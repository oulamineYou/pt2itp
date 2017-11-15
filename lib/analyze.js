const fs = require('fs');
const pg = require('pg');
const path = require('path');
const queue = require('queue-async');
const csv = require('fast-csv');
const collocation = require('./analyze/collocation.js');
const tokenize = require('./tokenize.js');
const BiGramCollocationTable = collocation.BiGramCollocationTable;

/**
 * This module analyzes the "_text" fields of address and network data. It
 * assumes they have been loaded into the database already. The output is a CSV
 * file with statistics on the frequency distribution of each token in that
 * data. Those statistics will be useful for surfacing important patterns in
 * street names and spotting potential near-misses when matching address and
 * network entries.
 *
 * @param {Object} argv - command line arguments passed when calling `pt2itp analyze`
 * @param {string} argv.cc - country code with optional region code (eg. `es` or `us ny`)
 * @param {Object} argv.type - one of "network" or "address"
 * @param {function} callback - callback function to surface any thrown errors
 */
function analyze(argv, callback) {
    if (Array.isArray(argv)) {
        argv = require('minimist')(argv, {
            string: [
                'cc',
                'type',
                'limit',
                'output'
            ]
        });
    }
    if (!argv.cc) {
        console.error('--cc=<country code> argument required');
        process.exit(1);
    } else if (!argv.type) {
        console.error('--type=<type> argument required');
        process.exit(1);
    } else if (!argv.output) {
        console.error('--output=<output file location> argument required');
        process.exit(1);
    }

    if (argv.limit) {
        argv.limit = parseInt(argv.limit);
    } else {
        console.log('note: you can limit results/rows with --limit <number>');
    }

    const cc = argv.cc;
    const type = argv.type;
    const limit = argv.limit;
    const unigramOutput = path.resolve(argv.output) + '-unigram.csv';
    const bigramOutput = path.resolve(argv.output) + '-bigram.csv';

    let database;

    let country = cc.split('_')[0];
    if (cc.indexOf('_') > -1) {
        let region = cc.split('_')[1];
        database = `mbpl_${country}_${region}_address_both`;
    } else if (cc == 'test') {
        database = 'pt_test';
    } else {
        database = `mbpl_${country}_address_both`;
    }

    const pool = new pg.Pool({
        max: 2,
        user: 'postgres',
        database: database,
        idleTimeoutMillis: 30
    });

    const bigramWriteStream = fs.createWriteStream(bigramOutput, { encoding: 'utf8' });
    const bigramCSVStream = csv.createWriteStream({ headers: true });
    bigramCSVStream.pipe(bigramWriteStream);

    const unigramWriteStream = fs.createWriteStream(unigramOutput, { encoding: 'utf8' });
    const unigramCSVStream = csv.createWriteStream({ headers: true });
    unigramCSVStream.pipe(unigramWriteStream);

    extractTextField(type, limit, pool, (err, text) => {
        if (err) return callback(err);
        frequencyDistributionMunger(text, (err, bigrams) => {
            if (err) return callback(err);
            else {
                for (var [word, frequency] of bigrams.unigram_fd.entries()) {
                    unigramCSVStream.write(
                        {'word': word, 'frequency': frequency},
                        {'headers': true}
                    );
                }
                unigramCSVStream.end();

                for (let score of bigrams.score_ngrams('likelihoodRatio')) {
                    bigramCSVStream.write(score, {headers: true});
                }
                bigramCSVStream.end();
            }
        });
    });
    unigramWriteStream.on("finish", () => {
        pool.query(`
            BEGIN;
            DROP TABLE IF EXISTS ${type}_unigrams;
            CREATE TABLE ${type}_unigrams (
                word VARCHAR NOT NULL,
                frequency INTEGER
            );
            COPY ${type}_unigrams from '${unigramOutput}' CSV HEADER;
            CREATE INDEX ${type}_unigrams__word__idx on ${type}_unigrams (word);
            COMMIT;`,
            (err, res) => {
                if (err) {
                    pool.end();
                    return callback(err);
                }
            }
        );
    });
    bigramWriteStream.on("finish", () => {
        pool.query(`
            BEGIN;
            DROP TABLE IF EXISTS ${type}_bigrams;
            CREATE TABLE ${type}_bigrams (
                w1 VARCHAR NOT NULL,
                w2 VARCHAR NOT NULL,
                frequency INTEGER,
                likelihood_ratio DOUBLE PRECISION
            );
            COPY ${type}_bigrams from '${bigramOutput}' CSV HEADER;
            CREATE INDEX ${type}_bigrams__w1_w2__idx on ${type}_bigrams (w1,w2);
            COMMIT;`,
            (err, res) => {
                if (err) {
                    pool.end();
                    return callback(err);
                }
            }
        );
        pool.end();
        callback(null);
    });
}

/**
 * This method queries the appropriate table in the postgres database, returns
 * the _text field for each row, passes each value through {@link formatData},
 * and calls callback on an array of the results.
 *
 * @param {string} cc - country code or country code + region (eg "es" or "us ny")
 * @param {string} type - one of "network" or "address"
 * @param {function} callback - callback function
 */
function extractTextField(type, limit, pool, callback) {
    let table;
    let limitClause;

    table = (type == 'address') ? 'address_cluster' : 'network_cluster';
    limitClause = limit ? ' LIMIT ' + limit : '';

    pool.query('SELECT _text FROM '+ table + limitClause +';', (err, data) => {
        if (err) {
            pool.end();
            return callback(err);
        }
        const textFields = formatData(data.rows);
        return callback(null, textFields);
    });
}

/**
 * This function formats each result
 *
 * @param {Array<any>} data - an array of rows from a sql query result
 * @returns {Array<string>} an array of formatted _text fields
 */
function formatData(data) {
    const results = [];
    data.forEach(function(i) {
        if (Array.isArray(i._text)) {
            for (let j of i._text) results.push(j);
        } else {
            results.push(i._text);
        }
    });
    return results;
}

/**
 * This function tokenizes each text value and uses the token arrays to update
 * a {@link BiGramCollocationTable}. Then it returns an array of scored ngrams.
 *
 * @param {Array<string>} textfields - An array of _text values
 * @param {function} callback - callback function
 */
function frequencyDistributionMunger(textfields, callback) {
    const bigrams = new BiGramCollocationTable();
    let scores;

    for (let textField in textfields) {
        let tokens = tokenize.main(textfields[textField]);
        bigrams.update(tokens);
    }
    return callback(null, bigrams);
}

module.exports = analyze;
module.exports.frequencyDistributionMunger = frequencyDistributionMunger;
module.exports.extractTextField = extractTextField;
module.exports.formatData = formatData;
