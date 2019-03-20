const post = require('../lib/post/props').post;
const test = require('tape');

test('Post: Props', (t) => {
    t.equals(post(), undefined);

    let opts = { args: { props: [] } };

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

    opts.args.props = ['accuracy'];
    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                accuracy: 'parcel'
            },{
                accuracy: 'building'
            },{
                accuracy: 'parcel'
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: {
            accuracy: 'parcel',
            'carmen:addressprops': {
                accuracy: {
                    1: 'building'
                }
            }
        },
        geometry: { }
    }, 'Basic addressprops example');

    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                accuracy: 'parcel'
            },{
                accuracy: 'building'
            },{
                accuracy: 'parcel'
            },{
                accuracy: 'entrance'
            },{
                accuracy: 'door'
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: {
            accuracy: 'parcel',
            'carmen:addressprops': {
                accuracy: {
                    1: 'building',
                    3: 'entrance',
                    4: 'door'
                }
            }
        },
        geometry: { }
    }, 'Multiple conflicting props');

    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                accuracy: 'parcel'
            },{
                accuracy: 'parcel'
            },{
                accuracy: 'parcel'
            },{
                accuracy: 'parcel'
            },{
                accuracy: 'parcel'
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: {
            accuracy: 'parcel'
        },
        geometry: { }
    }, 'All props the same');

    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                accuracy: 'parcel'
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: {
            accuracy: 'parcel'
        },
        geometry: { }
    }, 'All props the same (single)');

    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                accuracy: 'parcel',
                undesired: 'test'
            },{
                accuracy: 'building',
                fake: true
            },{
                accuracy: 'parcel',
                zip: 123
            },{
                accuracy: 'entrance',
                door: 2
            },{
                accuracy: 'door'
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: {
            accuracy: 'parcel',
            'carmen:addressprops': {
                accuracy: {
                    1: 'building',
                    3: 'entrance',
                    4: 'door'
                }
            }
        },
        geometry: { }
    }, 'Multiple conflicting props w/ undesired props');

    opts.args.props = ['accuracy', 'door'];
    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                accuracy: 'parcel',
                undesired: 'test'
            },{
                accuracy: 'building',
                fake: true
            },{
                accuracy: 'parcel',
                zip: 123
            },{
                accuracy: 'entrance',
                door: 'I am door'
            },{
                accuracy: 'door'
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: {
            accuracy: 'parcel',
            'carmen:addressprops': {
                accuracy: {
                    1: 'building',
                    3: 'entrance',
                    4: 'door'
                },
                door: {
                    3: 'I am door'
                }
            }
        },
        geometry: { }
    }, 'Multiple conflicting props w/ undesired props');

    opts.args.props = [ 'override:postcode' ];
    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                'override:postcode': null
            },{
                'override:postcode': null
            },{
                'override:postcode': null
            },{
                'override:postcode': null
            },{
                'override:postcode': null
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: { },
        geometry: { }
    }, 'All null values are omitted entirely');

    opts.args.props = [ 'override:postcode' ];
    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                'override:postcode': undefined
            },{
                'override:postcode': undefined
            },{
                'override:postcode': null
            },{
                'override:postcode': null
            },{
                'override:postcode': null
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: { },
        geometry: { }
    }, 'Null & Undefined values are treated identically');

    opts.args.props = [ 'override:postcode' ];
    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                'override:postcode': '20002'
            },{
                'override:postcode': '20002'
            },{
                'override:postcode': '20002'
            },{
                'override:postcode': null
            },{
                'override:postcode': null
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: {
            'override:postcode': '20002',
            'carmen:addressprops': {
                'override:postcode': {
                    3: null,
                    4: null
                }
            }
        },
        geometry: {}
    }, 'Null values are included if needed to override a top level property');

    opts.args.props = [ 'override:postcode' ];
    t.deepEquals(post({
        type: 'Feature',
        properties: {
            address_props: [{
                'override:postcode': '20002'
            },{
                'override:postcode': '20002'
            },{
                'override:postcode': '20002'
            },{
                'override:postcode': null
            },{
                'override:postcode': null
            },{
                'override:postcode': undefined
            }]
        },
        geometry: { }
    }, opts), {
        type: 'Feature',
        properties: {
            'override:postcode': '20002',
            'carmen:addressprops': {
                'override:postcode': {
                    3: null,
                    4: null,
                    5: null
                }
            }
        },
        geometry: {}
    }, 'Undefined values are treated as null in carmen:addressprops');

    t.end();
});
