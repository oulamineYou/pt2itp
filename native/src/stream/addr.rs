use std::convert::From;
use std::iter::Iterator;

use super::geo;
use super::super::Address;

/*
 * TODO:
 * - Add optional file to log error'd addresses to
 */

pub struct AddrStream {
    context: Option<super::super::types::Context>,
    input: geo::GeoStream,
    buffer: Option<Vec<u8>> //Used by Read impl for storing partial features
}

impl AddrStream {
    pub fn new(input: geo::GeoStream, context: Option<super::super::types::Context>) -> Self {
        AddrStream {
            context: context,
            input: input,
            buffer: None
        }
    }
}

impl From<super::geo::GeoStream> for AddrStream {
    fn from(input: super::geo::GeoStream) -> Self {
        AddrStream::new(input, None)
    }
}

impl std::io::Read for AddrStream {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let buf_len = buf.len();
        let mut write: Vec<u8> = Vec::new();
        let mut end = false;

        while write.len() < buf_len && !end {
            if self.buffer.is_some() {
                write = self.buffer.take().unwrap();
            } else {
                let feat = match self.next() {
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

impl Iterator for AddrStream {
    type Item = Address;

    fn next(&mut self) -> Option<Self::Item> {
        let mut next: Result<Address, String> = Err(String::from(""));
           
        while next.is_err() {
            next = match self.input.next() {
                Some(next) => Address::new(next, &self.context),
                None => { return None; }
            };

            println!("{:?}", next);
        }

        Some(next.unwrap())
    }
}
