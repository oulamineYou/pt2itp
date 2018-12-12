
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

    /**
     * Generate Intersection Text Permutations
     * IE Main St and 1st St
     *    1st St and Main St
     *
     * @return {Promise} Callback
     */
    function permutate() {
        return new Promise((resolve, reject) => {

        }
    }
}

module.exports = Intersections;
