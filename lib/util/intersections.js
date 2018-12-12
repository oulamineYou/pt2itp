
/**
 * Generate Intersections from the provided network
 *
 * @class Intersections
 */
class Intersections {
    constructor(opts) {
        opts = opts || {};
    }

    /**
     * Generate Intersections, removing duplicates where possible
     * @param {Function} cb Callback in (err, res)
     * @return {Function} Callback
     */
    generate(cb) {
        this.pool.query(`
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
        `, (err, res) => {
            if (!err) console.error('ok - generated intersections');
            return cb(err);
        });
    }
}

module.exports = Intersections;
