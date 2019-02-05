use regex::Regex;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Names {
    pub names: Vec<Name>
}

impl Names {
    pub fn new(names: Vec<Name>) -> Self {
        Names {
            names: names
        }
    }

    ///
    /// Parse a Names object from a serde_json value, returning
    /// an empty names vec if unparseable
    ///
    pub fn from_value(value: Option<serde_json::Value>, context: &Option<super::Context>) -> Result<Self, String> {
        let names: Vec<super::super::Name> = match value {
            Some(street) => {
                if street.is_string() {
                    vec![super::super::Name::new(street.as_str().unwrap().to_string(), &context)]
                } else {
                    match serde_json::from_value(street) {
                        Ok(street) => street,
                        Err(err) => { return Err(String::from("Invalid Street Property")); }
                    }
                }
            },
            None => Vec::new()
        };

        Ok(Names::new(names))
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
    /// let name = Name::new(String::from("Main St NW"));
    /// ```
    pub fn new(mut display: String, context: &Option<super::Context>) -> Self {
        match context {
            Some(context) => {
                if context.country == String::from("us") {
                    display = super::super::text::number_suffix(display);
                    display = super::super::text::written_numeric(display);
                }
            },
            None => ()
        };

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
        assert_eq!(Name::new(String::from("Main St NW")), Name {
            display: String::from("Main St NW"),
            priority: 0,
            source: String::from(""),
            tokenized: String::from(""),
            tokenless: String::from("")
        });
    }

    #[test]
    fn test_names() {
        assert_eq!(Names::new(vec![]), Names {
            names: Vec::new()
        });

        assert_eq!(Names::new(vec![Name::new(String::from("Main St NW"))]), Names {
            names: vec![Name::new(String::from("Main St NW"))]
        });
    }
}
