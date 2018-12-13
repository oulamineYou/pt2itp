
/**
 * Generate Intersections from the provided network
 *
 * @class Intersections
 */
class Intersections {
    constructor(pool, opts) {
        opts = opts || {};

        this.pool = pool;
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
}

let intersection;
process.on('message', (message) => {
    if (Array.isArray(message)) {
        const intersectionQ = new Queue();

        for (let nid of message) {
            if (!nid) continue;
            intersectionQ.defer((nid, done) => {
                .split(nid, done);
            }, nid);
        }

        intersectionQ.await((err) => {
            process.send({
                id: split.id,
                error: err ? err.message : false,
                jobs: message.length
            });
        });
    } else {
        if (message.type && (message.type === 'end')) {
            split.kill();
        } else {
            split = new Split(message);
        }

        process.send({
            type: message.type || false,
            id: split.id,
            jobs: 0
        });
    }   
});

module.exports = Intersections;
