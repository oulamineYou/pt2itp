use std::convert::From;
use postgres::{Connection, TlsMode};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufWriter, Write};
use geojson::GeoJson;

use neon::prelude::*;

use crate::{
    Address,
    hecate,
    util::linker,
    stream::{GeoStream, AddrStream}
};

use super::pg;
use super::pg::{Table, InputTable};

#[derive(Serialize, Deserialize, Debug)]
struct ConflateArgs {
    db: String,
    context: Option<super::types::InputContext>,
    in_address: Option<String>,
    in_persistent: Option<String>,
    error_address: Option<String>,
    error_persistent: Option<String>,
    output: Option<String>
}

impl ConflateArgs {
    pub fn new() -> Self {
        ConflateArgs {
            db: String::from("dedupe"),
            context: None,
            in_address: None,
            in_persistent: None,
            error_address: None,
            error_persistent: None,
            output: None
        }
    }
}

pub fn conflate(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let args: ConflateArgs = match cx.argument_opt(0) {
        None => ConflateArgs::new(),
        Some(arg) => {
            if arg.is_a::<JsUndefined>() || arg.is_a::<JsNull>() {
                ConflateArgs::new()
            } else {
                let arg_val = cx.argument::<JsValue>(0)?;
                neon_serde::from_value(&mut cx, arg_val)?
            }
        }
    };

    if args.in_persistent.is_none() {
        panic!("in_persistent argument is required");
    } else if args.in_address.is_none() {
        panic!("in_address argument is required");
    }

    let mut output = match args.output {
        None => panic!("Output file required"),
        Some(output) => match File::create(output) {
            Ok(outfile) => BufWriter::new(outfile),
            Err(err) => panic!("Unable to write to output file: {}", err)
        }
    };

    let conn = Connection::connect(format!("postgres://postgres@localhost:5432/{}", &args.db).as_str(), TlsMode::None).unwrap();

    conn.execute("
         CREATE TABLE modified (
            id: BIGINT,
            version: BIGINT,
            props: JSONB,
            geom: GEOMETRY(Point, 4326)
        );
    ", &[]).unwrap();

    let context = match args.context {
        Some(context) => crate::Context::from(context),
        None => crate::Context::new(String::from(""), None, crate::Tokens::new(HashMap::new()))
    };

    let pgaddress = pg::Address::new();
    pgaddress.create(&conn);
    pgaddress.input(&conn, AddrStream::new(GeoStream::new(args.in_persistent), context.clone(), args.error_persistent));
    pgaddress.index(&conn);

    for addr in AddrStream::new(GeoStream::new(args.in_address), context.clone(), args.error_address) {
        let rows = conn.query("
            SELECT
                ST_Distance(ST_SetSRID(ST_Point($2, $3), 4326), p.geom),
                json_build_object(
                    'id', p.id,
                    'number', p.number,
                    'version', p.version,
                    'names', p.names,
                    'output', p.output,
                    'source', p.source,
                    'props', p.props,
                    'geom', ST_AsGeoJSON(p.geom)::TEXT
                )
            FROM
                address p
            WHERE
                p.number = $1
                AND ST_DWithin(ST_SetSRID(ST_Point($2, $3), 4326), p.geom, 0.01);
        ", &[ &addr.number, &addr.geom[0], &addr.geom[1] ]).unwrap();

        let mut persistents: Vec<Address> = Vec::with_capacity(rows.len());

        for row in rows.iter() {
            let dist: f64 = row.get(0);
            if dist > 0.5 {
                continue
            }

            let paddr: serde_json::Value = row.get(1);
            let paddr = Address::from_value(paddr).unwrap();
            persistents.push(paddr);
        }

        match compare(&addr, &mut persistents) {
            Some(link) => {
                let link: Vec<&Address> = persistents.iter().filter(|persistent| {
                    if link == persistent.id.unwrap() {
                        true
                    } else {
                        false
                    }
                }).collect();

                if link.len() != 1 {
                    panic!("Duplicate IDs are not allowed in input data");
                }

                let link = link[0];

                conn.execute("
                    INSERT INTO modified (id, version, props, geom) VALUES (
                        $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)
                    );
                ", &[
                    &link.id,
                    &link.version,
                    &serde_json::Value::from(link.props.clone()),
                    &link.geom[0],
                    &link.geom[1]
                ]).unwrap();
            },
            None => {
                output.write(GeoJson::Feature(addr.to_geojson(hecate::Action::Create)).to_string().as_bytes()).unwrap();
            }
        };
    }

    let modifieds = pg::Cursor::new(conn, format!("
        SELECT
            json_build_object(
                'id', id,
                'type', 'Feature',
                'action', 'modify',
                'version', version,
                'props', JSONB_AGG(props),
                'geom', ST_AsGeoJSON(geom)
            )
        FROM
            modified
        GROUP BY
            id,
            version,
            geom
    ")).unwrap();

    for mut modified in modifieds {
        let modified_obj = modified.as_object_mut().unwrap();
        let mut props = modified_obj.remove(&String::from("props")).unwrap();

        if props.as_array().unwrap().len() == 1 {
            let props = props.as_array_mut().unwrap().pop().unwrap();

            modified_obj.insert(String::from("props"), props);
        } else {

        }

        let modified = Address::from_value(modified).unwrap();

        output.write(GeoJson::Feature(modified.to_geojson(hecate::Action::Modify)).to_string().as_bytes()).unwrap();
    }

    Ok(cx.boolean(true))
}

///
/// Compare a given address against a list of proximal addresses
///
/// The function will return None if the address does not exist in the
/// proximal set and should be considered a new address
///
/// The function will return Some(i64) if the address matches an existing address
///
pub fn compare(potential: &Address, persistents: &mut Vec<Address>) -> Option<i64> {
    // The address does not exist in the database and should be created
    if persistents.len() == 0 {
        return None;
    }

    let potential_link = linker::Link::new(0, &potential.names);

    let persistent_links: Vec<linker::Link> = persistents.iter().map(|persistent| {
        linker::Link::new(persistent.id.unwrap(), &persistent.names)
    }).collect();

    match linker::linker(potential_link, persistent_links) {
        Some(link) => Some(link.id),
        None => None
    }
}
