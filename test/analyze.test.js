const analyser = require('../lib/analyze');
const freqDist = require('./fixtures/analyze.freqDist.js');
const path = require('path');
const pg = require('pg');
const fs = require('fs');
const tmp = require('tmp');
const test = require('tape');
const Queue = require('d3-queue').queue;
const Cluster = require('../lib/cluster');
const Index = require('../lib/index');

const pool = new pg.Pool({
    max: 3,
    user: 'postgres',
    database: 'pt_test',
    idleTimeoutMillis: 3000
});

const cluster = new Cluster({ pool: pool });
const index = new Index(pool);

test('Drop/Init Database', (t) => {
    index.init((err, res) => {
        t.error(err);
        t.end();
    });
});

test('Init db', (t) => {
    const popQ = new Queue(1);

    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO address_cluster (id, text, text_tokenless, _text) VALUES (1, '{"akoko st"}', '{"akoko"}', '{"Akoko Street"}');
            INSERT INTO address_cluster (id, text, text_tokenless, _text) VALUES (2, '{"wong ho ln"}', '{"wong ho"}', '{"Wong Ho Lane"}');
            INSERT INTO address_cluster (id, text, text_tokenless, _text) VALUES (2, '{"pier 1"}', '{"pier 1"}', '{"Pier 1"}');
            INSERT INTO address_cluster (id, text, text_tokenless, _text) VALUES (2, '{"main st"}', '{"main"}', '{"Main St"}');
            INSERT INTO address_cluster (id, text, text_tokenless, _text) VALUES (3, '{"fake st"}', '{"fake"}', '{"Fake St"}');
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
            INSERT INTO network_cluster (id, address, _text, text_tokenless) VALUES (4, 3, 'Main St',      'Main');
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
    var popQ = Queue(1);
    let tempFileNamePrefix = tmp.tmpNameSync();
    analyser({
        cc: 'test',
        type: 'address',
        limit: 5,
        output: tempFileNamePrefix
    }, (err) => {
        if (err) throw err;
        var orders = ['bigram', 'unigram'];
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
            popQ.defer((done) => {
                var o = order;
                pool.query(`SELECT * FROM address_${o}s;`, (err, res) => {
                    t.error(err);
                    var results = [];

                    for (var j=0;j<res.rows.length;j++) {
                        //d = res.rows[j]
                        results.push(res.rows[j]);
                    }
                    if (results.length <= 0) {
                        t.fail(`no results returned from address_${o}s`);
                    }
                    t.deepEqual(results, freqDist[`${o}_sql`], `SQL table address_${o}s has expected values`);
                    return done();
                });
            });
        }
        popQ.await((err) => {
            t.error(err);
            t.end();
        });
    });
});

test('analyze.js output - network', (t) => {
    var popQ = Queue(1);
    let tempFileNamePrefix = tmp.tmpNameSync();
    analyser({
        cc: 'test',
        type: 'network',
        limit: 5,
        output: tempFileNamePrefix,
    }, (err) => {
        if (err) throw err;
        var orders = ['bigram', 'unigram'];
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
            popQ.defer((done) => {
                var o = order;
                pool.query(`SELECT * FROM network_${o}s;`, (err, res) => {
                    t.error(err);
                    var results = [];

                    for (var j=0;j<res.rows.length;j++) {
                        results.push(res.rows[j]);
                    }
                    if (results.length <= 0) {
                        t.fail(`no results returned from network_${o}s`);
                    }
                    t.deepEqual(results, freqDist[`${o}_sql`], `SQL table network_${o}s has expected values`);
                    return done();
                });
            });
        }
        popQ.await((err) => {
            t.error(err);
            t.end();
        });
    });
});

test('end connection', (t) => {
    pool.end();
    t.end();
});
