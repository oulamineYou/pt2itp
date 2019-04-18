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

    t.throws(() => {
        post({
            properties: {
                'carmen:addressnumber': [[1]],
                'carmen:text': 'Main St',
                address_props: []
            }
        })
    }, /discard-bad-orphans must be run after the props post script/);

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': 'Main St',
            'override:postcode': '20002'
        }
    }), {
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': 'Main St',
            'override:postcode': '20002'
        }
    });

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': '1234',
            'override:postcode': '20002'
        }
    }), false);

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': '_%^$*—',
            'override:postcode': '20002'
        }
    }), false);

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': 'Main St',
        }
    }), false);

    t.deepEquals(post({
        properties: {
            'carmen:addressnumber': [[1]],
            'carmen:text': 'Main St',
            'override:postcode': null
        }
    }), false);

    t.end();
});
