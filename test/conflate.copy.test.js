const tape = require('tape');
const tmp = require('tmp');
const os = require('os');
const fs = require('fs');
const path = require('path');
const copy = require('../lib/conflate/copy');
const tokenize = require('../lib/util/tokenize');

tape('conflate/copy.js output', (t) => {
    let tempFile = tmp.tmpNameSync();

    copy.init({
        id: 0,
        map: 'strip-unit',
        read: __dirname + '/fixtures/conflate-copy.sample-input-address.geojson',
        output: tempFile,
        total: 1,
        tokens: tokenize.createReplacer(['en'])
    });

    copy.start(() => {
        if (process.env.UPDATE) {
            fs.createReadStream(tempFile).pipe(fs.createWriteStream(path.resolve(__dirname, './fixtures/conflate-copy.psv')));
            t.fail('updated fixture');
        } else
            t.equal(fs.readFileSync(tempFile).toString(), fs.readFileSync(__dirname + '/fixtures/conflate-copy.psv').toString(), 'output is as expected');
        t.end();
    });
});
