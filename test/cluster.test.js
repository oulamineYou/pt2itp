'use strict';

const pg_optimize = require('../native/index.node').pg_optimize;
const {
    cluster_net,
    cluster_addr
} = require('../native/index.node');

const test = require('tape');
const Queue = require('d3-queue').queue;

const db = require('./lib/db');

db.init(test);

test('cluster.address', (t) => {
    const pool = db.get();
    const popQ = new Queue(1);

    // POPULATE ADDRESS
    popQ.defer((done) => {
        pool.query(`
            BEGIN;

            INSERT INTO address (id, names, number, geom, netid) VALUES (1, '[{ "tokenized": "main st", "tokenless": "main", "display": "Main Street" }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-66.97265625,43.96119063892024] }'), 4326), 1);
            INSERT INTO address (id, names, number, geom, netid) VALUES (2, '[{ "tokenized": "main st", "tokenless": "main", "display": "Main Street" }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-66.97265625,43.96119063892024] }'), 4326), 1);
            INSERT INTO address (id, names, number, geom, netid) VALUES (3, '[{ "tokenized": "main st", "tokenless": "main", "display": "Main Street" }]', 13, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-105.46875,56.36525013685606] }'), 4326), 3);
            INSERT INTO address (id, names, number, geom, netid) VALUES (4, '[{ "tokenized": "main st", "tokenless": "main", "display": "Main Street" }]', 13, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-105.46875,56.36525013685606] }'), 4326), 3);
            INSERT INTO address (id, names, number, geom, netid) VALUES (5, '[{ "tokenized": "fake av", "tokenless": "fake", "display": "Fake Avenue" }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-85.25390625,52.908902047770255] }'), 4326), 2);
            INSERT INTO address (id, names, number, geom, netid) VALUES (6, '[{ "tokenized": "main st", "tokenless": "main", "display": "Main Street" }]', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-66.97265625,43.96119063892024] }'), 4326), 1);

            COMMIT;
        `, (err) => {
            t.error(err, 'no errors');

            pg_optimize();

            return done();
        });
    });

    popQ.defer((done) => {
        cluster_addr('pt_test');

        done();
    });

    popQ.defer((done) => {
        pool.query(`
            SELECT
                names,
                ST_AsGeoJSON(geom)::JSON AS geom
            FROM
                address_cluster
            ORDER BY
                ST_NumGeometries(geom);
        `, (err, res) => {
            t.error(err, 'no errors');

            t.equals(res.rows.length, 3);
            t.deepEquals(res.rows[0], { geom: { type: 'MultiPoint','coordinates':[[-85.25390625,52.9089020477703,5]] }, names: [{ freq: 1, tokenized: 'fake av', tokenless: 'fake', display: 'Fake Avenue' }] });
            t.deepEquals(res.rows[1], { geom: { 'type':'MultiPoint','coordinates':[[-105.46875,56.3652501368561,3],[-105.46875,56.3652501368561,4]] }, names: [{ freq: 2, tokenized: 'main st', tokenless: 'main', display: 'Main Street' }] });
            t.deepEquals(res.rows[2], { geom: { coordinates: [[-66.97265625, 43.9611906389202, 1], [-66.97265625, 43.9611906389202, 2], [-66.97265625, 43.9611906389202, 6]], type: 'MultiPoint' }, names: [{ freq: 3, tokenized: 'main st', tokenless: 'main', display: 'Main Street' }] });

            return done();
        });
    });

    popQ.await((err) => {
        t.error(err, 'no errors');

        pool.end(() => {
            t.end();
        });
    });
});

db.init(test);

