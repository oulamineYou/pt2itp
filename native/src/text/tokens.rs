use regex::Regex;
use super::diacritics;
use std::collections::HashMap;

#[derive(Debug, PartialEq)]
pub struct Tokens {
    tokens: HashMap<String, String>
}

impl Tokens {
    pub fn new(tokens: HashMap<String, String>) -> Self {
        Tokens {
            tokens: tokens
        }
    }

    pub fn generate(mut tokens: Vec<Vec<String>>) -> Self {
        let mut map: HashMap<String, String> = HashMap::new();

        for group in tokens.iter_mut() {
            if group.len() == 0 {
                continue;
            } else if group.len() == 1 {
                map.insert(diacritics(&group[0]), diacritics(&group[0]));
            } else {
                group.sort_by(|a, b| {
                    if a.len() > b.len() {
                         std::cmp::Ordering::Greater
                    } else if a.len() < b.len() {
                         std::cmp::Ordering::Less
                    } else {
                         std::cmp::Ordering::Equal
                    }
                });

                let master = diacritics(&group[0]);

                for token in group.iter() {
                    if token != &master {
                        map.insert(diacritics(&token), master.clone());
                    }
                }
            }
        }

        Tokens {
            tokens: map
        }
    }

    pub fn process(&self, text: &String) -> (String, String) {
        let tokens = self.tokenize(&text);

        let mut tokenized: Vec<String> = Vec::with_capacity(tokens.len());
        let mut tokenless: Vec<String> = Vec::new();

        for token in tokens {
            match self.tokens.get(&token) {
                None => {
                    tokenized.push(token.clone());
                    tokenless.push(token);
                },
                Some(abbr) => {
                    tokenized.push(abbr.to_string());
                }
            };
        }



        (tokenized.join(" "), tokenless.join(" "))
    }

    ///
    /// Remove all diacritics, punctuation non-space whitespace
    /// returning a vector of component tokens
    ///
    fn tokenize(&self, text: &String) -> Vec<String> {
        lazy_static! {
            static ref UP: Regex = Regex::new(r"[\^]+").unwrap();

            // collapse apostraphes, periods
            static ref PUNC: Regex = Regex::new(r"[\u2018\u2019\u02BC\u02BB\uFF07'\.]").unwrap();

            // all other ascii and unicode punctuation except '-' per
            // http://stackoverflow.com/questions/4328500 split terms
            static ref SPACEPUNC: Regex = Regex::new(r"[\u2000-\u206F\u2E00-\u2E7F\'!#$%&()*+,./:;<=>?@[]^_`{|}~]").unwrap();

            static ref SPACE: Regex = Regex::new(r"\s+").unwrap();
        }

        let mut normalized = diacritics(&text.to_lowercase());

        normalized = UP.replace_all(normalized.as_str(), "").to_string();
        normalized = PUNC.replace_all(normalized.as_str(), "").to_string();
        normalized = SPACEPUNC.replace_all(normalized.as_str(), " ").to_string();
        normalized = SPACE.replace_all(normalized.as_str(), " ").to_string();

        let tokens: Vec<String> = normalized.split(" ").map(|split| {
            String::from(split)
        }).collect();

        tokens
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenize() {

    }
}
