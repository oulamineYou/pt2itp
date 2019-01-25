#[macro_use] extern crate neon;
#[macro_use] extern crate serde_derive;
extern crate neon_serde;
extern crate geojson;

mod convert;

register_module!(mut m, {
    m.export_function("convert", convert::convert)?;
    Ok(())
});
