const ngrams = require('talisman/stats/ngrams');

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

class CollocationTable {

    constructor() {
        this.unigram_fd = FrequencyDistribution();
        this.bigram_fd = FrequencyDistribution();
        this.trigram_fd = FrequencyDistribution();
    }

    update(words) {
        this.unigram_fd.update(words);
        this.bigram_fd.update(ngrams(2, words));
        this.trigram_fd.update(ngrams(3, words));
    }

    merge(collocationTable) {
        this.unigram_fd.update(collocationTable.unigram_fd);
        this.bigram_fd.update(collocationTable.bigram_fd);
        this.trigram_fd.update(collocationTable.trigram_fd);
    }

    bigram_contingency(ngram) {
        var n_all, n_ii, n_ix, n_xi;
        n_all = this.bigram_fd.N();
        n_ii = this.bigram_fd.absoluteFrequency(ngram)
        n_ix = self.unigram_fd.absoluteFrequency(ngram[0]);
        n_xi = self.unigram_fd.absoluteFrequency(ngram[1]);

        var n_oi, n_io;
        n_oi = n_xi - n_ii;
        n_io = n_ix - n_ii;
        n_oo = n_all - n_ii - n_oi - n_io;

        return (n_ii, n_oi, n_io, n_oo);
    }

    likelihood_ratio(ngram) {
        var contingency;

        switch(ngram.length) {
            case 2:
                contingency = this.bigram_contingency(ngram);
            case 3:
                contingency = this.trigram_contingency(ngram);

        }

}


