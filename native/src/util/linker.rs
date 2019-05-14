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

#[derive(Debug, PartialEq)]
pub struct LinkResult {
    id: i64,
    score: f64
}

impl LinkResult {
    pub fn new(id: i64, score: f64) -> Self {
        LinkResult {
            id: id,
            score: score
        }
    }
}

///
/// Determines if there is a match between any of two given set of name values
/// Geometric proximity must be determined/filtered by the caller
///
pub fn linker(primary: Link, mut potentials: Vec<Link>) -> Option<LinkResult> {
    // Ensure exact matches are always returned before potential short-circuits
    for name in &primary.names.names {
        for potential in potentials.iter() {
            for potential_name in &potential.names.names {
                if name.tokenized == potential_name.tokenized {
                    return Some(LinkResult::new(*potential.id, 100.0));
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
                Some(LinkResult::new(*max.id, (max.maxscore * 100.0).round() / 100.0))
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
    use std::collections::HashMap;
    use crate::{Context, Tokens, Name, Names};

    #[test]
    fn test_linker() {
        let mut tokens: HashMap<String, String> = HashMap::new();
        tokens.insert(String::from("street"), String::from("st"));
        tokens.insert(String::from("st"), String::from("st"));
        tokens.insert(String::from("avenue"), String::from("ave"));
        tokens.insert(String::from("ave"), String::from("ave"));
        tokens.insert(String::from("west"), String::from("w"));
        tokens.insert(String::from("east"), String::from("e"));
        tokens.insert(String::from("w"), String::from("w"));
        tokens.insert(String::from("e"), String::from("e"));

        let context = Context::new(String::from("us"), None, Tokens::new(tokens));

        // === Intentional Matches ===
        // The following tests should match one of the given potential matches
        {
            let a_name = Names::new(vec![Name::new("Main Street", 0, &context)], &context);
            let b_name = Names::new(vec![Name::new("Main Street", 0, &context)], &context);
            let a = Link::new(&1, &a_name);
            let b = vec![Link::new(&2, &b_name)];
            assert_eq!(linker(a, b), Some(LinkResult::new(2, 100.0)));
        }

        {
            let a_name = Names::new(vec![Name::new("Main Street", 0, &context)], &context);
            let b_name = Names::new(vec![Name::new("Maim Street", 0, &context)], &context);
            let a = Link::new(&1, &a_name);
            let b = vec![Link::new(&2, &b_name)];
            assert_eq!(linker(a, b), Some(LinkResult::new(2, 85.71)));
        }

        {
            let a_name = Names::new(vec![Name::new("US Route 50 East", 0, &context)], &context);
            let b_name = Names::new(vec![Name::new("US Route 50 West", 0, &context)], &context);
            let a = Link::new(&1, &a_name);
            let b = vec![Link::new(&2, &b_name)];
            assert_eq!(linker(a, b), Some(LinkResult::new(2, 98.08)));
        }

        {
            let a_name = Names::new(vec![Name::new("11th Street West", 0, &context)], &context);
            let b_name = Names::new(vec![Name::new("11th Avenue West", 0, &context)], &context);
            let a = Link::new(&1, &a_name);
            let b = vec![Link::new(&2, &b_name)];
            assert_eq!(linker(a, b), Some(LinkResult::new(2, 92.11)));
        }

        {
            let a_name = Names::new(vec![Name::new("Main Street", 0, &context)], &context);

            let b_name1 = Names::new(vec![Name::new("Main Street", 0, &context)], &context);
            let b_name2 = Names::new(vec![Name::new("Main Avenue", 0, &context)], &context);
            let b_name3 = Names::new(vec![Name::new("Main Road", 0, &context)], &context);
            let b_name4 = Names::new(vec![Name::new("Main Drive", 0, &context)], &context);

            let a = Link::new(&1, &a_name);
            let b = vec![
                Link::new(&2, &b_name1),
                Link::new(&3, &b_name2),
                Link::new(&4, &b_name3),
                Link::new(&5, &b_name4)
            ];
            assert_eq!(linker(a, b), Some(LinkResult::new(2, 100.0)));
        }

        {
            let a_name = Names::new(vec![Name::new("Main Street", 0, &context)], &context);

            let b_name1 = Names::new(vec![Name::new("Main Street", 0, &context)], &context);
            let b_name2 = Names::new(vec![Name::new("Asdg Street", 0, &context)], &context);
            let b_name3 = Names::new(vec![Name::new("Asdg Street", 0, &context)], &context);
            let b_name4 = Names::new(vec![Name::new("Maim Drive", 0, &context)], &context);

            let a = Link::new(&1, &a_name);
            let b = vec![
                Link::new(&2, &b_name1),
                Link::new(&3, &b_name2),
                Link::new(&4, &b_name3),
                Link::new(&5, &b_name4)
            ];
            assert_eq!(linker(a, b), Some(LinkResult::new(2, 100.0)));
        }

        {
            let a_name = Names::new(vec![Name::new("Ola Avenue", 0, &context)], &context);

            let b_name1 = Names::new(vec![Name::new("Ola", 0, &context)], &context);
            let b_name2 = Names::new(vec![Name::new("Ola Avg", 0, &context)], &context);

            let a = Link::new(&1, &a_name);
            let b = vec![
                Link::new(&2, &b_name1),
                Link::new(&3, &b_name2)
            ];
            assert_eq!(linker(a, b), Some(LinkResult::new(2, 80.0)));
        }

        {
            let a_name = Names::new(vec![Name::new("Avenue Street", 0, &context)], &context);

            let b_name1 = Names::new(vec![Name::new("Ave", 0, &context)], &context);
            let b_name2 = Names::new(vec![Name::new("Avenida", 0, &context)], &context);

            let a = Link::new(&1, &a_name);
            let b = vec![
                Link::new(&2, &b_name1),
                Link::new(&3, &b_name2)
            ];
            assert_eq!(linker(a, b), Some(LinkResult::new(2, 77.78)));
        }

        // === Intentional Non-Matches ===
        // The following tests should *NOT* match one of the given potential matches

        {
            let a_name = Names::new(vec![Name::new("1st Street West", 0, &context)], &context);
            let b_name = Names::new(vec![Name::new("2nd Street West", 0, &context)], &context);
            let a = Link::new(&1, &a_name);
            let b = vec![Link::new(&2, &b_name)];
            assert_eq!(linker(a, b), None);
        }

        {
            let a_name = Names::new(vec![Name::new("1st Street West", 0, &context)], &context);
            let b_name = Names::new(vec![Name::new("3rd Street West", 0, &context)], &context);
            let a = Link::new(&1, &a_name);
            let b = vec![Link::new(&2, &b_name)];
            assert_eq!(linker(a, b), None);
        }

        {
            let a_name = Names::new(vec![Name::new("1st Street West", 0, &context)], &context);
            let b_name = Names::new(vec![Name::new("4th Street West", 0, &context)], &context);
            let a = Link::new(&1, &a_name);
            let b = vec![Link::new(&2, &b_name)];
            assert_eq!(linker(a, b), None);
        }

        {
            let a_name = Names::new(vec![Name::new("11th Street West", 0, &context)], &context);
            let b_name = Names::new(vec![Name::new("21st Street West", 0, &context)], &context);
            let a = Link::new(&1, &a_name);
            let b = vec![Link::new(&2, &b_name)];
            assert_eq!(linker(a, b), None);
        }

        {
            let a_name = Names::new(vec![Name::new("US Route 60 East", 0, &context)], &context);
            let b_name = Names::new(vec![Name::new("US Route 51 West", 0, &context)], &context);
            let a = Link::new(&1, &a_name);
            let b = vec![Link::new(&2, &b_name)];
            assert_eq!(linker(a, b), None);
        }
    }
}
