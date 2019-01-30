#[macro_use] extern crate neon;
#[macro_use] extern crate serde_derive;
extern crate neon_serde;
extern crate geojson;
extern crate postgres;

// Internal Helper Libraries
pub mod geostream;
pub mod pgstream;

// External PT2ITP Modes
pub mod convert;
pub mod stats;
pub mod dedupe;

register_module!(mut m, {
    m.export_function("convert", convert::convert)?;
    m.export_function("stats", stats::stats)?;
    m.export_function("dedupe", dedupe::dedupe)?;
    Ok(())
});
