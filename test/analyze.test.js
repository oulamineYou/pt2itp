const analyser = require('../lib/analyze');
const freqDistResult = require('./fixtures/freqDist.js').freqDist;
const path = require('path');
const pg = require('pg');
const fs = require('fs');
const tmp = require('tmp');
const test = require('tape');
const Queue = require('d3-queue').queue;

const pool = new pg.Pool({
    max: 3,
    user: 'postgres',
    database: 'pt_test',
    idleTimeoutMillis: 3
});

test('Drop tables if exist', (t) => {
    pool.query(`
        BEGIN;
        DROP TABLE IF EXISTS network_cluster;
        DROP TABLE IF EXISTS address_cluster;
        COMMIT;
    `, (err, res) => {
        t.error(err);
        t.end();
    });
});

test('Init db', (t) => {
    var popQ = Queue(1);

    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            DROP TABLE IF EXISTS address_cluster;
            CREATE TABLE address_cluster (id SERIAL, text TEXT, text_tokenless TEXT, _text TEXT, number TEXT, geom GEOMETRY(MULTIPOINT, 4326));
            CREATE TABLE network_cluster (id SERIAL, text TEXT, text_tokenless TEXT, _text TEXT, address INT, geom GEOMETRY(MULTILINESTRING, 4326), buffer GEOMETRY(POLYGON, 4326), source_ids BIGINT[]);
            COMMIT;
        `, (err, res) => {
            t.error(err);
            return done();
        });
    });

    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO address_cluster (id, text, text_tokenless, _text, number, geom) VALUES (1, 'main st', 'main', 'Main Street', 10, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05154812335967, 45.26861208316249 ] }'), 4326)));
            INSERT INTO address_cluster (id, text, text_tokenless, _text, number, geom) VALUES (2, 'fake av', 'fake', 'Fake Avenue', 12, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05154812335967, 45.26861208316249 ] }'), 4326)));
            COMMIT;
        `, (err, res) => {
            t.error(err);
            return done();
        });
    });

    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO network_cluster (id, address, _text, text_tokenless) VALUES (1, 1, 'Akoko Street', 'Akoko');
            INSERT INTO network_cluster (id, address, _text, text_tokenless) VALUES (2, 1, 'Wong Ho Lane', 'Wong Ho');
            INSERT INTO network_cluster (id, address, _text, text_tokenless) VALUES (3, 2, 'Pier 1',       'Pier 1');
            INSERT INTO network_cluster (id, address, _text, text_tokenless) VALUES (4, 3, 'Main St',      'First');
            INSERT INTO network_cluster (id, address, _text, text_tokenless) VALUES (5, 3, 'Fake St',      'Fake');
            COMMIT;
        `, (err, res) => {
            t.error(err);
            return done();
        });
    });

    popQ.await((err) => {
        t.error(err);
        t.end();
    });

});

test('Results from extractTextField', (t) => {
    analyser.extractTextField('test', 'address', 5, (err, data) => {
        t.error(err);
        t.deepEquals(data, [ 'Main Street', 'Fake Avenue' ], 'extracted text is correct');
        t.end();
    });
});

test('format data from text extraction', (t) => {
    let fixture = [ { _text: 'Akoko Street' }, { _text: 'Akala Lane' }, { _text: 'Dreier Street' }];
    let expected = analyser.formatData(fixture);
    t.deepEquals(expected, [ 'Akoko Street', 'Akala Lane', 'Dreier Street' ], 'Data formatted correctly');
    t.end();
});

test('frequencyDistribution check', (t) => {
    let fixtures = [ 'Akoko Street', 'Wong Ho Lane', 'Pier 1', 'Main St', 'Fake St' ];
    analyser.frequencyDistributionMunger(fixtures, (err, data) => {
        t.deepEquals([...data], freqDistResult, 'expected frequency distribution');
        t.end();
    });
});

test('analyze.js output - address', (t) => {
    let tempFile = tmp.tmpNameSync();
    analyser({
        cc: 'test',
        type: 'address',
        limit: 5,
        output: tempFile
    }, (err) => {
        if (err) throw err;
        var fixturePath = path.resolve(__dirname, './fixtures/analyze.address-results.csv')
        if (process.env.UPDATE) {
            fs.createReadStream(tempFile).pipe(fs.createWriteStream(fixturePath));
            t.fail('updated fixture');
        } else {
            var expected = fs.readFileSync(fixturePath).toString();
            var actual = fs.readFileSync(tempFile).toString();
            t.equal(actual, expected, 'output is as expected');
        }
    });
    t.end();
});

test('analyze.js output - network', (t) => {
    let tempFile = tmp.tmpNameSync();
    analyser({
        cc: 'test',
        type: 'network',
        limit: 5,
        output: tempFile,
    }, (err) => {
        if (err) throw err;
        var fixturePath = path.resolve(__dirname, './fixtures/analyze.network-results.csv')
        if (process.env.UPDATE) {
            fs.createReadStream(tempFile).pipe(fs.createWriteStream(fixturePath));
            t.fail('updated fixture');
        } else {
            var expected = fs.readFileSync(fixturePath).toString();
            var actual = fs.readFileSync(tempFile).toString();
            t.equal(actual, expected, 'output is as expected');
        }
    });
    t.end();
});

test('end connection', (t) => {
    pool.end();
    t.end();
});
