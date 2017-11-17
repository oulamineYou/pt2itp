module.exports = {
    network_bigram: [
        { w1: 'akoko', w2: 'street', frequency: 1, likelihoodRatio: 6.701994141683237 },
        { w1: 'wong', w2: 'ho', frequency: 1, likelihoodRatio: 6.701994141683237 },
        { w1: 'ho', w2: 'lane', frequency: 1, likelihoodRatio: 6.701994141683237 },
        { w1: 'pier', w2: '1', frequency: 1, likelihoodRatio: 6.701994141683237 },
        { w1: 'main', w2: 'st', frequency:1, likelihoodRatio: 3.9294054194434587 },
        { w1: 'fake', w2: 'st', frequency: 1, likelihoodRatio: 3.9294054194434587 }
    ],
    network_bigram_sql: [
        { w1: 'akoko', w2: 'street', frequency: 1, likelihood_ratio: 6.70199414168324 },
        { w1: 'wong', w2: 'ho', frequency: 1, likelihood_ratio: 6.70199414168324 },
        { w1: 'ho', w2: 'lane', frequency: 1, likelihood_ratio: 6.70199414168324 },
        { w1: 'pier', w2: '1', frequency: 1, likelihood_ratio: 6.70199414168324 },
        { w1: 'main', w2: 'st', frequency:1, likelihood_ratio: 3.92940541944346 },
        { w1: 'fake', w2: 'st', frequency: 1, likelihood_ratio: 3.92940541944346 }
    ],
    address_bigram: [
        { w1: 'akoko', w2: 'street', frequency: 1, likelihoodRatio: 4.27833497684817 },
        { w1: 'akoko', w2: 'rd', frequency: 1, likelihoodRatio: 4.27833497684817 },
        { w1: 'wong', w2: 'ho', frequency: 1, likelihoodRatio: 7.05092369908795 },
        { w1: 'ho', w2: 'lane', frequency: 1, likelihoodRatio: 7.05092369908795 },
        { w1: 'pier', w2: '1', frequency: 1, likelihoodRatio: 7.05092369908795 },
        { w1: 'main', w2: 'st', frequency: 1, likelihoodRatio: 4.27833497684817 },
        { w1: 'fake', w2: 'st', frequency: 1, likelihoodRatio: 4.27833497684817 }
    ],
    address_bigram_sql: [
        { w1: 'akoko', w2: 'street', frequency: 1, likelihood_ratio: 4.27833497684817 },
        { w1: 'akoko', w2: 'rd', frequency: 1, likelihood_ratio: 4.27833497684817 },
        { w1: 'wong', w2: 'ho', frequency: 1, likelihood_ratio: 7.05092369908795 },
        { w1: 'ho', w2: 'lane', frequency: 1, likelihood_ratio: 7.05092369908795 },
        { w1: 'pier', w2: '1', frequency: 1, likelihood_ratio: 7.05092369908795 },
        { w1: 'main', w2: 'st', frequency: 1, likelihood_ratio: 4.27833497684817 },
        { w1: 'fake', w2: 'st', frequency: 1, likelihood_ratio: 4.27833497684817 }
    ]
};

module.exports.network_unigram = module.exports.network_unigram_sql = [
        { word: 'akoko', frequency: 1 },
        { word: 'street', frequency: 1 },
        { word: 'wong', frequency: 1 },
        { word: 'ho', frequency: 1 },
        { word: 'lane', frequency: 1 },
        { word: 'pier', frequency: 1 },
        { word: '1', frequency: 1 },
        { word: 'main', frequency: 1 },
        { word: 'st', frequency: 2 },
        { word: 'fake', frequency: 1 }
    ];

module.exports.address_unigram = module.exports.address_unigram_sql = [
        { word: 'akoko', frequency: 2 },
        { word: 'street', frequency: 1 },
        { word: 'rd', frequency: 1 },
        { word: 'wong', frequency: 1 },
        { word: 'ho', frequency: 1 },
        { word: 'lane', frequency: 1 },
        { word: 'pier', frequency: 1 },
        { word: '1', frequency: 1 },
        { word: 'main', frequency: 1 },
        { word: 'st', frequency: 2 },
        { word: 'fake', frequency: 1 }
    ];
