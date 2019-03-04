use postgres::{Connection};
use super::Table;

pub struct AddressCluster ();

impl AddressCluster {
    pub fn new() -> Self {
        AddressCluster()
    }
}

impl Table for AddressCluster {
    fn create(&self, conn: &Connection) {
        conn.execute(r#"
             CREATE EXTENSION IF NOT EXISTS POSTGIS
        "#, &[]).unwrap();

        conn.execute(r#"
            DROP TABLE IF EXISTS address_cluster;
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE UNLOGGED TABLE address_cluster (
                ID SERIAL,
                netid BIGINT,
                names JSONB,
                geom GEOMETRY(MULTIPOINTZ, 4326),
                props JSONB
            )
        "#, &[]).unwrap();
    }

    fn count(&self, conn: &Connection) -> i64 {
        match conn.query(r#"
            SELECT count(*) FROM address_cluster
        "#, &[]) {
            Ok(res) => {
                let cnt: i64 = res.get(0).get(0);
                cnt
            },
            _ => 0
        }
    }

    fn index(&self, conn: &Connection) {
        conn.execute(r#"
            CREATE INDEX address_cluster_idx ON address_cluster (id);
        "#, &[]).unwrap();
    }
}
