
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
            CREATE TABLE intersections AS
                SELECT
                    a.name AS a_street,
                    b.name AS b_street,
                    ST_Intersection(a.geom, b.geom)
                FROM
                    network_cluster AS a,
                    network_cluster AS b
                WHERE
                    a.id != b.id
                    AND ST_Touches(a.geom, b.geom)
                LIMIT 100;
        `, (err, res) => {
            if (!err) console.error('ok - generated intersections');
            return cb(err);
        });
    }
}

module.exports = Intersections;
