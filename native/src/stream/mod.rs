use std::thread;
use crate::pg;
use crate::pg::Table;
use crate::types::ToPG;
use std::marker::Send;
use postgres::{Connection, TlsMode};

pub mod addr;
pub mod geo;
pub mod net;
pub mod poly;

pub use self::poly::PolyStream;
pub use self::geo::GeoStream;
pub use self::net::NetStream;
pub use self::addr::AddrStream;

///
/// The Passthrough stream consumes any stream type whos
/// items implement the ToPG Trait, providing iteration
/// and the Read trait into a PG Table
///
pub struct Passthrough<T: Iterator> {
    input: T,
    buffer: Option<Vec<u8>> //Used by Read impl for storing partial features
}

impl<T: Iterator> Passthrough<T> {
    pub fn new(input: T) -> Self {
        Passthrough {
            buffer: None,
            input: input
        }
    }
}

impl<T: Iterator> Iterator for Passthrough<T>
where
    T::Item: ToPG
{
    type Item = T::Item;

    fn next(&mut self) -> Option<Self::Item> {
        self.input.next()
    }
}

impl<T: Iterator> std::io::Read for Passthrough<T>
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

pub struct Parallel<S: Iterator, ITEM: ToPG + Send> {
    item: ITEM,
    stream: S
}

impl<S: Iterator, ITEM: ToPG + Send + 'static> Parallel<S, ITEM>
where
    S: Iterator<Item=ITEM>
{
    pub fn stream(conn: String, stream: S, table: pg::Tables) {
        let (tx, rx) = crossbeam::channel::bounded(10000);

        let cpus = num_cpus::get();
        let mut web = Vec::new();

        for cpu in 0..cpus {
            let db_conn = conn.clone();
            let rx_n = rx.clone();
            let table_n = table.clone();

            let strand = match thread::Builder::new().name(format!("Parallel #{}", &cpu)).spawn(move || {
                let conn = Connection::connect(db_conn.as_str(), TlsMode::None).unwrap();

                let rx_iter = rx_n.iter();

                match table_n {
                    pg::Tables::Address => {
                        let table = pg::Address::new();
                        table.input(&conn, Passthrough::new(rx_iter));
                    },
                    pg::Tables::Network => {
                        let table = pg::Network::new();
                        table.input(&conn, Passthrough::new(rx_iter));
                    },
                    pg::Tables::Polygon(name) => {
                        let table = pg::Polygon::new(name);
                        table.input(&conn, Passthrough::new(rx_iter));
                    }
                }
            }) {
                Ok(strand) => strand,
                Err(err) => panic!("Parallel Thread Creation Error: {}", err.to_string())
            };

            web.push(strand);
        }

        for feat in stream {
            tx.send(feat).unwrap();
        }

        for strand in web {
            strand.join().unwrap();
        }
    }
}
