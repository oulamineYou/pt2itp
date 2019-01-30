#[macro_use] extern crate neon;
#[macro_use] extern crate serde_derive;
#[macro_use] extern crate serde_json;
extern crate neon_serde;
extern crate geojson;
extern crate postgres;

// Internal Helper Libraries
pub mod geostream;
pub mod addrstream;
pub mod pg;

// External PT2ITP Modes
pub mod convert;
pub mod stats;
pub mod dedupe;

/// A representation of a single Address
pub struct Address {
    /// An optional identifier for the address
    id: Option<i64>,

    /// The address number, can be numeric or semi-numeric (100 vs 100a)
    number: String,

    /// Vector of all street name synonyms
    street: Vec<Name>,

    /// Should the feature be output
    output: bool,

    /// Should the address feature be used to generate interpolation
    interpolate: bool,

    /// JSON representation of properties
    props: serde_json::Map<String, serde_json::Value>,

    /// Simple representation of Lng/Lat geometry
    point: (f64, f64)
}

impl Address {
    /// Create a new Address feature given the id of the
    /// address in the 'address' table
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
    pub fn to_db(&self, conn: &postgres::Connection) {
        match conn.query(r#"
            //TODO
        "#, &[]) {
            Ok(res) => (),
            Err(err) => ()
        };
    }
}

/// Representation of a street name with associated 

#[derive(Serialize, Deserialize, Debug)]
pub struct Name {
    /// Street Name
    display: String,

    /// When choosing which street name is primary, order by priority
    priority: i8
}

impl Name {
    /// Returns a representation of a street name
    ///
    /// # Arguments
    ///
    /// * `display` - A string containing the street name (Main St)
    ///
    /// # Example
    ///
    /// ```
    /// let name = Name::new("Main St NW");
    /// ```
    pub fn new(display: String) -> Self {
        Name {
            display: display,
            priority: 0
        }
    }
}

// Functions registered here will be made avaliable to be called from NodeJS
register_module!(mut m, {
    m.export_function("convert", convert::convert)?;
    m.export_function("stats", stats::stats)?;
    m.export_function("dedupe", dedupe::dedupe)?;
    Ok(())
});
