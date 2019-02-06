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
/// Replace names like "NC 1 => North Carolina Highway 1"
/// Replace names like "State Highway 1 => NC 1, North Carolina Highway 1
///
fn syn_state_hwy(name: &Name, context: &Context) -> Vec<Name> {

    let region = match context.region {
        Some(ref region) => region,
        None => { return Vec::new() }
    };

    // the goal is to get all the input highways to <state> #### and then format the matrix

    lazy_static! {
        static ref PRE_HWY: Regex = Regex::new(r"
            (?ix)^
            (?P<prefix>
              # State 123
              # State Highway 123
              (State\s(highway|hwy|route|rte)\s)

              ## North Carolina 123
              ## North Carolina Highway 123
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
    //
    // TODO
    if name.priority <= 0 {
        syns.push(Name::new(format!(" {}", &highway), 0));
    } else {
        syns.push(Name::new(format!(" {}", &highway), 1));
    }

    syns
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Name;

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
