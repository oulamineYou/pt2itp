use postgres::{Connection};
use std::io::Read;

pub trait Table {
    fn create(conn: &Connection);
    fn count(conn: &Connection) -> i64;
    fn input(conn: &Connection, mut data: impl Read);
    fn index(conn: &Connection);
}

pub struct Address ();

impl Table for Address {
    fn create(conn: &Connection) {
        conn.execute(r#"
             CREATE EXTENSION IF NOT EXISTS POSTGIS
        "#, &[]).unwrap();

        conn.execute(r#"
            DROP TABLE IF EXISTS address;
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE UNLOGGED TABLE address (
                id SERIAL,
                netid BIGINT,
                names JSONB,
                number TEXT,
                source TEXT,
                output BOOLEAN,
                props JSONB,
                geom GEOMETRY(POINT, 4326)
            )
        "#, &[]).unwrap();
    }

    fn count(conn: &Connection) -> i64 {
        match conn.query(r#"
            SELECT count(*) FROM address
        "#, &[]) {
            Ok(res) => {
                let cnt: i64 = res.get(0).get(0);
                cnt
            },
            _ => 0
        }
    }

    fn input(conn: &Connection, mut data: impl Read) {
        let stmt = conn.prepare(format!(r#"
            COPY address (
                id,
                names,
                number,
                source,
                output,
                props,
                geom
            ) FROM STDIN
        "#).as_str()).unwrap();

        stmt.copy_in(&[], &mut data).unwrap();
    }

    fn index(conn: &Connection) {
        conn.execute(r#"
             CREATE INDEX ON address (id);
        "#, &[]).unwrap();
    }
}

pub struct Network ();

impl Table for Network {
    fn create(conn: &Connection) {
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
                props JSONB,
                geom GEOMETRY(MultiLineString, 4326)
            )
        "#, &[]).unwrap();
    }

    fn count(conn: &Connection) -> i64 {
        match conn.query(r#"
            SELECT count(*) FROM network
        "#, &[]) {
            Ok(res) => {
                let cnt: i64 = res.get(0).get(0);
                cnt
            },
            _ => 0
        }
    }

    fn input(conn: &Connection, mut data: impl Read) {
        let stmt = conn.prepare(format!("COPY network (names, source, props, geom) FROM STDIN").as_str()).unwrap();

        stmt.copy_in(&[], &mut data).unwrap();
    }

    fn index(conn: &Connection) {
        conn.execute(r#"
             CREATE INDEX ON network (id);
        "#, &[]).unwrap();
    }
}
