use std::convert::From;
use std::iter::Iterator;

use super::geo;
use super::super::Network;

pub struct NetStream {
    input: geo::GeoStream,
    buffer: Option<Vec<u8>> //Used by Read impl for storing partial features
}

impl NetStream {
    pub fn new(input: geo::GeoStream) -> Self {
        NetStream {
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
    /// Network type is returnable or the stream is exhausted
    fn next_net(&mut self) -> Option<Network> {
        let feat: geojson::Feature = self.next_feat()?;

        let mut props = match feat.properties {
            Some(props) => props,
            None => {
                return self.next_net();
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

        let geom = match feat.geometry {
            Some(geom) => match geom.value {
                geojson::Value::LineString(ln) => {
                    let mut ln_tup = Vec::with_capacity(ln.len());
                    for pt in ln {
                        ln_tup.push((pt[0], pt[1]));
                    }

                    vec![ln_tup]
                },
                geojson::Value::MultiLineString(mln) => {
                    let mut mln_tup = Vec::with_capacity(mln.len());

                    for ln in mln {
                        let mut ln_tup = Vec::with_capacity(ln.len());
                        for pt in ln {
                            ln_tup.push((pt[0], pt[1]));
                        }

                        mln_tup.push(ln_tup);
                    }

                    mln_tup
                },
                _ => {
                    return self.next_net();
                }
            },
            None => {
                return self.next_net();
            }
        };

        let names: Vec<super::super::Name> = match props.remove(&String::from("street")) {
            Some(street) => match serde_json::from_value(street) {
                Ok(street) => street,
                Err(err) => {
                    return self.next_net();
                }
            },
            None => {
                return self.next_net();
            }
        };

        Some(Network {
            id: match feat.id {
                Some(geojson::feature::Id::Number(id)) => id.as_i64(),
                _ => None
            },
            names: names,
            source: source,
            props: props,
            geom: geom
        })
    }
}

impl From<super::geo::GeoStream> for NetStream {
    fn from(input: super::geo::GeoStream) -> Self {
        NetStream::new(input)
    }
}

impl std::io::Read for NetStream {
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

impl Iterator for NetStream {
    type Item = Network;

    fn next(&mut self) -> Option<Self::Item> {
        let feat = self.next_net()?;

        Some(feat)
    }
}
