/**
 * Exposes a post function to add a numeric id value
 * @param {Object} feat     GeoJSON Feature to generate properties for
 * @param {Array} opts      Post options
 * @return {Object}         Output GeoJSON feature to write to output
 */
function post(feat, opts) {
    if (!feat) return feat;

    let props = opts.args.props ? opts.args.props : [];

    if (props.length === 0) delete feat.properties.address_props;

    for (let prop of props) {

    }

    return feat;
}

module.exports.post = post;
