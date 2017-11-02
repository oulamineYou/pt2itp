const tape = require('tape');
const tmp = require('tmp');
const os = require('os');
const fs = require('fs');
const path = require('path');
const copy = require('../lib/copy');
const tokenize = require('../lib/tokenize');

tape('copy.js output - address', (t) => {
    let tempFile = tmp.tmpNameSync();
    copy.init({
        id: 0,
        read: __dirname + '/fixtures/copy.sample-input-address.geojson',
        output: tempFile,
        type: 'address',
        total: 1,
        solo: true,
        error: false,
        tokens: tokenize.createReplacer(['et'])
    });
    copy.start(() => {
        if (process.env.UPDATE) {
            fs.createReadStream(tempFile).pipe(fs.createWriteStream(path.resolve(__dirname, './fixtures/copy.sample-output-address.psv')));
            t.fail('updated fixture');
        }
        else
            t.equal(fs.readFileSync(tempFile).toString(), fs.readFileSync(__dirname + '/fixtures/copy.sample-output-address.psv').toString(), 'output is as expected');
        t.end();
    });
});

tape('copy.js output - network', (t) => {
    let tempFile = tmp.tmpNameSync();
    copy.init({
        id: 0,
        read: __dirname + '/fixtures/copy.sample-input-network.geojson',
        output: tempFile,
        type: 'network',
        total: 1,
        map: __dirname + '/../lib/map/osmium.js',
        solo: true,
        error: false,
        tokens: tokenize.createReplacer(['et'])
    });
    copy.start(() => {
        if (process.env.UPDATE) {
            fs.createReadStream(tempFile).pipe(fs.createWriteStream(path.resolve(__dirname, './fixtures/copy.sample-output-network.psv')));
            t.fail('updated fixture');
        }
        else
            t.equal(fs.readFileSync(tempFile).toString(), fs.readFileSync(__dirname + '/fixtures/copy.sample-output-network.psv').toString(), 'output is as expected');
        t.end();
    });
});

const tokenize = require('../lib/util/token.js');
const tape = require('tape');

(() => {
    tape('test tokens', (t) => {
        let tokens = {
            'Street': 'st'
        }
        let tokenReplacer = tokenize.createReplacer(tokens)
        let expected = [ { named: false, from: /([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)Street([\s\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)/gi, to: '$1st$2', inverse: false } ];
        t.deepEquals(tokenReplacer, expected, 'okay, created a regex')
        t.end();
    });
})();

(() => {
    tape('test tokens', (t) => {
        let tokens = {
            'Street': 'st'
        }
        let query = 'fake street';
        let tokensRegex = tokenize.createReplacer(tokens)
        let replace = tokenize.replaceToken(tokensRegex, query);
        t.deepEquals('fake st', replace, 'okay, replaced the token')
        t.end();
    });
})();

(() => {
    tape('test global tokens - talstrasse', (t) => {
        let tokens = {
            '\\b(.+)(strasse|str|straße)\\b': "$1 str"
        };
        tape.test('talstrasse', (q) => {
            let query = 'talstrasse';
            let tokensRegex = tokenize.createGlobalReplacer(tokens)
            let replace = tokenize.replaceToken(tokensRegex, query);
            q.deepEquals('tal str', replace, 'okay, talstrasse')
            q.end();
        });
        tape.test('talstraße', (q) => {
            let query = 'talstraße';
            let tokensRegex = tokenize.createGlobalReplacer(tokens)
            let replace = tokenize.replaceToken(tokensRegex, query);
            q.deepEquals('tal str', replace, 'okay, talstraße')
            q.end();
        });
        tape.test('talstr', (q) => {
            let query = 'talstr';
            let tokensRegex = tokenize.createGlobalReplacer(tokens)
            let replace = tokenize.replaceToken(tokensRegex, query);
            q.deepEquals('tal str', replace, 'okay, talstr')
            q.end();
        });
        t.end();
    });
})();

