use postgres;

pub struct PGStream {
    input: String
}

impl PGStream {
    pub fn new() -> Self {
        PGStream {
            input: String::from("")
        }
    }
}

pub struct Table ();

impl Table {
    pub fn address(conn: &postgres::Connection) {
        conn.execute(r#"
            CREATE EXTENSION POSTGIS;
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
