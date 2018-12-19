const tape = require('tape');

const Units = require('../lib/map/units');

tape('Units#Encode/Decode', (t) => {
    const units = new Units();

    //Errors
    t.throws(() => {
        units.encode('1-123456789')
    }, /Cannot encode values > 8 chars/, 'Cannot encode values > 8 chars');
    t.throws(() => {
        units.encode('1-123459}')
    }, /Cannot encode ASCII values above 99/, 'Cannot encode ASCII values above 99');

    //Test output true
    t.equals(units.encode('8000-8079'), 18000.4556485557);
    t.deepEquals(units.decode('18000.4556485557'), {
        num: '8000-8079',
        output: true
    });

    //Test output false
    t.equals(units.encode('8000-8079', { output: false }), -18000.4556485557);
    t.deepEquals(units.decode('-18000.4556485557'), {
        num: '8000-8079',
        output: false
    });

    const tests = {
        '1-1325': 11.4549515053,
        '8000-8079': 18000.4556485557,
        '12a': 112.65,
        '12b': 112.66,
        '989': 1989,
        '1-1325': 11.4549515053,
        '1s13': 11.834951,
        '6n486': 16.78525654,
        '54w32': 154.87515,
        '8e234': 18.69505152,
        'w350n5337': 28778350.5337,
        'n60w35415': 2788760.35415,
        'w35295': 38735295,
        'n35295': 37835295
    }

    for (let test in tests) {
        t.equals(units.encode(test), tests[test], `encode: ${test} => ${tests[test]}`);
        t.equals(units.decode(tests[test]).num, test, `decode: ${tests[test]} => ${test}`);
    }

    t.end();
});
