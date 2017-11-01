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
    // console.log(freqDistFromArray.frequencies);
    t.deepEqual(freqDistFromArray.N(), 5, 'N should be 5');
    t.deepEqual(freqDistFromArray.binCount(), 4, 'bin count should be 4');

    t.end();

});
