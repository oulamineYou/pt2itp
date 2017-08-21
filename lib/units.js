class Units {
    encode(str) {
        if (str.length > 8) throw new Error('Cannot encode values > 8 chars');

        let encoded = '';

        str = str.toLowerCase();

        for (str_it = 0; str_it < str.length; str++) {
            let code = str.charCodeAt(str_it).toString();

            if (code > 100) throw new Error('Cannot encode ASCII values above 100');

            encoded = encoded + code;
        }

        return encoded;
    }

    decode(str) {
        if (str % 2 === 1) throw new Error('Encoded terms are always even');

        let decoded = '';

        for (str_it = 0; str_it < str.length; str = str + 2) {
            decoded = decoded + String.fromCharCode(parseInt(str[str_it] + str[str_it + 1]);
        }
    }
}
