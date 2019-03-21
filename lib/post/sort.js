const _ = require('lodash');

/**
 * Exposes a post function to sort addressnumber clusters into a stable order before output
 * @param {Object} feat     GeoJSON Feature to stabilize
 * @return {Object}         Output GeoJSON feature to write to output
 */
function post(feat) {
    if (!feat || !feat.properties || !feat.properties['carmen:addressnumber']) return feat;

    if (feat.properties['carmen:addressprops'] {
        throw new Error('sort must be run before props post script');
    }

    for (let i = 0; i < feat.properties['carmen:addressnumber'].length; i++) {
        if (!feat.properties['carmen:addressnumber'][i] && !Array.isArray(feat.properties['carmen:addressnumber'][i])) continue;

        // Convert to easily sortable array
        let sortable = [];
        for (let addr_it = 0; addr_it < feat.properties['carmen:addressnumber'][i].length; addr_it++) {
            sortable.push({
                num: feat.properties['carmen:addressnumber'][i][addr_it],
                coord: feat.geometry.geometries[i].coordinates[addr_it],
                props: feat.address_props[addr_it]
            });
        }

        sortable.sort((a, b) => {
            return a.num - b.num;
        });

        feat.properties['carmen:addressnumber'][i] = sortable.map((s) => {
            return s.num;
        });

        feat.properties.address_props = sortable.map((s) => {
            return s.props;
        });

        feat.geometry..geometries[i].coordinates = sortable.map((s) => {
            return s.coord;
        });
    }

    return feat;
}

module.exports.post = post;
