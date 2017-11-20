module.exports = {
    network_bigram: [
        { w1: 'akoko', w2: 'street', frequency: 1, likelihoodRatio: 4.575312081599279 },
        { w1: 'wong', w2: 'ho', frequency: 1, likelihoodRatio: 7.34790080383906 },
        { w1: 'ho', w2: 'lane', frequency: 1, likelihoodRatio: 7.34790080383906 },
        { w1: 'pier', w2: '1', frequency: 1, likelihoodRatio: 7.34790080383906 },
        { w1: 'main', w2: 'st', frequency: 1, likelihoodRatio: 3.5288157940701828 },
        { w1: 'fake', w2: 'st', frequency: 1, likelihoodRatio: 3.5288157940701828 },
        { w1:'canal', w2: 'st', frequency: 1, likelihoodRatio: 3.5288157940701828 },
        { w1: 'lonely', w2: 'street', frequency: 1, likelihoodRatio: 4.575312081599279 }
    ],
    network_bigram_sql: [
        { w1: 'akoko', w2: 'street', frequency: 1, likelihood_ratio: 4.57531208159928 },
        { w1: 'wong', w2: 'ho', frequency: 1, likelihood_ratio: 7.34790080383906 },
        { w1: 'ho', w2: 'lane', frequency: 1, likelihood_ratio: 7.34790080383906 },
        { w1: 'pier', w2: '1', frequency: 1, likelihood_ratio: 7.34790080383906 },
        { w1: 'main', w2: 'st', frequency: 1, likelihood_ratio: 3.52881579407018 },
        { w1: 'fake', w2: 'st', frequency: 1, likelihood_ratio: 3.52881579407018 },
        { w1:'canal', w2: 'st', frequency: 1, likelihood_ratio: 3.52881579407018 },
        { w1: 'lonely', w2: 'street', frequency: 1, likelihood_ratio: 4.57531208159928 }
    ],
    address_bigram: [
        { w1: 'akoko', w2: 'street', frequency: 1, likelihoodRatio: 4.83382586399857 },
        { w1: 'akoko', w2: 'rd', frequency: 1, likelihoodRatio: 4.83382586399857 },
        { w1: 'wong', w2: 'ho', frequency: 1, likelihoodRatio: 7.60641458623835 },
        { w1: 'ho', w2: 'lane', frequency: 1, likelihoodRatio: 7.60641458623835 },
        { w1: 'pier', w2: '1', frequency: 1, likelihoodRatio: 7.60641458623835 },
        { w1: 'main', w2: 'st', frequency: 1, likelihoodRatio: 4.83382586399857 },
        { w1: 'fake', w2: 'st', frequency: 1, likelihoodRatio: 4.83382586399857 },
        { w1: 'elm', w2: 'way', frequency: 1, likelihoodRatio: 7.60641458623835 },
        { w1: 'evergreen', w2: 'terrace', frequency: 1, likelihoodRatio: 7.60641458623835 }
    ],
    address_bigram_sql: [
        { w1: 'akoko', w2: 'street', frequency: 1, likelihood_ratio: 4.83382586399857 },
        { w1: 'akoko', w2: 'rd', frequency: 1, likelihood_ratio: 4.83382586399857 },
        { w1: 'wong', w2: 'ho', frequency: 1, likelihood_ratio: 7.60641458623835 },
        { w1: 'ho', w2: 'lane', frequency: 1, likelihood_ratio: 7.60641458623835 },
        { w1: 'pier', w2: '1', frequency: 1, likelihood_ratio: 7.60641458623835 },
        { w1: 'main', w2: 'st', frequency: 1, likelihood_ratio: 4.83382586399857 },
        { w1: 'fake', w2: 'st', frequency: 1, likelihood_ratio: 4.83382586399857 },
        { w1: 'elm', w2: 'way', frequency: 1, likelihood_ratio: 7.60641458623835 },
        { w1: 'evergreen', w2: 'terrace', frequency: 1, likelihood_ratio: 7.60641458623835 }
    ]
};

module.exports.network_unigram = module.exports.network_unigram_sql = [
        { word: 'akoko', frequency: 1 },
        { word: 'street', frequency: 2 },
        { word: 'wong', frequency: 1 },
        { word: 'ho', frequency: 1 },
        { word: 'lane', frequency: 1 },
        { word: 'pier', frequency: 1 },
        { word: '1', frequency: 1 },
        { word: 'main', frequency: 1 },
        { word: 'st', frequency: 3 },
        { word: 'fake', frequency: 1 },
        { word: 'canal', frequency: 1 },
        { word: 'lonely', frequency: 1 }
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
        { word: 'fake', frequency: 1 },
        { word: 'elm', frequency: 1 },
        { word: 'way', frequency: 1 },
        { word: 'evergreen', frequency: 1 },
        { word: 'terrace', frequency: 1 }
    ];
