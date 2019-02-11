const ReadLine = require('readline');
const worker = require('../lib/conflate');

const test = require('tape');
const path = require('path');
const fs = require('fs');

test('Compare', (t) => {

    // Ensure files don't exist before test
    try {
        fs.unlinkSync('/tmp/output.geojson');
        fs.unlinkSync('/tmp/error-persistent');
    } catch (err) {
        console.error('ok - cleaned tmp files');
    }

    worker({
        'in-persistent': path.resolve(__dirname, './fixtures/dc-persistent.geojson'),
        'in-address': path.resolve(__dirname, './fixtures/dc-new.geojson'),
        output: '/tmp/output.geojson',
        'error-persistent': '/tmp/error-persistent',
        tokens: 'en',
        db: 'pt_test'
    }, (err, res) => {
        t.error(err);

        rl = ReadLine.createInterface({
            input: fs.createReadStream('/tmp/output.geojson')
        });

        rl.on('line', (line) => {
            if (!line) return;

            feat = JSON.parse(line);

            console.error(feat);

        });

        rl.on('error', t.error);

        rl.on('close', () => {
            t.doesNotThrow(() => {
                fs.accessSync('/tmp/error-persistent');
            });

            fs.unlinkSync('/tmp/ouput.geojson');
            fs.unlinkSync('/tmp/error-persistent');
            t.end();
        });
    });
});
