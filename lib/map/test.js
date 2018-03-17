/**
 * Example/test map that simply deletes all properties from an input feature
 *
 * @param {Object} feat     GeoJSON feature to convert/filter
 * @return {Object|false}   Converted GeoJSON feature or false if it cannot be converted.
 */
function map(feat) {
    feat.properties = {};

    return feat;
}

module.exports.map = map;
