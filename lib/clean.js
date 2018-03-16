const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Main entrance to clean module which reads a stream of line delimited GeoJSON features, runs them
 * through a specified map script (cleans/conforms them) and then outputs the modifed LdGeoJSON
 *
 * @param {Object} argv Argument Object - See argv parser or help module in code for a complete list
 * @param {Function} cb Callback in (err, res)
 * @return {Funtion} cb
 */
function main(argv, cb) {
    if (!cb || typeof cb !== 'function') throw new Error('lib/map.js requires a callback parameter');

    if (Array.isArray(argv)) {
        argv = require('minimist')(argv, {
            string: [ 'input', 'output' ],
            alias: {
                'output': 'o',
                'input': 'i'
            }
        });
    }

    if (!argv._[3]) return cb(new Error('<map-file-name> required. IE: osmium, strip-unit'));

    let map = require(path.resolve(__dirname, 'map/', argv._[3]));

    let inStream;
    if (argv.input) {
        inStream = fs.createReadStream(path.resolve(__dirname, '..', argv.input));
    } else {
        process.stdin.setEncoding('utf8');
        process.stdin.resume();
        inStream = process.stdin;
    }

    let outStream;
    if (argv.output) {
        outStream = fs.createWriteStream(path.resolve(__dirname, '..', argv.output));
    } else {
        outStream = process.stdout;
    }

    const rl = readline.createInterface({
        input: inStream,
        output: outStream
    }).on('line', (line) => {
        line = line.replace(RegExp(String.fromCharCode(30),"g"),"")
        let feat = JSON.parse(line);

        feat = map.map(feat);

        rl.output.write(JSON.stringify(feat) + '\n');
    }).on('error', (err) => {
        return cb(err);
    });
}
module.exports = main;
