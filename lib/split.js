const Post = require('./post');

const interpolize = require('./interpolize');
const Explode = require('./explode');
const Cluster = require('./cluster');
const diacritics = require('diacritics').remove;
const Queue = require('d3-queue').queue;
const turf = require('@turf/turf');
const pg = require('pg');

const misc = require('./misc');

let opts, pool, id, label, cluster;

const explode = new Explode();

process.on('message', (message) => {
    if (Array.isArray(message)) {
        const splitQ = Queue();

        for (let nid of message) {
            if (!nid) continue;
            splitQ.defer(split, nid);
        }

        splitQ.await((err) => {
            process.send({
                id: id,
                error: err,
                jobs: message.length
            });
        });
    } else {
        if (message.type && (message.type === 'end')) {
            kill();
        } else {
            init(message);
            id = message.id;
        }

        process.send({
            type: message.type || false,
            id: id,
            jobs: 0
        });
    }
});

/**
 * Only called by tests - child process kills this automatically
 * @return {boolean} Returns true after pool is ended.
 */
function kill() {
    pool.end();

    return true;
}

/**
 * Intilize the split child process with given arguments and then wait for data messages to process
 * @param {Object} o Argument object
 * @param {boolean} o.stdout Turn off stdout - true by default
 * @param {Array} o.post Array of non-default post operations to perform on output
 * @param {string} o.label Use non-default label formatter - ./label/titlecase is default
 * @param {Object} o.pool PG Pool Instance to use to communicate with the database
 * @return {boolean} Returns true after split is initialized
 */
function init(o) {
    opts = o;

    if (opts.stdout === undefined) opts.stdout = true; //Output to STDOUT by default - set to false for tests and (err, res) callback will be used

    opts.post = new Post(opts.post);

    pool = new pg.Pool(opts.pool);

    cluster = new Cluster(pool);

    if (!opts.label) {
        label = require('./label/titlecase')({ language: 'en', synonym: true });
    } else {
        label = require('./label/' + opts.label)({ language: opts.tokens.join(',') || 'en', synonym: true });
    }

    return true;
}

/**
 * Get a given cluster by nid and split into matched addr=>network segments and interpolize
 * @param {boolean} nid Network id in database to process
 * @param {Function} cb Callback function (err, res)
 * @return {Function} Return cb function
 */
function split(nid, cb) {
    pool.query(`
        SELECT
            network_cluster.text                AS ntext,
            network_cluster._text               AS network_text,
            address_cluster._text               AS address_text,
            ST_AsGeoJSON(network_cluster.geom)  AS network,
            ST_AsGeoJSON(address_cluster.geom)  AS address
        FROM
            network_cluster,
            address_cluster
        WHERE
            network_cluster.id = ${nid} AND
            network_cluster.address = address_cluster.id
    `, (err, res) => {
        if (err) return cb(err);

        res = res.rows[0];

        let network = JSON.parse(res.network);
        let address = JSON.parse(res.address);
        let number = [];
        let coords = [];

        let text = label(res, true);

        //Sort coords for consistent input into interpolate
        address.coordinates.sort((a, b) => {
            if (a[2] > b[2]) return 1;
            if (a[2] < b[2]) return -1;

            if (a[0] > b[0]) return 1;
            if (a[0] < b[0]) return -1;

            if (a[1] > b[1]) return 1;
            if (a[1] < b[1]) return -1;

            return 0;
        });

        //Convert 3 element coords to lat/lng + number array + drop dups
        address.coordinates.forEach((addr) => {
            if (addr[2] % 1 != 0 && opts.unitMap) {
                let unit = parseInt(String(addr[2]).split('.')[1]);
                let num = String(addr[2]).split('.')[0];

                addr[2] = `${num}${opts.unitMap[unit]}`;
            }

            let num = addr.pop();

            number.push(num);
            coords.push(addr);
        });

        network = explode.join({
            type: 'FeatureCollection',
            features: [ turf.feature(network) ]
        });

        let needsBreak = false;

        //Detect cases where there are duplicate addresses outside of the threshold
        for (let num_it = 0; num_it < number.length - 1; num_it++) {
            if (number[num_it + 1] !== number[num_it]) continue; //No duplicate numbers

            if (turf.distance(turf.point(coords[num_it]), turf.point(coords[num_it+1]), 'kilometers') > 1) {
                needsBreak = true;
                break;
            } else {
                network = explode.split(network, coords, number);
            }
        }

        let addressCluster = [];
        let numberCluster = [];

        for (let it = 0; it < coords.length; it++) {
            let pt = turf.point(coords[it]);

            let currentMatch = {
                dist: Infinity,
                ln: false
            };

            for (let ln_it = 0; ln_it < network.features.length; ln_it++) {
                let ln = network.features[ln_it].geometry;

                let dist = turf.distance(turf.pointOnLine(ln, pt), pt);

                if (dist < currentMatch.dist) {
                    currentMatch = { dist: dist, ln: ln_it, num: number[it] };
                }
            }

            if (!addressCluster[currentMatch.ln]) addressCluster[currentMatch.ln] = [];
            if (!numberCluster[currentMatch.ln]) numberCluster[currentMatch.ln] = [];
            addressCluster[currentMatch.ln].push(pt.geometry.coordinates);
            numberCluster[currentMatch.ln].push(number[it]);
        }

        let segs = [];

        for (let it = 0; it < addressCluster.length; it++) {
            segs.push({
                address: addressCluster[it] ? turf.multiPoint(addressCluster[it]) : null,
                number: numberCluster[it] ? numberCluster[it] : null,
                network: turf.feature(network.features[it].geometry)
            });
        }

        if (needsBreak) {
            segs = cluster.break(segs);
        }

        let potential = interpolize(text, segs, {
            debug: opts.debug,
            post: opts.post,
            country: opts.country
        });

        if (opts.stdout) return process.stdout.write(JSON.stringify(potential) + '\n', cb);
        else return cb(null, potential);
    });
}

module.exports = {
    split: split,
    init: init,
    kill: kill
}
