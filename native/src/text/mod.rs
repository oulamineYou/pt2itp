mod diacritics;

use std::collections::HashMap;
use regex::Regex;
use crate::{Name, Context};

//
// A note on fn names:
// - Functions that operate on Strings should be prefixed with `str_`
// - Functions that generate Name synonyms should be prefixed with `syn_`
//

///
/// Removes the octothorpe from names like "HWY #35", to get "HWY 35"
///
pub fn str_remove_octo(text: &String) -> Option<String> {
    lazy_static! {
        static ref OCTO: Regex = Regex::new(r"(?i)^(?P<type>HWY |HIGHWAY |RTE |ROUTE |US )(#)(?P<post>\d+\s?.*)$").unwrap();
    }

    match OCTO.captures(text.as_str()) {
        Some(capture) => Some(format!("{}{}", &capture["type"], &capture["post"])),
        _ => None
    }
}

///
/// Detect Strings like `5 Avenue` and return a synonym like `5th Avenue` where possible
///
pub fn syn_number_suffix(name: &Name) -> Vec<Name> {
    lazy_static! {
        static ref NUMSUFFIX: Regex = Regex::new(r"(?i)^(?P<number>\d+)\s+(?P<name>\w.*)$").unwrap();
    }

    match NUMSUFFIX.captures(name.display.as_str()) {
        Some(capture) => {
            let num: i64 = match capture["number"].parse() {
                Ok(num) => num,
                _ => { return Vec::new(); }
            };

            let suffix: String;
            if (num % 100) >= 10 && (num % 100) <= 20 {
                suffix = String::from("th");
            } else if (num % 10) == 1 {
                suffix = String::from("st");
            } else if (num % 10) == 2 {
                suffix = String::from("nd");
            } else if (num % 10) == 3 {
                suffix = String::from("rd");
            } else {
                suffix = String::from("th");
            }

            vec![Name::new(format!("{}{} {}", num, suffix, &capture["name"]), 0)]
        },
        None => Vec::new()
    }
}

///
/// One -> Twenty are handled as geocoder-abbrev. Because Twenty-First has a hyphen, which is converted
/// to a space by the tokenized, these cannot currently be managed as token level replacements and are handled
/// as synonyms instead
///
pub fn syn_written_numeric(name: &Name) -> Vec<Name> {
    lazy_static! {
        static ref NUMERIC: Regex = Regex::new(r"(?i)(?P<pre>^.*)(?P<tenth>Twenty|Thirty|Fourty|Fifty|Sixty|Seventy|Eighty|Ninety)-(?P<nth>First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth)(?P<post>.*$)").unwrap();

        static ref NUMERIC_MAP: HashMap<String, String> = {
            let mut m = HashMap::new();

            m.insert(String::from("twenty"), String::from("2"));
            m.insert(String::from("thirty"), String::from("3"));
            m.insert(String::from("fourty"), String::from("4"));
            m.insert(String::from("fifty"), String::from("5"));
            m.insert(String::from("sixty"), String::from("6"));
            m.insert(String::from("seventy"), String::from("7"));
            m.insert(String::from("eighty"), String::from("8"));
            m.insert(String::from("ninety"), String::from("9"));

            m.insert(String::from("first"), String::from("1st"));
            m.insert(String::from("second"), String::from("2nd"));
            m.insert(String::from("third"), String::from("3rd"));
            m.insert(String::from("fourth"), String::from("4th"));
            m.insert(String::from("fifth"), String::from("5th"));
            m.insert(String::from("sixth"), String::from("6th"));
            m.insert(String::from("seventh"), String::from("7th"));
            m.insert(String::from("eighth"), String::from("8th"));
            m.insert(String::from("ninth"), String::from("9th"));

            m
        };
    }

    match NUMERIC.captures(name.display.as_str()) {
        Some(capture) => {
            let tenth = match NUMERIC_MAP.get(&capture["tenth"].to_lowercase()) {
                None => { return Vec::new(); },
                Some(tenth) => tenth
            };

            let nth = match NUMERIC_MAP.get(&capture["nth"].to_lowercase()) {
                None => { return Vec::new(); },
                Some(nth) => nth
            };

            vec![Name::new(format!("{}{}{}{}", &capture["pre"], tenth, nth, &capture["post"]), 0)]
        },
        _ => Vec::new()
    }
}

