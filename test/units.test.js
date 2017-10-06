const tape = require('tape');

const Units = require('../lib/units');

tape('Units#Encode/Decode', (t) => {
    const units = new Units();

    //Errors
    t.throws(() => {
        units.encode('1-123456789')
    }, /Cannot encode values > 8 chars/, 'Cannot encode values > 8 chars');
    t.throws(() => {
        units.encode('1-123459}')
    }, /Cannot encode ASCII values above 100/, 'Cannot encode ASCII values above 100');

    t.equals(units.encode('1-1325'), 1.4549515053);
    t.deepEquals(units.decode('1.4549515053'), {
        num: '1-1325',
        output: true
    });

    t.equals(units.encode('8000-8079'), 8000.4556485557);
    t.deepEquals(units.decode('8000.4556485557'), {
        num: '8000-8079',
        output: true
    });

    t.equals(units.encode('12a'), 12.65);
    t.deepEquals(units.decode('12.65'), {
        num: '12a',
        output: true
    });

    t.equals(units.encode('12B'), 12.66);
    t.deepEquals(units.decode('12.66'), {
        num: '12b',
        output: true
    });

    t.equals(units.encode('989'), 989);
    t.deepEquals(units.decode('989'), {
        num: '989',
        output: true
    });

    t.equals(units.encode('1-1325', { output: false }), -1.4549515053);
    t.deepEquals(units.decode('-1.4549515053'), {
        num: '1-1325',
        output: false
    });

    t.equals(units.encode('8000-8079', { output: false }), -8000.4556485557);
    t.deepEquals(units.decode('-8000.4556485557'), {
        num: '8000-8079',
        output: false
    });

    t.equals(units.encode('12a', { output: false }), -12.65);
    t.deepEquals(units.decode('-12.65'), {
        num: '12a',
        output: false
    });

    t.equals(units.encode('12B', { output: false }), -12.66);
    t.deepEquals(units.decode('-12.66'), {
        num: '12b',
        output: false
    });

    t.equals(units.encode('989', { output: false }), -989);
    t.deepEquals(units.decode('-989'), {
        num: '989',
        output: false
    });

    t.end();
});
