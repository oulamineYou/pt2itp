const dist = require('fast-levenshtein').get;
const diacritics = require('diacritics').remove

/**
 * Generates a map of street => address based on text values - geometric proximity must be determined by parent
 * @param {Object} street Object containing information about the street
 * @param {Array} addresses Array of address features to compare against street
 * @return {false|Array} Return false if no match could be found or array of potential matches
 */
function linker(street, addresses) {
    let maxScore = false;

    for (let addr_it = 0; addr_it < addresses.length; addr_it++) {
        let address = addresses[addr_it];

        // Short Circuit if the text is exactly the same
        if (address.text === street.text)
            return addresses.filter((a) => { return a.text === street.text; });

        // don't bother considering if the tokenless forms don't share a starting letter
        // this might require adjustment for countries with addresses that have leading tokens which aren't properly stripped
        // from the token list
        if (address.text_tokenless && street.text_tokenless && (address.text_tokenless[0] !== street.text_tokenless[0]))
            continue;

        // use a weighted average w/ the tokenless dist score if possible
        let levScore;
        if (street.text_tokenless && address.text_tokenless) {
            levScore = (0.25 * dist(street.text, address.text)) + (0.75 *  dist(street.text_tokenless, address.text_tokenless));
        } else {
            // text_tokenless is unavailable for one or more of the features, but text is nonempty (it is not an unnamed road).
            // this can be due to an edge case like 'Avenue Street' in which all words are tokens.
            // in this case, short-circuit if one string is fully contained within another.
            if (address._text && street._text) {
                let shorter, longer;
                if (street._text.length > address._text.length) {
                    longer = diacritics(street._text).toLowerCase();
                    shorter = diacritics(address._text).toLowerCase();
                }
                else {
                    shorter = diacritics(street._text).toLowerCase();
                    longer = diacritics(address._text).toLowerCase();
                }
                if (longer.indexOf(shorter) !== -1)
                    return addresses.filter((a) => { return a._text === address._text; });
            }

            if (!street.text || !street.text.length || !address.text || !address.text.length)
                continue;

            levScore = dist(street.text, address.text);
        }

        //Calculate % Match
        let score = 100 - (((2 * levScore) / (address.text.length + street.text.length)) * 100);

        addresses[addr_it].score = score;

        if (!maxScore || (score > maxScore))
            maxScore = score;
    }

    // score must be > 40% for us to return any matches
    let qualifyingAddresses = addresses.filter((a) => { return a.score === maxScore; });
    if ((qualifyingAddresses.length > 0) && (maxScore > 40))
        return qualifyingAddresses;
    else
        return false;
}

module.exports = linker;
