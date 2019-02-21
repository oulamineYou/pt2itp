const test = require('tape');
const dedupe = require('../index').dedupe;

test('dedupe', (t) => {
    t.doesNotThrow(() => {
        dedupe({
            db: 'test',
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
