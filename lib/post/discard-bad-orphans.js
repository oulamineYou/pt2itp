'use strict';

/**
 * Exposes a post function to filter out orphan address clusters where:
 * - there's only one address in the cluster
 * - the 'carmen:text' is all numbers
 * - the 'carmen:text' is all punctuation (based on standard punctuation for US-ASCII)
 * - the feature doesn't contain an 'override:postcode' property
 * @param {Object} feat     GeoJSON Feature for examination
 * @return {Object}         Output GeoJSON feature to write to output or false to drop feature
 */
function post(feat) {
    if (feat &&
        feat.properties &&
        !feat.properties['carmen:rangetype'] &&

        Array.isArray(feat.properties['carmen:addressnumber']) &&
        Array.isArray(feat.properties['carmen:addressnumber'][0]) &&
        feat.properties['carmen:addressnumber'][0].length === 1 &&

        typeof feat.properties['carmen:text'] === 'string'
    ) {
        if (feat.properties.address_props) throw new Error('discard-bad-orphans must be run after the props post script');

        const text = feat.properties['carmen:text'].trim();

        if (!feat.properties['override:postcode'] ||
            /^\d+$/.test(text) ||
            /^[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~]+$/.test(text)
        ) return false;
    }
    return feat;
}

module.exports.post = post;
