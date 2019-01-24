#[macro_use] extern crate neon;
extern crate neon_serde;
#[macro_use] extern crate serde_derive;
use std::fs::File;
use std::io::{self, BufRead, Write, BufReader, BufWriter};

use neon::prelude::*;

#[derive(Serialize, Deserialize, Debug)]
struct ConvertArgs {
    input: Option<String>,
    output: Option<String>,
}

fn convert(mut cx: FunctionContext) -> JsResult<JsString> {
    let args = cx.argument::<JsValue>(0)?;
    let args: ConvertArgs = neon_serde::from_value(&mut cx, args)?;

    match args.input {
        Some(inpath) => {
            let infile = File::open(inpath).unwrap();

            match args.output {
                Some(outpath) => {
                    let outfile = File::create(outpath).unwrap();
                    convert_stream(BufReader::new(infile), BufWriter::new(outfile))
                },
                None => convert_stream(io::stdin().lock(), io::stdout().lock())
            };
        },
        None => match args.output {
            Some(outpath) => {
                let outfile = File::create(outpath).unwrap();
                convert_stream(io::stdin().lock(), BufWriter::new(outfile))
            },
            None => convert_stream(io::stdin().lock(), io::stdout().lock())
        }
    };

    Ok(cx.string("Hello"))
}

fn convert_stream(stream: impl BufRead, mut sink: impl Write) {
    sink.write(String::from("{ \"type\": \"FeatureCollection\", \"features\": [\n").as_bytes()).unwrap();
    let first = true;

    for line in stream.lines() {
        let mut line = line.unwrap();

        //Remove Ascii Record Separators
        if line.ends_with("\u{001E}") {
            line.pop();
        }

        if first {
            sink.write(format!("{}", line).as_bytes()).unwrap();
        } else {
            sink.write(format!("\n,{}", line).as_bytes()).unwrap();
        }
    }

    sink.write(String::from("\n]}\n").as_bytes()).unwrap();

    sink.flush().unwrap();
}

register_module!(mut m, {
    m.export_function("convert", convert)?;
    Ok(())
});
