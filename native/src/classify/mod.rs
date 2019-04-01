use std::convert::From;
use postgres::{Connection, TlsMode};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufWriter, Write};

use neon::prelude::*;

use crate::{
    Tokens,
    stream::{GeoStream, AddrStream, PolyStream}
};

use super::pg;
use super::pg::{Table, InputTable};

#[derive(Serialize, Deserialize, Debug)]
struct ClassifyArgs {
    db: String,
    hecate: Option<bool>,
    buildings: Option<String>,
    parcels: Option<String>,
    input: Option<String>,
    output: Option<String>
}

impl ClassifyArgs {
    pub fn new() -> Self {
        ClassifyArgs {
            db: String::from("dedupe"),
            hecate: None,
            buildings: None,
            parcels: None,
            input: None,
            output: None
        }
    }
}

pub fn classify(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let args: ClassifyArgs = match cx.argument_opt(0) {
        None => ClassifyArgs::new(),
        Some(arg) => {
            if arg.is_a::<JsUndefined>() || arg.is_a::<JsNull>() {
                ClassifyArgs::new()
            } else {
                let arg_val = cx.argument::<JsValue>(0)?;
                neon_serde::from_value(&mut cx, arg_val)?
            }
        }
    };

    let is_hecate = match args.hecate {
        Some(is_hecate) => is_hecate,
        None => false
    };

    let conn = Connection::connect(format!("postgres://postgres@localhost:5432/{}", &args.db).as_str(), TlsMode::None).unwrap();

    let address = pg::Address::new();
    address.create(&conn);
    address.input(
        &conn,
        AddrStream::new(
            GeoStream::new(args.input),
            crate::Context::new(String::from("xx"), None, Tokens::new(HashMap::new())),
            None
        )
    );

    if !is_hecate {
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

    match args.parcels {
        Some(parcels) => {
            let polygon = pg::Polygon::new(String::from("parcels"));
            polygon.create(&conn);
            polygon.input(&conn, PolyStream::new(GeoStream::new(Some(parcels)), None));
            polygon.index(&conn);
        },
        None => ()
    };

    Ok(cx.boolean(true))
}
