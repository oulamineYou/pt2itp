const dist = require('fast-levenshtein').get;
const diacritics = require('diacritics').remove

/**
 * Generates a map of street => address based on text values - geometric proximity must be determined by parent
 * @param {Object} addr Object containing information about the address
 * @param {Array} nets Array of street features to compare against address
 * @return {false|Array} Return false if no match could be found or array of potential matches
 */
function linker(addr, nets, returnAll) {
    let maxScore = false;
    returnAll = !!returnAll;

    //Ensure each matches are always returned before potential short-circuits
    eqNets = nets.filter((n) => { return n.name.tokenized === addr.tokenized; });
    if (eqNets.length) return eqNets.map((n) => {
        n.score = 100.0;
        return n;
    });

    //Handle Numered Streets (ie: 11th should never match 12th)
    addr.isNumbered = isNumbered(addr.tokenized);
    addr.isRoutish = isRoutish(addr.tokenized);

    for (let net_it = 0; net_it < nets.length; net_it++) {
        let net = nets[net_it];

        // don't bother considering if the tokenless forms don't share a starting letter
        // this might require adjustment for countries with addresses that have leading tokens which aren't properly stripped
        // from the token list
        if (net.name.tokenless && addr.tokenless && (net.name.tokenless[0] !== addr.tokenless[0])) continue;

        let netNumber = isNumbered(net.name.tokenized);
        let netRoutish = isRoutish(net.name.tokenized);
        //Dont bother considering if both addr and network are a numbered street that don't match (1st != 11th)
        if (addr.isNumbered && addr.isNumbered !== netNumber) continue;
        if (addr.isRoutish && addr.isRoutish !== netRoutish) continue;

        // use a weighted average w/ the tokenless dist score if possible
        let levScore;

        if (addr.tokenless && net.name.tokenless) {
            levScore = (0.25 * dist(addr.tokenized, net.name.tokenized)) + (0.75 * dist(addr.tokenless, net.name.tokenless));
        } else {
            // text_tokenless is unavailable for one or more of the features, but text is nonempty (it is not an unnamed road).
            // this can be due to an edge case like 'Avenue Street' in which all words are tokens.
            // in this case, short-circuit if one string is fully contained within another.
            if (net.name.display && addr.display) {
                let shorter, longer;
                if (addr.display.length > net.name.display.length) {
                    longer = diacritics(addr.display).toLowerCase();
                    shorter = diacritics(net.name.display).toLowerCase();
                } else {
                    shorter = diacritics(addr.display).toLowerCase();
                    longer = diacritics(net.name.display).toLowerCase();
                }

                if (longer.indexOf(shorter) !== -1) {
                    return nets.filter((n) => { return n.name.display === net.name.display; });
                }
            }

            if (!addr.tokenized || !addr.tokenized.length || !net.name.tokenized || !net.name.tokenized.length) continue;

            levScore = dist(addr.tokenized, net.name.tokenized);
        }

        //Calculate % Match
        let score = 100 - (((2 * levScore) / (net.name.tokenized.length + addr.tokenized.length)) * 100);

        nets[net_it].score = score;

        if (!maxScore || (score > maxScore)) maxScore = score;
    }

    // score must be > 70% for us to return any matches
    let qualifyingNets = returnAll ? nets.slice(0) : nets.filter((n) => { return n.score === maxScore; });

    if ((qualifyingNets.length > 0) && (maxScore > 70)) {
        return qualifyingNets;
    } else {
        return false;
    }
}

/**
 * Is the street a numered type street ie: 1st 2nd 3rd etc
 * @param {string} text Text to test against
 * @return {boolean|string}
 */
function isNumbered(text) {
    let toks = text.split(' ');

    let tests = [
        /^(([0-9]+)?1st)$/,
        /^(([0-9]+)?2nd)$/,
        /^(([0-9]+)?3rd)$/,
        /^([0-9]+th)$/,
    ]

    for (let tok of toks) {
        for (let t of tests) {
            let m = tok.match(t);
            if (m) return m[0];
        }
    }

    return false;
}

/**
 * Is the street route type number ie US Route 4
 * @param {string} text Text to test against
 * @return {boolean|string}
 */
function isRoutish(text) {
    let toks = text.split(' ');

    for (let tok of toks) {
        let m = tok.match(/^\d+$/);
        if (m) return m[0];
    }

    return false;
}

module.exports = linker;
module.exports.isNumbered = isNumbered;
module.exports.isRoutish = isRoutish;
