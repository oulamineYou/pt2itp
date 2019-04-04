const fs = require('fs');
const test = require('tape');
const classify = require('../index').classify;
const ReadLine = require('n-readlines');

const db = require('./lib/db');
db.init(test);

test('classify (dataset)', (t) => {
    try {
        fs.unlinkSync('/tmp/classifyout.geojson');
    } catch (err) {
        console.log('ok - no tmp files to clear');
    }

    t.doesNotThrow(() => {
        classify({
            db: 'pt_test',
            input: './test/fixtures/classify.geojson',
            output: '/tmp/classifyout.geojson',
            parcels: './test/fixtures/classify_parcels.geojson',
            buildings: './test/fixtures/classify_buildings.geojson'
        });
    }, 'classify runs without err');

    t.doesNotThrow(() => {
        fs.accessSync('/tmp/classifyout.geojson');
    }, 'output exists');

    const rl = new ReadLine('/tmp/classifyout.geojson');

    const output = {};

    while (line = rl.next()) {
        line = JSON.parse(line);

        t.equals(line.properties.expected === line.properties.accuracy);
    }

    t.deepEquals(output[0]);

    t.end();
});
