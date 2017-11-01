const ngrams = require('talisman/stats/ngrams');

const SMALL = 1e-20;

class FrequencyDistribution {

    constructor(initial_samples) {
        this.frequencies = new Map();
        this.update(initial_samples);
        this._N = null;
    }

    update(samples) {
        this._N = null;

        var counts;

        if (Array.isArray(samples)) {
            counts = new Map();
            for (var sample in samples) {
                if (!counts.has(sample)) {
                    counts.set(sample, 0);
                }
                var current_count = this.counts.get(sample);
                this.counts.set(sample, current_count + 1);
            }
        }
        else {
            counts = samples;
        }

        counts.forEach(function(value, key) {
            if (!this.frequencies.has(key)) {
                this.frequencies.set(key, 0);
            }
            var newCount = this.frequencies.get(key) + value;
            this.frequencies.set(key, newCount);
        });
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
            this._N = this.frequencies.values().reduce(
                function(accumulator, nextValue){
                    return accumulator + nextValue;
                }
            );
        }
        return this._N;
    }

    binCount() {
        return this.frequencies.size();
    }

}

class NGramCollocationTable {

    constructor() {
        this.unigram_fd = new FrequencyDistribution();
        this.ngram_fd = new FrequencyDistribution();
    }

    update(words) {
        this.unigram_fd.update(words);
        this.ngram_fd.update(ngrams(this.order, words));
    }

    merge(collocationTable) {
        if (!this.order === collocationTable.order) {
            throw 'NGramCollocation tables may only merge with others of the same order';
        }
        this.unigram_fd.update(collocationTable.unigram_fd);
        this.ngram_fd.update(collocationTable.ngram_fd);
    }

    getExpectedValues(contingency) {
        var n_all = sum(contingency)
        var expectedValues = [];

        for (var x=0; x < this.order; x++) {
            bits.push(1 << x);
        }

        var productOfSums;
        for (var i=0; i < contingency.length; i++) {
            var sums = [];
            for (var j in bits) {
                var selected_cells = [];
                for (var k=0; k < Math.pow(2, this.order)) {
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

            var expectedValue = productOfSums / (n_all ** (this.order - 1));
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
        this.order = 2;
    }

    getContingency(ngram) {
        var n_all = this.ngram_fd.N();

        // Component frequencies
        var n_ii = this.ngram_fd.absoluteFrequency(ngram);
        var n_ix = this.unigram_fd.absoluteFrequency(ngram[0]);
        var n_xi = this.unigram_fd.absoluteFrequency(ngram[1]);

        // Build contingency table
        var n_oi = n_xi - n_ii;
        var n_io = n_ix - n_ii;
        var n_oo = n_all - n_ii - n_oi - n_io;

        return (n_ii, n_oi, n_io, n_oo);
    }

}

class TriGramCollocationTable extends NGramCollocationTable {

    constructor() {
        super();
        this.bigram_fd = new FrequencyDistribution();
        this.wildcard_fd = new FrequencyDistribution();
        this.order = 3;
    }

    update(words) {
        super.update(words);
        var wildcards = [];

        this.bigram_fd.update(ngrams(2, words));

        for (var ngram in ngrams(3, words)) {
            wildcards.push([ngram[0], ngram[this.order - 1]]);
        }
        this.wildcard_fd.update(wildcards);
    }

    merge(collocationTable) {
        super.merge(collocationTable);
        this.bigram_fd.update(collocationTable.bigram_fd);
        this.wildcard_fd.update(collocationTable.wildcard_fd);
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
