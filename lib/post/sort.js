const _ = require('lodash');

/**
 * Exposes a post function to sort addressnumber clusters into a stable order before output
 * @param {Object} feat     GeoJSON Feature to stabilize
 * @return {Object}         Output GeoJSON feature to write to output
 */
function post(feat) {
    if (!feat || !feat.properties || !feat.properties['carmen:addressnumber']) return feat;

    for (let i = 0; i < feat.properties['carmen:addressnumber'].length; i++) {
        if (!feat.properties['carmen:addressnumber'][i] && !Array.isArray(feat.properties['carmen:addressnumber'][i])) continue;

        let nums = _.cloneDeep(feat.properties['carmen:addressnumber'][i]);
        let crds = [];

        nums.sort((a, b) => {
            return a - b;
        });

        for (let num of nums) {
            crds.push(feat.geometry.geometries[i].coordinates[feat.properties['carmen:addressnumber'][i].indexOf(num)]);
        }

        feat.properties['carmen:addressnumber'][i] = nums;
        feat.geometry.geometries[i].coordinates = crds;
    }

    return feat;
}

module.exports.post = post;
