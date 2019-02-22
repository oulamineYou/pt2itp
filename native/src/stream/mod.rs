use std::thread;
use crate::pg::Table;
use std::io::Read;
use crate::types::ToPG;
use std::marker::Send;

pub mod addr;
pub mod geo;
pub mod net;
pub mod poly;

pub use self::poly::PolyStream;
pub use self::geo::GeoStream;
pub use self::addr::AddrStream;
pub use self::net::NetStream;

pub struct Parallel<T: Table, S: Iterator, ITEM: ToPG + Send> {
    item: ITEM,
    stream: S,
    table: T
}

impl<T: Table, S: Iterator, ITEM: ToPG + Send + 'static> Parallel<T, S, ITEM>
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
                let item: ITEM = rx_n.recv().unwrap();

                println!("{}", item.to_tsv());
                
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
