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
            hecate: false,
            input: './test/fixtures/classify.geojson',
            output: '/tmp/classifyout.geojson'
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

    t.deepEquals(output[0], {
        id: 6,
        type: 'Feature',
        properties: {
            names: [ { display: 'Main St', freq: 1, priority: 0, source: 'address', tokenized: 'main st', tokenless: 'main st' } ],
            number: '123a',
            source: 'rando'
        },
        geometry: {
            type: 'Point',
            coordinates: [ -77.4813687801361, 37.4999975371368 ]
        }

    }, 'feature 1');

    t.end();
});
