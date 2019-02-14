use postgis::ewkb::AsEwkbPoint;
use postgis::ewkb::EwkbWrite;

/// A representation of a single Address
#[derive(Debug)]
pub struct Polygon {
    /// An optional identifier for the address
    pub id: Option<i64>,

    /// JSON representation of properties
    pub props: serde_json::Map<String, serde_json::Value>,

    /// Simple representation of Lng/Lat geometry
    pub geom: Vec<Vec<Vec<(f64, f64)>>>
}

impl Polygon {
    pub fn new(feat: geojson::GeoJson) -> Result<Self, String> {
        let feat = match feat {
            geojson::GeoJson::Feature(feat) => feat,
            _ => { return Err(String::from("Not a GeoJSON Feature")); }
        };

        let props = match feat.properties {
            Some(props) => props,
            None => { return Err(String::from("Feature has no properties")); }
        };

        let geom = match feat.geometry {
            Some(geom) => match geom.value {
                geojson::Value::Polygon(ln) => {
                    let mut ln_tup = Vec::with_capacity(ln.len());
                    for pt in ln {
                        ln_tup.push((pt[0], pt[1]));
                    }

                    vec![ln_tup]
                },
                geojson::Value::MultiPolygon(mln) => {
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
                _ => { return Err(String::from("Polygon must have (Multi)Polygon geometry")); }
            },
            None => { return Err(String::from("Polygon must have geometry")); }
        };

        Ok(Polygon {
            id: match feat.id {
                Some(geojson::feature::Id::Number(id)) => id.as_i64(),
                _ => None
            },
            props: props,
            geom: Vec::new()
        })
    }

    ///Return a PG Copyable String of the feature
    ///
    ///name, number, source, props, geom
    pub fn to_tsv(self) -> String {
        let geom = postgis::ewkb::MultiPolygon {
            polygons: vec![],
            srid: Some(4326)
        };

        format!("{id}\t{props}\t{geom}\n",
            id = match self.id {
                None => String::from(""),
                Some(id) => id.to_string()
            },
            props = serde_json::value::Value::from(self.props),
            geom = ""
        )
    }
}
