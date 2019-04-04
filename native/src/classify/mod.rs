use postgres::{Connection, TlsMode};
use std::{
    io::{Write, BufWriter},
    collections::HashMap,
    fs::File,
    convert::From
};

use neon::prelude::*;

use crate::{
    pg,
    pg::{Table, InputTable},
    Tokens,
    stream::{GeoStream, AddrStream, PolyStream}
};

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

    let mut output = match args.output {
        None => panic!("Output file required"),
        Some(output) => match File::create(output) {
            Ok(outfile) => BufWriter::new(outfile),
            Err(err) => panic!("Unable to write to output file: {}", err)
        }
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
            SET centroid = ST_PointOnSurface(parcels.geom)
    ", &[]).unwrap();

    conn.execute("
        UPDATE address
            SET
                accuracy = 'parcel'
            FROM
                parcels
            WHERE
                accuracy IS NULL
                AND ST_Distance(address.geom, parcels.centroid) < 0.0001
    ", &[]).unwrap();


    conn.execute("
        UPDATE address
            SET
                accuracy = 'point'
            WHERE
                accuracy IS NULL
    ", &[]).unwrap();

    let modified = match is_hecate {
        true => {
            pg::Cursor::new(conn, format!(r#"
                SELECT
                    JSON_Build_Object(
                        'id', id,
                        'type', 'Feature',
                        'properties', props,
                        'geometry', ST_AsGeoJSON(ST_Force2D(geom))::JSON
                    )
                FROM
                    address
            "#)).unwrap()
        },
        false => {
            pg::Cursor::new(conn, format!(r#"
                SELECT
                    JSON_Build_Object(
                        'id', id,
                        'type', 'Feature',
                        'properties', props,
                        'geometry', ST_AsGeoJSON(ST_Force2D(geom))::JSON
                    )
                FROM
                    address
            "#)).unwrap()
        }
    };

    for feat in modified {
        let feat = format!("{}\n", feat.to_string());
        if output.write(feat.as_bytes()).is_err() {
            panic!("Failed to write to output stream");
        }
    }

    if output.flush().is_err() {
        panic!("Failed to flush output stream");
    }

    Ok(cx.boolean(true))
}