///
/// Generate synonyms for name like "CR 123" => "County Road 123"
///
pub fn syn_us_cr(name: &Name) -> Vec<Name> {
    lazy_static! {
        static ref US_CR: Regex = Regex::new(r"(?i)^(CR |County Road )(?P<num>[0-9]+)$").unwrap();
    }

    let cr: String = match US_CR.captures(name.display.as_str()) {
        Some(capture) => capture["num"].to_string(),
        None => { return Vec::new(); }
    };

    // Note ensure capacity is increased if additional permuations are added below
    let mut syns: Vec<Name> = Vec::with_capacity(2);

    // CR 123
    syns.push(Name::new(format!("CR {}", &cr), -1));

    // County Road 123 (Display Form)
    if name.priority > 0 {
        syns.push(Name::new(format!("County Road {}", &cr), 0));
    } else {
        syns.push(Name::new(format!("County Road {}", &cr), 1));
    }

    syns
}

///
/// Generate synonyms for names like "US 81" => "US Route 81"
///
pub fn syn_us_hwy(name: &Name) -> Vec<Name> {
    lazy_static! {
        static ref US_HWY: Regex = Regex::new(r"(?i)^(U\.?S\.?|United States)(\s|-)(Rte |Route |Hwy |Highway )?(?P<num>[0-9]+)$").unwrap();
    }

    let highway: String = match US_HWY.captures(name.display.as_str()) {
        Some(capture) => capture["num"].to_string(),
        None => { return Vec::new(); }
    };

    // Note ensure capacity is increased if additional permuations are added below
    let mut syns: Vec<Name> = Vec::with_capacity(5);

    // US 81
    syns.push(Name::new(format!("US {}", &highway), -1));

    //US Route 81 (Display Form)
    if name.priority > 0 {
        syns.push(Name::new(format!("US Route {}", &highway), 0));
    } else {
        syns.push(Name::new(format!("US Route {}", &highway), 1));
    }

    //US Highway 81
    syns.push(Name::new(format!("US Highway {}", &highway), -1));

    //United States Route 81
    syns.push(Name::new(format!("United States Route {}", &highway), -1));

    //United States Highway 81
    syns.push(Name::new(format!("United States Highway {}", &highway), -1));

    syns
}

