/**
 * Given a 2 features, compare them to see if a merge & modify operation is warranted
 *
 * @param {Object} known Persistent GeoJSON Point Feature with address properties
 * @param {Object} potential New GeoJSON Point Feature with address properties
 * @return {Object|false} New hecate compatible GeoJSON Feature or false
 */
modify(known, potential) {
    let modify = false;
    const names = JSON.parse(JSON.stringify(known.names));

    for (const pname of potential.properties.street) {
        const ptoken = tokenize.replaceToken(tokenRegex, tokenize.main(pname.display, this.opts.tokens, true).tokens.join(' '));

        let exists = false;
        for (const kname of known.names) {
            const ktoken = tokenize.replaceToken(tokenRegex, tokenize.main(kname.display, this.opts.tokens, true).tokens.join(' '));

            if (ktoken === ptoken) {
                exists = true;
                break;
            }
        }

        if (!exists) {
            names.push(pname);
            modify = true;
        }
    }

    if (!modify) return false;

    known.names = names;
    known.action = 'modify';

    return known;
}
}

module.exports = Compare;
