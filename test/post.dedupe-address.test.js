'use strict';

const post = require('../lib/post/dedupe-address').post;
const test = require('tape');

test('Post: Dedupe', (t) => {
    t.deepEquals(post(), undefined);

    t.deepEquals(post({
        properties: undefined
    }), {
        properties: undefined
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': undefined
        }
    }), {
        properties: {
            'carmen:addressnumber': undefined
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': []
        }
    }), {
        properties: {
            'carmen:addressnumber': []
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1]]
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4]]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4]]
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4, 1, 2, 3, 4]]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4, 1, 2, 3, 4]]
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1]]
            }]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1]],
            address_props: [{}]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1]]
            }]
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4]]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4]]
            }]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4]],
            address_props: [{}, {}, {}, {}]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4]]
            }]
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4, 1, 2, 3, 4]]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4], [1,1], [2,2], [3,3], [4,4]]
            }]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4]],
            address_props: [{}, {}, {}, {}]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4]]
            }]
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4, 1, 2, 3, 4]],
            address_props: [{
                element: 0
            },{
                element: 1
            },{
                element: 2
            },{
                element: 3
            },{
                element: 4
            },{
                element: 5
            },{
                element: 6
            },{
                element: 7
            }]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4], [1,1], [2,2], [3,3], [4,4]]
            }]
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1, 2, 3, 4]],
            address_props: [{
                element: 0
            }, {
                element: 1
            }, {
                element: 2
            }, {
                element: 3
            }]
        },
        geometry: {
            geometries: [{
                coordinates: [[1,1], [2,2], [3,3], [4,4]]
            }]
        }
    });

    t.end();
});
