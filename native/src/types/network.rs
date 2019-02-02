use postgis::ewkb::EwkbWrite;

/// A representation of a single network
#[derive(Debug)]
pub struct Network {
    /// An optional identifier for the network
    pub id: Option<i64>,

    /// Vector of all street name synonyms
    pub names: Vec<super::Name>,

    /// String source/provider/timestamp for the given data
    pub source: String,

    /// JSON representation of properties
    pub props: serde_json::Map<String, serde_json::Value>,

    /// Simple representation of MultiLineString
    pub geom: Vec<Vec<(f64, f64)>>
}

impl Network {
    pub fn new(feat: geojson::GeoJson, context: &Option<super::super::types::Context>) -> Result<Self, String> {
        let feat = match feat {
            geojson::GeoJson::Feature(feat) => feat,
            _ => { return Err(String::from("Not a GeoJSON Feature")); }
        };

        let mut props = match feat.properties {
            Some(props) => props,
            None => { return Err(String::from("Feature has no properties")); }
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

        let geom = match feat.geometry {
            Some(geom) => match geom.value {
                geojson::Value::LineString(ln) => {
                    let mut ln_tup = Vec::with_capacity(ln.len());
                    for pt in ln {
                        ln_tup.push((pt[0], pt[1]));
                    }

                    vec![ln_tup]
                },
                geojson::Value::MultiLineString(mln) => {
                    let mut mln_tup = Vec::with_capacity(mln.len());

                    for ln in mln {
                        let mut ln_tup = Vec::with_capacity(ln.len());
                        for pt in ln {
                            ln_tup.push((pt[0], pt[1]));
                        }

                        mln_tup.push(ln_tup);
                    }

                    mln_tup
                },
                _ => { return Err(String::from("Network must have (Multi)LineString geometry")); }
            },
            None => { return Err(String::from("Network must have geometry")); }
        };

        let names: Vec<super::super::Name> = match props.remove(&String::from("street")) {
            Some(street) => match serde_json::from_value(street) {
                Ok(street) => street,
                Err(err) => { return Err(String::from("Invalid Street Property")); }
            },
            None => { return Err(String::from("Street Property required")); }
        };

        Ok(Network {
            id: match feat.id {
                Some(geojson::feature::Id::Number(id)) => id.as_i64(),
                _ => None
            },
            names: names,
            source: source,
            props: props,
            geom: geom
        })


    }

    ///Return a PG Copyable String of the feature
    ///
    ///names, source, props, geom
    pub fn to_tsv(self) -> String {
        let mut twkb = postgis::twkb::MultiLineString {
            lines: Vec::with_capacity(self.geom.len()),
            ids: None
        };

        for ln in self.geom {
            let mut line = postgis::twkb::LineString {
                points: Vec::with_capacity(ln.len())
            };

            for pt in ln {
                line.points.push(postgis::twkb::Point {
                    x: pt.0,
                    y: pt.1
                });
            }

            twkb.lines.push(line);
        }

        let geom = postgis::ewkb::EwkbMultiLineString {
            geom: &twkb,
            srid: Some(4326),
            point_type: postgis::ewkb::PointType::Point
        }.to_hex_ewkb();

        format!("{names}\t{source}\t{props}\t{geom}\n",
            names = serde_json::to_string(&self.names).unwrap_or(String::from("")),
            source = self.source,
            props = serde_json::value::Value::from(self.props),
            geom = geom
        )
    }
}
