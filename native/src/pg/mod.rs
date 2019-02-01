use postgres::{Connection};
use std::io::Read;

pub fn addrstream(conn: &Connection, mut data: impl Read) {
    let stmt = conn.prepare(format!("COPY address (names, number, source, props, geom) FROM STDIN").as_str()).unwrap();

    stmt.copy_in(&[], &mut data).unwrap();
}

pub struct Table ();

impl Table {
    pub fn network(conn: &Connection) {
        conn.execute(r#"
             CREATE EXTENSION IF NOT EXISTS POSTGIS
        "#, &[]).unwrap();

        conn.execute(r#"
            DROP TABLE IF EXISTS network;
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE UNLOGGED TABLE network (
                id SERIAL,
                names JSONB,
                source TEXT,
                geom GEOMETRY(POINT, 4326),
                props JSONB
            )
        "#, &[]).unwrap();
    }

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
                names JSONB,
                number TEXT,
                source TEXT,
                geom GEOMETRY(POINT, 4326),
                props JSONB
            )
        "#, &[]).unwrap();
    }
}
