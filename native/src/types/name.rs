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
