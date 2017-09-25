const pg = require('pg');
const pool = new pg.Pool({
    max: 10, 
    user: 'postgres',
    database: 'mbpl_us_wv_address_both',
    idleTimeoutMillis: 30000
});
const Cluster = require('./lib/cluster.js');
const cluster = new Cluster(pool);
cluster.collapse((err) => { console.log(err, 'done!'); });
