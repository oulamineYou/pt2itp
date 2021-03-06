'use strict';

const ReadLine = require('n-readlines');
const worker = require('../lib/conflate');

const test = require('tape');
const path = require('path');
const fs = require('fs');

const db = require('./lib/db');
db.init(test);

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
        languages: 'en',
        db: 'pt_test'
    }, (err) => {
        t.error(err);

        const rl = new ReadLine('/tmp/output.geojson');

        t.deepEquals(JSON.parse(rl.next()), {
            action: 'create',
            type: 'Feature',
            properties: {
                number: 112,
                street: [{
                    display: '4th ST NE',
                    priority: 0
                }]
            },
            geometry: {
                type: 'Point',
                coordinates: [-77.00080543756485, 38.89128752230519]
            }
        });

        t.doesNotThrow(() => {
            fs.accessSync('/tmp/error-persistent');
        });

        fs.unlinkSync('/tmp/output.geojson');
        fs.unlinkSync('/tmp/error-persistent');
        t.end();
    });
});
