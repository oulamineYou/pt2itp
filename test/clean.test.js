const fs = require('fs');
const test = require('tape');
const path = require('path');
const clean = require('../lib/clean');

test('Clean', (t) => {
    clean({
        input: path.resolve(__dirname, 'fixtures/clean_address.geojson'),
        output: '/tmp/pt2itp_clean_address.geojson',
        _: [ null, null, null, 'test' ]
    }, (err, res) => {
        t.ifError(err);

        t.deepEquals(JSON.parse(fs.readFileSync('/tmp/pt2itp_clean_address.geojson')), {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [ 0, 0 ] }
        });
        t.end();
    });
});
