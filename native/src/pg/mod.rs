use postgres;

pub struct PGStream {
    input: String
}

impl PGtream {
    pub fn new() -> Self {
        GeoStream {
            input: String::from("")
        }
    }
}

pub struct Table ();

impl Table {
    fn address(conn: &postgres::Connection) {
        match conn.execute(r#"
            CREATE EXTENSION POSTGIS;
        )"#, &[]).unwrap();

        match conn.execute(r#"
            DROP TABLE IF EXISTS address;
        )"#, &[]).unwrap();

        match conn.execute(r#"
            CREATE TABLE address (
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
