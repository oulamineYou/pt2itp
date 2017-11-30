const post = require('../lib/post/centre').post;
const test = require('tape');

test('Post: Centre', (t) => {
     t.deepEquals(post({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                "type": "LineString",
                "coordinates": [ [ -68.66264104843138, 45.46536797816513 ], [ -68.64938020706177, 45.46925051979969 ] ]
            }]
        }
     }).properties['carmen:center'], []);

    t.end();
});
