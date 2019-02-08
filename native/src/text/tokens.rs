use regex::Regex;
use super::diacritics;
use std::collections::HashMap;

pub struct Tokens {
    tokens: HashMap<String, String>
}

impl Tokens {
    pub fn new(tokens: Vec<Vec<String>>) -> Self {
        Tokens {
            tokens: HashMap::new()
        }
    }

    pub fn process(&self, text: &String) -> (String, String) {
        let tokenized = self.tokenize(&text);

        (String::from(""), String::from(""))
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
