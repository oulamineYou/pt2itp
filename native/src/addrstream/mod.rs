use std::convert::From;
use std::iter::Iterator;

use super::geostream;

pub struct AddrStream {
    input: geostream::GeoStream,
    buffer: Option<Vec<u8>> //Used by Read impl for storing partial features
}

impl AddrStream {
    pub fn new(input: geostream::GeoStream) -> Self {
        AddrStream {
            input: input,
            buffer: None
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
        let feat: geojson::Feature = self.next_feat()?;

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

        let source = match props.remove(&String::from("source")) {
            Some(source) => {
                if source.is_string() {
                    Some(String::from(source.as_str().unwrap()))
                } else {
                    None
                }
            },
            None => None
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
            street: street,
            output: output,
            source: source,
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
    type Item = super::Address;

    fn next(&mut self) -> Option<Self::Item> {
        let feat = self.next_addr()?;

        Some(feat)
    }
}