///
/// Replace names like "NC 1 => North Carolina Highway 1"
/// Replace names like "State Highway 1 => NC 1, North Carolina Highway 1
///
pub fn syn_state_hwy(name: &Name, context: &Context) -> Vec<Name> {

    let region = match context.region {
        Some(ref region) => region,
        None => { return Vec::new() }
    };

    let region_name = match context.region_name() {
        Some(region) => region,
        None => { return Vec::new() }
    };

    // the goal is to get all the input highways to <state> #### and then format the matrix

    lazy_static! {
        static ref PRE_HWY: Regex = Regex::new(r"(?ix)^
            (?P<prefix>
              # State 123
              # State Highway 123
              (State\s(highway|hwy|route|rte)\s)

              # North Carolina 123
              # North Carolina Highway 123
              |((Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\sHampshire|New\sJersey|New\sMexico|New\sYork|North\sCarolina|North\sDakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\sIsland|South\sCarolina|South\sDakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\sVirginia|Wisconsin|Wyoming|District\sof\sColumbia|American\sSamoa|Guam|Northern\sMariana\sIslands|Puerto\sRico|United\sStates\sMinor\sOutlying\sIslands|Virgin\sIslands
            )\s((highway|hwy|route|rte)\s)?)

              # Highway 123
              |((highway|hwy|route|rte)\s)

              # US-AK 123
              # US AK Highway 123
              # AK 123
              # AK Highway 123
              |((US[-\s])?(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|AS|GU|MP|PR|UM|VI|SR)[\s-]((highway|hwy|route|rte)\s)?)
            )

            (?P<num>\d+)

            (\shighway$|\shwy$|\sroute$|\srte$)?

            $
        ").unwrap();

        static ref POST_HWY: Regex = Regex::new(r"(?i)^(highway|hwy|route|rte)\s(?P<num>\d+)$").unwrap();
    }

    let highway: String = match PRE_HWY.captures(name.display.as_str()) {
        Some(capture) => capture["num"].to_string(),
        None => match POST_HWY.captures(name.display.as_str()) {
            Some(capture) => capture["num"].to_string(),
            None => { return Vec::new(); }
        }
    };

    // Note ensure capacity is increased if additional permuations are added below
    let mut syns: Vec<Name> = Vec::with_capacity(7);

    // NC 123 Highway
    syns.push(Name::new(format!("{} {} Highway", region.to_uppercase(), &highway), -2));

    // NC 123
    syns.push(Name::new(format!("{} {}", region.to_uppercase(), &highway), -1));

    // Highway 123
    syns.push(Name::new(format!("Highway {}", &highway), -2));

    // SR 123 (State Route)
    syns.push(Name::new(format!("SR {}", &highway), -1));

    //State Highway 123
    syns.push(Name::new(format!("State Highway {}", &highway), -1));

    //State Route 123
    syns.push(Name::new(format!("State Route {}", &highway), -1));

    // <State> Highway 123 (Display Form)
    if name.priority > 0 {
        syns.push(Name::new(format!("{} Highway {}", &region_name, &highway), 0));
    } else {
        syns.push(Name::new(format!("{} Highway {}", &region_name, &highway), 1));
    }

    syns
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Name, Context};

    #[test]
    fn test_syn_us_cr() {
        assert_eq!(syn_us_cr(&Name::new(String::from(""), 0)), vec![]);

        let results = vec![
            Name::new(String::from("CR 123"), -1),
            Name::new(String::from("County Road 123"), 1),
        ];

        assert_eq!(syn_us_cr(&Name::new(String::from("County Road 123"), 0)), results);
        assert_eq!(syn_us_cr(&Name::new(String::from("CR 123"), 0)), results);
    }

    #[test]
    fn test_syn_us_hwy() {
        assert_eq!(syn_us_hwy(&Name::new(String::from(""), 0)), vec![]);

        let results = vec![
            Name::new(String::from("US 81"), -1),
            Name::new(String::from("US Route 81"), 1),
            Name::new(String::from("US Highway 81"), -1),
            Name::new(String::from("United States Route 81"), -1),
            Name::new(String::from("United States Highway 81"), -1),
        ];

        assert_eq!(syn_us_hwy(&Name::new(String::from("us-81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("US 81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("U.S. Route 81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("US Route 81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("US Rte 81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("US Hwy 81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("US Highway 81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("United States 81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("United States Route 81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("United States Highway 81"), 0)), results);
        assert_eq!(syn_us_hwy(&Name::new(String::from("United States Hwy 81"), 0)), results);
    }

    #[test]
    fn test_syn_state_highway() {
        assert_eq!(
            syn_state_hwy(
                &Name::new(String::from(""), 0),
                &Context::new(String::from("US"), None)
            ), vec![]
        );

        let results = vec![
            Name::new(String::from("PA 123 Highway"), -2),
            Name::new(String::from("PA 123"), -1),
            Name::new(String::from("Highway 123"), -2),
            Name::new(String::from("SR 123"), -1),
            Name::new(String::from("State Highway 123"), -1),
            Name::new(String::from("State Route 123"), -1),
            Name::new(String::from("Pennsylvania Highway 123"), 1)
        ];

        assert_eq!(
            syn_state_hwy(
                &Name::new(String::from("State Highway 123"), 0),
                &Context::new(String::from("US"), Some(String::from("PA")))
            ), results
        );

        assert_eq!(
            syn_state_hwy(
                &Name::new(String::from("Highway 123"), 0),
                &Context::new(String::from("US"), Some(String::from("PA")))
            ), results
        );

        assert_eq!(
            syn_state_hwy(
                &Name::new(String::from("Hwy 123"), 0),
                &Context::new(String::from("US"), Some(String::from("PA")))
            ), results
        );

        assert_eq!(
            syn_state_hwy(
                &Name::new(String::from("Pennsylvania Highway 123"), 0),
                &Context::new(String::from("US"), Some(String::from("PA")))
            ), results
        );

        assert_eq!(
            syn_state_hwy(
                &Name::new(String::from("Pennsylvania Route 123"), 0),
                &Context::new(String::from("US"), Some(String::from("PA")))
            ), results
        );

        assert_eq!(
            syn_state_hwy(
                &Name::new(String::from("PA 123"), 0),
                &Context::new(String::from("US"), Some(String::from("PA")))
            ), results
        );

        assert_eq!(
            syn_state_hwy(
                &Name::new(String::from("PA-123"), 0),
                &Context::new(String::from("US"), Some(String::from("PA")))
            ), results
        );

        assert_eq!(
            syn_state_hwy(
                &Name::new(String::from("US-PA-123"), 0),
                &Context::new(String::from("US"), Some(String::from("PA")))
            ), results
        );
    }

    #[test]
    fn test_syn_number_suffix() {
        assert_eq!(
            syn_number_suffix(&Name::new(String::from("1st Avenue"), 0)),
            Vec::new()
        );

        assert_eq!(
            syn_number_suffix(&Name::new(String::from("1 Avenue"), 0)),
            vec![Name::new(String::from("1st Avenue"), 0)]
        );

        assert_eq!(
            syn_number_suffix(&Name::new(String::from("2 Avenue"), 0)),
            vec![Name::new(String::from("2nd Avenue"), 0)]
        );

        assert_eq!(
            syn_number_suffix(&Name::new(String::from("3 Street"), 0)),
            vec![Name::new(String::from("3rd Street"), 0)]
        );

        assert_eq!(
            syn_number_suffix(&Name::new(String::from("4 Street"), 0)),
            vec![Name::new(String::from("4th Street"), 0)]
        );

        assert_eq!(
            syn_number_suffix(&Name::new(String::from("20 Street"), 0)),
            vec![Name::new(String::from("20th Street"), 0)]
        );

        assert_eq!(
            syn_number_suffix(&Name::new(String::from("21 Street"), 0)),
            vec![Name::new(String::from("21st Street"), 0)]
        );
    }

    #[test]
    fn test_syn_written_numeric() {
        assert_eq!(
            syn_written_numeric(&Name::new(String::from("Twenty-third Avenue NW"), 0)),
            vec![Name::new(String::from("23rd Avenue NW"), 0)]
        );

        assert_eq!(
            syn_written_numeric(&Name::new(String::from("North twenty-Third Avenue"), 0)),
            vec![Name::new(String::from("North 23rd Avenue"), 0)]
        );

        assert_eq!(
            syn_written_numeric(&Name::new(String::from("TWENTY-THIRD Avenue"), 0)),
            vec![Name::new(String::from("23rd Avenue"), 0)]
        );
    }

    #[test]
    fn test_str_remove_octo() {
        assert_eq!(
            str_remove_octo(&String::from("Highway #12 West")),
            Some(String::from("Highway 12 West"))
        );

        assert_eq!(
            str_remove_octo(&String::from("RTe #1")),
            Some(String::from("RTe 1"))
        );
    }
}
