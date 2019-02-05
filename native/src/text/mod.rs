mod diacritics;

pub use self::diacritics::diacritics;
use regex::Regex;

/// 
/// Detect Strings like `5 Avenue` and return a synonym like `5th Avenue` where possible
/// 
pub fn number_suffix(text: String) -> String {
    lazy_static! {
        static ref NUMSUFFIX: Regex = Regex::new(r"(?i)^(?P<number>\d+)(?P<name>\s+\w.*)$").unwrap();
    }

    match NUMSUFFIX.captures(text.as_str()) {
        Some(capture) => {
            let num: i64 = match capture["number"].parse() {
                Ok(num) => num,
                _ => {
                    return text
                }
            };

            text
        },
        None => text
    }
} 

pub fn written_numeric(text: String) -> String {
    text
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::*;

    #[test]
    fn test_written_numeric() {
        let names = Names::new(vec![Name::new(String::from("Twenty-third Avenue NW"), &None)]);

        let names = Names::new(vec![Name::new(String::from("North twenty-Third Avenue"), &None)]);

        let names = Names::new(vec![Name::new(String::from("TWENTY-THIRD Avenue"), &None)]);
    }

    #[test]
    fn test_number_suffix() {

    }
}
