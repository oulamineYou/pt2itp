#!/usr/bin/env node

const help = require('./lib/help');
const settings = require('./package.json');

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
        require('./lib/stat')(process.argv, (err) => {
            if (err) throw err;

            process.exit(0);
        });
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
        require('./lib/convert')(process.argv, (err) => {
            if (err) throw err;

            process.exit(0);
        });
        break;
    default:
        help(argv);
        break;
}
