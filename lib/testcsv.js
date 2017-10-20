module.exports = test;

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');
const csv = require('fast-csv');
const geocode = require('./geocode');
const Q = require('d3-queue').queue;

/**
 * Use raw addresses to query generated ITP output to check for completeness
 * @param {Object} argv Arguments Param - See help or parsing code for a full list
 * @param {Function} cb Callback in (err, res)
 * @return {Function} cb
 */
function test(argv, cb) {
    if (Array.isArray(argv)) {
        argv = require('minimist')(argv, {
            string: [
                'index',
                'output',
                'config',
                'input'
            ],
            alias: {
                output: 'o',
                input: 'i'
            }
        });
    }

    if (!argv.output) {
        console.error('--output=<output.errors> argument required');
        process.exit(1);
    } else if (!argv.output) {
        console.error('--input=<input.csv> argument required');
        process.exit(1);
    } else if (!argv.index) {
        console.error('--index=<INDEX.mbtiles> argument required');
        process.exit(1);
    } else if (!argv.config) {
        console.error('--config=<CONFIG.json> argument required');
        process.exit(1);
    }

    carmencnf = {
        getInfo: require(path.resolve(argv.config)),
        index: argv.index
    }

    const c = geocode(carmencnf);

    let buffer = [];

    c.on('open', () => {
        const input = fs.createReadStream(path.resolve(process.cwd(), argv.input));

        csvStream = csv.fromStream(input, {
            headers: [ "lon", "lat", "address" ],
            objectMode: true,
            headers: false
        });

        csvStream.on('data', (data) => {
            if (buffer.length >= 25) {
                csvStream.pause();
                buffer.push(data);

                let addrQ = new Q();
                for (let entry of buffer) {
                    addrQ.defer((lon, lat, query, done) => {
                        console.error(query, lon, lat)
                        c.geocode(query, {
                            proximity: [ lon, lat ]
                        }, (err, res) => {
                            geocode.isPass(query, [lon, lat], res, {
                                tokens: carmencnf.metadata ? carmencnf.metadata.geocoder_tokens : carmencnf.geocoder_tokens
                            }, done);
                        });
                    }, Number(entry[0]), Number(entry[1]), entry[2]);
                }

                addrQ.awaitAll((err, res) => {
                    buffer = [];
                    //input.resume();
                });
            } else {
                buffer.push(data);
            }
        });

        csvStream.on('end', () => {
            console.error('All done!');
        });
    });

    function processEntry(entry, done) {
    }
}
