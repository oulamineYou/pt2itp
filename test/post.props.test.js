const post = require('../lib/post/props').post;
const test = require('tape');

test('Post: Props', (t) => {
    t.equals(post(), undefined);

    let props = [];

    let opts = { args: { props: props } };

    t.deepEquals(post({
        type: 'Feature',
        properties: { },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: { },
        geometry: { }
    }, 'handle no address_props');

    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{

            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: { },
        geometry: { }
    }, 'remove address_props if no props specified');

    t.end();
});
