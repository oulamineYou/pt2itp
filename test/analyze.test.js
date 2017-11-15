const analyser = require('../lib/analyze');
const freqDist = require('./fixtures/analyze.freqDist.js');
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
    idleTimeoutMillis: 3000
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
            INSERT INTO address_cluster (id, text, text_tokenless, _text, number, geom) VALUES (1, 'akoko st', 'akoko', 'Akoko Street', 10, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05154812335967, 45.26861208316249 ] }'), 4326)));
            INSERT INTO address_cluster (id, text, text_tokenless, _text, number, geom) VALUES (2, 'wong ho ln', 'wong ho', 'Wong Ho Lane', 12, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05154812335967, 45.26861208316249 ] }'), 4326)));
            INSERT INTO address_cluster (id, text, text_tokenless, _text, number, geom) VALUES (2, 'pier 1', 'pier 1', 'Pier 1', 14, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05154812335967, 45.26861208316249 ] }'), 4326)));
            INSERT INTO address_cluster (id, text, text_tokenless, _text, number, geom) VALUES (2, 'main st', 'main', 'Main St', 14, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05154812335967, 45.26861208316249 ] }'), 4326)));
            INSERT INTO address_cluster (id, text, text_tokenless, _text, number, geom) VALUES (3, 'fake st', 'fake', 'Fake St', 12, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -66.05154812335967, 45.26861208316249 ] }'), 4326)));
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
    analyser.extractTextField('address', 5, pool, (err, data) => {
        t.error(err);
        t.deepEquals(
            data,
            [ 'Akoko Street', 'Wong Ho Lane', 'Pier 1', 'Main St', 'Fake St' ],
            'extracted text is correct'
        );
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
        t.deepEquals([...data.score_ngrams('likelihoodRatio')], freqDist.bigram, 'expected frequency distribution');
        t.end();
    });
});

test('analyze.js output - address', (t) => {
    let tempFileNamePrefix = tmp.tmpNameSync();
    analyser({
        cc: 'test',
        type: 'address',
        limit: 5,
        output: tempFileNamePrefix
    }, (err) => {
        if (err) throw err;
        var orders = ['bigram']; //TODO 'unigram'];
        for (var i=0;i<orders.length;i++) {
            var order = orders[i];
            var tmpOutput = `${tempFileNamePrefix}-${order}.csv`;

            var fixturePath = path.resolve(__dirname, `./fixtures/analyze.address-${order}.csv`);
            if (process.env.UPDATE) {
                fs.createReadStream(tmpOutput)
                  .pipe(fs.createWriteStream(fixturePath));
                t.fail(`updated address ${order} fixture`);
            } else {
                var expected = fs.readFileSync(fixturePath).toString();
                var actual = fs.readFileSync(tmpOutput).toString();
                t.equal(actual, expected, `address ${order} output is as expected`);
            }
            pool.query(`SELECT * FROM address_${order}s;`, (err,res) => {
                if (err) {
                    throw err;
                }
                var results = [];

                for (j=0;j<res.rows.length;j++) {
                    d = res.rows[j];
                    results.push({
                        "w1": d.w1,
                        "w2": d.w2,
                        "frequency": d.frequency,
                        "likelihoodRatio": d.likelihood_ratio
                    });
                }
                if (results.length <= 0) {
                    t.fail(`no results returned from address_${order}s`);
                }
                t.deepEqual(results, freqDist[`${order}_sql`], `SQL table address_${order}s has expected values`);
            });

        }
        t.end();

    });
});

test('analyze.js output - network', (t) => {
    let tempFileNamePrefix = tmp.tmpNameSync();
    analyser({
        cc: 'test',
        type: 'network',
        limit: 5,
        output: tempFileNamePrefix,
    }, (err) => {
        if (err) throw err;
        var orders = ['bigram'];// TODO'unigram'];
        for (var i=0;i<orders.length;i++) {
            var order = orders[i];
            var tmpOutput = `${tempFileNamePrefix}-${order}.csv`;

            var fixturePath = path.resolve(__dirname, `./fixtures/analyze.network-${order}.csv`);
            if (process.env.UPDATE) {
                fs.createReadStream(tmpOutput)
                  .pipe(fs.createWriteStream(fixturePath));
                t.fail(`updated network ${order} fixture`);
            } else {
                var expected = fs.readFileSync(fixturePath).toString();
                var actual = fs.readFileSync(tmpOutput).toString();
                t.equal(actual, expected, `network ${order} output is as expected`);
            }
        }
    });
    t.end();
});

test('end connection', (t) => {
    pool.end();
    t.end();
});
