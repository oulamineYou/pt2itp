#[macro_use] extern crate neon;
#[macro_use] extern crate serde_derive;
extern crate serde_json;
extern crate neon_serde;
extern crate geojson;
extern crate postgres;

// Internal Helper Libraries
pub mod stream;

pub mod types;
pub mod pg;

// External PT2ITP Modes
pub mod convert;
pub mod stats;
pub mod dedupe;

pub use self::types::Address;
pub use self::types::Name;

// Functions registered here will be made avaliable to be called from NodeJS
register_module!(mut m, {
    m.export_function("convert", convert::convert)?;
    m.export_function("stats", stats::stats)?;
    m.export_function("dedupe", dedupe::dedupe)?;
    Ok(())
});
