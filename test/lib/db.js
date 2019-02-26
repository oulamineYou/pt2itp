const pg = require('pg');

function init(test) {
    test('Database Reset', (t) => {
        let pool = new pg.Pool({
            max: 10, 
            user: 'postgres',
            database: 'postgres',
            idleTimeoutMillis: 30000
        });

        t.test('Drop Database', (q) => {
            pool.query(`
                DROP DATABASE IF EXISTS pt_test;
            `, (err) => {
                q.error(err, 'database dropped');
                q.end();
            });
        });

        t.test('Create Database', (q) => {
            pool.query(`
                CREATE DATABASE pt_test;
            `, (err) => {
                q.error(err, 'database created');
                q.end();
            });
        });

        t.test('Close Pool', (q) => {
            pool.end();
            q.end();
        });
    });
}

function get() {
    return new pg.Pool({
        max: 10, 
        user: 'postgres',
        database: 'pt_test',
        idleTimeoutMillis: 30000
    });
};

module.exports = {
    init: init,
    get: get
};
