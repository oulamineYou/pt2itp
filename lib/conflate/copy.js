const tokenize = require('./tokenize');
const tokens = require('@mapbox/geocoder-abbreviations');
const readline = require('readline');
const turf = require('@turf/turf');
const csv = require('csv-stringify/lib/sync');
const fs = require('fs');

let opts = {};

let tokenRegex = tokenize.createGlobalReplacer(tokens().global);

process.on('message', (message) => {
    init(message);

    process.title = `COPY - PERSISTENT - ${opts.id}`;

    return start();
});

/**
 * Start reading given input GeoJSON file and write output to csv to be COPYied into the database
 * @param {Function} callback Optional callback for those not using in a childprocess (listen to process.message by default)
 * @return {Function|false} Return callback if defined or false when completed
 */
function start(callback) {
    rl = readline.createInterface({
        input: opts.read,
        output: opts.output
    });

    let num = 0;

    rl.on('close', () => {
        if (!opts.solo) {
            opts.output.end(() => {
                process.send(true);
            });
        }

        if (callback && (typeof callback === 'function')) {
            return callback();
        }
    });

    rl.on('line', (data) => {
        if (!data || !data.length) return;

        num++;

        if (num % opts.total !== opts.id) return; //Distribute tasks evenly accross workers

        let features = false;

        //The new GeoJSONSeq schema uses record separators
        data = data.replace(RegExp(String.fromCharCode(30), 'g'), '');

        try {
            features = JSON.parse(data);
        } catch (err) {
            if (opts.error) process.stderr.write(`Unable to parse: ${err.toString()}\t${data}\n`);
        }


        feat = turf.truncate(feat, {
            precision: 6,
            coordinates: 2,
            mutate: true
        });

        let texts;
        if (typeof feat.properties.street === 'string') {
            texts = [{
                display: feat.properties.street,
                priority: 0
            }]
        } else if (Array.isArray(feat.properties.street)) {
            texts = feat.properties.street;
        } else {
            texts = [ feat.properties.street ];
        }

        for (let text of texts) {
            if (!text.priority) text.priority = 0;

            let tokens = tokenize.main(text.display, opts.tokens, true);
            text.tokenized = tokenize.replaceToken(tokenRegex, tokens.tokens.join(' '));
            text.source = opts.type;
        }

        if (feat.properties.number === null) {
            if (opts.error) process.stderr.write(`.number cannot be null\t${data}\n`);
            return;
        }

        feat.properties.source = feat.properties.source || '';

        rl.output.write(csv([[
            str(JSON.stringify(texts)),
            feat.geometry.coordinates[0],
            feat.geometry.coordinates[1],
            str(feat.properties.number),
            str(encoded),
            str(feat.properties.source),
            feat.properties.output
        ]], {
            delimiter: '|',
            quote: String.fromCharCode(30)
        }));
    });
}

/**
 * Instantiate copy class with required parameters before start is called
 * @param {Object} o Argument object
 * @param {string} o.map Optionally use map file to convert line delimited input into PT2ITP supported GeoJSON
 * @param {string} o.read Path to input file
 * @param {string} o.output Path to output file (will be overwritten if exists)
 * @param {string} o.type One of 'address' or 'network' depending on the input type
 * @param {boolean} o.error If true print errors to stderr
 * @param {numeric} o.id ID of process batch
 * @param {numeric} o.total Total number of batches to process
 * @return {boolean} return true when initiated
 */
function init(o) {
    opts = o;
    opts.map = opts.map ? require(opts.map).map : false;
    opts.context = opts.context ? opts.context : false;

    opts.read = fs.createReadStream(opts.read);
    opts.output = fs.createWriteStream(opts.output);

    return true;
}

/**
 * Remove `|` and newline characters from output strings to ensure PSV file is valid
 * @param {string} s String to validate
 * @return {string} validated string
 */
function str(s) {
    if (typeof s === 'string') return s.replace(/\|/g, '').replace(/(\n|\r)/g, ' ');
    return s;
}

module.exports.init = init;
module.exports.str = str;
module.exports.start = start;
