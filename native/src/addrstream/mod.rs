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
        let mut feat: geojson::Feature = self.next_feat()?;

        let mut props = match feat.properties {
            Some(props) => props,
            None => {
                return self.next_addr();
            }
        };

        let number = match props.remove(&String::from("number")) {
            Some(number) => {
                if number.is_string() {
                    String::from(number.as_str().unwrap())
                } else if number.is_i64() {
                    number.as_i64().unwrap().to_string()
                } else {
                    return self.next_addr();
                }
            },
            None => {
                return self.next_addr();
            }
        };

        let interpolate = match props.remove(&String::from("interpolate")) {
            Some(itp) => match itp.as_bool() {
                None => true,
                Some(itp) => itp
            },
            None => true
        };

        let output = match props.remove(&String::from("output")) {
            Some(itp) => match itp.as_bool() {
                None => true,
                Some(itp) => itp
            },
            None => true
        };

        let point = match feat.geometry {
            Some(geom) => match geom.value {
                geojson::Value::Point(pt) => {
                    if pt.len() != 2 {
                        return self.next_addr();
                    }

                    (pt[0], pt[1])
                },
                _ => {
                    return self.next_addr();
                }
            },
            None => {
                return self.next_addr();
            }
        };

        let street: Vec<super::Name> = match props.remove(&String::from("street")) {
            Some(street) => match serde_json::from_value(street) {
                Ok(street) => street,
                Err(err) => {
                    return self.next_addr();
                }
            },
            None => {
                return self.next_addr();
            }
        };

        Some(super::Address {
            id: match feat.id {
                Some(geojson::feature::Id::Number(id)) => id.as_i64(),
                _ => None
            },
            number: number,
            street: vec![super::Name::new(String::from("Main St"))],
            output: output,
            interpolate: interpolate,
            props: props,
            point: point
        })
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
