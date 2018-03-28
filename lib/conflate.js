const path = require('path');
const pg = require('pg');
const fs = require('fs');
const os = require('os');

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
                'error-conflate',
                'error-persistent',
                'db',
                'output',
                'tokens',
                'country',
                'region'
            ],
            alias: {
                'in-address': 'in-addresses',
                'database': 'db',
                'output': 'o',
                'tokens': 'token'
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

    if (argv['error-persistent']) argv['error-persistent'] = fs.createWriteStream(path.resolve(__dirname, '..', argv['error-persistent']));
    if (argv['error-conflate']) argv['error-conflate'] = fs.createWriteStream(path.resolve(__dirname, '..', argv['error-conflate']));

    let tokens;
    if (argv.tokens) {
        argv.tokens = argv.tokens.split(',')
        tokens = tokenize.createReplacer(argv.tokens);
    }

    const output = fs.createWriteStream(path.resolve(__dirname, '..', argv.output));

    const poolConf = {
        max: CPUS,
        user: 'postgres',
        database: argv.db,
        idleTimeoutMillis: 30000
    }

    const pool = new pg.Pool(poolConf);

    let opts = { pool: pool };

    const index = new Index(pool);

    createIndex();

    /**
     * Create Tables, Import, & Optimize by generating indexes
     */
    function createIndex() {
        index.init((err) => {
            if (err) return cb(err);

            index.copy(path.resolve(__dirname, '..', argv['in-persistent']), {
                tokens: tokens,
                error: argv['error-persistent']
            }, (err) => {

            });
        });
    }
}

module.exports = main;
