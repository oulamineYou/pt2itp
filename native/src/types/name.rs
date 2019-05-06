use crate::{Context, text};

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

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Names {
    pub names: Vec<Name>
}

impl Names {
    pub fn new(mut names: Vec<Name>, context: &Context) -> Self {
        let mut synonyms: Vec<Name> = Vec::new();

        if context.country == String::from("US") {
            for name in names.iter_mut() {
                name.display = text::str_remove_octo(&name.display);

                synonyms.append(&mut text::syn_number_suffix(&name, &context));
                synonyms.append(&mut text::syn_written_numeric(&name, &context));
                synonyms.append(&mut text::syn_state_hwy(&name, &context));
                synonyms.append(&mut text::syn_us_hwy(&name, &context));
                synonyms.append(&mut text::syn_us_cr(&name, &context));
            }
        } else if context.country == String::from("CA") {
            for name in names.iter_mut() {
                name.display = text::str_remove_octo(&name.display);

                synonyms.append(&mut text::syn_ca_hwy(&name, &context));

                if context.region.is_some() && context.region.as_ref().unwrap() == "QC" {
                    synonyms.append(&mut text::syn_ca_french(&name, &context));
                }
            }
        }

        names.append(&mut synonyms);

        Names {
            names: names
        }
    }

    ///
    /// Parse a Names object from a serde_json value, returning
    /// an empty names vec if unparseable
    ///
    pub fn from_value(value: Option<serde_json::Value>, context: &Context) -> Result<Self, String> {
        let names: Vec<Name> = match value {
            Some(street) => {
                if street.is_string() {
                    vec![Name::new(street.as_str().unwrap().to_string(), 0, &context)]
                } else {
                    let names: Vec<InputName> = match serde_json::from_value(street) {
                        Ok(street) => street,
                        _ => { return Err(String::from("Invalid Street Property")); }
                    };

                    let names: Vec<Name> = names.iter().map(|name| {
                        Name::new(name.display.clone(), name.priority, &context)
                    }).collect();

                    names
                }
            },
            None => Vec::new()
        };

        Ok(Names::new(names, &context))
    }

    ///
    /// Sort names object by priority
    ///
    pub fn sort(&mut self) {
        self.names.sort_by(|a, b| {
            if a.priority > b.priority {
                std::cmp::Ordering::Less
            } else if a.priority < b.priority {
                std::cmp::Ordering::Greater
            } else {
                std::cmp::Ordering::Equal
            }
        });
    }

    ///
    /// Set the source on all the given names
    ///
    pub fn set_source(&mut self, source: String) {
        for name in self.names.iter_mut() {
            name.source = source.clone();
        }
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Name {
    /// Street Name
    pub display: String,

    /// When choosing which street name is primary, order by priority
    pub priority: i8,

    /// Geometry Type of a given name (network/address)
    pub source: String,

    /// Abbreviated form of the name
    pub tokenized: String,

    /// All abbreviations removed form of the name
    pub tokenless: String,

    /// Frequency of the given name
    pub freq: i64
}

impl Name {
    /// Returns a representation of a street name
    ///
    /// # Arguments
    ///
    /// * `display` - A string containing the street name (Main St)
    ///
    /// ```
    pub fn new(mut display: String, priority: i8, context: &Context) -> Self {
        let tokens = context.tokens.process(&display);

        display = display
            .replace(r#"""#, "")
            .replace("\t", "")
            .replace("\n", "");

        Name {
            display: display,
            priority: priority,
            source: String::from(""),
            tokenized: tokens.0,
            tokenless: tokens.1,
            freq: 1
        }
    }
}

#[cfg(test)]
mod tests {
    #[macro_use] use serde_json::json;
    use super::*;
    use std::collections::HashMap;
    use crate::Tokens;

    #[test]
    fn test_name() {
        let context = Context::new(String::from("us"), None, Tokens::new(HashMap::new()));

        assert_eq!(Name::new(String::from("Main St NW"), 0, &context), Name {
            display: String::from("Main St NW"),
            priority: 0,
            source: String::from(""),
            tokenized: String::from("main st nw"),
            tokenless: String::from("main st nw"),
            freq: 1
        });
    }

    #[test]
    fn test_names_sort() {
        let context = Context::new(String::from("us"), None, Tokens::new(HashMap::new()));

        let mut names = Names::new(vec![
            Name::new(String::from("Highway 123"), -1, &context),
            Name::new(String::from("Route 123"), 2, &context),
            Name::new(String::from("Test 123"), 0, &context)
        ], &context);

        names.sort();

        let names_sorted = Names::new(vec![
            Name::new(String::from("Route 123"), 2, &context),
            Name::new(String::from("Test 123"), 0, &context),
            Name::new(String::from("Highway 123"), -1, &context)
        ], &context);

        assert_eq!(names, names_sorted);
    }

    #[test]
    fn test_names_from_value() {
        let context = Context::new(String::from("us"), None, Tokens::new(HashMap::new()));

        let expected = Names::new(vec![Name::new(String::from("Main ST NE"), 0, &context)], &context);

        assert_eq!(Names::from_value(Some(json!("Main St NE")), &context).unwrap(), expected);

        assert_eq!(Names::from_value(Some(json!({
            "display": "Main St NE",
            "priority": 0
        })), &context).unwrap(), expected);
    }

    #[test]
    fn test_names() {
        let context = Context::new(String::from("us"), None, Tokens::new(HashMap::new()));

        assert_eq!(Names::new(vec![], &context), Names {
            names: Vec::new()
        });

        assert_eq!(Names::new(vec![Name::new(String::from("Main St NW"), 0, &context)], &context), Names {
            names: vec![Name::new(String::from("Main St NW"), 0, &context)]
        });
    }
}
