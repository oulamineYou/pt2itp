#[derive(Serialize, Deserialize, Debug)]
pub struct Context {
    country: String,
    region: Option<String> 
}

impl Context {
    pub fn new(country: String, region: Option<String>) -> Self {
        Context {
            country: country,
            region: region

        }
    }
}

