/*eslint no-lonely-if: "off"*/ // <-- complying with this linting rule would reduce code readability

const wordBoundary = new RegExp("[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\!\"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_{|}~]+", 'g');
const allowedAfterSpace = new RegExp("[()#<>\\[\\]{}\"]+");
const diacritics = require('diacritics').remove;
const dist = require('fast-levenshtein').get
const numCaseChanges = require('./util').numCaseChanges;
const isUpperCase = require('./util').isUpperCase;
const _ = require('lodash');

module.exports = (opts = {}) => {
    // for the time being we only use en rules -- supporting culturally correct capitalization
    // conventions is an effort that has to span layers beyond just address
    let titleCaseConfig = require('@mapbox/title-case')('en');

    return (texts) => {
        texts = _.uniqBy(texts, (name) => {
            return name.display
        }).filter((name) => {
            //Eliminate empty names
            if (!name.display.trim()) return false;
            return true;
        }).sort((a, b) => {
            //Higher Priority beats favor
            if (a.priority !== b.priority) return b.priority - a.priority;

            //Favor longer display text when tokenized matches (usually the unabbreviated form)
            if (a.tokenized == b.tokenized) {
                return b.display.length - a.display.length;
            }

            //Favor breaks ties (address vs network)
            if (a.source == opts.favor) return -1;
            if (b.source == opts.favor) return 1;

            return 0;
        });

        return _.uniqBy(texts, (name) => {
            return name.tokenized;
        }).map((name) => {
            name.display = titleCase(name.display.trim(), titleCaseConfig);
            return name;
        }).sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            if (a.source == opts.favor) return -1;
            if (b.source == opts.favor) return 1;
            return 0;
        }).reduce((acc, name) => {
            if (!acc) return name.display;
            return `${acc},${name.display}`;
        }, '');
    };
};

/**
 * Title case a given string except for minors
 * @param {string} text Text to be titlecased
 * @param {Array} config Object containing @mapbox/title-case configuration
 */
function titleCase(text, config) {
    config.minors = config.minors || [];
    config.pre = config.pre || [];
    config.post = config.post || [];
    let separators = [];
    for (let separator = wordBoundary.exec(text); !!separator; separator = wordBoundary.exec(text)) {
        // preserve the characters separating words, collapsing runs of whitespace but preserving other stuff
        let sep = '';
        for (let sep_i = 0; sep_i < separator[0].length; sep_i++) {
            let lastCharIsSpace = (sep_i > 0) && (sep[sep.length - 1] === ' ');
            if (!(/\s/.test(separator[0][sep_i]))) {
                // don't add separators at the beginning of words (after spaces)
                if (!lastCharIsSpace || allowedAfterSpace.test(separator[0][sep_i]))
                    sep += separator[0][sep_i];
            } else if (!lastCharIsSpace) {
                sep += ' ';
            }
        }
        separators.push(sep);
    }
    text = config.pre.reduce((prev, cur) => { return cur(prev); }, text);

    text = text
        .split(wordBoundary)
        .map((y) => { return y.toLowerCase(); })
        .reduce((prev, cur, i) => {
            if (i > 0)
                prev.push(separators[i-1]);
            if (cur.length > 0) {
                if (config.minors.indexOf(cur) !== -1)
                    prev.push(cur);
                else
                    prev.push(cur[0].toUpperCase() + cur.slice(1));
            }
            return prev;
        }, [])
        .join('');

    return config.post.reduce((prev, cur) => { return cur(prev); }, text);
}

/**
 * Title case a given string except for minors
 * @param {string} text Text to be titlecased
 * @param {Array} config Object containing @mapbox/title-case configuration
 */
function titleCase(text, config) {
    config.minors = config.minors || [];
    config.pre = config.pre || [];
    config.post = config.post || [];
    let separators = [];
    for (let separator = wordBoundary.exec(text); !!separator; separator = wordBoundary.exec(text)) {
        // preserve the characters separating words, collapsing runs of whitespace but preserving other stuff
        let sep = '';
        for (let sep_i = 0; sep_i < separator[0].length; sep_i++) {
            let lastCharIsSpace = (sep_i > 0) && (sep[sep.length - 1] === ' ');
            if (!(/\s/.test(separator[0][sep_i]))) {
                // don't add separators at the beginning of words (after spaces)
                if (!lastCharIsSpace || allowedAfterSpace.test(separator[0][sep_i]))
                    sep += separator[0][sep_i];
            } else if (!lastCharIsSpace) {
                sep += ' ';
            }
        }
        separators.push(sep);
    }
    text = config.pre.reduce((prev, cur) => { return cur(prev); }, text);

    text = text
        .split(wordBoundary)
        .map((y) => { return y.toLowerCase(); })
        .reduce((prev, cur, i) => {
            if (i > 0)
                prev.push(separators[i-1]);
            if (cur.length > 0) {
                if (config.minors.indexOf(cur) !== -1)
                    prev.push(cur);
                else
                    prev.push(cur[0].toUpperCase() + cur.slice(1));
            }
            return prev;
        }, [])
        .join('');

    return config.post.reduce((prev, cur) => { return cur(prev); }, text);
}


module.exports.titleCase = titleCase;
