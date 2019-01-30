use std::io::{self, BufRead, BufReader};
use std::convert::From;
use std::iter::Iterator;

use super::geostream;

pub struct AddrStream {
    input: geostream::GeoStream
}

impl AddrStream {
    pub fn new(input: geostream::GeoStream) -> Self {
        AddrStream {
            input: input
        }
    }

    /// Get a GeoJSON feature from the underlying geostream
    /// ignoring other geojson types until a feature is returned
    /// or the stream is exhausted
    fn next_feat(&mut self) -> Option<geojson::Feature> {
        match self.input.next() {
            Some(geojson::GeoJson::Feature(feat)) => Some(feat),
            None => { return None; },
            _ => self.next_feat()
        }
    }

    /// Iterate over underlying geostream until a valid
    /// Address type is returnable or the stream is exhausted
    fn next_addr(&mut self) -> Option<super::Address> {
        let feat = self.next_feat()?;

        let addr = super::Address {
            id: None,
            number: String::from("1"),
            street: vec![super::Name::new(String::from("Main St"))],
            output: false,
            interpolate: false,
            props: json!({}),
            geometry: vec![(0.0, 0.0)]
        };

        Some(addr)
    }
}

impl From<super::geostream::GeoStream> for AddrStream {
    fn from(input: super::geostream::GeoStream) -> Self {
        AddrStream::new(input)
    }
}

impl Iterator for AddrStream {
    type Item = super::Address;

    fn next(&mut self) -> Option<Self::Item> {
        let mut feat = self.next_addr()?;

        Some(feat)
    }
}
