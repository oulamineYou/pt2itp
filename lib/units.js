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
        if (str.length % 2 === 1) throw new Error('Encoded terms are always even');

        let decoded = '';

        for (let str_it = 0; str_it < str.length; str_it = str_it + 2) {
            decoded = decoded + String.fromCharCode(parseInt(str[str_it] + str[str_it + 1]));
        }

        return decoded;
    }
}

module.exports = Units;
