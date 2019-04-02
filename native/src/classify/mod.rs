use std::convert::From;
use postgres::{Connection, TlsMode};
use std::collections::HashMap;

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

    let buildings = pg::Polygon::new(String::from("buildings"));
    buildings.create(&conn);
    match args.buildings {
        Some(buildings_in) => {
            buildings.input(&conn, PolyStream::new(GeoStream::new(Some(buildings_in)), None));
            buildings.index(&conn);
        },
        None => ()
    };

    let parcels = pg::Polygon::new(String::from("parcels"));
    parcels.create(&conn);
    match args.parcels {
        Some(parcels_in) => {
            parcels.input(&conn, PolyStream::new(GeoStream::new(Some(parcels_in)), None));
            parcels.index(&conn);
        },
        None => ()
    };

    conn.execute("
        ALTER TABLE address
            ADD COLUMN accuracy TEXT
    ", &[]).unwrap();

    conn.execute("
        UPDATE address
            SET
                accuracy = 'rooftop'
            FROM
                buildings
            WHERE
                ST_Intersects(address.geom, buildings.geom)
    ", &[]).unwrap();

    conn.execute("
        ALTER TABLE parcels
            ADD COLUMN centroid GEOMETRY(POINT, 4326)
    ", &[]).unwrap();

    conn.execute("
        UPDATE parcels
            SET point = ST_PointOnSurface(parcels.geom)
    ", &[]).unwrap();

    Ok(cx.boolean(true))
}
