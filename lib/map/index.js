const os = require('os');
const fs = require('fs');
const turf = require('@turf/turf');
const path = require('path');
const readline = require('readline');
const CP = require('child_process');
const Queue = require('d3-queue').queue;
const _ = require('lodash');
const pgcopy = require('pg-copy-streams').from;

const CPUS = os.cpus().length;

const tokenize = require('../util/tokenize');
const tokens = require('@mapbox/geocoder-abbreviations');

/**
 * @class Index
 */
class Index {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Import a stream of 'map' module generated ITP Features into a given database
     * (Currently used to bring map geojson back into database for debug mode
     *
     * @param {string}      path    to itp geojson file
     * @param {Object}      opts    optional args
     * @param {Function}    cb      Callback
     * @return {Function}           in form fxn(err)
     */
    itp(path, opts = {}, cb) {
        this.pool.query(`
            BEGIN;

            CREATE EXTENSION IF NOT EXISTS POSTGIS;

            DROP TABLE IF EXISTS itp;

            CREATE TABLE itp (id BIGINT, blob JSONB, geom GEOMETRY(GEOMETRY, 4326) );

            \copy itp (blob) FROM '${path}' WITH CSV DELIMITER '|' QUOTE E'\b' NULL AS '';

            UPDATE itp
                SET
                    geom = ST_Envelope(ST_SetSRID(ST_GeomFromGeoJSON(blob->>'geometry'), 4326)),
                    id = (blob->>'id')::BIGINT;

            CREATE INDEX itp_gix ON itp USING GIST (geom);

            COMMIT;
        `, (err) => {
            return cb(err);
        });
    }
}

module.exports = Index;
