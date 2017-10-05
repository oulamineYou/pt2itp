/**
 * @class Units
 */
class Units {


    /**
     * Is the given string a potential unit
     * @parm {string} str String to test
     * @return {boolean}
     */
    isUnit(str) {
        return isNaN(Number(str));
    }

    /**
     * Encode a housenumber/unit ie: 10a 10-1 etc into a numeric value
     * @param {string} str String to encode
     * @param {Object} args Optional args
     * @return {number}
     */
    encode(str, args = {}) {
        str = String(str);

        if (!this.isUnit(str)) return str;

        if (!str.match(/^\d+/)) return false;

        let num = str.match(/^\d+/)[0];
        let unit = str.replace(/^\d+/, '');

        if (!unit || !unit.length) return num;
        if (unit.length > 8) throw new Error('Cannot encode values > 8 chars');

        let encoded = '';

        unit = unit.toUpperCase();

        for (let unit_it = 0; unit_it < unit.length; unit_it++) {
            let code = unit.charCodeAt(unit_it);

            if (code > 100) throw new Error(`Cannot encode ASCII values above 100 - ${unit}`);

            encoded = encoded + String(code);
        }

        return `${num}.${encoded}`;
    }

    /**
     * Decode a housenumber/unit ie: 1.1234 etc into its' original string value
     * @param {string} str String to encode
     * @param {Object} args Optional args
     * @return {number}
     */
    decode(str, args = {}) {
        str = String(str);

        let num = str.split('.')[0];
        let unit = str.split('.')[1];

        if (!unit) return num;

        if (unit.length % 2 === 1) unit = unit + '0';

        let decoded = '';

        for (let unit_it = 0; unit_it < unit.length; unit_it = unit_it + 2) {
            decoded = decoded + String.fromCharCode(parseInt(unit[unit_it] + unit[unit_it + 1]));
        }

        return num + decoded.toLowerCase();
    }
}

module.exports = Units;
