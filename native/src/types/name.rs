use regex::Regex;

#[derive(Serialize, Deserialize, Debug)]
pub struct Names {
    names: Vec<Name>
}

impl Names {
    pub fn new(names: Vec<Name>) -> Self {
        Names {
            names: names
        }
    }

    ///
    /// Detect Strings like `5 Avenue` and return a synonym
    /// like `5th Avenue` where possible
    ///
    pub fn number_suffix(&mut self) {
        
    }

    /// One -> Twenty are handled as geocoder-abbrev. Because Twenty-First has a hyphen, which is
    /// converted to a space by the tokenized, these cannot currently be managed as token level
    /// replacements and are handled as synonyms instead
    pub fn written_numeric(&mut self) {
        let numeric = Regex::new(r"(?i)(Twenty|Thirty|Fourty|Fifty|Sixty|Seventy|Eighty|Ninety)-(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth)").unwrap();

        for name in &self.names {
            if numeric.is_match(name.display.as_str()) {

                /*
                    let num = {
                                twenty: '2', thirty: '3', fourty: '4', fifty: '5', sixty: '6', seventy: '7', eighty: '8', ninety: '9',
                                        first: '1st', second: '2nd', third: '3rd', fourth: '4th', fifth: '5th', sixth: '6th', seventh: '7th', eighth: '8th', ninth: '9th'
                                                };

                    return text.replace(RegExp(match[0], 'i'), num[match[1].toLowerCase()] + num[match[2].toLowerCase()])
                    */
               
            }
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Name {
    /// Street Name
    pub display: String,

    /// When choosing which street name is primary, order by priority
    pub priority: i8
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
    /// let name = Name::new("Main St NW");
    /// ```
    pub fn new(display: String) -> Self {
        Name {
            display: display,
            priority: 0
        }
    }

}
