'use strict'
var fs = require('fs');
var pg = require('pg');
var queue = require('queue-async');
var fs = require('fs');
var csv = require('fast-csv');
var collocation = require('./analyze/collocation.js');
var tokenize = require('./tokenize.js');
var BiGramCollocationTable = collocation.BiGramCollocationTable;

function analyze(argv, callback) {
    if (Array.isArray(argv)) {
        argv = require('minimist')(argv, {
            string: [
                'cc',
                'type',
                'limit'
            ]
        });
    }
    if (!argv.cc) {
        console.error('--cc=<country code> argument required');
        process.exit(1);
    } else if (!argv.type) {
        console.error('--type=<type> argument required');
        process.exit(1);
    }

    if (argv.limit) {
        argv.limit = parseInt(argv.limit);
    }   else {
        console.log('note: you can limit results/rows with --limit <number>');
    }

    var cc = argv.cc;
    var type = argv.type;
    var limit = argv.limit

    extractTextField(cc, type, limit, (err, text) => {
        if (err) return callback(err);
        frequencyDistributionMunger(text, (err, scores) => {
            if (err) return callback(err);
            else {
                writeToCSV(scores, cc);
                console.log("ok - analysis saved to")
                console.log("   pt2itp/<cc>_scores.csv");
                console.log("you can view it with: ");
                console.log("   csvlook <cc>_scores.csv");
            }
        });
    });
}

function extractTextField(cc, type, limit, callback) {
    var database;
    var table;
    (type == 'address') ? table = 'address_cluster' : table = 'network_cluster';

    if (cc.indexOf('us') > -1) {
        database = 'mbpl_us_'+  cc.split(' ')[1] + '_address_both';
    } else database = 'mbpl_'+ cc +'_address_both'

    var pool = new pg.Pool({
        max: 2,
        user: 'postgres',
        database: database,
        idleTimeoutMillis: 30
    });

    pool.query('SELECT _text FROM '+ table + ((limit ? ' LIMIT ' + limit : '') + ';'), (err, data) => {
        if (err) {
            pool.end();
            return callback(err);
        }
        var textFields = formatData(data.rows);
        return callback(null, textFields);
    });
}

function formatData(data) {
    var results = [];
    data.forEach(function(i) {
        results.push(i._text);
    });
    return results;
}

function frequencyDistributionMunger(textfields, callback) {
    var bigrams = new BiGramCollocationTable();
    var scores;
    var tokens = [];

    for (var textField in textfields) {
        tokens = tokens.concat(tokenize.main(textfields[textField]));
    }
    bigrams.update(tokens);
    scores = [...bigrams.score_ngrams('likelihoodRatio')];
    return callback(null, scores);
}

function writeToCSV(scores, cc) {
var scoreFile = fs.createWriteStream(`${cc}_scores.csv`);
    csv
    .write(scores, {headers: true})
    .pipe(scoreFile);
}

module.exports = analyze;
module.exports.frequencyDistributionMunger = frequencyDistributionMunger;
module.exports.extractTextField = extractTextField;
module.exports.formatData = formatData;
module.exports.writeToCSV = writeToCSV;
