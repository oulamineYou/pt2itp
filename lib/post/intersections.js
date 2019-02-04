/**
 * Exposes a post function to add a numeric id value
 * @param {Object} feat     GeoJSON Feature to generate properties for
 * @param {Array} opts      Post options
 * @return {Object}         Output GeoJSON feature to write to output
 */
function post(feat, opts) {
    if (!feat) return feat;

    let output_intersections = opts.args.intersections ? opts.args.intersections : false;

    if (!output_intersections || !feat.properties['carmen:intersections']) {
        delete feat.properties['carmen:intersections'];
        return feat;
    }

    if (!feat || !feat.properties || !feat.properties['carmen:text']) return feat;

    // Remove duplicative synonyms & pick intersection vs carmen:text street name
    for (let intersection of feat.properties['carmen:intersections']) {
    }

    return feat;
}

function dedupe(intersection_name) {
    intersection.forEach((k) => {
        feat.properties[k] = opts.label(feat.properties[k])

        if (feat.properties[k].split(',').length > 10) {
            console.error(`ok - WARN too many synonyms - truncating!: {}`, feat.properties[k]);
            feat.properties[k] = feat.properties[k].split(',').splice(0, 10).join(',');
        }
    });
}

module.exports.post = post;
