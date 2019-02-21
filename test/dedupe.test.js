const fs = require('fs');
const test = require('tape');
const dedupe = require('../index').dedupe;
const ReadLine = require('n-readlines');

test('dedupe (dataset)', (t) => {
    try {
        fs.unlinkSync('/tmp/dedupeout.geojson');
    } catch (err) {
        console.error('ok - no tmp files to clear');
    }

    t.doesNotThrow(() => {
        dedupe({
            db: 'test',
            hecate: false,
            input: './test/fixtures/dedupe.geojson',
            output: '/tmp/dedupeout.geojson',
            tokens: 'en',
            context: {
                country: 'us',
                region: 'dc'
            }
        });
    }, 'dedupe runs without err');

    t.doesNotThrow(() => {
        fs.accessSync('/tmp/dedupeout.geojson');
    }, 'output exists');

    const rl = new ReadLine('/tmp/dedupeout.geojson');

    const output = {};

    while (line = rl.next()) {
        line = JSON.parse(line);

        output[line.id] = line;
    }

    t.deepEquals(Object.keys(output), [
        '1',        // ID 1 & 2 should be collapsed to only ID 1 (duplicate geom/number/street)
        '3', '4',   // ID 3 & 4 should be output - duplicate number/street but not geom
        '5', '6'    // ID 5 & 6 should be output - duplicate street/geom - 123 vs 123a for number
    ], 'output ids as expected');

    t.end();
});

test('dedupe (hecate)', (t) => {
    try {
        fs.unlinkSync('/tmp/dedupeout.geojson');
    } catch (err) {
        console.error('ok - no tmp files to clear');
    }

    t.doesNotThrow(() => {
        dedupe({
            db: 'test',
            hecate: true,
            input: './test/fixtures/dedupe.geojson',
            output: '/tmp/dedupeout.geojson',
            tokens: 'en',
            context: {
                country: 'us',
                region: 'dc'
            }
        });
    });

    t.end();
});
