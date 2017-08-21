class Units {
    encode(str) {
        if (str.length > 8) throw new Error('Cannot encode values > 8 chars');

        let encoded = '';

        str = str.toLowerCase();

        for (let str_it = 0; str_it < str.length; str_it++) {
            let code = str.charCodeAt(str_it);

            if (code > 100) throw new Error('Cannot encode ASCII values above 100');

            encoded = encoded + String(code);
        }

        return encoded;
    }

    decode(str) {
        let num = '';
        let unit;

        if (str.match(/\./)) {
            num = str.split('.')[0];
            unit = str.split('.')[1];
        } else {
            unit = str;
        }

        if (unit.length % 2 === 1) unit = unit + '0';

        let decoded = '';

        for (let unit_it = 0; unit_it < unit.length; unit_it = unit_it + 2) {
            decoded = decoded + String.fromCharCode(parseInt(unit[unit_it] + unit[unit_it + 1]));
        }

        return num + decoded.toLowerCase();
    }
}

module.exports = Units;
