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

    t.end();
});
