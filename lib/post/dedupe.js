module.exports.post = (feat) => {
    if (!feat || !feat.properties || !feat.properties['carmen:addressnumber']) return;
    if (!Array.isArray(feat.properties['carmen:addressnumber'])) return;
    if (!feat.geometry || !feat.geometry.geometries || !feat.geometry.geometries.length) return;

    for (let i = 0; i < feat.properties['carmen:addressnumber'].length; i++) {
        if (!Array.isArray(feat.properties['carmen:addressnumber'][i])) continue;

        const num = [];
        const coords = [];

        for (let j = 0; j < feat.properties['carmen:addressnumber'][i][j].length; j++) {
            if (!Array.isArray(feat.properties['carmen:addressnumber'][i][j])) continue;

            if (!number.indexOf(feat.properties['carmen:addressnumber'][i][j]) === -1) {
                number.push(feat.properties['carmen:addressnumber'][i][j]);
                coords.push(feat.geometry.geometries[i].coordinates[j]);
            }
        }

        feat.properties['carmen:addressnumber'][i] = num;
        feat.geometry.geometries[i].coordinates = coords;
    }

    return feat;
}
