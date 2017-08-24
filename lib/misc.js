const turf = require('@turf/turf');
const _ = require('lodash');

module.exports = {
    /**
     * Calculate the Determinant on a 2 dimensional plane
     * @param {Array} start Coordinates of start of segment
     * @param {Array} end Coordinates of end of segment
     * @param {Array} query Coordinates to calculate det against
     * @return {Number}
     */
    det2D: (start, end, query) => {
        return (end[0]-start[0])*(query[1]-start[1]) - (end[1]-start[1])*(query[0]-start[0]);
    },

    /**
     * Return 1 or -1 if the number is above or below 0
     * @param {Number} num Number to test
     * @return {Number}
     */
    sign: (num) => {
        return typeof num === 'number' ? num ? num < 0 ? -1 : 1 : num === num ? 0 : NaN : NaN;
    },

    /**
     * Round the given num to the next highest given power
     * @param {Number} num Value to round
     * @param {Number} pow Power to round up to
     * @return {Number}
     */
    toHighest: (num, pow = 1) => {
        return Math.ceil(num / pow) * pow;
    },

    /**
     * Round the given num to the next lowest given power
     * @param {Number} num Value to round
     * @param {Number} pow Power to round down to
     * @return {Number}
     */
    toLowest: (num, pow = 1) => {
        return Math.floor(num / pow) * pow;
    },

    /**
     * Find the closest value in an array to a given target
     * @param {Array} array Array of values to search against
     * @param {Number} Target Find the closest number in the array to the target
     * @return {Number}
     */
    closest: (array, target) => {
        return array.sort((a, b) => Math.abs(target - a) - Math.abs(target - b))[0];
    },

    /**
     * Detect cases where there are duplicate addresses outside of the threshold within a single address cluster
     * @param {Array} number
     * @param {Array} coords
     */
    hasDupAddressWithin: (number, coords) => {
        for (let num_it = 0; num_it < number.length - 1; num_it++) {
            if (String(number[num_it + 1]) !== String(number[num_it])) continue; //No duplicate numbers

            if (turf.distance(turf.point(coords[num_it]), turf.point(coords[num_it+1]), 'kilometers') > 1) {
                return number[num_it];
            }
        }
        return false;
    }
}
