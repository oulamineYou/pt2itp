const analyze = require('../lib/analyze');
const NGram = analyze.NGram;
const splitToNGrams = analyze.splitToNGrams;
const FrequencyDistribution = analyze.FrequencyDistribution;
const BiGramCollocationTable = analyze.BiGramCollocationTable;
const TriGramCollocationTable = analyze.TriGramCollocationTable;
const test = require('tape');
const fs = require('fs');

var testArray = ["the", "cat", "chased", "the", "mouse"];
var testMap = new Map([["the", 2], ["cat", 1], ["chased", 1], ["mouse", 1]]);


test('FrequencyDistribution.arrayToCounts', (t) => {
    t.deepEqual(
        FrequencyDistribution.arrayToCounts(testArray),
        testMap
    );

    t.end();
});

test('FrequencyDistribution init', (t) => {
    var freqDistFromArray = new FrequencyDistribution(testArray);
    var freqDistFromMap = new FrequencyDistribution(testMap);

    t.deepEqual(freqDistFromArray, freqDistFromMap, 'constructing FrequencyDistribution from array or map should not differ');
    t.deepEqual(freqDistFromArray.N(), freqDistFromMap.N(), 'N should be the same for array or map');
    t.deepEqual(freqDistFromArray.binCount(), freqDistFromMap.binCount(), 'bin count should be the same for array or map');

    t.ok(new FrequencyDistribution(), 'ok to init FrequencyDistribution without data');

    t.end();

});

var testTokens = [
    "the", "cat", "chased", "the", "mouse",
    "and", "then", "a", "dog", "chased", "the", "cat"
];


// TODO rewrite as NGrams
var expectedUniGramCounts = new Map([
    [ ['the'], 3 ],
    [ ['cat'], 2 ],
    [ ['chased'], 2 ],
    [ ['mouse'], 1 ],
    [ ['and'], 1 ],
    [ ['then'], 1 ],
    [ ['a'], 1 ],
    [ ['dog'], 1 ]
]);

var expectedBiGramCounts = new Map([
    [ [ 'the', 'cat' ], 2 ],
    [ [ 'cat', 'chased' ], 1 ],
    [ [ 'chased', 'the' ], 2 ],
    [ [ 'the', 'mouse' ], 1 ],
    [ [ 'mouse', 'and' ], 1 ],
    [ [ 'and', 'then' ], 1 ],
    [ [ 'then', 'a' ], 1 ],
    [ [ 'a', 'dog' ], 1 ],
    [ [ 'dog', 'chased' ], 1 ],
]);

var expectedTriGramCounts = new Map([
    [ [ 'the', 'cat', 'chased' ], 1 ],
    [ [ 'cat', 'chased', 'the' ], 1 ],
    [ [ 'chased', 'the', 'mouse' ], 1 ],
    [ [ 'the', 'mouse', 'and' ], 1 ],
    [ [ 'mouse', 'and', 'then' ], 1 ],
    [ [ 'and', 'then', 'a' ], 1 ],
    [ [ 'then', 'a', 'dog' ], 1 ],
    [ [ 'a', 'dog', 'chased' ], 1 ],
    [ [ 'dog', 'chased', 'the' ], 1 ],
    [ [ 'chased', 'the', 'cat' ], 1 ],
]);

test('NGram', (t) => {
    var unigram = new analyze.NGram(['the']);
    t.deepEqual(unigram.tokens[0], 'the');
    t.deepEqual(unigram.toString(), '(the)');

    var bigram = new analyze.NGram(['the', 'cat']);
    t.deepEqual(bigram.tokens[0], 'the');
    t.deepEqual(bigram.tokens[1], 'cat');
    t.deepEqual(bigram.toString(), '(the,cat)');

    var trigram = new analyze.NGram(['the', 'cat', 'chased']);
    t.deepEqual(trigram.tokens[0], 'the');
    t.deepEqual(trigram.tokens[1], 'cat');
    t.deepEqual(trigram.tokens[2], 'chased');
    t.deepEqual(trigram.toString(), '(the,cat,chased)');
    t.end();
});

// TODO splitToNGrams


// TODO adjust expecteds to NGrams
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


test('BiGramCollocationTable', (t) => {

    bigrams = new BiGramCollocationTable();

    bigrams.update(testTokens);

    t.deepEqual(
        bigrams.unigram_fd.frequencies,
        expectedUniGramCounts,
        'expected unigram frequencies'
    )

    t.deepEqual(
        bigrams.bigram_fd.frequencies,
        expectedBiGramCounts,
        'expected bigram frequencies'
    );
    t.end();
});

test('TriGramCollocationTable', (t) => {

    trigrams = new TriGramCollocationTable();

    trigrams.update(testTokens);

    t.deepEqual(
        trigrams.unigram_fd.frequencies,
        expectedUniGramCounts,
        'expected unigram frequencies'
    )

    t.deepEqual(
        trigrams.bigram_fd.frequencies,
        expectedBiGramCounts,
        'expected bigram frequencies'
    );
    
    t.deepEqual(
        trigrams.trigram_fd.frequencies,
        expectedTriGramCounts,
        'expected trigram frequencies'
    );
    
    t.end();
});

test('Collocation Merges', (t) => {
    var testTokens_a = testTokens.slice(0,5);
    var testTokens_b = testTokens.slice(5);
    
    bigram_a = new BiGramCollocationTable();
    bigram_a.update(testTokens_a);
    
    bigram_b = new BiGramCollocationTable();
    bigram_b.update(testTokens_b);

    bigram_a.merge(bigram_b);


    t.deepEqual(
        bigram_a.unigram_fd.frequencies,
        expectedUniGramCounts,
        'after merging two bigram tables, expected unigram frequencies'
    )

    t.deepEqual(
        bigram_a.bigram_fd.frequencies,
        expectedBiGramCounts,
        'after merging two bigram tables, expected bigram frequencies'
    );
    
    trigram_a = new TriGramCollocationTable();
    trigram_a.update(testTokens_a);
    
    trigram_b = new TriGramCollocationTable();
    trigram_b.update(testTokens_b);

    trigram_a.merge(trigram_b);
    
    t.deepEqual(
        trigram_a.unigram_fd.frequencies,
        expectedUniGramCounts,
        'after merging two trigram tables, expected unigram frequencies'
    )

    t.deepEqual(
        trigram_a.bigram_fd.frequencies,
        expectedBiGramCounts,
        'after merging two trigram tables, expected bigram frequencies'
    );
    
    t.deepEqual(
        trigram_a.trigram_fd.frequencies,
        expectedTriGramCounts,
        'after merging two trigram tables, expected trigram frequencies'
    );
    
    t.end();
});

test('BiGramCollocationTable Metrics', (t) => {
    var bigrams = new BiGramCollocationTable();
    bigrams.update(testTokens);

    var expectedContingency = [
        2, // n_ii, or freq of ["the",      "cat"     ]
        0, // n_oi, or freq of [not("the"), "cat"     ]
        1, // n_io, or freq of ["the",      not("cat")]
        9  // n_oo, of freq of [not("the"), not("cat")]
    ]

    t.deepEqual(
        bigrams.getContingency(['the', 'cat']),
        [2, 0, 1, 9],
        'BiGramCollocationTable.getContingency'
    );

    t.deepEqual(
        bigrams.getExpectedValues([2, 0, 1, 9]),
        [ 0.5, 1.5, 2.5, 7.5],
        'BiGramCollocationTable.getExpectedValues'
    );

    
});


test('Short Sequences', (t) => {
    var bigrams = new BiGramCollocationTable();
    bigrams.update(testTokens);
    t.end();
});
