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

///
/// An AddressPassthrough consumes an Address Iterator,
/// providing a Read stream
///
pub struct AddrPassthrough<T: Iterator> {
    input: T,
    buffer: Option<Vec<u8>> //Used by Read impl for storing partial features
}

impl<T: Iterator> AddrPassthrough<T> {
    pub fn new(input: T) -> Self {
        AddrPassthrough {
            buffer: None,
            input: input
        }
    }
}

impl<T: Iterator> Iterator for AddrPassthrough<T>
where
    T::Item: ToPG
{
    type Item = T::Item;

    fn next(&mut self) -> Option<Self::Item> {
        self.input.next()
    }
}

impl<T: Iterator> std::io::Read for AddrPassthrough<T> 
where
    <T as std::iter::Iterator>::Item: ToPG
{
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let buf_len = buf.len();
        let mut write: Vec<u8> = Vec::new();
        let mut end = false;

        while write.len() < buf_len && !end {
            if self.buffer.is_some() {
                write = self.buffer.take().unwrap();
            } else {
                let feat = match self.input.next() {
                    Some(feat) => feat.to_tsv(),
                    None => String::from("")
                };

                let mut bytes = feat.into_bytes();
                if bytes.len() == 0 {
                    end = true;
                } else {
                    write.append(&mut bytes);
                }

                if write.len() == 0 {
                    return Ok(0);
                }
            }
        }

        if write.len() > buf_len {
            self.buffer = Some(write.split_off(buf_len));
        }

        for it in 0..write.len() {
            buf[it] = write[it];
        }

        Ok(write.len())
    }
}

