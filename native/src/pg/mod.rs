use std::iter::Iterator;
use postgres::{Connection};
use std::io::Read;
use std::mem;
use serde_json::Value;

pub trait Table {
    fn create(&self, conn: &Connection);
    fn count(&self, conn: &Connection) -> i64;
    fn input(&self, conn: &Connection, data: impl Read);
    fn seq_id(&self, conn: &Connection);
    fn index(&self, conn: &Connection);
}

///
/// Polygon table are special in that they don't make assumptions about the underlying
/// data. They can be any one of a number of types - building polys, parcels, places
///
pub struct Polygon {
    name: String
}

impl Polygon {
    pub fn new(name: String) -> Self {
        Polygon {
            name: name
        }
    }
}

impl Table for Polygon {
    fn create(&self, conn: &Connection) {
        conn.execute(r#"
             CREATE EXTENSION IF NOT EXISTS POSTGIS
        "#, &[]).unwrap();

        conn.execute(format!(r#"
            DROP TABLE IF EXISTS {};
        "#, &self.name).as_str(), &[]).unwrap();

        conn.execute(format!(r#"
            CREATE UNLOGGED TABLE {} (
                id BIGINT,
                props JSONB,
                geom GEOMETRY(MultiPolygon, 4326)
            )
        "#, &self.name).as_str(), &[]).unwrap();
    }

    fn count(&self, conn: &Connection) -> i64 {
        match conn.query(format!(r#"
            SELECT count(*) FROM {}
        "#, &self.name).as_str(), &[]) {
            Ok(res) => {
                let cnt: i64 = res.get(0).get(0);
                cnt
            },
            _ => 0
        }
    }

    fn input(&self, conn: &Connection, mut data: impl Read) {
        let stmt = conn.prepare(format!(r#"
            COPY {} (
                props,
                geom
            )
            FROM STDIN
            WITH
                NULL AS ''
        "#, &self.name).as_str()).unwrap();

        stmt.copy_in(&[], &mut data).unwrap();
    }

    fn seq_id(&self, conn: &Connection) {
        conn.execute(format!(r#"
            DROP SEQUENCE IF EXISTS {}_seq;
        "#, &self.name).as_str(), &[]).unwrap();

        conn.execute(format!(r#"
            CREATE SEQUENCE {}_seq;
        "#, &self.name).as_str(), &[]).unwrap();

        conn.execute(format!(r#"
            UPDATE {name}
                SET id = nextval('{name}_seq');
        "#, name = &self.name).as_str(), &[]).unwrap();
    }

    fn index(&self, conn: &Connection) {
        conn.execute(format!(r#"
            CREATE INDEX {name}_idx ON {name} (id);
        "#, name = &self.name).as_str(), &[]).unwrap();

        conn.execute(format!(r#"
            CREATE INDEX {name}_gix ON {name} USING GIST (geom);
        "#, name = &self.name).as_str(), &[]).unwrap();
    }
}

pub struct Address ();

impl Address {
    pub fn new() -> Self {
        Address()
    }
}

impl Table for Address {
    fn create(&self, conn: &Connection) {
        conn.execute(r#"
             CREATE EXTENSION IF NOT EXISTS POSTGIS
        "#, &[]).unwrap();

        conn.execute(r#"
            DROP TABLE IF EXISTS address;
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE UNLOGGED TABLE address (
                id BIGINT,
                version BIGINT,
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

    fn count(&self, conn: &Connection) -> i64 {
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

    fn input(&self, conn: &Connection, mut data: impl Read) {
        let stmt = conn.prepare(format!(r#"
            COPY address (
                id,
                version,
                names,
                number,
                source,
                output,
                props,
                geom
            )
            FROM STDIN
            WITH (
                FORMAT CSV,
                NULL '',
                DELIMITER E'\t',
                QUOTE E'\b'
            )
        "#).as_str()).unwrap();

        stmt.copy_in(&[], &mut data).unwrap();
    }

    fn seq_id(&self, conn: &Connection) {
        conn.execute(r#"
            DROP SEQUENCE IF EXISTS address_seq;
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE SEQUENCE address_seq;
        "#, &[]).unwrap();

        conn.execute(r#"
            UPDATE address
                SET id = nextval('address_seq');
        "#, &[]).unwrap();
    }

    fn index(&self, conn: &Connection) {
        conn.execute(r#"
            ALTER TABLE address
                ALTER COLUMN geom
                TYPE GEOMETRY(POINTZ, 4326)
                USING ST_SetSRID(ST_MakePoint(ST_X(geom), ST_Y(geom), id::FLOAT), 4326);
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE INDEX address_idx ON address (id);
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE INDEX address_gix ON address USING GIST (geom);
        "#, &[]).unwrap();

        conn.execute(r#"
            CLUSTER address USING address_idx;
        "#, &[]).unwrap();

        conn.execute(r#"
            ANALYZE address;
        "#, &[]).unwrap();
    }
}

pub struct Network ();

impl Network {
    pub fn new() -> Self {
        Network()
    }
}

impl Table for Network {
    fn create(&self, conn: &Connection) {
        conn.execute(r#"
             CREATE EXTENSION IF NOT EXISTS POSTGIS
        "#, &[]).unwrap();

        conn.execute(r#"
            DROP TABLE IF EXISTS network;
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE UNLOGGED TABLE network (
                id BIGINT,
                names JSONB,
                source TEXT,
                props JSONB,
                geom GEOMETRY(MultiLineString, 4326)
            )
        "#, &[]).unwrap();
    }

    fn count(&self, conn: &Connection) -> i64 {
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

    fn input(&self, conn: &Connection, mut data: impl Read) {
        let stmt = conn.prepare(format!(r#"
            COPY network (
                names,
                source,
                props,
                geom
            )
            FROM STDIN
            WITH (
                FORMAT CSV,
                NULL '',
                DELIMITER E'\t',
                QUOTE E'\b'
            )
        "#).as_str()).unwrap();

        stmt.copy_in(&[], &mut data).unwrap();
    }

    fn seq_id(&self, conn: &Connection) {
        conn.execute(r#"
            DROP SEQUENCE IF EXISTS network_seq;
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE SEQUENCE network_seq;
        "#, &[]).unwrap();

        conn.execute(r#"
            UPDATE network
                SET id = nextval('network_seq');
        "#, &[]).unwrap();
    }

    fn index(&self, conn: &Connection) {
        conn.execute(r#"
            ALTER TABLE network
                ALTER COLUMN geom
                TYPE GEOMETRY(MULTILINESTRINGZ, 4326)
                USING ST_GEomFromEWKT(Regexp_Replace(ST_AsEWKT(geom)::TEXT, '(?<=\d)(?=[,)])', ' '||id, 'g'))
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE INDEX network_idx ON network (id);
        "#, &[]).unwrap();

        conn.execute(r#"
            CREATE INDEX network_gix ON network USING GIST (geom);
        "#, &[]).unwrap();

        conn.execute(r#"
            CLUSTER network USING network_idx;
        "#, &[]).unwrap();

        conn.execute(r#"
            ANALYZE network;
        "#, &[]).unwrap();
    }
}

///
/// Relatively limited cursor wrapper that will allow a cursor to be
/// created that returns a single Serde_Json::Value field
///
pub struct Cursor {
    pub fetch: i64,
    pub query: String,
    trans: postgres::transaction::Transaction<'static>,
    #[allow(dead_code)]
    conn: Box<postgres::Connection>,
    cache: Vec<Value>
}

impl Cursor {
    pub fn new(conn: Connection, query: String) -> Self {
        let fetch = 1000;

        let pg_conn = Box::new(conn);

        let trans: postgres::transaction::Transaction = unsafe {
            mem::transmute(pg_conn.transaction().unwrap())
        };

        trans.execute(format!(r#"
            DECLARE next_cursor CURSOR FOR {}
        "#, &query).as_str(), &[]).unwrap();

        Cursor {
            fetch: fetch,
            conn: pg_conn,
            trans: trans,
            query: query,
            cache: Vec::with_capacity(fetch as usize)
        }
    }
}

impl Iterator for Cursor {
    type Item = Value;

    fn next(&mut self) -> Option<Self::Item> {
        if !self.cache.is_empty() {
            return self.cache.pop()
        }

        let rows = self.trans.query(format!(r#"
            FETCH {} FROM next_cursor
        "#, &self.fetch).as_str(), &[]).unwrap();

        // Cursor is finished
        if rows.is_empty() {
            return None;
        } else {
            self.cache = rows.iter().map(|row| {
                let json: Value = row.get(0);
                json
            }).collect();

            return self.cache.pop();
        }
    }
}

