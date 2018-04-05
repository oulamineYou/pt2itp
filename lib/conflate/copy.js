const tokenize = require('../util/tokenize');
const tokens = require('@mapbox/geocoder-abbreviations');
const readline = require('readline');
const turf = require('@turf/turf');
const path = require('path');
const csv = require('csv-stringify/lib/sync');
const fs = require('fs');

let opts = {};

let tokenRegex = tokenize.createGlobalReplacer(tokens().global);

process.on('message', (message) => {
    init(message);

    process.title = `COPY - PERSISTENT - ${opts.id}`;

    return start(() => {
        process.send(true);
    });
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
        opts.output.end(() => {
            return callback();
        });
    });

    rl.on('line', (data) => {
        if (!data || !data.length) return;

        num++;

        if (num % opts.total !== opts.id) return; //Distribute tasks evenly accross workers

        let feat;

        //The new GeoJSONSeq schema uses record separators
        data = data.replace(RegExp(String.fromCharCode(30), 'g'), '');

        try {
            feat = JSON.parse(data);
        } catch (err) {
            if (opts.error) process.stderr.write(`Unable to parse: ${err.toString()}\t${data}\n`);
            return;
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
        }

        if (!feat.id) {
            if (opts.error) process.stderr.write(`id cannot be null\t${data}\n`);
            return;
        }

        if (feat.properties.number === null) {
            if (opts.error) process.stderr.write(`properties.number cannot be null\t${data}\n`);
            return;
        }

        feat.properties.source = feat.properties.source || '';

        rl.output.write(csv([[
            feat.id,
            str(JSON.stringify(texts)),
            str(feat.properties.number),
            str(JSON.stringify(feat.properties)),
            feat.geometry.coordinates[0],
            feat.geometry.coordinates[1]
        ]], {
            delimiter: '|',
            quote: String.fromCharCode(30)
        }));
    });
}

/**
 * Instantiate copy class with required parameters before start is called
 * @param {Object} o Argument object
 * @param {numeric} o.id ID of process batch
 * @param {string} o.map Optionally use map file to convert line delimited input into PT2ITP supported GeoJSON
 * @param {string} o.read Path to input file
 * @param {Object} o.tokens Map of token abbreviations to use on text
 * @param {string} o.output Path to output file (will be overwritten if exists)
 * @param {numeric} o.total Total number of batches to process
 * @param {boolean} o.error If true print errors to stderr
 * @param {Object} o.context Additionalc context for map operations
 * @param {String} o.context.country ISO 3166-1 Alpha 2 code
 * @param {String} o.context.region ISO 3166-2 Code
 * @return {boolean} return true when initiated
 */
function init(o) {
    opts = o;

    //Enforce opts namespace to avoid undocumented opts
    let keys = [ 'id', 'map', 'read', 'tokens', 'output', 'total', 'error', 'context' ];
    for (let key of Object.keys(opts)) {
        if (keys.indexOf(key) === -1) throw new Error(`${key} is not a valid conflate/copy option`);
    }

    opts.map = opts.map ? require(path.resolve(__dirname, '../map/', opts.map)).map : false;
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
