use std::convert::From;
use std::iter::Iterator;
use std::io::{Write, BufWriter};
use std::fs::File;
use crate::types::ToPG;

use crate::{Address, Context};

///
/// An Address Stream consumes a GeoJSON Iterator stream,
/// producing an iterator of Address objects
///
pub struct AddrStream<T: Iterator> {
    context: Option<Context>,
    input: T,
    errors: Option<BufWriter<File>>
}

impl<T: Iterator> AddrStream<T> {
    pub fn new(input: T, context: Context, errors: Option<String>) -> Self {
        AddrStream {
            context: Some(context),
            input: input,
            errors: match errors {
                None => None,
                Some(path) => Some(BufWriter::new(File::create(path).unwrap()))
            }
        }
    }
}

impl<T: Iterator> Iterator for AddrStream<T>
where
    T: Iterator<Item=geojson::GeoJson>
{
    type Item = Address;

    fn next(&mut self) -> Option<Self::Item> {
        let mut next: Result<Address, String> = Err(String::from(""));

        while next.is_err() {
            next = match self.input.next() {
                Some(potential) => match Address::new(potential, &self.context.as_ref().unwrap()) {
                    Ok(potential) => Ok(potential),
                    Err(err) => match self.errors {
                        None => Err(err),
                        Some(ref mut file) => {
                            file.write(format!("{}\n", err).as_bytes()).unwrap();

                            Err(err)
                        }
                    }
                },
                None => { return None; }
            };
        }

        Some(next.unwrap())
    }
}
