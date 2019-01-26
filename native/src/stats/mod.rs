use neon::prelude::*;
use super::geostream::GeoStream;

#[derive(Serialize, Deserialize, Debug)]
struct StatsArgs {
    input: Option<String>
}

impl StatsArgs {
    pub fn new() -> Self {
        StatsArgs {
            input: None
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Stats {
    feats: i64, // Total number of features
    clusters: i64, // Total number of addr/network clusters
    addresses: i64, // Total number of address points in clusters/orphans
    intersections: i64, // Total number of address features
    address_orphans: i64, // Total number of address orphans
    network_orphans: i64 // Total number of network orphans
}

impl Stats {
    fn new() -> Self {
        Stats {
            feats: 0,
            clusters: 0,
            addresses: 0,
            intersections: 0,
            address_orphans: 0,
            network_orphans: 0
        }
    }
}

pub fn stats(mut cx: FunctionContext) -> JsResult<JsValue> {
    let args: StatsArgs = match cx.argument_opt(0) {
        None => StatsArgs::new(),
        Some(arg) => {
            if arg.is_a::<JsUndefined>() || arg.is_a::<JsNull>() {
                StatsArgs::new()
            } else {
                let arg_val = cx.argument::<JsValue>(0)?;
                neon_serde::from_value(&mut cx, arg_val)?
            }
        }
    };

    let stream = GeoStream::new(args.input);

    let mut stats = Stats::new();

    for geo in stream {
        match geo {
            geojson::GeoJson::Feature(feat) => {
                stats.feats = stats.feats + 1;

                if feat.geometry.is_none() { continue; }

                match feat.geometry.as_ref().unwrap() {
                    geojson::Value::Point(_) => {

                    },
                    geojson::Value::MultiPoint(_)  => {

                    },
                    geojson::GeometryCollection(_) => {

                    }
                }
            },
            _ => panic!("Only Line Delimited GeoJSON Features are supported")
        };
    }

    Ok(neon_serde::to_value(&mut cx, &stats)?)
}
