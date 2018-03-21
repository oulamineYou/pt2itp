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
     * Attenpt to break a single NetworkCluster into 2 network clusters where there are dup addresses
     *
     * -- Dup within Segment -- (TYPE SegDup)
     * Output:        | Input:
     * --1--   --2--  | ------1------
     * 1 2 3   3 2 1  | 1 2 3   3 2 1
     *
     * --Dup accross segments -- (TYPE: ClusterDup)
     * Output:        | Input:
     * --1--   --2--  | --1a-- --1b--
     * 1 2 3   3 2 1  | 1 2 3   3 2 1
     *
     * Note: This uses the misc.hasDupAddresswithin test and as such assumes ordered numbers within each segment
     *
     * @param {Array} segs Array of addr/number/lnstring segmtents to attempt to split
     * @param {number} id Optional network_cluster id for debugging
     * @return {Array} New segments array
     */
    break(segs, id) {
        let newSegs = []; //Break apart cluster into two new clusters

        let orphanSegs = []; //Segs that needs to be matched based on prox. at the end with segments in newSegs

        //Clasify into SegDup or Clusterdup
        let segDup = false;
        for (let seg of segs) {
            if (!seg.number) continue;
            if (misc.hasDupAddressWithin(seg.number.map(num => { return num.num }), seg.address.geometry.coordinates)) {
                segDup = true;
                break;
            }
        }

        //Attempt to handle and split a ClusterDup
        //TODO: This currently only handles segs with a length of 2, a full implmentation to handle
        //  segs > 2 has yet to be written
        if (!segDup && segs.length === 2) {
            return segs.map(seg => {
                return {
                    number: seg.number,
                    address: seg.address.geometry.coordinates,
                    network: turf.featureCollection([seg.network])
                };
            });
        } else if (!segDup) {
            console.error('not ok - WARN: detected unhandled SegDup on network_cluster.id: ' + id);
        }

        //Attempt to handle and split a SegDup
        for (let seg of segs) {
            if (!seg.address || turf.lineDistance(seg.network) < 1) {
                orphanSegs.push(seg);
                continue;
            }

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

            //Sort from origin => end
            dist.sort((a, b) => {
                if (a.distOnLine < b.distOnLine) return -1;
                if (a.distOnLine > b.distOnLine) return 1;
                if (a.distOnLine === b.distOnLine) {
                    return a.distFromLine - b.distFromLine;
                }
            });

            let distDelta = [];
            for (let d_it = 1; d_it < dist.length; d_it++) {
                let deltaNum = dist[d_it].number - dist[d_it - 1].number;
                distDelta.push([dist[d_it].distOnLine, deltaNum > 0 ? 1 : -1]);
            }

            let ln = simple.linearRegression(distDelta)

            if (isNaN(ln.b) || isNaN(ln.m)) {
                orphanSegs.push(seg);
                continue;
            }

            let xInt = (-ln.b) / ln.m;

            //XIntercept is before or after the line
            if (isNaN(xInt) || xInt <= 0 || xInt >= turf.lineDistance(seg.network)) {
                orphanSegs.push(seg);
                continue;
            }

            let networkStart = turf.featureCollection([turf.lineSliceAlong(seg.network, 0, xInt)]);
            let networkEnd = turf.featureCollection([turf.lineSliceAlong(seg.network, xInt, turf.lineDistance(seg.network))]);

            if (turf.lineDistance(networkStart) < 0.001 || turf.lineDistance(networkEnd) < 0.001) return false;


            let tmpSeg = [{
                network: networkStart,
                address: [],
                number: []
            },{
                network: networkEnd,
                address: [],
                number: []
            }];

            for (let d_it = 0; d_it < dist.length; d_it++) {
                if (dist[d_it].distOnLine < xInt) {
                    tmpSeg[0].number.push({
                        num: dist[d_it].number,
                        output: dist[d_it].output
                    });
                    tmpSeg[0].address.push(dist[d_it].geometry.geometry.coordinates);
                } else {
                    tmpSeg[1].number.push({
                        num: dist[d_it].number,
                        output: dist[d_it].output
                    });
                    tmpSeg[1].address.push(dist[d_it].geometry.geometry.coordinates);
                }
            }

            newSegs.push(tmpSeg[0]);
            newSegs.push(tmpSeg[1]);
        }

        if (!newSegs.length) return false; //No change between new & original segs

        for (let oSeg of orphanSegs) {
            let closest = {
                dist: false,
                ele: false
            }

            for (let n_it = 0; n_it < newSegs.length; n_it++) {
                let nseg = newSegs[n_it];

                let d = turf.distance(turf.center(oSeg.network), turf.center(nseg.network));

                if (!closest.dist || closest.dist > d) {
                    closest.dist = d;
                    closest.ele = n_it;
                }
            }

            newSegs[closest.ele].network.features.push(oSeg.network);
            if (oSeg.address && oSeg.number) {
                newSegs[closest.ele].address = newSegs[closest.ele].address.concat(oSeg.address.geometry.coordinates);
                newSegs[closest.ele].number = newSegs[closest.ele].number.concat(oSeg.number);
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
