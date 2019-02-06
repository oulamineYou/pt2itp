use std::collections::HashMap;
use regex::Regex;

///
/// InputName is only used internally to serialize a names array to the
/// Names type. It should not be used unless as an intermediary into the Names type
///
#[derive(Serialize, Deserialize, Debug, PartialEq)]
struct InputName {
    /// Street Name
    pub display: String,

    /// When choosing which street name is primary, order by priority
    pub priority: i8
}

impl InputName {
    pub fn new(mut display: String, priority: i8) -> Self {
        InputName {
            display: display,
            priority: priority
        }
    }
}


#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Names {
    pub names: Vec<Name>
}

impl Names {
    pub fn new(mut names: Vec<Name>, context: &Option<super::Context>) -> Self {
        match context {
            Some(context) => {
                if context.country == String::from("us") {

                    let mut synonyms: Vec<Name> = Vec::new();

                    for name in names.iter() {
                        match super::super::text::number_suffix(&name.display) {
                            Some(syn) => synonyms.push(Name::new(syn, 0)),
                            None => ()
                        };
                        match super::super::text::written_numeric(&name.display) {
                            Some(syn) => synonyms.push(Name::new(syn, 0)),
                            None => ()
                        };
                    }

                    names.append(&mut synonyms);
                }
            },
            None => ()
        };

        Names {
            names: names
        }
    }

    ///
    /// Parse a Names object from a serde_json value, returning
    /// an empty names vec if unparseable
    ///
    pub fn from_value(value: Option<serde_json::Value>, context: &Option<super::Context>) -> Result<Self, String> {
        let names: Vec<Name> = match value {
            Some(street) => {
                if street.is_string() {
                    vec![Name::new(street.as_str().unwrap().to_string(), 0)]
                } else {
                    let names: Vec<InputName> = match serde_json::from_value(street) {
                        Ok(street) => street,
                        Err(err) => { return Err(String::from("Invalid Street Property")); }
                    };

                    let names: Vec<Name> = names.iter().map(|name| {
                        Name::new(name.display.clone(), name.priority)
                    }).collect();

                    names
                }
            },
            None => Vec::new()
        };

        Ok(Names::new(names, &context))
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Name {
    /// Street Name
    pub display: String,

    /// When choosing which street name is primary, order by priority
    pub priority: i8,

    /// Table source of a given name (network or address)
    pub source: String,

    /// Abbreviated form of the name
    pub tokenized: String,

    /// All abbreviations removed form of the name
    pub tokenless: String
}

impl Name {
    /// Returns a representation of a street name
    ///
    /// # Arguments
    ///
    /// * `display` - A string containing the street name (Main St)
    ///
    /// # Example
    ///
    /// ```
    /// let name = Name::new(String::from("Main St NW"), 0);
    /// ```
    pub fn new(mut display: String, priority: i8) -> Self {
        Name {
            display: display,
            priority: 0,
            source: String::from(""),
            tokenized: String::from(""),
            tokenless: String::from("")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_name() {
        assert_eq!(Name::new(String::from("Main St NW"), 0), Name {
            display: String::from("Main St NW"),
            priority: 0,
            source: String::from(""),
            tokenized: String::from(""),
            tokenless: String::from("")
        });
    }

    #[test]
    fn test_inputname() {
        assert_eq!(InputName::new(String::from("Main St NW"), 1), InputName {
            display: String::from("Main St NW"),
            priority: 1
        });

        assert_eq!(InputName::new(String::from("S Main St NW"), 0), InputName {
            display: String::from("S Main St NW"),
            priority: 0
        });
    }

    #[test]
    fn test_names() {
        assert_eq!(Names::new(vec![], &None), Names {
            names: Vec::new()
        });

        assert_eq!(Names::new(vec![Name::new(String::from("Main St NW"), 0)], &None), Names {
            names: vec![Name::new(String::from("Main St NW"), 0)]
        });
    }
}
