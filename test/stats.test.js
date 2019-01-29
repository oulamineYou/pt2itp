const stats = require('../native/index.node').stats;
const test = require('tape');
const path = require('path');
const os = require('os');

test('Stats - MultiPoint Orphan', (t) => {
    let res = stats({
        input: String(path.resolve(__dirname, 'fixtures/stats.orphan-mp'))
    });

    t.deepEquals(res, {
        feats: 1,
        clusters: 0,
        invalid: 0,
        addresses: 2,
        intersections: 0,
        address_orphans: 1,
        network_orphans: 0
    }, 'has 2 addresses');

    t.end();
});

test('Stats - GeometryCollection Orphan', (t) => {
    let res = stats({
        input: String(path.resolve(__dirname, 'fixtures/stats.orphan'))
    });

    t.deepEquals(res, {
        feats: 1,
        clusters: 0,
        invalid: 0,
        addresses: 2,
        intersections: 0,
        address_orphans: 1,
        network_orphans: 0
    }, 'has 2 addresses');

    t.end();
});

