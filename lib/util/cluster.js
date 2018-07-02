const buffer = require('./buffer');
const dist = require('fast-levenshtein').get;
const Cursor = require('pg-cursor');
const turf = require('@turf/turf');
const Queue = require('d3-queue').queue;
const _ = require('lodash');
const wk = require('wellknown');
const simple = require('simple-statistics');
const Misc = require('./misc');
const misc = new Misc();
const linker = require('./linker');
const numCaseChanges = require('../label/util').numCaseChanges;

/**
 * @class Cluster
 */
class Cluster {
    constructor(opts) {
        opts = opts || {};
        this.pool = opts.pool;
        if (opts.label) {
            this.label = require('../label/' + opts.label)();
        } else {
            this.label = require('../label/titlecase')();
        }
    }

    /**
     * Attenpt to break a single NetworkCluster into n network clusters where there are dup addresses
     *
     * --Dup accross segments -- (TYPE: ClusterDup)
     * Output:        | Input:
     * --1--   --2--  | --1a-- --1b--
     * 1 2 3   3 2 1  | 1 2 3   3 2 1
     *
     *
     * -- Dup within Segment -- (TYPE SegDup)
     * Output:        | Input:
     * --1--   --2--  | ------1------
     * 1 2 3   3 2 1  | 1 2 3   3 2 1
     *
     * Note: This uses the misc.hasDupAddresswithin test and as such assumes ordered numbers within each segment
     *
     * @param {Array} segs Array of addr/number/lnstring segmtents to attempt to split
     * @param {number} id Optional network_cluster id for debugging
     * @return {Array} New segments array
     */
    break(segs, id) {
        //Classify into SegDup or Clusterdup
        let segDup = []; //Parallel array to segs of whether it contains a dup (bool)
        for (let seg_it = 0; seg_it < segs.length; seg_it++) {
            const seg = segs[seg_it];

            if (!seg.number) {
                segDup[seg_it] = false;
            } else if (misc.hasDupAddressWithin(seg.number.map(num => { return num.num }), seg.address.geometry.coordinates)) {
                segDup[seg_it] = true;
            } else {
                segDup[seg_it] = false;
            }
        }

        //Attempt to handle and split a ClusterDup
        //TODO: This currently only handles segs with a length of 2, a full implmentation to handle
        //  segs > 2 has yet to be written
        if (!segDup.some((dup) => { return dup }) && segs.length === 2) {
            return segs.map(seg => {
                return {
                    number: seg.number,
                    address: seg.address.geometry.coordinates,
                    network: turf.featureCollection([seg.network])
                };
            });
        } else if (!segDup.some((dup) => { return dup })) {
            console.error(`WARN: detected unhandled ClusterDup on network_cluster.id: ${id}`);
        }

        let orphanSegs = []; //Segs that needs to be matched based on prox. at the end with segments in newSegs
        let newSegs = []; //Break apart cluster into new clusters

        console.error(`Total Segs: ${segs.length}`);

        //Attempt to handle and split a SegDup
        for (let seg_it = 0; seg_it < segs.length; seg_it++) {
            const seg = segs[seg_it];

            if (!segDup[seg_it] || !seg.address || turf.lineDistance(seg.network) < 1) {
                orphanSegs.push(seg);
                continue;
            }

            //Dist array contains an ordering of the address points based on distance to origin
            let dist = [];
            for (let addr_it = 0; addr_it < seg.number.length; addr_it++) {
                let addr = turf.point(seg.address.geometry.coordinates[addr_it]);
                let linept = turf.pointOnLine(seg.network, addr);

                let res = {
                    distOnLine: turf.lineDistance(turf.lineSlice(turf.point(seg.network.geometry.coordinates[0]), linept, seg.network)),
                    distFromLine: turf.distance(addr, linept),
                    geometry: addr,
                    number: parseInt(seg.number[addr_it].num),
                    output: seg.number[addr_it].output
                };

                dist.push(res);
            }
        }

        return newSegs;
    }

    /**
     * Cluster orphan address points
     * @param {Function} cb Callback in (err, res)
     * @return {Function} Callback
     */
    orphan(cb) {
        this.pool.query(`
            INSERT INTO address_orphan_cluster (name, geom)
                SELECT
                    addr.name,
                    ST_Multi(ST_CollectionExtract(addr.geom, 1)) AS geom
                FROM (
                    SELECT
                        name,
                        unnest(ST_ClusterWithin(geom, 0.005)) AS geom
                    FROM address
                    WHERE netid IS NULL
                    GROUP BY name
                ) addr;
        `, (err, res) => {
            if (!err) console.error('ok - clustered orphan addresses');
            return cb(err);
        });
    }

