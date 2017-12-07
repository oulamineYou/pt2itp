const turf = require('@turf/turf');
const iso = require('./iso.json');
const _ = require('lodash');

/**
 * Exposes a map function to convert/filter osm or minjur geometries to pt2itp formatted ones
 *
 * @param {Object} feat     GeoJSON feature to convert/filter
 * @return {Object|false}   Converted GeoJSON feature or false if it cannot be converted.
 */
function map(feat, context) {
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

    //Generate all possible name fields for all langs
    let targetKeys = ['name', 'loc_name', 'alt_name', 'ref'];
    targetKeys = targetKeys.concat(Object.keys(feat.properties).filter((k) => { return /(name_\d+)/.test(k); }));

    //Extract the actual names from the list of target keys
    for (let key of targetKeys) {
        if (!feat.properties[key]) continue;

        names = names.concat(feat.properties[key].split(';').filter((n) => { return !!n.trim().length }));
    }

    //Add any country/region specific function calls here
    for (let i = 0; i < names.length; i++) {

        //United States Specific Name Formatting
        if (context.country === 'us') {
            names[i] = reformatUSHighway(names[i]);

            if (context.region) names = names.concat(renameUSRoutes(context.region, names[i]));
        }
    }

    if (['track', 'service', 'construction', 'proposed', 'footway'].indexOf(feat.properties.highway) !== -1 && (names.length === 0))
        return false; // these classes of roads should only be allowed if they are already named

    if (turf.lineDistance(feat.geometry) < 0.001)
        return false;

    if (names.length === 0) {
        names.push('');
    } else { //Dedupe names array
        let newNames = [];

        for (let name of names) {
            if (newNames.indexOf(name) === -1) newNames.push(name);
        }
        names = newNames;
    }

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
        let m = map(feat, process.argv);
        if (!m) return;
        for (let n of m) {
            rl.output.write(JSON.stringify(n) + '\n');
        }
    });
}

/**
 * Replace names like "NC 1 => North Carolina Highway 1"
 * Replace names like "State Highway 1 => NC 1, North Carolina Highway 1
 * @param {string} region Region of the US, usually a state
 * @param {string} name Name to edit
 */
function renameUSRoutes(region, name) {
    if (!name) return;

    let names = [];

    region = region.toUpperCase();

    if (name.match(new RegExp(`^${region} [0-9]+`, 'i'))) {
        names.push(name.replace(new RegExp(`^${region} `, 'i'), `${iso.US.divisions[`US-${region}`]} Highway `));
        names.push(name.replace(new RegExp(`^${region} `, 'i'), `${iso.US.divisions[`US-${region}`]} Highway `));
    }

    if (name.match(/^State Highway /i)) {
        names.push(name.replace(/^State Highway /i, `${region} `));
        names.push(name.replace(/^State Highway /i, `${iso.US.divisions[`US-${region}`]} Highway `));
    }

    return names;
}

/**
 * Removes the octothorpe from names like "HWY #35", to get "HWY 35"
 * @param {string} name Name to edit
 */
function reformatUSHighway(name) {
    if (!name) return;

    let octothorpePattern = new RegExp('^(HWY |HIGHWAY )(#)(\\d+)$');

    let match = name.match(octothorpePattern);
    if (match) {
        let formattedName = `${match[1]}${match[3]}`;
        name = formattedName;
    }

    return name;
}

module.exports.map = map;
