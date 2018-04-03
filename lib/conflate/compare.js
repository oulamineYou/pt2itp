const Queue = require('d3-queue').queue;
const turf = require('@turf/turf');
const pg = require('pg');
const readline = require('readline');
const fs = require('fs');

let opts, pool;
let num = 0;

process.on('message', (message) => {
    if (message.type && (message.type === 'end')) {
        kill();

        process.send({
            type: 'end',
            id: id
        });
    } else {
        init(message);
        id = message.id;

        process.send({
            type: 'init',
            id: id
        });

        split((err) => {
            process.send({
                type: 'end',
                id: id
            });
        });
    }
});

/**
 * Intilize the split child process with given arguments and then wait for data messages to process
 * @param {Object} o Argument object
 * @param {boolean} o.stdout Turn off stdout - true by default
 * @param {Object} o.pool PG Pool Instance to use to communicate with the database
 * @return {boolean} Returns true after split is initialized
 */
function init(o) {
    opts = o;

    if (!opts.output) opts.output = process.stdout;
    opts.read = fs.createReadStream(opts.read);

    pool = new pg.Pool(opts.pool);

    return true;
}

/**
 * Given an address, compare it to the persistent table to see if it exists
 * @param {number} address to compare against persistent
 * @param {Function} cb Callback function (err, res)
 * @return {Function} Return cb function
 */
function split(cb) {
    const rl = new readline.createInterface({
        input: opts.read,
        output: opts.output
    }).on('error', (err) => {
        return cb(err);
    }).on('line', (data) => {
        if (!data || !data.length) return;

        num++;
        if (num % opts.total !== opts.id) return; //Distribute tasks evenly accross workers

        //The new GeoJSONSeq schema uses record separators
        data = data.replace(RegExp(String.fromCharCode(30), 'g'), '');

        let feat;
        try {
            if (opts.map) {
                feat = opts.map(JSON.parse(data), opts.context);
            } else {
                feature = JSON.parse(data);
            }
        } catch (err) {
            if (opts.error) process.stderr.write(`Unable to parse: ${err.toString()}\t${data}\n`);
        }

        /*
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

    }).on('close', (close) => {
        return cb();
    });

}

/**
 * Only called by tests - child process kills this automatically
 * @return {boolean} Returns true after pool is ended.
 */
function kill() {
    pool.end();

    return true;
}


module.exports = {
    compare: split,
    init: init,
    kill: kill
}