test('cluster.address - order synonyms by address count', (t) => {
    const pool = db.get();
    const popQ = new Queue(1);

    popQ.defer((done) => {
        pool.query(`
            BEGIN;

            INSERT INTO address (id, names, number, netid, geom) VALUES (21, '[{ "tokenized": "mill st nw", "tokenless": "mill", "display": "Mill Street NW" }]', 12, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.41056871414183, 41.8005111239637 ] }'), 4326));
            INSERT INTO address (id, names, number, netid, geom) VALUES (22, '[{ "tokenized": "mill st nw", "tokenless": "mill", "display": "Mill Street NW" }]', 13, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.41054725646971, 41.801102975153974 ] }'), 4326));

            INSERT INTO address (id, names, number, netid, geom) VALUES (23, '[{ "tokenized": "r st nw", "tokenless": "r", "display": "R Street NW" }]', 10, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.41816473007202, 41.80102299558284 ] }'), 4326));
            INSERT INTO address (id, names, number, netid, geom) VALUES (24, '[{ "tokenized": "r st nw", "tokenless": "r", "display": "R Street NW" }]', 11, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.4172420501709, 41.80103899150505 ] }'), 4326));
            INSERT INTO address (id, names, number, netid, geom) VALUES (25, '[{ "tokenized": "r st nw", "tokenless": "r", "display": "R Street NW" }]', 12, 20, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [ -85.41599750518799, 41.801166958738996 ] }'), 4326));


            COMMIT;
        `, (err) => {
            t.error(err, 'no errors');

            pg_optimize();

            return done();
        });
    });

    popQ.defer((done) => {
        cluster_addr('pt_test');
        done();
    });

    popQ.defer((done) => {
        // check that text has r st, then mill st
        pool.query(`
            SELECT
                id,
                names
            FROM
                address_cluster
            ORDER BY
                id;
        `, (err, res) => {
            t.error(err, 'no errors');

            t.equals(res.rows.length, 1, 'one address cluster');

            t.deepEquals(res.rows[0].names, [{
                display: 'R Street NW',
                tokenized: 'r st nw',
                tokenless: 'r',
                freq: 3
            },{
                display: 'Mill Street NW',
                tokenized: 'mill st nw',
                tokenless: 'mill',
                freq: 2
            }], 'address cluster text ordered by number of addresses');

            return done();
        });
    });

    popQ.await((err) => {
        t.error(err, 'no errors');
        pool.end(() => {
            t.end();
        });
    });
});

db.init(test);

test('cluster.network', (t) => {
    const pool = db.get();
    const popQ = new Queue(1);

    // POPULATE NETWORK
    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO network (names, geom) VALUES ('[{ "tokenized": "main st", "tokenless": "main", "display": "Main Street", "freq": 1 }]', ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "MultiLineString", "coordinates": [ [ [ -66.05390310287476, 45.26961632842303 ], [ -66.05441808700562, 45.271035832768376 ] ] ]}'), 4326));
            INSERT INTO network (names, geom) VALUES ('[{ "tokenized": "main st", "tokenless": "main", "display": "Main Street", "freq": 1 }]', ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "MultiLineString", "coordinates": [ [ [ -66.05435371398926, 45.27100563091792 ], [ -66.05493307113646, 45.27245530161207 ] ] ]}'), 4326));
            INSERT INTO network (names, geom) VALUES ('[{ "tokenized": "main st", "tokenless": "main", "display": "Main Street", "freq": 1 }]', ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "MultiLineString", "coordinates": [ [ [ -113.50117206573485, 53.55137413785917 ], [ -113.50112915039062, 53.54836549323335 ] ] ]}'), 4326));
            INSERT INTO network (names, geom) VALUES ('[{ "tokenized": "main st", "tokenless": "main", "display": "Main Street", "freq": 1 }]', ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "MultiLineString", "coordinates": [ [ [ -113.50100040435791, 53.54836549323335 ], [ -113.50104331970215, 53.54614711825744 ] ] ]}'), 4326));
            COMMIT;
        `, (err) => {
            t.error(err, 'no errors');

            pg_optimize();

            return done();
        });
    });

    popQ.defer((done) => {
        cluster_net('pt_test');
        done();
    });

    popQ.defer((done) => {
        pool.query(`
            SELECT
                id,
                names,
                ST_AsGeoJSON(geom)::JSON AS geom,
                source_ids
            FROM
                network_cluster
            ORDER BY
                id ASC;
        `, (err, res) => {
            t.error(err, 'no errors');

            t.equals(res.rows.length, 2);

            t.deepEquals(res.rows[0], {
                id: 1,
                names: [{
                    freq: 1,
                    tokenized: 'main st',
                    tokenless: 'main',
                    display: 'Main Street'
                }],
                geom: {
                    type: 'MultiLineString',
                    coordinates: [[[-66.0539031028748, 45.269616328423], [-66.0544180870056, 45.2710358327684]], [[-66.0543537139893, 45.2710056309179], [-66.0549330711365, 45.2724553016121]]]
                },
                source_ids: ['1', '2']
            });

            t.deepEquals(res.rows[1], {
                id: 2,
                geom: {
                    type: 'MultiLineString',
                    coordinates: [[[-113.501172065735, 53.5513741378592], [-113.501129150391, 53.5483654932333]], [[-113.501000404358, 53.5483654932333], [-113.501043319702, 53.5461471182574]]]
                },
                names: [{
                    freq: 1,
                    display: 'Main Street',
                    tokenized: 'main st',
                    tokenless: 'main'
                }],
                source_ids: ['3', '4']
            });


            return done();
        });
    });

    popQ.await((err) => {
        t.error(err, 'no errors');
        pool.end(() => {
            t.end();
        });
    });
});

db.init(test);
