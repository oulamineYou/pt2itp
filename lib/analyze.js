const ngrams = require('talisman/tokenizers/ngrams');

const SMALL = 1e-20;

class NGram {

    constructor(tokenArray) {
        this.order = tokenArray.length;
        this.tokens = {};
        for (var i=0; i < tokenArray.length; i++) {
            this.tokens[i] = tokenArray[i];
        }
    }

    toArray() {
        var a = [];
        for (var i=0; i < this.order; i++) {
            a.push(this.tokens[i]);
        }
        return a;
    }

    toString() {
        var s = '(';
        s += this.toArray().join(',');
        s += ')';
        return s;
    }
}

function splitToNGrams(tokens, order) {
    var ngrams = [];
    for (var window in ngrams(order, tokenArray)) {
        ngrams.push(NGram(window));
    }
    return ngrams;
}

class FrequencyDistribution {

    constructor(initial_data) {
        this.frequencies = new Map();
        if (initial_data) {
            this.update(initial_data);
        }
        this._N = null;
    }

    static arrayToCounts(sample_array) {
	var counts = new Map();
	for (var i=0; i < sample_array.length; i++) {
            var sample = sample_array[i]
	    if (!counts.has(sample)) {
		counts.set(sample, 0);
	    }
	    var current_count = counts.get(sample);
	    counts.set(sample, current_count + 1);
	}
	return counts;
    }

    update(data) {
        this._N = null;

        var counts;

        if (Array.isArray(data)) {
            counts = FrequencyDistribution.arrayToCounts(data);
        }
        else {
            counts = data;
        }

        for (var [key, value] of counts.entries()) {
            if (!this.frequencies.has(key)) {
                this.frequencies.set(key, 0);
            }
            var newCount = this.frequencies.get(key) + value;
            this.frequencies.set(key, newCount);
        };
    }

    absoluteFrequency(key) {
        if (!this.frequencies.has(key)){
            return 0;
        }
        else {
            return this.frequencies.get(key);
        }
    }

    relativeFrequency(key) {
        return this.absoluteFrequency(key) / this.N();
    }

    N() {
        if (!this._N) {
            var accumulator = 0;
            for (let value of this.frequencies.values()) {
                accumulator += value;
            };
            this._N = accumulator;
        }
        return this._N;
    }

    binCount() {
        return this.frequencies.size;
    }

}

// TODO replace ngrams() with splitToNGrams()

class NGramCollocationTable {

    constructor() {
        this.unigram_fd = new FrequencyDistribution();
        this.order = 1;
    }

    update(words) {
        this.unigram_fd.update(ngrams(1, words));
    }

    merge(collocationTable) {
        if (!this.order === collocationTable.order) {
            throw 'NGramCollocation tables may only merge with others of the same order';
        }
        this.unigram_fd.update(collocationTable.unigram_fd.frequencies);
    }

    getExpectedValues(contingency) {
        var n_all = contingency.reduce((a,b) => { return a + b; }, 0)
        console.log(contingency);
        var expectedValues = [];

        var bits = []
        for (var x=0; x < this.order; x++) {
            bits.push(1 << x);
        }

        var productOfSums;
        for (var i=0; i < contingency.length; i++) {
            var sums = [];
            for (var j in bits) {
                var selected_cells = [];
                for (var k=0; k < Math.pow(2, this.order); k++) {
                    if ((k & j) && (i & j)) {
                        selected_cells.push(contingency[k]);
                    }
                }
                var sum = selected_cells.reduce(function(a,b) {
                    return a + b;
                }, 0);
                sums.push(sum);
            }
            productOfSums = sums.reduce(function(a, b) {
                    return a * b;
            }, 1);

            var expectedValue = productOfSums / Math.pow(n_all, (this.order - 1));
            expectedValues.push(expectedValue);
        }

        return expectedValues;
    }

