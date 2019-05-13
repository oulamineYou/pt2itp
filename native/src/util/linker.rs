use crate::text::{
    distance,
    is_numbered,
    is_routish
};
use crate::types::Names;

pub struct Link<'a> {
    pub id: &'a i64,
    pub names: &'a Names
}

impl<'a> Link<'a> {
    pub fn new(id: &'a i64, names: &'a Names) -> Self {
        Link {
            id: id,
            names: names
        }
    }
}

///
/// Determines if there is a match between any of two given set of name values
/// Geometric proximity must be determined/filtered by the caller
///
pub fn liner(primary: Link, potentials: Vec<Link>) -> Option<i64> {
    let max_score = false;

    // Ensure exact matches are always returned before potential short-circuits
    for name in &primary.names.names {
        for potential in potentials.iter() {
            for potential_name in &potential.names.names {
                if name.tokenized == potential_name.tokenized {
                    return Some(*potential.id);
                }
            }
        }
    }

    for name in &primary.names.names {
        for potential in potentials.iter() {
            // Don't bother considering if the tokenless forms don't share a starting letter
            // this might require adjustment for countries with addresses that have leading tokens
            // which aren't properly stripped from the token list

        }
    }

    None
}
