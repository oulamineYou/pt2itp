const test = require('tape');
const dedupe = require('../index').dedupe;

test('dedupe (dataset)', (t) => {
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
    });

    t.end();
});

test('dedupe (hecate)', (t) => {
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
