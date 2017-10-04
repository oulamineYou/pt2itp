/**
 * Exposes a post function to dedupe addresses within a given addressnumber cluster
 * @param {Object} feat     GeoJSON Feature to dedupe
 * @return {Object}         Output GeoJSON feature to write to output
 */
function post(feat) {
    if (!feat || !feat.properties || !feat.properties['carmen:addressnumber']) return feat;
    if (!Array.isArray(feat.properties['carmen:addressnumber'])) return feat;
    if (!feat.geometry || !feat.geometry.geometries || !feat.geometry.geometries.length) return feat;

    for (let i = 0; i < feat.properties['carmen:addressnumber'].length; i++) {
        if (!Array.isArray(feat.properties['carmen:addressnumber'][i])) continue;

        const number = [];
        const coords = [];

        for (let j = 0; j < feat.properties['carmen:addressnumber'][i].length; j++) {
            if (!feat.properties['carmen:addressnumber'][i][j]) continue;

            if (number.indexOf(feat.properties['carmen:addressnumber'][i][j]) === -1) {
                number.push(feat.properties['carmen:addressnumber'][i][j]);
                coords.push(feat.geometry.geometries[i].coordinates[j]);
            }
        }

        feat.properties['carmen:addressnumber'][i] = number;
        feat.geometry.geometries[i].coordinates = coords;
    }

    return feat;
}

module.exports.post = post;
