const map = require('../lib/inputs/strip-unit').map;
const test = require('tape');

test('Strip-Unit', (t) => {
    t.equals(map({
        type: 'Feature',
        geometry: {
            type: 'Polygon'
        }
    }).toString(), 'Error: Feat must be a Point geom', 'Feat must be a Point geom');

    t.equals(map({
        type: 'Feature',
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have properties object', 'Feat must have properties object');

    t.equals(map({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have number property', 'Feat must have number property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: ' \t '
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Feat must have non-empty number property', 'Feat must have non-empty number property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: []
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Feat must have a string or numeric number property', 'Feat must have a string or numeric number property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 'xyz',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Feat number is not a supported address/unit type', 'Feat number is not a supported address/unit type');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: '42352426897',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Number should not exceed 10 chars', 'Number should not exceed 10 chars');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1
        },
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have street property', 'Feat must have street property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: '   '
        },
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have non-empty street property', 'Feat must have non-empty street property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: []
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Feat must have non-empty street property', 'Feat must have non-empty street property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: 123
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Feat must have a string or array street property', 'Feat must have a string or array street property');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: [{
                name: 'Main St'
            }]
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Synonym objects in street array must contain only display and priority properties', 'Synonym objects in street array must contain only display and priority properties');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: [{
                display: 'Main St',
                priority: 'first'
            }]
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }).toString(), 'Error: Display property must be a string and priority property must be a number', 'Display property must be a string and priority property must be a number');


    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: 'Main St'
        },
        geometry: {
            type: 'Point'
        }
    }).toString(), 'Error: Feat must have 2 element coordinates array', 'Feat must have 2 element coordinates array');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [1000, 1000]
        }
    }).toString(), 'Error: Feat exceeds +/-180deg coord bounds', 'Feat exceeds +/-180deg coord bounds');

    t.equals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 1000]
        }
    }).toString(), 'Error: Feat exceeds +/-85deg coord bounds', 'Feat exceeds +/-85deg coord bounds');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: 124,
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '124', street: [{ display: 'Main St', priority: 0 }] },
        type: 'Feature'
    }, 'Working Numeric Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '124',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '124', street: [{ display: 'Main St', priority: 0 }] },
        type: 'Feature'
    }, 'Working String Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123a',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '123a', street: [{ display: 'Main St', priority: 0 }] },
        type: 'Feature'
    }, 'Working 123a Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123 1/2',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '123', street: [{ display: 'Main St', priority: 0 }] },
        type: 'Feature'
    }, 'Stripped 123 1/2 Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123-45',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '123-45', street: [{ display: 'Main St', priority: 0 }] },
        type: 'Feature'
    }, 'Working 123-45 Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123n45',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '123n45', street: [{ display: 'Main St', priority: 0 }] },
        type: 'Feature'
    }, 'Working 123n45 Address');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: [{
                display: 'Main St',
                priority: 0
            }]
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '1', street: [{ display: 'Main St', priority: 0 }] },
        type: 'Feature'
    }, 'Working street array address with one synonym');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: 1,
            street: [{
                display: 'Main St',
                priority: 0
            },
            {
                display: 'Hwy 101',
                priority: 1
            }]
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }), {
        geometry: { coordinates: [ 0, 0 ], type: 'Point' },
        properties: { number: '1', street: [{ display: 'Main St', priority: 0 },{ display: 'Hwy 101', priority: 1 }] },
        type: 'Feature'
    }, 'Working street array address with two synonyms');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123',
            street: 'Twenty-Third Avenue'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }, { country: 'us' }).properties.street, [ { display: 'Twenty-Third Avenue', priority: 0 }, { display: '23rd Avenue', priority: -1 } ], 'Working Twenty-Third Avenue');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123',
            street: 'WEST NINETY-NINTH STREET'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }, { country: 'us' }).properties.street, [ { display: 'WEST NINETY-NINTH STREET', priority: 0 }, { display: 'WEST 99th STREET', priority: -1 } ], 'Working NINETY-NINE');

    t.deepEquals(map({
        type: 'Feature',
        properties: {
            number: '123',
            street: '2 Avenue'
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }, { country: 'us' }).properties.street, [{ display: '2 Avenue', priority: 0 }, { display: '2nd Avenue', priority: -1 }], 'Working NINETY-NINE');

    t.end();
});
