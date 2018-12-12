
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
     * @param {Function} cb Callback in (err, res)
     * @return {Function} Callback
     */
    generate(cb) {
        return new Promise((resolve, reject) => {
            this.pool.execute(`
                INSERT INTO intersections (a_street, b_street, geom) (
                    SELECT
                        a.name AS a_street,
                        b.name AS b_street,
                        ST_Intersection(a.geom, b.geom) as geom
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

module.exports = Intersections;
