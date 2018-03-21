/**
 * Detect Strings like `5 Avenue` and return a synonym
 * like `5th Avenue` where possible
 *
 * @param {string} text String to test for numeric value
 * @return {false|string} Optionally return synonym
 */
function number_suffix(text = '') {
    let numericNameMatch = text.match(/^(\d+)(\s+\w.*)$/i);

    if (!numericNameMatch) return;

    let num = parseInt(numericNameMatch[1]);
    let rest = numericNameMatch[2];
    let suffix = false;

    if (((num % 100) >= 10) && ((num % 100) <=20)) {
        suffix = 'th';
    } else if ((num % 10) === 1) {
        suffix = 'st';
    } else if ((num % 10) === 2) {
        suffix = 'nd';
    } else if ((num % 10) === 3) {
        suffix = 'rd';
    } else {
        suffix = 'th';
    }

    if (suffix) return num.toString() + suffix + rest;
}

/**
 * One -> Twenty are handled as geocoder-abbrev. Because Twenty-First has a hyphen, which is converted
 * to a space by the tokenized, these cannot currently be managed as token level replacements and are handled
 * as synonyms instead
 *
 * @param {string} text Name to test and potentially make a synonym for
 * @return {string|false} Optionally return a new synonym string
 */
function written_numeric(text = '') {
    let match = text.match(/(Twenty|Thirty|Fourty|Fifty|Sixty|Seventy|Eighty|Ninety)-(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth)/i);
    if (!match) return;

    let num = {
        twenty: '2', thirty: '3', fourty: '4', fifty: '5', sixty: '6', seventy: '7', eighty: '8', ninety: '9',
        first: '1st', second: '2nd', third: '3rd', fourth: '4th', fifth: '5th', sixth: '6th', seventh: '7th', eighth: '8th', ninth: '9th'
    };

    return text.replace(RegExp(match[0], 'i'), num[match[1].toLowerCase()] + num[match[2].toLowerCase()])
}

module.exports = {
    written_numeric: written_numeric,
    number_suffix: number_suffix
};
