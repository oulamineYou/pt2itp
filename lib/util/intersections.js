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
     * @param {Object} o.pool PG Pool Instance to use to communicate with the database
     * @return {boolean} Returns true after intersection is initialized
     */
    constructor(opts) {
        this.opts = opts;

        this.id = this.opts.id;

        this.pool = new pg.Pool(this.opts.pool);
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

    name(opts) {
        return new Promise(async(resolve, reject) => {
            try {
                const res = await this.pool.query(`
                    SELECT
                        a_street,
                        b_street,
                        ST_AsGeoJSON(geom) AS geom
                    FROM
                        intersections
                    WHERE
                        id >= ${opts.min} AND id <= ${opts.max}
                `);

                const feats = [];

                for (let intsec of res.rows) {
                    let names = [];

                    for (let a_street of intsec.a_street) {
                        for (let b_street of intsec.b_street) {
                            names.push(`${a_street.display} and ${b_street.display}`)
                            names.push(`${b_street.display} and ${a_street.display}`)
                        }
                    }

                    feats.push({
                        type: 'Feature',
                        properties: {
                            'carmen:text': names.join(','),
                            'carmen:geocoder_stack': opts.country ? opts.country : undefined
                        },
                        geometry: JSON.parse(intsec.geom)
                    });
                }

                return resolve(feats);
            } catch (err) {
                return reject(err);
            }
        });
    }
}

module.exports = Intersections;
