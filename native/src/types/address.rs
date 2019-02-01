use postgis::ewkb::AsEwkbPoint;
use postgis::ewkb::EwkbWrite;

/// A representation of a single Address
pub struct Address {
    /// An optional identifier for the address
    pub id: Option<i64>,

    /// The address number, can be numeric or semi-numeric (100 vs 100a)
    pub number: String,

    /// Vector of all street name synonyms
    pub names: Vec<super::Name>,

    /// String source/provider/timestamp for the given data
    pub source: String,

    /// Should the feature be output
    pub output: bool,

    /// Should the address feature be used to generate interpolation
    pub interpolate: bool,

    /// JSON representation of properties
    pub props: serde_json::Map<String, serde_json::Value>,

    /// Simple representation of Lng/Lat geometry
    pub geom: (f64, f64)
}

impl Address {
    pub fn new(feat: geojson::GeoJson) -> Result<Self, String> {
        let feat = match feat {
            geojson::GeoJson::Feature(feat) => feat,
            _ => { return Err(String::from("Not a GeoJSON Feature")); }
        };

        let mut props = match feat.properties {
            Some(props) => props,
            None => { return Err(String::from("Feature has no properties")); }   
        };

        let number = match props.remove(&String::from("number")) {
            Some(number) => {
                if number.is_string() {
                    String::from(number.as_str().unwrap())
                } else if number.is_i64() {
                    number.as_i64().unwrap().to_string()
                } else { return Err(String::from("Number property must be String or Numeric")); }
            },
            None => { return Err(String::from("Number property required")); }
        };

        let source = match props.remove(&String::from("source")) {
            Some(source) => {
                if source.is_string() {
                    String::from(source.as_str().unwrap())
                } else {
                    String::from("")
                }
            },
            None => String::from("")
        };

        let interpolate = match props.remove(&String::from("interpolate")) {
            Some(itp) => match itp.as_bool() {
                None => true,
                Some(itp) => itp
            },
            None => true
        };

        let output = match props.remove(&String::from("output")) {
            Some(itp) => match itp.as_bool() {
                None => true,
                Some(itp) => itp
            },
            None => true
        };

        let geom = match feat.geometry {
            Some(geom) => match geom.value {
                geojson::Value::Point(pt) => {
                    if pt.len() != 2 {
                        return Err(String::from("Geometry must have 2 coordinates"));
                    }

                    (pt[0], pt[1])
                },
                _ => { return Err(String::from("Addresses must have point geometry")); }
            },
            None => { return Err(String::from("Addresses must have geometry")); }
        };

        let names: Vec<super::super::Name> = match props.remove(&String::from("street")) {
            Some(street) => match serde_json::from_value(street) {
                Ok(street) => street,
                Err(err) => { return Err(String::from("Invalid Street Property")); }
            },
            None => { return Err(String::from("Street Property required")); }
        };

        Ok(Address {
            id: match feat.id {
                Some(geojson::feature::Id::Number(id)) => id.as_i64(),
                _ => None
            },
            number: number,
            names: names,
            output: output,
            source: source,
            interpolate: interpolate,
            props: props,
            geom: geom
        })
    }

    ///Return a PG Copyable String of the feature
    ///
    ///name, number, source, props, geom
    pub fn to_tsv(self) -> String {
        let geom = postgis::ewkb::Point::new(self.geom.0, self.geom.1, Some(4326)).as_ewkb().to_hex_ewkb();

        format!("{names}\t{number}\t{source}\t{props}\t{geom}\n",
            names = serde_json::to_string(&self.names).unwrap_or(String::from("")),
            number = self.number,
            source = self.source,
            props = serde_json::value::Value::from(self.props),
            geom = geom
        )
    }
}
