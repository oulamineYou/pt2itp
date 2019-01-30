use postgres::{Connection};
use std::io::Read;

pub fn stream(conn: &Connection, table: &String, mut data: impl Read) {
    let stmt = conn.prepare(format!("COPY {} FROM STDIN", &table).as_str()).unwrap();

    stmt.copy_in(&[], &mut data).unwrap();
}

pub struct Table ();

impl Table {
    pub fn address(conn: &Connection) {
        conn.execute(r#"
             CREATE EXTENSION IF NOT EXISTS POSTGIS
        "#, &[]).unwrap();

        conn.execute(r#"
            DROP TABLE IF EXISTS address;
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE UNLOGGED TABLE address (
                id SERIAL,
                name JSONB,
                number TEXT,
                source TEXT,
                geom GEOMETRY(POINTZ, 4326),
                props JSONB
            )
        "#, &[]).unwrap();
    }
}
