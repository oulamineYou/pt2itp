#[macro_use] extern crate neon;
extern crate neon_serde;
#[macro_use] extern crate serde_derive;
use std::fs::File;
use std::io::{self, BufRead, Write, BufReader, BufWriter};
use std::convert::From;
extern crate geojson;

use neon::prelude::*;

#[derive(Serialize, Deserialize, Debug)]
struct ConvertArgs {
    input: Option<String>,
    output: Option<String>,
}

impl ConvertArgs {
    pub fn new() -> Self {
        ConvertArgs {
            input: None,
            output: None
        }
    }
}

fn convert(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let args: ConvertArgs = match cx.argument_opt(0) {
        None => ConvertArgs::new(),
        Some(arg) => {
            if arg.is_a::<JsUndefined>() || arg.is_a::<JsNull>() {
                ConvertArgs::new()
            } else {
                let arg_val = cx.argument::<JsValue>(0)?;
                neon_serde::from_value(&mut cx, arg_val)?
            }
        }
    };
        
    match args.input {
        Some(inpath) => {
            let infile = match File::open(inpath) {
                Ok(infile) => infile,
                Err(err) => { panic!("Unable to open input file: {}", err); }
            };

            match args.output {
                Some(outpath) => {
                    let outfile = match File::create(outpath) {
                        Ok(outfile) => outfile,
                        Err(err) => { panic!("Unable to owrite to output file: {}", err); }
                    };

                    convert_stream(BufReader::new(infile), BufWriter::new(outfile))
                },
                None => convert_stream(io::stdin().lock(), io::stdout().lock())
            };
        },
        None => match args.output {
            Some(outpath) => {
                let outfile = match File::create(outpath) {
                    Ok(outfile) => outfile,
                    Err(err) => { panic!("Unable to owrite to output file: {}", err); }
                };

                convert_stream(io::stdin().lock(), BufWriter::new(outfile))
            },
            None => convert_stream(io::stdin().lock(), io::stdout().lock())
        }
    };

    Ok(cx.boolean(true))
}

fn convert_stream(stream: impl BufRead, mut sink: impl Write) {
    if sink.write(String::from("{ \"type\": \"FeatureCollection\", \"features\": [\n").as_bytes()).is_err() { panic!("Failed to write to output stream"); };
    let mut first = true;

    for line in stream.lines() {
        let mut line = line.unwrap();

        if line.trim().len() == 0 { continue; }

        //Remove Ascii Record Separators
        if line.ends_with("\u{001E}") {
            line.pop();
        }

        let geojson = match line.parse::<geojson::GeoJson>() {
            Ok(geojson) => geojson,
            Err(err) => {
                panic!("Invalid GeoJSON ({:?}): {}", err, line);
            }
        };

        let line = match geojson {
            geojson::GeoJson::Geometry(geom) => {
                geojson::GeoJson::from(geojson::Feature {
                    id: None,
                    bbox: None,
                    geometry: Some(geom),
                    properties: None,
                    foreign_members: None
                }).to_string()
            },
            geojson::GeoJson::Feature(_) => line,
            geojson::GeoJson::FeatureCollection(fc) => {
                let mut line = String::new();
                let mut fcfirst = true;

                for feat in fc.features {
                    if fcfirst {
                        line = format!("{}", geojson::GeoJson::from(feat).to_string());
                        fcfirst = false;
                    } else {
                        line = format!("{},\n{}", line, geojson::GeoJson::from(feat).to_string());
                    }
                }
                line
            }
        };

        if first {
            if sink.write(format!("{}", line).as_bytes()).is_err() { panic!("Failed to write to output stream"); };
            first = false;
        } else {
            if sink.write(format!("\n,{}", line).as_bytes()).is_err() { panic!("Failed to write to output stream"); };
        }
    }

    if sink.write(String::from("\n]}\n").as_bytes()).is_err() { panic!("Failed to write to output stream"); };

    if sink.flush().is_err() { panic!("Failed to flush output stream"); }
}

register_module!(mut m, {
    m.export_function("convert", convert)?;
    Ok(())
});
