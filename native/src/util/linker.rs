use crate::text::distance;
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
pub fn liner(primary: &Link, potentials: Vec<Link>, returnAll: bool) {
    let maxScore = false;

    // Ensure exact matches are always returned before potential short-circuits
}
