const test = require('tape');
const dedupe = require('../index').dedupe;

test('dedupe (dataset)', (t) => {
    t.doesNotThrow(() => {
        dedupe({
            db: 'test',
            hecate: false,
            input: 'fixtures/dedupe.geojson',
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
            input: 'fixtures/dedupe.geojson',
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
