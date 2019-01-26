#[macro_use] extern crate neon;
#[macro_use] extern crate serde_derive;
extern crate neon_serde;
extern crate geojson;

pub mod convert;
pub mod geostream;
pub mod stats;

register_module!(mut m, {
    m.export_function("convert", convert::convert)?;
    m.export_function("stats", stats::stats)?;
    Ok(())
});
