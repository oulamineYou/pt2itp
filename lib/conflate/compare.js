const Queue = require('d3-queue').queue;
const turf = require('@turf/turf');
const pg = require('pg');

let opts, pool;

process.on('message', (message) => {
    if (Array.isArray(message)) {
        const compareQ = new Queue();

        for (let address of message) {
            compareQ.defer(compare, address);
        }

        compareQ.await((err) => {
            process.send({
                id: id,
                error: err ? err.message : false,
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
 * @param {Object} o.pool PG Pool Instance to use to communicate with the database
 * @return {boolean} Returns true after split is initialized
 */
function init(o) {
    opts = o;

    if (opts.stdout === undefined) opts.stdout = true; //Output to STDOUT by default - set to false for tests and (err, res) callback will be used

    pool = new pg.Pool(opts.pool);

    return true;
}

/**
 * Given an address, compare it to the persistent table to see if it exists
 * @param {number} address to compare against persistent
 * @param {Function} cb Callback function (err, res)
 * @return {Function} Return cb function
 */
function split(address, cb) {
    /**
    pool.query(`
        SELECT
            network_cluster.name || address_cluster.name    AS name,
            ST_AsGeoJSON(network_cluster.geom)::JSON        AS network,
            ST_AsGeoJSON(address_cluster.geom)::JSON        AS address
        FROM
            network_cluster,
            address_cluster
        WHERE
            network_cluster.id = ${nid}
            AND network_cluster.address = address_cluster.id
    `, (err, res) => {
        if (err) return cb(err);

        if (opts.stdout) return process.stdout.write(output, cb);
        else return cb(null, itpFinal);
    });
    */
    });
}

module.exports = {
    compare: split,
    init: init,
    kill: kill
}
