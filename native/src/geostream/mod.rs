use std::fs::File;
use std::io::{self, Read, BufRead, BufReader};
use std::convert::From;
use std::iter::Iterator;

pub struct GeoStream {
    input: Input
}

pub enum Input {
    File(std::io::Lines<BufReader<File>>),
    StdIn(std::io::Stdin)
}

impl GeoStream {
    pub fn new(input: Option<String>) -> Self {
        let stream = match input {
            Some(inpath) => match File::open(inpath) {
                Ok(file) => GeoStream {
                    input: Input::File(BufReader::new(file).lines())
                },
                Err(err) => { panic!("Unable to open input file: {}", err); }
            },
            None => {
                GeoStream {
                    input: Input::StdIn(io::stdin())
                }
            }
        };

        stream
    }
}

/*
impl Itertor for GeoStream {
    pub fn next(&mut self) -> Option<Self::Item> {
        let line = match &self.input {
            Input::File {

            }
        }

        for line in stream.lines() {
            let mut line = line.unwrap();

            if line.trim().len() == 0 { continue; }

            //Remove Ascii Record Separators at beginning or end of line
            if line.ends_with("\u{001E}") {
                line.pop();
            } else if line.starts_with("\u{001E}") {
                line.replace_range(0..1, "");
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
}
*/
