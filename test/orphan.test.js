const Orphan = require('../lib/orphan');

const test = require('tape');
const fs = require('fs');
const pg = require('pg');
const Queue = require('d3-queue').queue;

const pool = new pg.Pool({
    max: 10,
    user: 'postgres',
    database: 'pt_test',
    idleTimeoutMillis: 30000
});

test('Drop tables if exist', (t) => {
    pool.query(`
        BEGIN;
        DROP TABLE IF EXISTS address_cluster;
        DROP TABLE IF EXISTS address;
        COMMIT;
    `, (err, res) => {
        t.error(err);
        t.end();
    });
});

// test orphan construction
// start up an orphan with some arguments, check for the correct error messsages
test.skip('orphan.init with invalid options', (t) => {
    // can't 'catch' this because it's a console.error :(
    try {
        let opts = {tokens: ['fr']};
        const invalidOrphan = new Orphan(pool, opts);
    } catch (err) {
        t.ok(err, 'invalid Orphan options throw error');
        t.equal(err.message, 'WARN: map.orphanAddr() using titlecase behavior, which is current English-only, on non-English data', 'has error message about non-english tokens');
        t.end();
    }
});

test('orphan.init with valid options', (t) => {
    let opts = {tokens: ['en']};
    const validOrphan = new Orphan(pool, opts);
    t.equal(typeof validOrphan.label, 'function', 'orphan initiated succesfully');
    t.end();
});


// start up a new default orphan
// initialize some adopted addresses, some orphan addresses
// run them through orphan
// should output all orphan addresses
test('orphan.address', (t) => {
    const orphan = new Orphan(pool, {});
    const popQ = Queue(1);

    //CREATE pt2itp TABLES
    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            CREATE TABLE address (id SERIAL, segment BIGINT, text TEXT, text_tokenless TEXT, _text TEXT, number INT, geom GEOMETRY(POINTZ, 4326), netid BIGINT);
            CREATE TABLE address_cluster (id SERIAL, text TEXT, text_tokenless TEXT, _text TEXT, number TEXT, geom GEOMETRY(GEOMETRYZ, 4326));
            COMMIT;
        `, (err, res) => {
            t.error(err, 'ok - created tables');
            return done();
        });
    });

    //POPULATE ADDRESS
    popQ.defer((done) => {
        pool.query(`
            BEGIN;
            INSERT INTO address (id, segment, text, text_tokenless, _text, number, geom, netid) VALUES (1, 1, 'main st se', 'main', 'Main Street SE', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-66.97265625,43.96119063892024, 1] }'), 4326), 1);
            INSERT INTO address (id, segment, text, text_tokenless, _text, number, geom, netid) VALUES (2, 1, 'main st se', 'main', 'Main Street SE', 12, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-66.97265625,43.96119063892024, 2] }'), 4326), 1);
            INSERT INTO address (id, segment, text, text_tokenless, _text, number, geom, netid) VALUES (6, 1, 'main st se', 'main', 'Main Street SE', 14, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-66.97265625,43.96119063892024, 6] }'), 4326), 1);
            INSERT INTO address (id, segment, text, text_tokenless, _text, number, geom, netid) VALUES (3, 1, 'main st', 'main', 'Main Street', 13, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-105.46875,56.36525013685606, 3] }'), 4326), NULL);
            INSERT INTO address (id, segment, text, text_tokenless, _text, number, geom, netid) VALUES (4, 1, 'main st', 'main', 'Main Street', 15, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-105.46875,56.36525013685606, 4] }'), 4326), NULL);
            INSERT INTO address (id, segment, text, text_tokenless, _text, number, geom, netid) VALUES (5, 1, 'fake av', 'fake', 'Fake Avenue', 10, ST_SetSRID(ST_GeomFromGeoJSON('{ "type": "Point", "coordinates": [-85.25390625,52.908902047770255, 5] }'), 4326), NULL);
            COMMIT;
        `, (err, res) => {
            t.error(err, 'ok - added addresses to table');
            return done();
        });
    });

    // call orphan.address
    popQ.defer((done) => {
        orphan.address((err) => {
            t.error(err);
            return done();
        });
    });

    // check output
    // TODO: fixup test once orphan.js approximately working
    popQ.defer((done) => {
        pool.query(`
            SELECT id, _text FROM address_cluster ORDER BY id;
        `, (err, res) => {
            t.error(err);

            t.equals(res.rows.length, 2, 'ok - correct number of orphans');
            t.deepEquals(res.rows[1], { id: '4', _text: 'Main Street'});
            t.deepEquals(res.rows[2], { id: '5', _text: 'Fake Avenue'});
            return done();
        });
    });

    popQ.await((err) => {
        t.error(err);

        pool.query(`
            BEGIN;
            DROP TABLE address;
            DROP TABLE address_cluster;
            COMMIT;
        `, (err, res) => {
            t.error(err, 'ok - cleaned up test tables');
            t.end();
        });
    });
});

test('end connection', (t) => {
    pool.end();
    t.end();
});
