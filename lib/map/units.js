/**
 * @class Units
 */
class Units {

    /**
     * Is the given string a potential encoded unit
     * @param {string} str String to test
     * @return {boolean}
     */
    isEncoded(str) {
        return !isNaN(Number(str));
    }

    /**
     * Encode a housenumber/unit ie: 10a 10-1 etc into a numeric value
     * @param {string} str String to encode
     * @param {Object} args Optional args
     * @param {boolean} args.output Should the pt be output once itp has finished (defaults to true)
     * @return {number}
     */
    encode(str, args = {}) {
        str = String(str);

        let format, num, unit;
        if (str.match(/^([nesw]\d+)([nesw]\d+)$/)) {
            let match = str.match(/^([nesw])(\d+)([nesw])(\d+)?$/);
            num = `2${match[1].toUpperCase().charCodeAt(0)}${match[3].toUpperCase().charCodeAt(0)}${match[2]}`;
            unit = parseInt(match[4]);
        } else if (str.match(/^([nesw]\d+)$/)) {
            let match = str.match(/^([nesw])(\d+)/);
            num = `3${match[1].toUpperCase().charCodeAt(0)}${match[2]}`;
        } else if (!str.match(/^\d+/)) {
            return false; //Cannot encode units starting with  a non-numeric value unless they are a special format
        } else {
            num = `1${str.match(/^\d+/)[0]}`;
            unit = str.replace(/^\d+/, '');

            if (unit.length > 8) throw new Error('Cannot encode values > 8 chars');

            let encoded = '';

            unit = unit.toUpperCase();

            for (let unit_it = 0; unit_it < unit.length; unit_it++) {
                let code = unit.charCodeAt(unit_it);

                if (code > 99) throw new Error(`Cannot encode ASCII values above 99 - ${unit}`);

                encoded = encoded + String(code);
            }

            unit = encoded;
        }

        if (args.output === false) {
            num = num * -1;
        }

        if (!unit) return parseInt(num);
        return parseFloat(`${num}.${unit}`);
    }

    /**
     * Decode a housenumber/unit ie: 1.1234 etc into its' original string value
     * @param {numeric} str String to decode
     * @param {Object} args Optional args
     * @return {Object} Object in format { num: String, output: boolean }
     */
    decode(str, args = {}) {
        if (!this.isEncoded(str)) return false;

        str = Number(str);

        let output = true;
        if (str < 0) {
            output = false;
            str = str * -1;
        }

        str = String(str);

        let prelim = str.split('.')[0];

        let format = prelim.slice(0, 1);
        let num = prelim.slice(1);
        let unit = str.split('.')[1];

        if (format === '1') {
            if (!unit) return {
                num: String(num),
                output: output
            }

            if (unit.length % 2 === 1) unit = unit + '0';

            let decoded = '';

            for (let unit_it = 0; unit_it < unit.length; unit_it = unit_it + 2) {
                decoded = decoded + String.fromCharCode(parseInt(unit[unit_it] + unit[unit_it + 1]));
            }

            return {
                num: num + decoded.toLowerCase(),
                output: output
            }
        } else if (format === '2') { //W543N2345 format
            return {
                num: `${String.fromCharCode(num.slice(0, 2))}${num.slice(4)}${String.fromCharCode(num.slice(2, 4))}${unit}`.toLowerCase(),
                output: output
            }
        } else if (format === '3') { //W543 format
            return {
                num: `${String.fromCharCode(num.slice(0, 2))}${num.slice(2)}`.toLowerCase(),
                output: output
            }
        } else {
            return false;
        }
    }
}

module.exports = Units;
