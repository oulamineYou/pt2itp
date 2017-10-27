const linker = require('./linker');
const pg = require('pg');
const Queue = require('d3-queue').queue;

let pool;
let id;

process.on('message', (message) => {
    console.error('MESSAGE');

    if (message.min && message.max) {
        const matchQ = Queue();

        for (let addr_it = message.min; addr_it < message.max addr_it++)
            matchQ.defer(match, networkid);

        matchQ.await((err) => {
            process.send({
                id: id,
                error: err,
                jobs: message.length
            });
        });
    } else {
        init(message);
        id = message.id;

        process.send({
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
 * @param {Object} o.pool PG Pool Instance to use to communicate with the database
 * @return {boolean} Returns true after match is initialized
 */
function init(o) {
    pool = new pg.Pool(o.pool);

    return true;
}

/**
 * Perform a matching operation between network and addresses on a given network id
 * @param {boolean} id ID of network in database to match with addresses
 * @param {Function} cb Callback in (err, res)
 * @return {Function} Callback
 */
function match(id, cb) {
    pool.query(`
        SELECT
            network.text AS network,
            network.text_tokenless AS network_text_tokenless,
            addr.id,
            addr.text,
            addr._text AS _text,
            addr.text_tokenless AS text_tokenless
        FROM
            address_cluster addr,
            network_cluster AS network
        WHERE
            network.id = ${id} AND
            ST_Intersects(network.buffer, addr.geom);
    `, (err, res) => {
        if (err) return cb(err);

        if (!res.rows.length) return cb();

        let address = linker({
            id: id,
            text: res.rows[0].network,
            _text: res.rows[0].network_text,
            text_tokenless: res.rows[0].network_text_tokenless
        }, res.rows)

        if (!address || address.length === 0) return cb();

        if (address.length === 1) {
            pool.query(`
                UPDATE network_cluster
                SET address = ${address[0].id}
                WHERE network_cluster.id = ${id};
            `, (err, res) => {
                return cb(err);
            });
        } else {
            let addressIds = address.map((a) => { return a.id.toString(); }).join(',');
            pool.query(`
                UPDATE network_cluster
                SET address = (
                    SELECT
                        acd.id
                    FROM
                        (SELECT ac.id, (ST_Dump(ac.geom)).geom FROM address_cluster ac WHERE ac.id IN (${addressIds})) acd
                    WHERE
                        ST_Intersects(
                            acd.geom,
                            (SELECT buffer FROM network_cluster nc WHERE nc.id=${id})
                        )
                    GROUP BY acd.id
                    ORDER BY COUNT(acd.id) DESC
                    LIMIT 1
                )
                WHERE network_cluster.id = ${id};
            `, (err, res) => {
                return cb(err);
            });
        }
    });
}

module.exports.main = match;
module.exports.init = init;
module.exports.kill = kill;
