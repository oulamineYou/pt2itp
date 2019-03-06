const os = require('os');
const CPUS = os.cpus().length;

/**
 * @class Index
 */
class Index {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Initialize an empty conflate database with required tables
     * @param {Function} cb Callback in (err, res)
     * @return {Function} cb
     */
    init(cb) {
        this.pool.query(`
            ABORT;
            BEGIN;

            CREATE EXTENSION IF NOT EXISTS POSTGIS;

            DROP TABLE IF EXISTS modified;
            CREATE TABLE modified (id BIGINT, version BIGINT, props JSONB, geom GEOMETRY(POINT, 4326));

            COMMIT;
        `, (err) => {
            return cb(err);
        });
    }

    /**
     * Add indexes to persistent table
     * @param {Function} cb Callback in (err, res)
     * @return {Function} cb
     */
    optimize(cb) {
        this.pool.query(`
            BEGIN;

            CREATE INDEX modified_persistent_gix ON modified USING GIST(geom);

            COMMIT;
        `, cb);
    }
}

module.exports = Index;
