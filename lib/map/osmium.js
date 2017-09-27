const turf = require('@turf/turf');

/**
 * Exposes a map function to convert/filter osm or minjur geometries to pt2itp formatted ones
 *
 * @param {Object} feat     GeoJSON feature to convert/filter
 * @return {Object|false}   Converted GeoJSON feature or false if it cannot be converted.
 */
function map(feat) {
    //Skip points & Polygons
    if (feat.geometry.type !== 'LineString' && feat.geometry.type !== 'MultiLineString') return false;

    //Skip non-highways
    if (!feat.properties || !feat.properties.highway) return false;

    let accepted = [
        'motorway',
        'trunk',
        'primary',
        'secondary',
        'tertiary',
        'residential',
        'unclassified',
        'living_street',
        'pedestrian',
        'service',
        'track',
        'road',
        'construction',
        'proposed',
        'footway'
    ];

    //Eliminate all highway types not on accepted list
    if (accepted.indexOf(feat.properties.highway) === -1) return false;

    let names = [];

    /**
     * Take a name value and check for dups/synonyms and push or discard into full name list
     * @param {string} name Name to split/discard
     */
    function addName(name) {
        if (!name) return;

        //OSM uses ; to separate in a single value
        name = name.split(';');

        for (let n of name) {
            if (n && (n.trim().length > 0) && (names.indexOf(n) === -1)) {
                names.push(n);
            }
        }
    }

    let targetKeys = ['name', 'loc_name', 'alt_name'];
    targetKeys = targetKeys.concat(Object.keys(feat.properties).filter((k) => { return /(name_\d+)/.test(k); }));
    for (let key of targetKeys) {
        addName(feat.properties[key]);
    }
    // tiger names come in name_base and name_type pairs, sometimes with a trailing /_\d+/
    if (feat.properties['tiger:name_base'] && feat.properties['tiger:name_type']) {
        feat.properties['tiger:name_combo'] = `${feat.properties['tiger:name_base']} ${feat.properties['tiger:name_type']}`;
        targetKeys.push('tiger:name_combo');
    }
    for (let i = 1; i < 10; i++) { // cap at 10 -- I've never seen more than 1
        if (feat.properties[`tiger:name_base_${i}`] && feat.properties[`tiger:name_type_${i}`]) {
            feat.properties[`tiger:name_combo_${i}`] = feat.properties[`tiger:name_base_${i}`] + ' ' + feat.properties[`tiger:name_type_${i}`];
            targetKeys.push(`tiger:name_combo_${i}`);
        }
    }

    if (['track', 'service', 'construction', 'proposed', 'footway'].indexOf(feat.properties.highway) !== -1 && (names.length === 0))
        return false; // these classes of roads should only be allowed if they are already named

    if (turf.lineDistance(feat.geometry) < 0.001)
        return false;

    if (names.length === 0)
        names.push('');

    return names.map((name) => {
        return {
            type: 'Feature',
            properties: {
                id: feat.properties['@id'],
                street: name
            },
            geometry: feat.geometry
        };
    });
}

if (require.main === module) {
    const readline = require('readline');

    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', (pt) => {
        if (!pt) return;

        let feat = null;
        try {
            feat = JSON.parse(pt);
        } catch (err) {
            return;
        }
        if (!feat) return;
        let m = map(feat);
        if (!m) return;
        for (let n of m)
            rl.output.write(JSON.stringify(n) + '\n');
    });
}

module.exports.map = map;
