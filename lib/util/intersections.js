const pg = require('pg');

/**
 * Generate Intersections from the provided network
 *
 * @class Intersections
 */
class Intersections {

    /**
     * Intilize the intersections object
     * @param {Object} o Argument object
     * @param {boolean} o.stdout Turn off stdout - true by default
     * @param {Object} o.pool PG Pool Instance to use to communicate with the database
     * @return {boolean} Returns true after split is initialized
     */
    constructor(opts) {
        this.opts = opts;

        this.id = this.opts.id;

        this.pool = new pg.Pool(this.opts.pool);

        //Output to STDOUT by default - set to false for tests and (err, res) callback will be used
        if (this.opts.stdout === undefined) this.opts.stdout = true; 
    }

    /**
     * Generate Intersections, removing duplicates where possible
     * @return {Promise}
     */
    generate() {
        return new Promise((resolve, reject) => {
            this.pool.query(`
                INSERT INTO intersections (a_street, b_street, geom) (
                    SELECT
                        a.name AS a_street,
                        b.name AS b_street,
                        ST_PointOnSurface(ST_Intersection(a.geom, b.geom)) AS geom
                    FROM
                        network_cluster AS a,
                        network_cluster AS b
                    WHERE
                        a.id != b.id
                        AND ST_Intersects(a.geom, b.geom)
                )
            `, (err) => {
                if (err) return reject(err);
                return resolve();
            });
        });
    }

    name(opts, cb) {
        this.pool.query(`
            SELECT 
                a_street,
                b_street,
                geom
            FROM
                intersections
            WHERE
                id >= ${opts.min} AND id <= ${opts.max}
        `, (err, res) => {
            if (err) return cb(err);

            for (let intsec of res.rows) {
                console.error(intsec);
            }
        });
    }
}

let intersection;
process.on('message', (message) => {
    if (Array.isArray(message)) {
        const intersectionQ = new Queue();

        for (let nid of message) {
            if (!nid) continue;
            intersectionQ.defer((nid, done) => {
                intersection.name(nid, done);
            }, nid);
        }

        intersectionQ.await((err) => {
            process.send({
                id: intersection.id,
                error: err ? err.message : false,
                jobs: message.length
            });
        });
    } else {
        if (message.type && (message.type === 'end')) {
            split.kill();
        } else {
            intersection = new Intersections(message);
        }

        process.send({
            type: message.type || false,
            id: intersection.id,
            jobs: 0
        });
    }   
});

module.exports = Intersections;
