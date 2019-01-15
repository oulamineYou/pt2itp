const Intersection = require('../lib/map/intersections');
const turf = require('@turf/turf');
const test = require('tape');
const fs = require('fs');

test('Intersections', async(t) => {
    try {
        const intsec = new Intersection();

        const res = await intsec.name([{
            a_street: [{
                display: 'Main Street'
            }],
            b_street: [{
                display: '1st Avenue'
            }],
            geom: JSON.stringify({
                type: 'Point',
                coordinates: [ 0, 0 ]
            })
        }], {
            country: 'ca'
        })

        t.ok(res[0].id);
        delete res[0].id;

        t.deepEquals(res, [{
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Street and 1st Avenue,1st Avenue and Main Street',
                'carmen:geocoder_stack': 'ca',
                'carmen:center': [ 0, 0 ],
                accuracy: 'intersection'
            },
            geometry: {
                type: 'Point',
                coordinates: [ 0, 0 ]
            }
        }]);
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('Intersections - Synonyms', async(t) => {
    try {
        const intsec = new Intersection();

        const res = await intsec.name([{
            a_street: [{
                display: 'Main Street'
            },{
                display: 'US Highway 2'
            }],
            b_street: [{
                display: '1st Avenue'
            }],
            geom: JSON.stringify({
                type: 'Point',
                coordinates: [ 0, 0 ]
            })
        }], {
            country: 'ca'
        });

        t.ok(res[0].id);
        delete res[0].id;

        t.deepEquals(res, [{
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Street and 1st Avenue,1st Avenue and Main Street,US Highway 2 and 1st Avenue,1st Avenue and US Highway 2',
                'carmen:geocoder_stack': 'ca',
                'carmen:center': [ 0, 0 ],
                accuracy: 'intersection'
            },
            geometry: {
                type: 'Point',
                coordinates: [ 0, 0 ]
            }
        }]);
    } catch (err) {
        t.error(err);
    }

    t.end();
});
