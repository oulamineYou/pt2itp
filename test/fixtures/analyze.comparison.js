module.exports.bigram_comparison = [
    { w1: 'akoko', w2: 'street', network_frequency: 1, network_likelihood_ratio: 4.57531208159928, address_frequency: 1, address_likelihood_ratio: 4.83382586399857, frequency_diff: 0, likelihood_ratio_diff: -0.258513782399287, zscore: 0.295147955162722 },
    { w1: 'akoko', w2: 'rd', network_frequency: null, network_likelihood_ratio: null, address_frequency: 1, address_likelihood_ratio: 4.83382586399857, frequency_diff: -1, likelihood_ratio_diff: -4.83382586399857, zscore: -0.870542336009587 },
    { w1: 'wong', w2: 'ho', network_frequency: 1, network_likelihood_ratio: 7.34790080383906,address_frequency: 1, address_likelihood_ratio: 7.60641458623835, frequency_diff: 0, likelihood_ratio_diff: -0.258513782399287, zscore: 0.295147955162722 },
    { w1: 'ho', w2: 'lane', network_frequency: 1, network_likelihood_ratio: 7.34790080383906, address_frequency: 1, address_likelihood_ratio: 7.60641458623835, frequency_diff: 0, likelihood_ratio_diff: -0.258513782399287, zscore: 0.295147955162722 },
    { w1: 'pier', w2: '1', network_frequency: 1, network_likelihood_ratio: 7.34790080383906, address_frequency: 1, address_likelihood_ratio: 7.60641458623835, frequency_diff: 0, likelihood_ratio_diff: -0.258513782399287, zscore: 0.295147955162722 },
    { w1: 'main', w2: 'st', network_frequency: 1, network_likelihood_ratio: 3.52881579407018, address_frequency: 1, address_likelihood_ratio: 4.83382586399857, frequency_diff: 0, likelihood_ratio_diff: -1.30501006992838, zscore: 0.0285233970202043 },
    { w1: 'fake', w2: 'st', network_frequency: 1, network_likelihood_ratio: 3.52881579407018, address_frequency: 1, address_likelihood_ratio: 4.83382586399857, frequency_diff: 0, likelihood_ratio_diff: -1.30501006992838, zscore: 0.0285233970202043 },
    { w1: 'elm', w2: 'way', network_frequency: null, network_likelihood_ratio: null, address_frequency: 1, address_likelihood_ratio: 7.60641458623835, frequency_diff: -1, likelihood_ratio_diff: -7.60641458623835, zscore: -1.57693781183449 },
    { w1: 'evergreen', w2: 'terrace',network_frequency: null, network_likelihood_ratio: null, address_frequency: 1, address_likelihood_ratio: 7.60641458623835, frequency_diff: -1, likelihood_ratio_diff: -7.60641458623835, zscore: -1.57693781183449 },
    { w1: 'lonely', w2: 'street', network_frequency: 1, network_likelihood_ratio: 4.57531208159928, address_frequency: null, address_likelihood_ratio: null, frequency_diff: 1, likelihood_ratio_diff: 4.57531208159928, zscore: 1.52670195156489 },
    { w1: 'canal', w2: 'st', network_frequency: 1, network_likelihood_ratio: 3.52881579407018, address_frequency: null, address_likelihood_ratio: null, frequency_diff: 1, likelihood_ratio_diff: 3.52881579407018, zscore: 1.26007739342238 }
];

module.exports.unigram_comparison = [
  { word: 'terrace', network_frequency: null, address_frequency: 1, frequency_diff: -1, zscore: '-1.12946491724678318057' },
  { word: 'akoko', network_frequency: 1, address_frequency: 2, frequency_diff: -1, zscore: '-1.12946491724678318057' },
  { word: 'evergreen', network_frequency: null, address_frequency: 1, frequency_diff: -1, zscore: '-1.12946491724678318057' },
  { word: 'rd', network_frequency: null, address_frequency: 1, frequency_diff: -1, zscore: '-1.12946491724678318057' },
  { word: 'elm', network_frequency: null, address_frequency: 1, frequency_diff: -1, zscore: '-1.12946491724678318057' },
  { word: 'way', network_frequency: null, address_frequency: 1, frequency_diff: -1, zscore: '-1.12946491724678318057' },
  { word: 'fake', network_frequency: 1, address_frequency: 1, frequency_diff: 0, zscore: '0.15059532229957109074' },
  { word: 'main', network_frequency: 1, address_frequency: 1, frequency_diff: 0, zscore: '0.15059532229957109074' },
  { word: 'wong', network_frequency: 1, address_frequency: 1, frequency_diff: 0, zscore: '0.15059532229957109074' },
  { word: 'ho', network_frequency: 1, address_frequency: 1, frequency_diff: 0, zscore: '0.15059532229957109074' },
  { word: 'lane', network_frequency: 1, address_frequency: 1, frequency_diff: 0, zscore: '0.15059532229957109074' },
  { word: 'pier', network_frequency: 1, address_frequency: 1, frequency_diff: 0, zscore: '0.15059532229957109074' },
  { word: '1', network_frequency: 1, address_frequency: 1, frequency_diff: 0, zscore: '0.15059532229957109074' },
  { word: 'st', network_frequency: 3, address_frequency: 2, frequency_diff: 1, zscore: '1.43065556184592536204' },
  { word: 'street', network_frequency: 2, address_frequency: 1, frequency_diff: 1, zscore: '1.43065556184592536204' },
  { word: 'canal', network_frequency: 1, address_frequency: null, frequency_diff: 1, zscore: '1.43065556184592536204' },
  { word: 'lonely', network_frequency: 1, address_frequency: null, frequency_diff: 1, zscore: '1.43065556184592536204' }
];
