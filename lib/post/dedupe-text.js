/**
 * Exposes a post function to dedupe synonyms on features
 * @param {Object} feat     GeoJSON Feature to dedupe
 * @return {Object}         Output GeoJSON feature to write to output
 */
function post(feat) {
    if (!feat || !feat.properties) return feat;

    Object.keys(feat.properties)
        .filter((k) => { return k.indexOf('carmen:text') === 0; })
        .forEach((k) => {
            let observedText = {};
            feat.properties[k] = feat.properties[k].split(',').reduce((prev, cur) => {
                if (!observedText[cur]) {
                    observedText[cur] = true;
                    prev.push(cur);
                }
                return prev;
            }, [])
            .join(',');
        });

    return feat;
}

module.exports.post = post;
