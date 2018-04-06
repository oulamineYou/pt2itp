const Queue = require('d3-queue').queue;
const turf = require('@turf/turf');
const pg = require('pg');
const Readline = require('readline');
const tokenize = require('../util/tokenize');
const tokens = require('@mapbox/geocoder-abbreviations');
const fs = require('fs');
let tokenRegex = tokenize.createGlobalReplacer(tokens().global);

/**
 * @class Compare
 */
class Compare {

    /**
     * Intilize the compare child process with given arguments and then wait for data messages to process
     * @param {Object} o Argument object
     * @param {number} o.id Assigned id of the process
     * @param {number} o.total total number of parallel processes to distribute work
     * @param {Object} o.context Object containing country/region codes
     * @param {string} o.context.country ISO 3166-1 Alpha 2 Country Code
     * @param {string} o.context.region ISO 3166-2 Region Code
     * @param {string} o.read A path to the input GeoJSON file
     * @param {string} o.map Name of map file to use in lib/map/
     * @param {Stream} o.output A stream to output to, defaults to process.stdout
     * @param {Object} o.tokens Token replacement object
     * @param {Object} o.pool PG Pool Instance to use to communicate with the database
     */
    constructor(o) {
        this.opts = o;
        this.num = 0;

        //Enforce opts namespace to avoid undocumented opts
        let keys = ['id', 'total', 'context', 'output', 'pool', 'map', 'read', 'tokens']
        for (let key of Object.keys(this.opts)) {
            if (keys.indexOf(key) === -1) throw new Error(`${key} is not a valid conflate/compare option`);
        }

        if (!this.opts.output) this.opts.output = process.stdout;
        if (this.opts.read) this.opts.read = fs.createReadStream(this.opts.read);

        if (this.opts.map) this.opts.map = require(`../map/${this.opts.map}`).map;

        if (this.pool) this.pool = new pg.Pool(this.opts.pool);
    }

    /**
     * Read the input stream, comparing with the database and creating/modifying as necessary
     * @param {Function} cb Callback function (err, res)
     * @return {Function} Return cb function
     */
    read(cb) {
        const rl = Readline.createInterface({
            input: this.opts.read,
            output: this.opts.output
        }).on('error', (err) => {
            return cb(err);
        }).on('line', (data) => {
            if (!data || !data.length) return;

            this.num++;
            if (this.num % this.opts.total !== this.opts.id) return; //Distribute tasks evenly accross workers

            //The new GeoJSONSeq schema uses record separators
            data = data.replace(RegExp(String.fromCharCode(30), 'g'), '');

            let feat;
            try {
                if (this.opts.map) {
                    feat = this.opts.map(JSON.parse(data), this.opts.context);
                } else {
                    feat = JSON.parse(data);
                }
            } catch (err) {
                process.stderr.write(`Unable to parse: ${err.toString()}\t${data}\n`);
            }

            if (feat instanceof Error) {
                return process.stderr.write(`${feat.message}: ${data}\n`);
            }

            this.pool.query(`
                SELECT
                    name,
                    json_build_object(
                        'id', p.id,
                        'properties', p.props,
                        'geometry', ST_AsGeoJSON(p.geom)::JSON
                    ) AS feat
                FROM
                    persistent p
                WHERE
                    p.number = '${feat.properties.number}'
                    AND ST_DWithin(ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(feat.geometry)}'), 4326), p.geom, 0.02);
            `, (err, res) => {
                if (err) return cb(err);

                let hecate = this.compare(feat, res.rows);
                if (hecate) this.opts.output.write(JSON.stringify(hecate) + '\n');
            });
        }).on('close', (close) => {
            return cb();
        });
    }

    compare(feat, rows) {
        //The address does not exist in the database and should be created
        if (rows.length === 0) return this.create(feat);

        //Use geometry unit cutoff instead of the geographic postgis
        rows = rows.filter((row) => {
            return turf.distance(feat, row.feat.geometry, { units: 'kilometers' }) < 0.5;
        });

        const potentials = feat.properties.street.map((name) => {
            return tokenize.replaceToken(tokenRegex, tokenize.main(name.display, this.opts.tokens, true).tokens.join(' '));
        });

        for (let r of rows) {
            let known = r.name.map((name) => { return name.tokenized; });

            for (let potential of potentials) {
                if (known.indexOf(potential) !== -1) {
                    let m = this.modify(r.feat, feat);

                    if (m) return m;
                    else return;
                }
            }
        }

        return this.create(feat);
    }

    /**
     * Given a feature that should be added to the database, output a hecate compatible feature
     *
     * @param {Object} feat GeoJSON Point Feature with address properties
     * @return {Object} GeoJSON Point Feature with additional hecate properties
     */
    create(feat) {
        return {
            action: 'create',
            properties: {
                number: feat.properties.number,
                street: feat.properties.street,
                source: feat.properties.source
            },
            geometry: feat.geometry
        };
    }

    /**
     * Given a 2 features, compare them to see if a merge & modify operation is warranted
     *
     * @param {Object} known Persistent GeoJSON Point Feature with address properties
     * @param {Object} potential New GeoJSON Point Feature with address properties
     * @return {Object|false} New hecate compatible GeoJSON Feature or false
     */
    modify(known, potential) {
        let modify = false;
        let names = JSON.parse(JSON.stringify(known.properties.street));

        for (let pname of potential.properties.street) {
            let ptoken = tokenize.replaceToken(tokenRegex, tokenize.main(pname.display, this.opts.tokens, true).tokens.join(' '));

            let exists = false;
            for (let kname of known.properties.street) {
                let ktoken = tokenize.replaceToken(tokenRegex, tokenize.main(kname.display, this.opts.tokens, true).tokens.join(' '));

                if (ktoken === ptoken) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                names.push(kname);
                modify = true;
            }
        }

        if (!modify) return false;

        known.properties.street = names;
        known.action = 'modify';

        return known;
    }

    /**
     * Only called by tests - child process kills this automatically
     * @return {boolean} Returns true after pool is ended.
     */
    kill() {
        this.pool.end();

        return true;
    }
}

process.on('message', (message) => {
    const compare = new Compare(message);

    id = message.id;
    process.send({
        type: 'ready',
        id: id
    });

    compare.read((err) => {
        if (err) throw err;

        process.send({
            type: 'end',
            id: id
        });
    });
});

module.exports = Compare;
