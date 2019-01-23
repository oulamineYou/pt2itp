#[macro_use] extern crate neon;

use neon::prelude::*;

fn convert(mut cx: FunctionContext) -> JsResult<JsString> {
    Ok(cx.string("hello world!"))
}

register_module!(mut m, {
    m.export_function("convert", convert)
});
