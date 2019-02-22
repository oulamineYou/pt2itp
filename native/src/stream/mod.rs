use std::thread;
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
pub use self::addr::AddrPassthrough;

///
/// Take a Stream function and provide
/// postgres Read implementations
///
pub struct Passthrough<T: Iterator> {
    input: T,
    buffer: Option<Vec<u8>> //Used by Read impl for storing partial features
}

pub struct Parallel<T: Table + Send, S: Iterator, ITEM: ToPG + Send> {
    item: ITEM,
    stream: S,
    table: T
}

impl<T: Table + Send, S: Iterator, ITEM: ToPG + Send + 'static> Parallel<T, S, ITEM>
where
    S: Iterator<Item=ITEM>
{
    pub fn stream(conn: String, table: T, stream: S) {
        let (tx, rx) = crossbeam::channel::bounded(10000);

        let cpus = num_cpus::get();
        let mut web = Vec::new();

        for cpu in 0..cpus {
            let db_conn = conn.clone();
            let rx_n = rx.clone();

            let strand = match thread::Builder::new().name(format!("Parallel #{}", &cpu)).spawn(move || {
                let conn = Connection::connect(db_conn.as_str(), TlsMode::None).unwrap();

                //table.input(&conn, AddrPassthrough::new(rx_n.recv().into_iter()));
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
