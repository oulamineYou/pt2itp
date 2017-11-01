const analyze = require('../lib/analyze');
const test = require('tape');
const fs = require('fs');

var testArray = ["the", "cat", "chased", "the", "mouse"];
var testMap = new Map([["the", 2], ["cat", 1], ["chased", 1], ["mouse", 1]]);


test('FrequencyDistribution.arrayToCounts', (t) => {
    t.deepEqual(
        analyze.FrequencyDistribution.arrayToCounts(testArray),
        testMap
    );
    t.end();
});

test('FrequencyDistribution init', (t) => {
    var freqDistFromArray = new analyze.FrequencyDistribution(testArray);
    var freqDistFromMap = new analyze.FrequencyDistribution(testMap);

    t.deepEqual(freqDistFromArray, freqDistFromMap, 'constructing FrequencyDistribution from array or map should not differ');
    t.deepEqual(freqDistFromArray.N(), freqDistFromMap.N(), 'N should be the same for array or map');

    t.end();

});

test('FrequencyDistribution methods', (t) => {
    var freqDist = new analyze.FrequencyDistribution(testArray);

    t.deepEqual(freqDist.N(), 5, 'N should be 5');
    t.deepEqual(freqDist.binCount(), 4, 'bin count should be 4');
    t.deepEqual(freqDist.absoluteFrequency('the'), 2, 'absolute frequency of "the" sb 2');
    t.deepEqual(freqDist.relativeFrequency('the'), 0.4, 'relative frequency of "the" sb 2/5 = 0.4');

    freqDist.update(["and", "then", "a"]);
    t.deepEqual(freqDist.absoluteFrequency('the'), 2, 'after update, still 2 "the"s');
    t.deepEqual(freqDist.relativeFrequency('the'), 0.25, 'after update, relative frequency is 2/8 = 0.25');
    t.deepEqual(freqDist.binCount(), 7, 'after update, bin count is 7');

    freqDist.update(["dog", "chased", "the", "cat"]);
    t.deepEqual(freqDist.absoluteFrequency('the'), 3, 'after next update, now 3 "the"s');
    t.deepEqual(freqDist.binCount(), 8, 'after next update, bin count is 8');

    var expectedCounts = new Map([
        [ 'the', 3 ],
        [ 'cat', 2 ],
        [ 'chased', 2 ],
        [ 'mouse', 1 ],
        [ 'and', 1 ],
        [ 'then', 1 ],
        [ 'a', 1 ],
        [ 'dog', 1 ]
    ]);

    t.deepEqual(freqDist.frequencies, expectedCounts);
    t.end();

});
