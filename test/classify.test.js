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

    while (line = rl.next()) {
        line = JSON.parse(line);

        t.equals(line.properties.expected, line.properties.accuracy);
    }

    t.end();
});

test('classify (hecate)', (t) => {
    try {
        fs.unlinkSync('/tmp/classifyout.geojson');
    } catch (err) {
        console.log('ok - no tmp files to clear');
    }

    t.doesNotThrow(() => {
        classify({
            db: 'pt_test',
            hecate: true,
            input: './test/fixtures/classify_hecate.geojson',
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

        output[line.id] = line;
    }

    t.deepEquals(output[0], undefined);

    t.deepEquals(output[1].properties.accuracy, output[1].properties.expected);

    t.deepEquals(output[2], undefined);

    t.deepEquals(output[3].properties.accuracy, output[3].properties.expected);

    t.deepEquals(output[4].properties.accuracy, output[4].properties.expected);

    t.deepEquals(output[5].properties.accuracy, output[5].properties.expected);

    t.deepEquals(output[6], undefined);

    t.deepEquals(output[7].properties.accuracy, output[7].properties.expected);

    t.deepEquals(output[8].properties.accuracy, output[8].properties.expected);

    t.deepEquals(output[9].properties.accuracy, output[9].properties.expected);

    t.end();
});
