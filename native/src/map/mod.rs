use std::convert::From;
use postgres::{Connection, TlsMode};

use neon::prelude::*;

use super::stream::GeoStream;
use super::stream::AddrStream;
use super::stream::NetStream;

use super::pg;
use super::pg::Table;

#[derive(Serialize, Deserialize, Debug)]
struct MapArgs {
    db: String,
    context: Option<super::types::Context>,
    input: Option<String>
}

impl MapArgs {
    pub fn new() -> Self {
        MapArgs {
            db: String::from("map"),
            context: None,
            input: None
        }
    }
}

pub fn import_addr(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let args: MapArgs = match cx.argument_opt(0) {
        None => MapArgs::new(),
        Some(arg) => {
            if arg.is_a::<JsUndefined>() || arg.is_a::<JsNull>() {
                MapArgs::new()
            } else {
                let arg_val = cx.argument::<JsValue>(0)?;
                neon_serde::from_value(&mut cx, arg_val)?
            }
        }
    };

    let conn = Connection::connect(format!("postgres://postgres@localhost:5432/{}", &args.db).as_str(), TlsMode::None).unwrap();

    pg::Address::create(&conn);
    pg::Address::input(&conn, AddrStream::new(GeoStream::new(args.input), args.context));
    pg::Address::index(&conn);

    Ok(cx.boolean(true))
}

pub fn import_net(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let args: MapArgs = match cx.argument_opt(0) {
        None => MapArgs::new(),
        Some(arg) => {
            if arg.is_a::<JsUndefined>() || arg.is_a::<JsNull>() {
                MapArgs::new()
            } else {
                let arg_val = cx.argument::<JsValue>(0)?;
                neon_serde::from_value(&mut cx, arg_val)?
            }
        }
    };

    let conn = Connection::connect(format!("postgres://postgres@localhost:5432/{}", &args.db).as_str(), TlsMode::None).unwrap();

    pg::Network::create(&conn);
    pg::Network::input(&conn, NetStream::from(GeoStream::new(args.input)));
    pg::Network::index(&conn);

    Ok(cx.boolean(true))
}
