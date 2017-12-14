const linker = require('../lib/linker');
const test = require('tape');

test('linker#isNumbered', (t) => {
    t.equals(linker.isNumbered('main st'), false, 'main st => false');
    t.equals(linker.isNumbered('1st st'), '1st', '1st st => 1st');
    t.equals(linker.isNumbered('2nd st'), '2nd', '2nd st => 2nd');
    t.equals(linker.isNumbered('west 2nd st'), '2nd', 'west 2nd st => 2nd');
    t.equals(linker.isNumbered('3rd st'), '3rd', '3rd st = 3rd');
    t.equals(linker.isNumbered('4th av'), '4th', '4th av => 4th');
    t.equals(linker.isNumbered('21st av'), '21st', '21st av => 21st');
    t.equals(linker.isNumbered('32nd av'), '32nd', '32nd av => 32nd');
    t.equals(linker.isNumbered('45th av'), '45th', '45th av => 45th');
    t.equals(linker.isNumbered('351235th av'), '351235th', '351235th av => 351235th');
    t.end();
});

test('linker#isRoutish', (t) => {
    t.equals(linker.isRoutish('main st'), false, 'main st => false');
    t.equals(linker.isRoutish('1st st'), false, '1st st => false');
    t.equals(linker.isRoutish('351235th av'), false, '351235th av => false');
    t.equals(linker.isRoutish('NC 124'), '124', 'NC 124 => 124');
    t.equals(linker.isRoutish('US Route 50 East'), '50', 'US Route 50 East => 50');
    t.equals(linker.isRoutish('321'), '321', '321 => 321');
    t.equals(linker.isRoutish('124 NC'), '124', '124 NC => 124');
    t.end();
});

