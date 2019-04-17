/**
 * Exposes a post function to filter out orphan address clusters where:
 * - there's only one address in the cluster
 * - the 'carmen:text' is all numbers
 * - the 'carmen:text' is all punctuation (based on standard punctuation for US-ASCII)
 * - the feature doesn't contain a postcode property
 * @param {Object} feat     GeoJSON Feature for examination
 * @return {Object}         Output GeoJSON feature to write to output or false to drop feature
 */
function post(feat) {
    if (feat &&
        feat.properties &&
        !feat.properties['carmen:rangetype'] &&
        feat.properties['carmen:addressnumber'] &&
        Array.isArray(feat.properties['carmen:addressnumber']) &&
        Array.isArray(feat.properties['carmen:addressnumber'][0]) &&
        feat.properties['carmen:addressnumber'][0].length === 1 &&
        feat.properties['carmen:text'] &&
        (typeof feat.properties['carmen:text'] === 'string')
    ) {
        const text = feat.properties['carmen:text'].trim();

        if (!feat.properties.postcode ||
            /^\d+$/.test(text) ||
            (/^[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]+$/.test(text))
        ) return false;
    }
    return feat;
}

module.exports.post = post;
