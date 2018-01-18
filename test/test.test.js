const Index = require('../lib/index');
const worker = require('../lib/map');
const exec = require('child_process').exec;

const spawn = require('tape-spawn');
const csv = require('fast-csv');
const test = require('tape');
const path = require('path');
const pg = require('pg');

const database = 'pt_test';
const carmenIndex = path.resolve(__dirname, './fixtures/test-ri/index/us_ri-address-both-0d603c2a171017011038-0d603c2a39.mbtiles');
const output = '/tmp/test-ri.err';
const config = path.resolve(__dirname, './fixtures/test-ri/carmen-config.json');

const pool = new pg.Pool({
    max: 10,
    user: 'postgres',
    database: database,
    idleTimeoutMillis: 30000
});

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
        'in-address': './test/fixtures/test-ri/address.geojson',
        'in-network': './test/fixtures/test-ri/network.geojson',
        output: '/tmp/itp.geojson',
        debug: true,
        db: database,
        tokens: 'en'
    }, (err, res) => {
        t.error(err);
        t.end();
    });
});

test('Run test mode', (t) => {
    exec(`${__dirname}/../index.js test - | carmen-index --config=${config} --index=${carmenIndex}`);
    exec(`${__dirname}/../index.js test --index ${carmenIndex} --database ${database} --output ${output} --config ${config}`, (err, stdout, stderr) => {
        t.test('Return correct error messages in csv', (t) => {
            let csvErrs = [];

            csv.fromPath(output, {headers: true})
            .on('data', (data) => {
                csvErrs.push(data);
            })
            .on('end', () => {
                t.equal(csvErrs.length, 2);
                t.equal(csvErrs.filter(ele => ele.query === '5 greeeeeenview rd')[0].error, 'NO RESULTS');
                t.equal(csvErrs.filter(ele => ele['addr text'] === 'greeeeeenview')[0].error, 'NAME MISMATCH (SOFT)');
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
