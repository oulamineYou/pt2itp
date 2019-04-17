const post = require('../lib/post/discard-bad-orphans').post;
const test = require('tape');

test('Post: Discard Bad Orphans', (t) => {
    t.equals(post(), undefined);
    t.deepEquals(post({}), {});
    t.deepEquals(post({
        properties: {}
    }), {
        properties: {}
    });
    t.deepEquals(post({
        properties: {
            'carmen:rangetype': 'tiger'
        }
    }), {
        properties: {
            'carmen:rangetype': 'tiger'
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': ''
        }
    }), {
        properties: {
            'carmen:addressnumber': ''
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': ['']
        }
    }), {
        properties: {
            'carmen:addressnumber': ['']
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
            'carmen:addressnumber': [[1]],
            'carmen:text': null
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': null
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': 'Main St',
            postcode: '20002'
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': 'Main St',
            postcode: '20002'
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': '1234',
            postcode: '20002'
        }
    }), false);

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': '_%^$*—',
            postcode: '20002'
        }
    }), false);

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': 'Main St',
        }
    }), false);

    t.end();
});
