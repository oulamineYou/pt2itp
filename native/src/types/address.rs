use postgis::ewkb::AsEwkbPoint;
use postgis::ewkb::EwkbWrite;

/// A representation of a single Address
pub struct Address {
    /// An optional identifier for the address
    pub id: Option<i64>,

    /// The address number, can be numeric or semi-numeric (100 vs 100a)
    pub number: String,

    /// Vector of all street name synonyms
    pub street: Vec<super::Name>,

    /// String source/provider/timestamp for the given data
    pub source: Option<String>,

    /// Should the feature be output
    pub output: bool,

    /// Should the address feature be used to generate interpolation
    pub interpolate: bool,

    /// JSON representation of properties
    pub props: serde_json::Map<String, serde_json::Value>,

    /// Simple representation of Lng/Lat geometry
    pub point: (f64, f64)
}

impl Address {
    /// Create a new Address feature given the id of the
    /// address in the 'address' table
    ///
    /// TODO
    pub fn from_db(conn: &postgres::Connection, id: &i64) {
        match conn.query(r#"
            SELECT
                id,
                name,
                number,
                source,
                geom,
                props
            FROM
                address
            WHERE
                id = {}
        "#, &[ &id ]) {
            Ok(res) => (),
            Err(err) => ()
        };
    }

    /// Save the feature to the database, overwriting the feature
    /// if the optional id exists
    ///
    ///
    /// TODO
    pub fn to_db(&self, conn: &postgres::Connection) {
        match conn.query(r#"
            //TODO
        "#, &[]) {
            Ok(res) => (),
            Err(err) => ()
        };
    }

    ///Return a PG Copyable String of the feature
    ///
    ///name, number, source, props, geom
    pub fn to_tsv(self) -> String {
        let geom = postgis::ewkb::Point::new(self.point.0, self.point.1, Some(4326)).as_ewkb().to_hex_ewkb();

        format!("{name}\t{number}\t{source}\t{props}\t{geom}\n",
            name = serde_json::to_string(&self.street).unwrap_or(String::from("")),
            number = self.number,
            source = self.source.as_ref().unwrap_or(&String::from("")),
            props = serde_json::value::Value::from(self.props),
            geom = geom
        )
    }
    
}
