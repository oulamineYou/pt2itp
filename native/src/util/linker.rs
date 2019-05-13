use crate::text::{
    distance,
    is_numbered,
    is_routish
};
use crate::types::Names;

pub struct Link<'a> {
    pub id: &'a i64,
    pub maxscore: f64,
    pub names: &'a Names
}

impl<'a> Link<'a> {
    pub fn new(id: &'a i64, names: &'a Names) -> Self {
        Link {
            id: id,
            maxscore: 0.0,
            names: names
        }
    }
}

///
/// Determines if there is a match between any of two given set of name values
/// Geometric proximity must be determined/filtered by the caller
///
pub fn linker(primary: Link, mut potentials: Vec<Link>) -> Option<i64> {
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
        for potential in potentials.iter_mut() {
            for potential_name in &potential.names.names {

                // Don't bother considering if the tokenless forms don't share a starting letter
                // this might require adjustment for countries with addresses that have leading tokens
                // which aren't properly stripped from the token list
                if potential_name.tokenless.len() > 0 && name.tokenless.len() > 0 && potential_name.tokenless[0..1] != name.tokenless[0..1] {
                    continue;
                }

                // Don't bother considering if both addr and network are a numbered street that
                // doesn't match (1st != 11th)
                let name_numbered = is_numbered(name);
                let name_routish = is_routish(name);
                if
                    (name_numbered.is_some() && name_numbered != is_numbered(potential_name))
                    || (name_routish.is_some() && name_routish != is_routish(potential_name))
                {
                    continue;
                }

                // Use a weighted average w/ the tokenless dist score if possible
                let mut lev_score: Option<f64> = None;

                if name.tokenless.len() > 0 && potential_name.tokenless.len() > 0 {
                    lev_score = Some((0.25 * distance(&name.tokenized, &potential_name.tokenized) as f64) + (0.75 * distance(&name.tokenless, &potential_name.tokenless) as f64));
                } else if (name.tokenless.len() > 0 && potential_name.tokenless.len() == 0) || (name.tokenless.len() == 0 && potential_name.tokenless.len() > 0) {
                    lev_score = Some(distance(&name.tokenized, &potential_name.tokenized) as f64);
                } else {
                    let mut ntoks: Vec<String> = potential_name.tokenized.split(' ').map(|split| {
                        String::from(split)
                    }).collect();
                    let ntoks_len = ntoks.len() as f64;

                    let mut a_match = 0;

                    let atoks: Vec<String> = name.tokenized.split(' ').map(|split| {
                        String::from(split)
                    }).collect();

                    for atok in atoks {
                        // If there are dup tokens ensure they match a unique token ie Saint Street => st st != main st
                        let ntok_index = &ntoks.iter().position(|r| r == &atok);

                        match ntok_index {
                            Some(index) => {
                                ntoks.remove(*index);
                                a_match = a_match + 1;
                            },
                            None => ()
                        };
                    }

                    if a_match as f64 / ntoks_len > 0.66 {
                        lev_score = Some(a_match as f64 / ntoks_len);
                    }

                    if lev_score.is_none() {
                        lev_score = Some(distance(&name.tokenized, &potential_name.tokenized) as f64);
                    }
                }

                let score = 100.0 - (((2.0 * lev_score.unwrap()) / (potential_name.tokenized.len() as f64 + name.tokenized.len() as f64)) * 100.0);

                if score > potential.maxscore {
                    potential.maxscore = score;
                }
            }
        }
    }

    // Calculate max score (score must be > 70% for us to return any matches)
    let mut max: Option<&Link> = None;
    for potential in potentials.iter() {
        match max {
            None => {
                max = Some(potential);
            },
            Some(current_max) => {
                if potential.maxscore > current_max.maxscore {
                    max = Some(potential);
                }
            }
        };
    }

    match max {
        Some(max) => {
            if max.maxscore > 0.70 {
                Some(*max.id)
            } else {
                None
            }
        },
        None => None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_linker() {

    }
}
