function post(feat) {
    if (!feat) return;

    feat.id =  Math.floor((Math.random() * 2147483647) + 1);

    return feat;
}

module.exports.post = post;
