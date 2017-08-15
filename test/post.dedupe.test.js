const post = require('../lib/post/dedupe').post;
const test = require('tape');

test('Post: Dedupe', (t) => {
    t.equals(post(), undefined);

    t.equals(post({
        properties: undefined
    }), undefined);

    t.equals(post({
        properties: {
            'carmen:addressnumber': undefined
        }
    }), undefined);

    t.equals(post({
        properties: {
            'carmen:addressnumber': []
        }
    }), undefined);

    t.equals(post({
        properties: {
            'carmen:addressnumber': [[ 1 ]]
        }
    }), undefined);

    t.equals(post({
        properties: {
            'carmen:addressnumber': [[ 1, 2, 3, 4 ]]
        }
    }), undefined);

    t.equals(post({
        properties: {
            'carmen:addressnumber': [[ 1, 2, 3, 4, 1, 2, 3, 4 ]]
        }
    }), undefined);

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[ 1 ]]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1]]
            }]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1]]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1]]
            }]
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[ 1, 2, 3, 4 ]]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4]]
            }]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[ 1, 2, 3, 4 ]]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4]]
            }]
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[ 1, 2, 3, 4, 1, 2, 3, 4 ]]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4], [1,1], [2,2], [3,3], [4,4]]
            }]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[ 1, 2, 3, 4 ]]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4]]
            }]
        }
    });

    t.end();
});
