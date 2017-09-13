const map = require('../lib/map/osmium').map;
const test = require('tape');

test('Osmium', (t) => {
    t.equals(map({
        type: 'Feature',
        geometry: {
            type: 'Polygon'
        }
    }), false, 'Feat must be a (Multi)LineString geom');

    t.equals(map({
        type: 'Feature',
        geometry: {
            type: 'LineString'
        }
    }), false, 'Feat must have Properties');

    t.equals(map({
        type: 'Feature',
        properties: { },
        geometry: {
            type: 'LineString'
        }
    }), false, 'Feat must have Highway');

    t.equals(map({
        type: 'Feature',
        properties: {
            name: 'Test',
            highway: 'fake'
        },
        geometry: {
            type: 'LineString'
        }
    }), false, 'Feat must be valid Highway');

    t.equals(map({
        type: 'Feature',
        properties: {
            name: 'Test',
            highway: 'primary'
        },
        geometry: {
            type: 'LineString',
            coordinates: [[0,0], [0,0]]
        }
    }), false, 'Feat must have length');

    //Streets allowed to be missing names
    for (let type of ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'pedestrian', 'road']) {
        t.deepEquals(map({
            type: 'Feature',
            properties: {
                highway: type
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0,0],[1,1]]
            }
        }), { geometry: { type: 'LineString', coordinates: [[0,0], [1,1]] }, properties: { street: '' }, type: 'Feature' }, `${type} is accepted`);
    }

    //Streets required to have names as they are lower quality tags
    for (let type of ['track', 'service', 'construction', 'proposed', 'footway']) {
        t.equals(map({
            type: 'Feature',
            properties: {
                highway: type
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0,0],[1,1]]
            }
        }), false, `${type} requires name`);
    }

    for (let type of ['track', 'service', 'construction', 'proposed', 'footway']) {
        t.deepEquals(map({
            type: 'Feature',
            properties: {
                highway: type,
                name: 'Test'
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0,0],[1,1]]
            }
        }), { geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] }, properties: { street: 'Test' }, type: 'Feature' }, `${type} is accepted w/ name`);
    }

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            highway: 'motorway',
            name: 'name',
            loc_name: 'loc_name',
            alt_name: 'alt_name'
        },
        geometry: {
            type: 'LineString',
            coordinates: [[0,0],[1,1]]
        }
    }), { geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] }, properties: { street: [ 'name', 'loc_name', 'alt_name' ] }, type: 'Feature' }, 'AltNames');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            highway: 'motorway',
            name: '1 Name;2 Name;3 Name'
        },
        geometry: {
            type: 'LineString',
            coordinates: [[0,0],[1,1]]
        }
    }), { geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] }, properties: { street: [ '1 Name', '2 Name', '3 Name' ] }, type: 'Feature' }, 'OSM ; AltNames');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            highway: 'motorway',
            name: '1 Name; '
        },
        geometry: {
            type: 'LineString',
            coordinates: [[0,0],[1,1]]
        }
    }), { geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] }, properties: { street: '1 Name' }, type: 'Feature' }, 'OSM ; AltNames null');

    t.end();
});

