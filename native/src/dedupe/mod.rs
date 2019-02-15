use std::convert::From;
use postgres::{Connection, TlsMode};
use std::collections::HashMap;

use neon::prelude::*;

use crate::stream::{GeoStream, AddrStream, PolyStream};

use super::pg;
use super::pg::Table;

#[derive(Serialize, Deserialize, Debug)]
struct DedupeArgs {
    db: String,
    context: Option<super::types::InputContext>,
    buildings: Option<String>,
    input: Option<String>,
    output: Option<String>,
    tokens: Option<String>,
    hecate: Option<bool>
}

impl DedupeArgs {
    pub fn new() -> Self {
        DedupeArgs {
            db: String::from("dedupe"),
            context: None,
            buildings: None,
            input: None,
            output: None,
            tokens: None,
            hecate: None
        }
    }
}

pub fn dedupe(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let args: DedupeArgs = match cx.argument_opt(0) {
        None => DedupeArgs::new(),
        Some(arg) => {
            if arg.is_a::<JsUndefined>() || arg.is_a::<JsNull>() {
                DedupeArgs::new()
            } else {
                let arg_val = cx.argument::<JsValue>(0)?;
                neon_serde::from_value(&mut cx, arg_val)?
            }
        }
    };

    let hecate = match args.hecate {
        Some(hecate) => hecate,
        None => false
    };

    let conn = Connection::connect(format!("postgres://postgres@localhost:5432/{}", &args.db).as_str(), TlsMode::None).unwrap();

    let context = match args.context {
        Some(context) => crate::Context::from(context),
        None => crate::Context::new(String::from(""), None, crate::Tokens::new(HashMap::new()))
    };

    let address = pg::Address::new();
    address.create(&conn);
    address.input(&conn, AddrStream::new(GeoStream::new(args.input), context, None));

    if !hecate {
        // Hecate Addresses will already have ids present
        // If not hecate, create sequential ids for processing

        address.seq_id(&conn);
    }

    address.index(&conn);

    match args.buildings {
        Some(buildings) => {
            let polygon = pg::Polygon::new(String::from("buildings"));
            polygon.create(&conn);
            polygon.input(&conn, PolyStream::new(GeoStream::new(Some(buildings)), None));
            polygon.index(&conn);
        },
        None => ()
    };

    format!(r#"
        SELECT ARRAY_AGG(address.id) FROM address GROUP BY geom HAVING count(*) > 1;
    "#);

    Ok(cx.boolean(true))
}