test('Passing Linker Matches', (t) => {
    t.deepEquals(
        linker({ display: 'Main Street', tokenized: 'main st' }, [
            { id: 1, name: { display: 'Main Street', tokenized: 'main st' } }
        ]),
        [{ id: 1, name: { display: 'Main Street', tokenized: 'main st' }, score: 100 }],
    'basic match');

    t.deepEquals(
        linker({ display: 'Main Street', tokenized: 'main st' }, [
            { id: 1, name: { display: 'Maim Street', tokenized: 'maim st' } },
        ]),
        [{ id: 1, name: { display: 'Maim Street', tokenized: 'maim st' }, score: 85.71428571428572 }],
    'close match');

    t.deepEquals(
        linker({ display: '1st Street West', tokenized: '1st st west' }, [
            { id: 1, name: { display: '2nd Street West', tokenized: '2nd st west' } },
        ]),
        false,
    'no match numeric simple (2nd)');

    t.deepEquals(
        linker({ display: '1st Street West', tokenized: '1st st west' }, [
            { id: 1, name: { display: '3rd Street West', tokenized: '3rd st west' } },
        ]),
        false,
    'no match numeric simple (3rd)');

    t.deepEquals(
        linker({ display: '1st Street West', tokenized: '1st st west' }, [
            { id: 1, name: { display: '4th Street West', tokenized: '4th st west' } },
        ]),
        false,
    'no match numeric simple (4th)');

    t.deepEquals(
        linker({ display: '11th Street West', tokenized: '11th st west' }, [
            { id: 1, name: { display: '21st Street West', tokenized: '21st st west' } },
        ]),
        false,
    'no match numeric simple (21st)');

    t.deepEquals(
        linker({ display: 'US Route 50 East', tokenized: 'us route 50 east' }, [
            { id: 1, name: { display: 'US Route 50 West', tokenized: 'us route 50 west' } },
        ]),
        [{ id: 1, name: { display: 'US Route 50 West', tokenized: 'us route 50 west' }, score: 87.5 }],
    'Numbers match - cardinals don\'t');

    t.deepEquals(
        linker({ display: 'US Route 60 East', tokenized: 'us route 50 east' }, [
            { id: 1, name: { display: 'US Route 51 West', tokenized: 'us route 51 west' } },
        ]),
        false,
    'Number mismatch fail');

    t.deepEquals(
        linker({ display: '11th Street West', tokenized: '11th st west' }, [
            { id: 1, name: { display: '11th Avenue West', tokenized: '11th av west' } },
        ]),
        [ { id: 1, name: { display: '11th Avenue West', tokenized: '11th av west' }, score: 83.33333333333334 } ],
    'match numeric simple (type mismatch)');

    t.deepEquals(
        linker({ tokenized: 'main st' }, [
            { id: 1, tokenized: 'main st' },
            { id: 2, tokenized: 'main av' },
            { id: 3, tokenized: 'main rd' },
            { id: 4, tokenized: 'main dr' }
        ]),
        [{ id: 1, tokenized: 'main st' }],
    'diff suff');

    t.deepEquals(
        linker({ tokenized: 'main st' }, [
            { id: 1, tokenized: 'main st' },
            { id: 2, tokenized: 'asdg st' },
            { id: 3, tokenized: 'asdg st' },
            { id: 4, tokenized: 'maim st' }
        ]),
        [{ id: 1, tokenized: 'main st' }],
    'diff name');

    t.deepEquals(
        linker({ tokenized: 'ola ave', tokenless: 'ola' }, [
            { id: 1, tokenized: 'ola', tokenless: 'ola'},
            { id: 2, tokenized: 'ola avg', tokenless: 'ola avg'}
        ]),
        [{ id: 1, tokenized: 'ola', tokenless: 'ola', score: 80}],
    'short names, tokens deweighted');

    t.deepEquals(
        linker({ tokenized: 'ave st', tokenless: '', tokenized: 'Avenue Street' }, [
            { id: 1, tokenized: 'ave', tokenless: '', tokenized: 'Avenue'},
            { id: 2, tokenized: 'avenida', tokenless: 'avenida'}
        ]),
        [{ id: 1, tokenized: 'ave', tokenless: '', tokenized: 'Avenue'}],
    'all-token scenario (e.g. avenue street)');

    t.deepEquals(
        linker({ tokenized: 'ave st', tokenless: '', tokenized: 'Avenue Street' }, [
            { id: 1, tokenized: 'ave', tokenless: '', tokenized: 'Avenue'},
            { id: 2, tokenized: 'ave', tokenless: '', tokenized: 'Avenue'},
            { id: 3, tokenized: 'avenida', tokenless: 'avenida'}
        ]),
        [
            { id: 1, tokenized: 'ave', tokenless: '', tokenized: 'Avenue'},
            { id: 2, tokenized: 'ave', tokenless: '', tokenized: 'Avenue'}
        ],
    'multiple winners (exact match)');

    t.deepEquals(
        linker({ tokenized: 'main st', tokenless: '', tokenized: 'Main Street' }, [
            { id: 1, tokenized: 'maim st', tokenless: 'maim', tokenized: 'Maim Street'},
            { id: 2, tokenized: 'maim st', tokenless: 'maim', tokenized: 'Maim Street'},
            { id: 3, tokenized: 'cross st', tokenless: 'cross', tokenized: 'Cross Street'}
        ]),
        [
            { id: 1, tokenized: 'maim st', score: 85.71428571428572, tokenless: 'maim', tokenized: 'Maim Street'},
            { id: 2, tokenized: 'maim st', score: 85.71428571428572, tokenless: 'maim', tokenized: 'Maim Street'}
        ],
    'multiple winners (score codepath)');

    t.deepEquals(
        linker({ tokenized: 's st nw', tokenized: 'S STREET NW', tokenless: null }, [
            { id: 1250, tokenized: 'p st ne', tokenized: 'P Street Northeast', tokenless: 'p' },
            { id: 863, tokenized: 's st nw', tokenized: 'S STREET NW', tokenless: '' },
            { id: 862, tokenized: 's st ne', tokenized: 'S STREET NE', tokenless: '' },
            { id: 388, tokenized: 'bates st nw', tokenized: 'BATES STREET NW', tokenless: 'bates' }
        ]),
        [ { id: 863, tokenized: 's st nw', tokenized: 'S STREET NW', tokenless: '' } ],
    'single winner w/ null tokenless');

    t.deepEquals(
        linker({ tokenized: 's st nw', tokenized: 'S STREET NW', tokenless: null }, [
            { id: 2421, tokenized: 'n capitol st', tokenized: 'North Capitol Street', tokenless: 'capitol' },
            { id: 669, tokenized: 't st ne', tokenized: 'T Street Northeast', tokenless: 't' },
            { id: 630, tokenized: 'todd pl ne', tokenized: 'Todd Place Northeast', tokenless: 'todd' },
            { id: 1007, tokenized: 'u st ne', tokenized: 'U Street Northeast', tokenless: 'u' },
            { id: 2286, tokenized: 'v st ne', tokenized: 'V Street Northeast', tokenless: 'v' },
            { id: 1026, tokenized: 'u st nw', tokenized: 'U STREET NW', tokenless: 'u' },
            { id: 680, tokenized: 't st nw', tokenized: 'T STREET NW', tokenless: 't' },
            { id: 2231, tokenized: 'rhode is av ne', tokenized: 'Rhode Island Avenue Northeast', tokenless: 'rhode' },
            { id: 1199, tokenized: 'n capitol st ne', tokenized: 'North Capitol Street Northeast', tokenless: 'capitol' },
            { id: 2031, tokenized: 'n capitol st nw', tokenized: 'NORTH CAPITOL STREET NW', tokenless: 'capitol' },
            { id: 224, tokenized: 'elm st nw', tokenized: 'Elm Street Northwest', tokenless: 'elm' },
            { id: 388, tokenized: 'bates st nw', tokenized: 'BATES STREET NW', tokenless: 'bates' },
            { id: 863, tokenized: 's st nw', tokenized: 'S STREET NW', tokenless: '' },
            { id: 1365, tokenized: 'rhode is av nw', tokenized: 'RHODE ISLAND AVENUE NW', tokenless: 'rhode' },
            { id: 2366, tokenized: 'r st nw', tokenized: 'R STREET NW', tokenless: '' },
            { id: 189, tokenized: 'randolph pl ne', tokenized: 'Randolph Place Northeast',tokenless: 'randolph' },
            { id: 296, tokenized: 'rt 1', tokenized: 'ROUTE 1', tokenless: '1' },
            { id: 629, tokenized: 'lincoln rd ne', tokenized: 'Lincoln Road Northeast', tokenless: 'lincoln' },
            { id: 1662, tokenized: 'quincy pl ne', tokenized: 'Quincy Place Northeast', tokenless: 'quincy' },
            { id: 852, tokenized: '1st st nw', tokenized: 'First Street Northwest', tokenless: null },
            { id: 920, tokenized: 'porter st ne', tokenized: 'Porter Street Northeast', tokenless: 'porter' },
            { id: 1037, tokenized: 'quincy pl nw', tokenized: 'Quincy Place Northwest', tokenless: 'quincy' },
            { id: 959, tokenized: 'florida av ne', tokenized: 'Florida Avenue Northeast',tokenless: 'florida' },
            { id: 969, tokenized: 'richardson pl nw', tokenized: 'Richardson Place Northwest', tokenless: 'richardson' },
            { id: 1898, tokenized: '1st st ne', tokenized: 'First Street Northeast', tokenless: null },
            { id: 1929, tokenized: 'q st ne', tokenized: 'Q Street Northeast', tokenless: 'q' },
            { id: 2053, tokenized: 'florida av nw', tokenized: 'Florida Ave NW', tokenless: 'florida' },
            { id: 1250, tokenized: 'p st ne', tokenized: 'P Street Northeast', tokenless: 'p' },
            { id: 1243, tokenized: 's st ne', tokenized: 'S Street Northeast', tokenless: null },
            { id: 1874, tokenized: 'r st ne', tokenized: 'R Street Northeast', tokenless: null },
            { id: 2472, tokenized: 'seaton pl ne', tokenized: 'Seaton Place Northeast', tokenless: 'seaton' },
            { id: 1893, tokenized: 'randolph pl nw', tokenized: 'Randolph Place Northwest', tokenless: 'randolph' },
            { id: 2074, tokenized: 'anna j cooper cir nw', tokenized: 'Anna J Cooper Circle Northwest', tokenless: 'anna j cooper' },
            { id: 69, tokenized: 'p st nw', tokenized: 'P STREET NW', tokenless: 'p' },
            { id: 2225, tokenized: 'q st nw', tokenized: 'Q STREET NW', tokenless: 'q' },
            { id: 424, tokenized: '4th st nw', tokenized: '4th Street Northwest', tokenless: null },
            { id: 761, tokenized: 'v st nw', tokenized: 'V Street Northwest', tokenless: 'v' },
            { id: 1210, tokenized: '3rd st nw', tokenized: '3rd Street Northwest', tokenless: null },
            { id: 1481, tokenized: 'seaton pl nw', tokenized: 'Seaton Place Northwest', tokenless: 'seaton' },
            { id: 460, tokenized: 'flagler pl nw', tokenized: 'Flagler Place Northwest', tokenless: 'flagler' },
            { id: 565, tokenized: '2nd st nw', tokenized: '2nd Street Northwest', tokenless: null },
            { id: 2402, tokenized: 'thomas st nw', tokenized: 'Thomas Street Northwest', tokenless: 'thomas' }
        ]),
        [ { id: 863, tokenized: 's st nw', tokenized: 'S STREET NW', tokenless: '' } ],
    'Ensure short circuiting never beats an exact match');
    t.end();
});

test('Failing Linker Matches', (t) => {
    t.deepEquals(
        linker({ tokenized: 'main st' }, [
            { id: 1, tokenized: 'anne blvd' }
        ]),
        false,
    'basic fail');

    t.end();
});
