const linker = require('../lib/linker');
const test = require('tape');

test('Passing Linker Matches', (t) => {
    t.deepEquals(
        linker({ text: 'main st' }, [
            { id: 1, text: 'main st' }
        ]),
        [{ id: 1, text: 'main st' }],
    'basic match');

    t.deepEquals(
        linker({ text: 'main st' }, [
            { id: 1, text: 'maim st' },
        ]),
        [{ id: 1, text: 'maim st', score: 85.71428571428572 }],
    'close match');

    t.deepEquals(
        linker({ text: 'main st' }, [
            { id: 1, text: 'main st' },
            { id: 2, text: 'main av' },
            { id: 3, text: 'main rd' },
            { id: 4, text: 'main dr' }
        ]),
        [{ id: 1, text: 'main st' }],
    'diff suff');

    t.deepEquals(
        linker({ text: 'main st' }, [
            { id: 1, text: 'main st' },
            { id: 2, text: 'asdg st' },
            { id: 3, text: 'asdg st' },
            { id: 4, text: 'maim st' }
        ]),
        [{ id: 1, text: 'main st' }],
    'diff name');

    t.deepEquals(
        linker({ text: 'ola ave', text_tokenless: 'ola' }, [
            { id: 1, text: 'ola', text_tokenless: 'ola'},
            { id: 2, text: 'ola avg', text_tokenless: 'ola avg'}
        ]),
        [{ id: 1, text: 'ola', text_tokenless: 'ola', score: 80}],
    'short names, tokens deweighted');

    t.deepEquals(
        linker({ text: 'ave st', text_tokenless: '', _text: 'Avenue Street' }, [
            { id: 1, text: 'ave', text_tokenless: '', _text: 'Avenue'},
            { id: 2, text: 'avenida', text_tokenless: 'avenida'}
        ]),
        [{ id: 1, text: 'ave', text_tokenless: '', _text: 'Avenue'}],
    'all-token scenario (e.g. avenue street)');

    t.deepEquals(
        linker({ text: 'ave st', text_tokenless: '', _text: 'Avenue Street' }, [
            { id: 1, text: 'ave', text_tokenless: '', _text: 'Avenue'},
            { id: 2, text: 'ave', text_tokenless: '', _text: 'Avenue'},
            { id: 3, text: 'avenida', text_tokenless: 'avenida'}
        ]),
        [
            { id: 1, text: 'ave', text_tokenless: '', _text: 'Avenue'},
            { id: 2, text: 'ave', text_tokenless: '', _text: 'Avenue'}
        ],
    'multiple winners (exact match)');

    t.deepEquals(
        linker({ text: 'main st', text_tokenless: '', _text: 'Main Street' }, [
            { id: 1, text: 'maim st', text_tokenless: 'maim', _text: 'Maim Street'},
            { id: 2, text: 'maim st', text_tokenless: 'maim', _text: 'Maim Street'},
            { id: 3, text: 'cross st', text_tokenless: 'cross', _text: 'Cross Street'}
        ]),
        [
            { id: 1, text: 'maim st', score: 85.71428571428572, text_tokenless: 'maim', _text: 'Maim Street'},
            { id: 2, text: 'maim st', score: 85.71428571428572, text_tokenless: 'maim', _text: 'Maim Street'}
        ],
    'multiple winners (score codepath)');

    t.end();
});

test('Failing Linker Matches', (t) => {
    t.deepEquals(
        linker({ text: 'main st' }, [
            { id: 1, text: 'anne blvd' }
        ]),
        false,
    'basic fail');

    t.end();
});
