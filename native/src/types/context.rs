#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Context {
    pub country: String,
    pub region: Option<String> 
}

impl Context {
    pub fn new(country: String, region: Option<String>) -> Self {
        Context {
            country: country,
            region: region

        }
    }
}

