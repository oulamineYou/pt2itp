const linker = require('./linker');
const pg = require('pg');
const Queue = require('d3-queue').queue;

let pool, id;

process.on('message', (message) => {
    if (message.min && message.max) {
        console.error(message);

        const matchQ = Queue();

        for (let addr_it = message.min; addr_it < message.max; addr_it++)
            matchQ.defer(match, addr_it);

        matchQ.await((err) => {
            process.send({
                id: id,
                error: err,
                jobs: message.length
            });
        });
    } else {
        init(message);

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
    id = o.id;

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
            n.id AS id,
            n.text AS network,
            n._text AS network_text,
            n.text_tokenless AS network_text_tokenless,
            a.text AS address,
            a._text AS address_text,
            a.text_tokenless AS address_text_tokenless
        FROM
            address a,
            network_cluster AS n
        WHERE
            a.id = ${id}
            AND ST_Intersects(ST_Buffer(a.geom, 0.005), n.geom)
    `, (err, res) => {
        if (err) return cb(err);

        let network = linker({
            id: id,
            text: res.rows[0].address,
            _text: res.rows[0].address_text,
            text_tokenless: res.rows[0].address_text_tokenless
        }, res.rows.map((row) => {
            return {
                id: row.id,
                text: row.network,
                _text: row.network_text,
                text_tokenless: row.network_text_tokenless
            }
        }));

        if (!network || network.length === 0) return cb();

        if (network.length === 1) {
            pool.query(`
                UPDATE address
                    SET netid = ${network[0].id}
                    WHERE address.id = ${id};
            `, (err, res) => {
                return cb(err);
            });
        } else {
            let networkIds = network.map((n) => { return n.id.toString(); }).join(',');
            //pool.query(`
            console.error(networkIds)
            console.error(`
                UPDATE address
                    SET netid = (
                        SELECT
                            n.id
                        FROM
                            network_cluster n
                        WHERE
                            n.id IN (${networkIds})
                        ORDER BY ST_Distance(ST_ClosestPoint(n.geom, goem), geom)) DESC
                        LIMIT 1)
                    WHERE address.id = ${id};
            `);
            //`, (err, res) => {
            //    return cb(err);
            //});
        }
    });
}

module.exports.main = match;
module.exports.init = init;
module.exports.kill = kill;
