const Index = require('../lib/index');
const worker = require('../lib/map');
const exec = require('child_process').exec;

const spawn = require('tape-spawn');
const csv = require('fast-csv');
const test = require('tape');
const path = require('path');
const pg = require('pg');

// const database = 'pt_test';
const carmenIndex = path.resolve(__dirname, './fixtures/test-ri/index/us_ri-address-both-0d603c2a171017011038-0d603c2a39.mbtiles');
const output = '/tmp/test-ri.err';
const config = path.resolve(__dirname, './fixtures/test-ri/carmen-config2.json');

test('Run test mode', (t) => {
    exec(`${__dirname}/../index.js test - | carmen-index --config=${config} --index=${carmenIndex}`, (err, stdout, stderr) => {
        t.test('Return correct error messages in csv', (t) => {
            let csvErrs = [];
            let queryResults;

            csv.fromPath(output, {headers: true})
            .on('data', (data) => {
                csvErrs.push(data);
            })
            .on('end', () => {
                t.equal(csvErrs.length, 2);
                t.equal(csvErrs.filter(ele => ele.query === '5 greeeeeenview rd')[0].error, 'NO RESULTS');
                t.equal(csvErrs.filter(ele => ele['addr text'] === 'greeeeeenview')[0].error, 'NAME MISMATCH (SOFT)');
                exec(`carmen --query "5 Greenview Rd" /tmp/ri.mbtiles | grep "1.00 5 Greenview Rd" | tr -d '\n'`, (err, res) => {
                    t.equal(res, "- 1.00 5 Greenview Rd,  (address.1216774020)")
                });

                t.end();
            });
        });
    });

});
