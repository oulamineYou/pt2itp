use std::convert::From;
use postgres::{Connection, TlsMode};
use std::collections::HashMap;
use std::thread;

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

    let count = address.count(&conn);
    let cpus = num_cpus::get() as i64;
    let mut web = Vec::new();

    let batch_extra = count % cpus;
    let batch = (count - batch_extra) / cpus;

    for cpu in 0..cpus {
        let db_conn = args.db.clone();

        let strand = match thread::Builder::new().name(format!("Exact Dup #{}", &cpu)).spawn(move || {
            let mut min_id = batch * cpu;
            let max_id = batch * cpu + batch + batch_extra;

            if cpu != 0 {
                min_id = min_id + batch_extra + 1;
            }

            println!("Exact Dedupe # {} ({} - {})", &cpu, &min_id, &max_id);

            let exact_dups = match pg::Cursor::new(Connection::connect(format!("postgres://postgres@localhost:5432/{}", &db_conn).as_str(), TlsMode::None).unwrap(), format!(r#"
                SELECT
                    JSON_AGG(address.id)
                FROM
                    address
                WHERE
                    id >= {min_id}
                    AND id <= {max_id}
                GROUP BY
                    geom
                HAVING
                    count(*) > 1;
            "#,
                min_id = min_id,
                max_id = max_id
            )) {
                Ok(cursor) => cursor,
                Err(err) => return println!("ERR: {}", err.to_string())
            };
        }) {
            Ok(strand) => strand,
            Err(err) => panic!("{}", err.to_string())
        };

        let conn = Connection::connect(format!("postgres://postgres@localhost:5432/{}", &db_conn).as_str(), TlsMode::None).unwrap();

        for dup_feats in exact_dups {

        }

        web.push(strand);
    }

    for strand in web {
        strand.join().unwrap();
    }

    Ok(cx.boolean(true))
}

/*
    */
