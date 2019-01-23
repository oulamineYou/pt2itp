/**
 * Exposes a post function to add a numeric id value
 * @param {Object} feat     GeoJSON Feature to generate properties for
 * @param {Array} props     Properties that are allowed in output
 * @return {Object}         Output GeoJSON feature to write to output
 */
function post(feat) {
    if (!feat) return feat;

    if (props.length === 1) delete feat.properties.props;

    return feat;
}

module.exports.post = post;
