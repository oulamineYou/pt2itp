'use strict';

const path = require('path');
const pg = require('pg');
const fs = require('fs');
const os = require('os');
const Compare = require('./conflate/compare');

const import_addr = require('../native/index.node').import_addr;

const Index = require('./conflate/index');

const CPUS = process.env.CI ? 10 : Math.min(16, os.cpus().length);
const tokenize = require('./util/tokenize');

/**
 * Main entrance to conflate module which conflates a new address source against an existing file
 * @param {Object} argv Argument Object - See argv parser or help module in code for a complete list
 * @param {Function} cb Callback in (err, res)
 * @return {Funtion} cb
 */
function main(argv, cb) {
    if (!cb || typeof cb !== 'function') throw new Error('lib/conflate.js requires a callback parameter');

    if (Array.isArray(argv)) {
        argv = require('minimist')(argv, {
            string: [
                'in-addresses',
                'in-persistent',
                'error-persistent',
                'db',
                'output',
                'languages',
                'country',
                'region'
            ],
            alias: {
                'in-address': 'in-addresses',
                'database': 'db',
                'output': 'o',
                'languages': 'language'
            }
        });
    }

    if (!argv['in-address']) {
        return cb(new Error('--in-address=<FILE.geojson> argument required'));
    } else if (!argv['in-persistent']) {
        return cb(new Error('--in-persistent=<FILE.geojson> argument required'));
    } else if (!argv.output) {
        return cb(new Error('--output=<FILE.geojson> argument required'));
    } else if (!argv.db) {
        return cb(new Error('--db=<DATABASE> argument required'));
    }

    if (!argv.languages) {
        argv.languages = [];
    } else if (typeof argv.languages === 'string') {
        argv.languages = argv.languages.split(',');
    }
    const tokens = tokenize.createReplacer(argv.languages);

    const pool = new pg.Pool({
        max: CPUS,
        user: 'postgres',
        database: argv.db,
        idleTimeoutMillis: 30000
    });

    createIndex();

    /**
     * Create Tables, Import, & Optimize by generating indexes
     */
    function createIndex() {
        new Index(pool).init((err) => {
            if (err) return cb(err);

            const context = {
                country: argv.country ? argv.country : '',
                region: argv.region ? argv.region : '',
                languages: argv.languages
            };

            console.error('ok - importing address data');
            import_addr({
                db: argv.db,
                input: argv['in-persistent'],
                seq: false,
                context: context,
                errors: argv['error-persistent']
            });

            return compare();
        });
    }

    /**
     * Compare new addresses against the persistent database created in the previous step
     */
    function compare() {
        const compare = new Compare({
            context: {
                country: argv['country'],
                region: argv['region']
            },
            pool: pool,
            tokens: tokens,
            read: argv['in-address'],
            output: fs.createWriteStream(path.resolve(__dirname, '..', argv.output))
        });

        compare.read((err) => {
            if (err) return cb(err);

            compare.modify_groups((err) => {
                if (err) return cb(err);

                pool.end();

                console.error('ok - all done!');
                return cb();
            });
        });
    }
}

module.exports = main;
