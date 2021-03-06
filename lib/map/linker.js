'use strict';

const dist = require('fast-levenshtein').get;

/**
 * Generates a map of street => address based on text values - geometric proximity must be determined by parent
 * @param {Array} addrs Array of Objects containing information about the address
 * @param {Array} nets Array of street features to compare against address
 * @param {boolean} returnAll Optionally return all matches instead of only top matches
 * @return {false|Array} Return false if no match could be found or array of potential matches
 */
function linker(addrs, nets, returnAll) {
    let maxScore = false;
    returnAll = !!returnAll;

    // Ensure each matches are always returned before potential short-circuits
    for (const addr of addrs) {
        const eqNets = nets.filter((n) => { return n.name.tokenized === addr.tokenized; });
        if (eqNets.length) return eqNets.map((n) => {
            n.score = 100.0;
            return n;
        });

        // Handle Numered Streets (ie: 11th should never match 12th)
        addr.isNumbered = isNumbered(addr.tokenized);
        addr.isRoutish = isRoutish(addr.tokenized);
    }

    for (const addr of addrs) {
        for (let net_it = 0; net_it < nets.length; net_it++) {
            const net = nets[net_it];

            // don't bother considering if the tokenless forms don't share a starting letter
            // this might require adjustment for countries with addresses that have leading tokens which aren't properly stripped
            // from the token list
            if (net.name.tokenless && addr.tokenless && (net.name.tokenless[0] !== addr.tokenless[0])) continue;

            // Dont bother considering if both addr and network are a numbered street that don't match (1st != 11th)
            if (addr.isNumbered && addr.isNumbered !== isNumbered(net.name.tokenized)) continue;
            if (addr.isRoutish && addr.isRoutish !== isRoutish(net.name.tokenized)) continue;

            // use a weighted average w/ the tokenless dist score if possible
            let levScore;

            if (addr.tokenless && net.name.tokenless) {
                levScore = (0.25 * dist(addr.tokenized, net.name.tokenized)) + (0.75 * dist(addr.tokenless, net.name.tokenless));
            } else if ((addr.tokenless && !net.name.tokenless) || (!addr.tokenless && net.name.tokenless)) {
                levScore = dist(addr.tokenized, net.name.tokenized);
            } else {
                const ntoks = net.name.tokenized.split(' ');
                const numntoks = ntoks.length;
                let aMatch = 0;
                for (const atok of addr.tokenized.split(' ')) {
                    if (ntoks.indexOf(atok) > -1) {
                        ntoks.splice(ntoks.indexOf(atok), 1); // If there are dup tokens ensure they match a unique token ie Saint Street => st st != main st
                        aMatch++;
                    }
                }

                if (aMatch / numntoks > 0.66) levScore = aMatch / numntoks;

                // text_tokenless is unavailable for one or more of the features, but text is nonempty (it is not an unnamed road).
                // this can be due to an edge case like 'Avenue Street' in which all words are tokens.
                // in this case, short-circuit if one string is fully contained within another.

                if (!levScore) levScore = dist(addr.tokenized, net.name.tokenized);
            }

            // Calculate % Match
            const score = 100 - (((2 * levScore) / (net.name.tokenized.length + addr.tokenized.length)) * 100);

            nets[net_it].score = score;

            if (!maxScore || (score > maxScore)) maxScore = score;
        }
    }

    // score must be > 70% for us to return any matches
    const qualifyingNets = returnAll ? nets.slice(0) : nets.filter((n) => { return n.score === maxScore; });

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
    const toks = text.split(' ');

    const tests = [
        /^(([0-9]+)?1st)$/,
        /^(([0-9]+)?2nd)$/,
        /^(([0-9]+)?3rd)$/,
        /^([0-9]+th)$/
    ];

    for (const tok of toks) {
        for (const t of tests) {
            const m = tok.match(t);
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
    const toks = text.split(' ');

    for (const tok of toks) {
        const m = tok.match(/^\d+$/);
        if (m) return m[0];
    }

    return false;
}

module.exports = linker;
module.exports.isNumbered = isNumbered;
module.exports.isRoutish = isRoutish;
