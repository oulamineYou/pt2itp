const Index = require('../lib/index');
const worker = require('../lib/map');
const exec = require('child_process').exec;
const fs = require('fs');

const spawn = require('tape-spawn');
const csv = require('fast-csv');
const test = require('tape');
const path = require('path');
const pg = require('pg');

const database = 'pt_test';
const carmenIndex = '/tmp/test-de.mbtiles';
const output = '/tmp/test-de.err';
const config = path.resolve(__dirname, './fixtures/test-de/carmen-config.json');
const abbr = path.resolve(__dirname, '../node_modules/@mapbox/geocoder-abbreviations/tokens/global.js')


const pool = new pg.Pool({
    max: 10,
    user: 'postgres',
    database: database,
    idleTimeoutMillis: 30000
});

// step 1: pt2itp map
const index = new Index(pool);

test('Drop/init database', (t) => {
    index.init((err, res) => {
        t.error(err);
        t.end();
    });
});

// loads address and network data into postgres
test('load address and network files', (t) => {
    worker({
        'in-address': './test/fixtures/test-de/address.geojson',
        'in-network': './test/fixtures/test-de/network.geojson',
        output: '/tmp/itp-de.geojson',
        debug: true,
        db: database,
        tokens: 'de'
    }, (err, res) => {
        t.error(err);
        t.end();
    });
});

// make sure to delete /tmp/test-de.* before running indexer
test('clean up any previous database files', (t) => {
    exec('rm -rf /tmp/test-de.*', (err, stdout, stderr) => {
        t.ifError(err);
        t.equal(fs.existsSync('/tmp/test-de.mbtiles'), false, 'cleans up test-de.mbtiles');
        t.end();
    });
});

// step 2: create index file for test mode
// cat <geojson> | carmen-index --config=${config} --index=${carmenIndex}
test('create index from geojson', (t) => {
    exec(`cat /tmp/itp-de.geojson | ${__dirname}/../node_modules/.bin/carmen-index --config=${config} --index=${carmenIndex} --tokens ${abbr}`, (err, stdout, stderr) => {
        t.ifError(err);
        t.equal(fs.existsSync('/tmp/test-de.mbtiles'), true, 'creates test-de.mbtiles');
        t.end();
    });
});

test('query from new index', (t) => {
    exec(`${__dirname}/../node_modules/.bin/carmen --query "5 Haupt Strasse" ${carmenIndex} | grep "1.00 5 Haupt Strasse" | tr -d '\n'`, (err, res) => {
        t.ifError(err);
        t.equal(res.split(',')[0], "- 1.00 5 Haupt Strasse", 'Finds 5 Haupt Strasse');
    });
    exec(`${__dirname}/../node_modules/.bin/carmen --query "5 Hauptstrasse" ${carmenIndex} | grep "1.00 5 Haupt Strasse" | tr -d '\n'`, (err, res) => {
        t.ifError(err);
        t.equal(res.split(',')[0], "- 1.00 5 Haupt Strasse", 'Finds 5 "Hauptstrasse" as "Haupt Strasse"');
        t.end();
    });
});

// step 3: run test mode against the built index
test('Run test mode', (t) => {
    exec(`${__dirname}/../index.js test --config=${config} --index=${carmenIndex} --db=${database} -o ${output}`, (err, stdout, stderr) => {
        t.test('Return correct error messages in csv', (t) => {
            let csvErrs = [];
            // let queryResults;

            csv.fromPath(output, {headers: true})
            .on('data', (data) => {
                csvErrs.push(data);
            })
            .on('end', () => {
                t.equal(csvErrs.length, 3);
                t.equal(csvErrs.filter(ele => ele.query === '')[0].error, 'NOT MATCHED TO NETWORK');
                t.equal(csvErrs.filter(ele => ele.query === '31 hauptstr')[0].error, 'TEXT');
                t.equal(csvErrs.filter(ele => ele['addr text'] === 'Haupt str')[0].error, 'NOT MATCHED TO NETWORK');
                t.equal(csvErrs.filter(ele => ele['addr text'] === 'Haupt Strasse')[0].error, 'NOT MATCHED TO NETWORK');
                t.end();
            });
        });
    });
});

test('Drop/init database', (t) => {
   index.init((err, res) => {
       t.error(err);
       t.end();
   });
});

test('end connection', (t) => {
   pool.end();
   t.end();
});