    likelihoodRatio(ngram) {
        var contingency = this.getContingency(ngram);
        var expectedValues = this.getExpectedValues(contingency);

        var likelihoods = [];
        for (var i=0; i < contingency.length; i++) {
            var observed = contingency[i];
            var expected = expectedValues[i];
            var likelihood = observed * math.log((observed / (expected + SMALL)) + SMALL)
            likelihoods.push(likelihood)
        }
        var sumLikelihoods = likelihoods.reduce(function(a,b) {
            return a + b;
        }, 0);
        return this.order * sumLikelihoods;
    }

}

class BiGramCollocationTable extends NGramCollocationTable {

    constructor() {
        super();
        this.bigram_fd = new FrequencyDistribution();
        this.order = 2;
    }

    update(words) {
        super.update(words)
        this.bigram_fd.update(ngrams(this.order, words));
    }

    merge(collocationTable) {
        super.merge(collocationTable);
        this.bigram_fd.update(collocationTable.bigram_fd.frequencies);
    }

    getContingency(ngram) {
        var n_all = this.bigram_fd.N();
        console.log(this.bigram_fd.frequencies);

        // Component frequencies
        var n_ii = this.bigram_fd.absoluteFrequency(ngram);
        var n_ix = this.unigram_fd.absoluteFrequency(ngram[0]);
        var n_xi = this.unigram_fd.absoluteFrequency(ngram[1]);
        console.log(`frequencies: ${n_ii}, ${n_ix}, ${n_xi}`);

        // Build contingency table
        var n_oi = n_xi - n_ii;
        var n_io = n_ix - n_ii;
        var n_oo = n_all - n_ii - n_oi - n_io;

        return [n_ii, n_oi, n_io, n_oo];
    }

}

class TriGramCollocationTable extends BiGramCollocationTable {

    constructor() {
        super();
        this.trigram_fd = new FrequencyDistribution();
        this.wildcard_fd = new FrequencyDistribution();
        this.order = 3;
    }

    update(words) {
        super.update(words);
        this.trigram_fd.update(ngrams(3,words));

        var wildcards = [];

        for (var ngram in ngrams(3, words)) {
            wildcards.push([ngram[0], ngram[this.order - 1]]);
        }
        this.wildcard_fd.update(wildcards);
    }

    merge(collocationTable) {
        super.merge(collocationTable);
        this.trigram_fd.update(collocationTable.trigram_fd.frequencies);
        this.wildcard_fd.update(collocationTable.wildcard_fd.frequencies);
    }

    getContingency(ngram) {
        var n_all = this.ngram_fd.N();


        // Component frequencies
        var n_iix, n_ixi, n_xii;
        n_iix = this.bigram_fd.absoluteFrequency(ngram[0], ngram[1]);
        n_ixi = this.wildcard_fd.absoluteFrequency([ngram[0], ngram[2]]);
        n_xii = this.bigram_fd.absoluteFrequency([ngram[1], ngram[2]]);

        var n_ixx, n_xix, n_xxi;
        n_ixx = this.unigram_fd.absoluteFrequency(ngram[0]);
        n_xix = this.unigram_fd.absoluteFrequency(ngram[1]);
        n_xxi = this.unigram_fd.absoluteFrequency(ngram[2]);

        // Build contingency table
        var n_iii = this.ngram_fd.absoluteFrequency(ngram);
        var n_oii = n_xii - n_iii;
        var n_ioi = n_ixi - n_iii;
        var n_iio = n_iix - n_iii;
        var n_ooi = n_xxi - n_iii - n_oii - n_ioi;
        var n_oio = n_xix - n_iii - n_oii - n_iio;
        var n_ioo = n_ixx - n_iii - n_ioi - n_iio;
        var n_ooo = n_xxx - n_iii - n_oii - n_ioi - n_iio - n_ooi - n_oio - n_ioo;

	return [n_iii, n_oii, n_ioi, n_ooi,
		n_iio, n_oio, n_ioo, n_ooo];
    }
}

module.exports.NGram = NGram;
module.exports.splitToNGrams = splitToNGrams;
module.exports.FrequencyDistribution = FrequencyDistribution;
module.exports.BiGramCollocationTable = BiGramCollocationTable;
module.exports.TriGramCollocationTable = TriGramCollocationTable;
