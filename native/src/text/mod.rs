mod diacritics;

pub use self::diacritics::diacritics;
use regex::Regex;

///
/// Detect Strings like `5 Avenue` and return a synonym like `5th Avenue` where possible
///
pub fn number_suffix(text: String) -> String {
    lazy_static! {
        static ref NUMSUFFIX: Regex = Regex::new(r"(?i)^(?P<number>\d+)\s+(?P<name>\w.*)$").unwrap();
    }

    match NUMSUFFIX.captures(text.as_str()) {
        Some(capture) => {
            let num: i64 = match capture["number"].parse() {
                Ok(num) => num,
                _ => {
                    return text
                }
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

            String::from(format!("{}{} {}", num, suffix, &capture["name"]))
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

    #[test]
    fn test_number_suffix() {
        assert_eq!(
            number_suffix(String::from("1 Avenue")),
            String::from("1st Avenue")
        );

        assert_eq!(
            number_suffix(String::from("2 Avenue")),
            String::from("2nd Avenue")
        );

        assert_eq!(
            number_suffix(String::from("3 Street")),
            String::from("3rd Street")
        );

        assert_eq!(
            number_suffix(String::from("4 Street")),
            String::from("4th Street")
        );

        assert_eq!(
            number_suffix(String::from("20 Street")),
            String::from("20th Street")
        );

        assert_eq!(
            number_suffix(String::from("21 Street")),
            String::from("21st Street")
        );
    }

    #[test]
    fn test_written_numeric() {
        assert_eq!(
            written_numeric(String::from("Twenty-third Avenue NW")),
            String::from("")
        );

        assert_eq!(
            written_numeric(String::from("North twenty-Third Avenue")),
            String::from("")
        );

        assert_eq!(
            written_numeric(String::from("TWENTY-THIRD Avenue")),
            String::from("")
        );
    }
}