    /**
     * Cluster address points that have been matched to the network
     * @param {Function} cb Callback in (err, res)
     * @return {Function} Callback
     */
    address(cb) {
        this.pool.query(`
            BEGIN;

            INSERT INTO address_cluster (name, geom, netid)
                SELECT
                    JSON_Agg(a.name||('{ "freq": '::TEXT||ST_NPoints(geom)||'}')::JSONB ORDER BY ST_NPoints(geom) DESC),
                    ST_Multi(ST_CollectionExtract(ST_Collect(a.geom), 1)) AS geom,
                    a.netid
                FROM (
                    SELECT
                        jsonb_array_elements(name) AS name,
                        netid,
                        ST_Multi(ST_CollectionExtract(ST_Collect(geom), 1)) AS geom
                    FROM
                        address
                    WHERE
                        netid IS NOT NULL
                    GROUP BY
                        netid,
                        name
                ) a
                GROUP BY
                    netid;

            UPDATE network_cluster n
                SET address = a.id
                FROM address_cluster a
                WHERE n.id = a.netid;

            COMMIT;
        `, (err, res) => {
            if (!err) console.error('ok - clustered addresses');
            return cb(err);
        });
    }

    /**
     * Cluster network lines within a given segment
     * @param {Function} cb Callback in (err, res)
     * @return {Function} Callback
     */
    network(cb) {
        this.pool.query(`
            BEGIN TRANSACTION;

            INSERT INTO network_cluster(name, geom)
                SELECT
                    JSON_AGG(name),
                    geom
                FROM (
                    SELECT
                        name,
                        ST_Multi(ST_CollectionExtract(netw.geom, 2)) AS geom
                    FROM (
                        SELECT
                            json_array_elements(json_array_elements(JSON_AGG(name)))::JSONB AS name,
                            unnest(ST_ClusterWithin(geom, 0.005)) AS geom
                        FROM network
                        WHERE name->0->>'tokenized' != ''
                        GROUP BY name->0
                    ) netw
                    GROUP BY
                        geom,
                        name
                    ORDER BY name->>'priority'
                ) final
                GROUP BY geom;

            -- extracts distinct Z coordinates from a multilinestring
            CREATE OR REPLACE FUNCTION get_source_ids(geometry(MultiLineStringZ))
            RETURNS BIGINT[]
            AS
            $$
            DECLARE
                mls ALIAS FOR $1;
                ls geometry(LineStringZ);
                retVal BIGINT[];
                j BIGINT;
            BEGIN
                j := 1;
                FOR ls IN SELECT (ST_Dump(mls)).geom LOOP
                    FOR i IN 1..ST_NPoints(ls) LOOP
                        retVal[j] := ST_Z(ST_PointN(ls, i));
                        j := j + 1;
                    END LOOP;
                END LOOP;
                retVal := ARRAY(SELECT DISTINCT UNNEST(retVal) ORDER BY 1);
            RETURN retVal;
            END;
            $$
            LANGUAGE plpgsql
               STABLE
            RETURNS NULL ON NULL INPUT;

            UPDATE network_cluster
                SET source_ids = get_source_ids(geom);

            ALTER TABLE network_cluster
                ADD COLUMN geom_flat geometry(geometry, 4326);

            UPDATE network_cluster
                SET geom_flat = ST_SetSRID(ST_Force2D(geom), 4326);

            ALTER TABLE network_cluster
                DROP COLUMN geom;

            ALTER TABLE network_cluster
                RENAME geom_flat TO geom;

            COMMIT;
        `, (err, res) => {
            return cb(err);
        });
    }

    /**
    * Optimize cluster databases with Geometric indexes
    * @param {Function} cb Callback in (err, res)
    * @return {Function} cb
    */
    optimize(cb) {
        this.pool.query(`
            BEGIN;
            CREATE INDEX IF NOT EXISTS network_cluster_gix ON network_cluster USING GIST (geom);
            CREATE INDEX IF NOT EXISTS address_cluster_gix ON address_cluster USING GIST (geom);

            CLUSTER address_cluster USING address_cluster_gix;
            CLUSTER network_cluster USING network_cluster_gix;

            ANALYZE network_cluster;
            ANALYZE address;
            COMMIT;
        `, (err, res) => {
            return cb(err);
        });
    }
}

module.exports = Cluster;
