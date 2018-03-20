const tape = require('tape');

const Units = require('../lib/util/units');

tape('Units#Encode/Decode', (t) => {
    const units = new Units();

    //Errors
    t.throws(() => {
        units.encode('1-123456789')
    }, /Cannot encode values > 8 chars/, 'Cannot encode values > 8 chars');
    t.throws(() => {
        units.encode('1-123459}')
    }, /Cannot encode ASCII values above 100/, 'Cannot encode ASCII values above 100');

    //Test output true
    t.equals(units.encode('8000-8079'), 8000.4556485557);
    t.deepEquals(units.decode('8000.4556485557'), {
        num: '8000-8079',
        output: true
    });

    //Test output false
    t.equals(units.encode('8000-8079', { output: false }), -8000.4556485557);
    t.deepEquals(units.decode('-8000.4556485557'), {
        num: '8000-8079',
        output: false
    });

    const tests = {
        '1-1325': 1.4549515053,
        '8000-8079': 8000.4556485557,
        '12a': 12.65,
        '12b': 12.66,
        '989': 989,
        '1-1325': 1.4549515053,
        '1s13': 1.834951,
        '6n486': 6.78525654,
        '54w32': 54.87515,
        '8e234': 8.69505152
    }

    for (let test in tests) {
        t.equals(units.encode(test), tests[test], `encode: ${test} => ${tests[test]}`);
        t.equals(units.decode(tests[test]).num, test, `decode: ${tests[test]} => ${test}`);
    }

    t.end();
});
