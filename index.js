#!/usr/bin/env node

const help = require('./lib/help');
const settings = require('./package.json');

if (require.main === module) {
    let argv = require('minimist')(process.argv, {
        boolean: ['help', 'version'],
        alias: {
            'version': 'v',
            'help': '?'
        }
    });

    if (argv.help) {
        help(argv);
        process.exit(0);
    } else if (argv.version) {
        console.log(settings.name + '@' + settings.version);
        process.exit(0);
    }

    switch (argv._[2]) {
        case ('help'):
            help(argv);
            break;
        case ('debug'):
            require('./lib/debug')(process.argv, (err) => {
                if (err) throw err;

                process.exit(0);
            });
            break;
        case ('clean'):
            require('./lib/clean')(process.argv, (err) => {
                if (err) throw err;

                console.error('ok - processing complete');
                process.exit(0);
            });
            break;
        case ('map'):
            require('./lib/map')(process.argv, (err) => {
                if (err) throw err;

                console.log('ok - processing complete');
                process.exit(0);
            });
            break;
        case ('conflate'):
            require('./lib/conflate')(process.argv, (err) => {
                if (err) throw err;

                console.log('ok - conflation complete');
                process.exit(0);
            });
            break;
        case ('stat'):
        case ('stats'):
            let stat_arg = require('minimist')(process.argv, {
                string: [ 'input' ]
            });

            let stats = require('./native/index.node').stats({
                input: stat_arg.input
            });

            console.log(JSON.stringify(stats));

            break;
        case ('test'):
            require('./lib/test')(process.argv, (err) => {
                if (err) throw err;

                process.exit(0);
            });
            break;
        case ('testcsv'):
            require('./lib/testcsv')(process.argv, (err) => {
                if (err) throw err;

                process.exit(0);
            });
            break;
        case ('strip'):
            require('./lib/strip')(process.argv, (err) => {
                if (err) throw err;

                process.exit(0);
            });
            break;
        case ('analyze'):
            require('./lib/analyze')(process.argv, (err) => {
                if (err) throw err;

                process.exit(0);
            });
            break;
        case ('convert'):
            let convert_arg = require('minimist')(process.argv, {
                string: [ 'input', 'output' ]
            });

            require('./native/index.node').convert({
                input: convert_arg.input,
                output: convert_arg.output
            });

            break;
        case ('dedupe'):
            let dedupe_arg = require('minimist')(process.argv, {
                string: [ 'input', 'output', 'tokens', 'db' ],
                boolean: ['hecate'],
                alias: {
                    database: 'db'
                }
            });

            require('./native/index.node').dedupe({
                input: dedupe_arg.input,
                output: dedupe_arg.output,
                tokens: dedupe_arg.tokens,
                hecate: dedupe_arg.hecate,
                database: dedupe_arg.db
            });

            break;
        default:
            help(argv);
            break;
    }
} else {
    module.exports = {
        debug: require('./lib/debug'),
        clean: require('./lib/clean'),
        map: require('./lib/map'),
        conflate: require('./lib/conflate'),
        dedupe: require('./native/index.node').dedupe,
        stat: require('./native/index.node').stats,
        test: require('./lib/test'),
        testcsv: require('./lib/testcsv'),
        strip: require('./lib/strip'),
        analyze: require('./lib/analyze'),
        convert: require('./native/index.node').convert
    };
}
