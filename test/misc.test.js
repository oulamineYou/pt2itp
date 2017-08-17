const test = require('tape');
const misc = require('../lib/misc');

test('misc.det2D', (t) => {
    t.equal(misc.det2D([0,0], [1,2], [3,4]), -2);
    t.equal(misc.det2D([0,0], [2,1], [-1,3]), 7);
    t.equal(misc.det2D([1,1], [0,1], [2,3]), -2);
    t.equal(misc.det2D([2,2], [0,-1], [-3,1]), -13);
    t.end();
});

test('misc.sign', (t) => {
    t.equal(misc.sign(5), 1);
    t.equal(misc.sign(-5), -1);
    t.equal(misc.sign(0), 0);
    t.end();
});

test('misc.toHighest', (t) => {
    t.equals(misc.toHighest(3425, 1000), 4000);
    t.equals(misc.toHighest(1, 1000), 1000);
    t.equals(misc.toHighest(454, 1000), 1000);
    t.equals(misc.toHighest(4642364, 1000), 4643000);
    t.equals(misc.toHighest(1001, 1000), 2000);
    t.equals(misc.toHighest(1000, 1000), 1000);
    t.end();
});

test('misc.toLowest', (t) => {
    t.equals(misc.toLowest(3425, 1000), 3000);
    t.equals(misc.toLowest(1, 1000), 0);
    t.equals(misc.toLowest(454, 1000), 0);
    t.equals(misc.toLowest(4642364, 1000), 4642000);
    t.equals(misc.toLowest(1001, 1000), 1000);
    t.equals(misc.toLowest(1000, 1000), 1000);
    t.end();
});
