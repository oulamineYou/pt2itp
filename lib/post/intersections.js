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

    const intersections = feat.properties['carmen:intersections'].map((intersection) => {
        if (feat.properties['internal:nid'] === intersection.a_id) {
            return {
                street: intersection.a_street,
                geom: intersection.geom
            };
        } else if (feat.properties['internal:nid'] === intersection.b_id) {
            return {
                street: intersection.b_street,
                geom: intersection.geom
            };
        }
    });

    if (!intersections.length) {
        delete feat.properties['carmen:intersections'];
        return feat;
    }

    feat.geometry.geometries.push({
        type: 'MultiPoint',
        coordinates: []
    });


    let final = [];

    for (let intersection of intersections) {
        const streets = opts.label(intersection.street).split(',');

        for (const st of streets) {
            final.push(st);
            feat.geometry.geometries[feat.geometry.geometries.length - 1].coordinates.push(intersection.geom.coordinates);
        }
    }

    feat.properties['carmen:intersections'] = final;

    return feat;
}

module.exports.post = post;
