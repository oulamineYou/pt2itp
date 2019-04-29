use fancy_regex::{Regex, Captures};
use std::str;
use memchr::memchr;

pub trait ReplaceAll {
    fn replace_all(&self, text: &str, rep: &str) -> String;
}

impl ReplaceAll for Regex {
    fn replace_all(&self, text: &str, rep: &str) -> String {
        let mut input = text;
        let mut new = String::new();

        if rep.contains("$") {
            while input.len() > 0 {
                match self.captures(input).unwrap() {
                    None => {
                        new.push_str(&input);
                        break;
                    },
                    Some(m) => {
                        let pos = (m.pos(0).unwrap().0, m.pos(0).unwrap().1);
                        new.push_str(&input[..pos.0]);
                        expand_str(&m, &rep, &mut new);
                        input = &input[pos.1..];
                    }
                }
            }
        }
        else {
            while input.len() > 0 {
                match self.find(input).unwrap() {
                    None => {
                        new.push_str(&input);
                        break;
                    },
                    Some(m) => {
                        new.push_str(&input[..m.0]);
                        new.push_str(&rep);
                        input = &input[m.1..];
                    }
                }
            }
        }
        new
    }
}

/// The following functions, structs, and enums are copied from the core Rust regex crate
/// They add capture group replacement functionality currently not supported by fancy-regex
///  License MIT


/// A reference to a capture group in some text.
///
/// e.g., `$2`, `$foo`, `${foo}`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Ref<'a> {
    Named(&'a str),
    Number(usize),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct CaptureRef<'a> {
    cap: Ref<'a>,
    end: usize,
}

fn expand_str(
    caps: &Captures,
    mut replacement: &str,
    dst: &mut String,
) {
    while !replacement.is_empty() {
        match memchr(b'$', replacement.as_bytes()) {
            None => break,
            Some(i) => {
                dst.push_str(&replacement[..i]);
                replacement = &replacement[i..];
            }
        }
        if replacement.as_bytes().get(1).map_or(false, |&b| b == b'$') {
            dst.push_str("$");
            replacement = &replacement[2..];
            continue;
        }
        debug_assert!(!replacement.is_empty());
        let cap_ref = match find_cap_ref(replacement) {
            Some(cap_ref) => cap_ref,
            None => {
                dst.push_str("$");
                replacement = &replacement[1..];
                continue;
            }
        };
        replacement = &replacement[cap_ref.end..];
        match cap_ref.cap {
            Ref::Number(i) => {
                dst.push_str(
                    caps.at(i).map(|m| m).unwrap_or(""));
            }
            _ => panic!("dependency fancy-regex does not supported named capture groups")
        }
    }
    dst.push_str(replacement);
}

/// Parses a possible reference to a capture group name in the given text,
/// starting at the beginning of `replacement`.
///
/// If no such valid reference could be found, None is returned.
fn find_cap_ref<T: ?Sized + AsRef<[u8]>>(
    replacement: &T,
) -> Option<CaptureRef> {
    let mut i = 0;
    let rep: &[u8] = replacement.as_ref();
    if rep.len() <= 1 || rep[0] != b'$' {
        return None;
    }
    let mut brace = false;
    i += 1;
    if rep[i] == b'{' {
        brace = true;
        i += 1;
    }
    let mut cap_end = i;
    while rep.get(cap_end).map_or(false, is_valid_cap_letter) {
        cap_end += 1;
    }
    if cap_end == i {
        return None;
    }
    // We just verified that the range 0..cap_end is valid ASCII, so it must
    // therefore be valid UTF-8. If we really cared, we could avoid this UTF-8
    // check with either unsafe or by parsing the number straight from &[u8].
    let cap = str::from_utf8(&rep[i..cap_end])
                  .expect("valid UTF-8 capture name");
    // println!("cap {:#?}, cap.parse {:#?}", cap, cap.parse::<u32>());
    if brace {
        if !rep.get(cap_end).map_or(false, |&b| b == b'}') {
            return None;
        }
        cap_end += 1;
    }
    Some(CaptureRef {
        cap: match cap.parse::<u32>() {
            Ok(i) => Ref::Number(i as usize),
            Err(_) => Ref::Named(cap),
        },
        end: cap_end,
    })
}

/// Returns true if and only if the given byte is allowed in a capture name.
fn is_valid_cap_letter(b: &u8) -> bool {
    match *b {
        b'0' ... b'9' | b'a' ... b'z' | b'A' ... b'Z' | b'_' => true,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_replace() {
        assert_eq!(Regex::new("\\w+(?=!)").unwrap().replace_all("foo! foo foo! foo", "bar"), "bar! foo bar! foo");
        assert_eq!(Regex::new("(?:apartment|apt|bldg|building|rm|room|unit) #?(?:[A-Z]|\\d+|[A-Z]\\d+|\\d+[A-Z]|\\d+-\\d+[A-Z]?)").unwrap().replace_all("123 Main St apt #5", ""), "123 Main St ");
        assert_eq!(Regex::new("(?:floor|fl) #?\\d{1,3}").unwrap().replace_all("123 Main St floor 5", ""), "123 Main St ");
        assert_eq!(Regex::new("\\d{1,3}(?:st|nd|rd|th) (?:floor|fl)").unwrap().replace_all("123 Main St 5th floor", ""), "123 Main St ");
        assert_eq!(Regex::new("[１1]丁目").unwrap().replace_all("1丁目 意思", "一丁目"), "一丁目 意思");

        assert_eq!(Regex::new("([a-z]+)vagen").unwrap().replace_all("hi amanuensvagen hello", "${1}v"), "hi amanuensv hello");
        assert_eq!(Regex::new("([a-z]+)vagen").unwrap().replace_all("hi amanuensvagen hello gutenvagen", "${1}v"), "hi amanuensv hello gutenv");
        assert_eq!(Regex::new("((?!apartment|apt|bldg|building|rm|room|unit|fl|floor|ste|suite)[a-z]{2,}) # ?(?:[A-Z]|\\d+|[A-Z]\\d+|\\d+[A-Z]|\\d+-\\d+[A-Z]?)").unwrap().replace_all("123 main st floor #5", "$1"), "123 main st floor");
        assert_eq!(Regex::new("([^ ]+)(strasse|straße|str)").unwrap().replace_all("wilhelmstraße 3", "$1 str"), "wilhelm str 3");
    }
}
