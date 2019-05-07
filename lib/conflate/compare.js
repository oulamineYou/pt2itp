'use strict';

const Queue = require('d3-queue').queue;
const turf = require('@turf/turf');
const Readline = require('n-readlines');
const tokenize = require('../util/tokenize');
const tokens = require('@mapbox/geocoder-abbreviations');
const Cursor = require('pg-cursor');
const _ = require('lodash');
const tokenRegex = tokenize.createGlobalReplacer(tokens().global);

/**
 * @class Compare
 */
class Compare {

    /**
     * Intilize the compare child process with given arguments and then wait for data messages to process
     * @param {Object} o Argument object
     * @param {Object} o.context Object containing country/region codes
     * @param {string} o.context.country ISO 3166-1 Alpha 2 Country Code
     * @param {string} o.context.region ISO 3166-2 Region Code
     * @param {string} o.read A path to the input GeoJSON file
     * @param {Stream} o.output A stream to output to
     * @param {Object} o.tokens Token replacement object
     * @param {Object} o.pool PG Pool Instance
     */
    constructor(o) {
        this.opts = o;
        // Enforce opts namespace to avoid undocumented opts
        const keys = ['context', 'output', 'pool', 'read', 'tokens'];
        for (const key of Object.keys(this.opts)) {
            if (keys.indexOf(key) === -1) throw new Error(`${key} is not a valid conflate/compare option`);
        }

        this.output = this.opts.output;
        this.pool = this.opts.pool;
    }

    /**
     * Read the input stream, comparing with the database and creating/modifying as necessary
     * @param {Function} cb Callback function (err, res)
     * @return {Function} Return cb function
     */
    read(cb) {
        const self = this;

        const rl = new Readline(this.opts.read);

        reader();

        /**
         * Recursive function to populate process q from sync. linereader
         */
        function reader() {
            const q = new Queue(10);
            let finished = false;

            let current = 0;

            let l = rl.next();
            while (l) {
                current++;
                if (current > 100) break;

                l = rl.next();
                if (!l) {
                    finished = true;
                    break;
                }

                q.defer((new_address, done) => {
                    // The new GeoJSONSeq schema uses record separators
                    new_address = new_address.replace(RegExp(String.fromCharCode(30), 'g'), '');

                    try {
                        new_address = JSON.parse(new_address);
                    } catch (err) {
                        return done(err);
                    }

                    self.pool.query(`
                        SELECT
                            names AS name,
                            json_build_object(
                                'type', 'Feature',
                                'version', p.version,
                                'id', p.id,
                                'properties', p.props,
                                'names', p.names,
                                'geometry', ST_AsGeoJSON(p.geom)::JSON
                            ) AS feat
                        FROM
                            address p
                        WHERE
                            lower(p.number) = '${new_address.properties.number.toLowerCase()}'
                            AND ST_DWithin(ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(new_address.geometry)}'), 4326), p.geom, 0.02);
                    `, (err, res) => {
                        if (err) return done(err);

                        const hecate = self.compare(new_address, res.rows);

                        if (hecate) {
                            if (hecate.action === 'create') {
                                self.output.write(JSON.stringify(hecate) + '\n');
                                return done();
                            } else {
                                self.pool.query(`
                                    INSERT INTO modified (id, version, props, geom) VALUES (
                                        ${hecate.id},
                                        ${hecate.version},
                                        '${JSON.stringify(hecate.properties)}'::JSONB,
                                        ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(hecate.geometry)}'), 4326)
                                    );
                                `, (err) => {
                                    return done(err);
                                });
                            }
                        } else {
                            return done();
                        }
                    });
                }, String(l));
            }

            q.awaitAll((err) => {
                if (err) return cb(err);

                if (!finished) return process.nextTick(reader);
                return cb();
            });
        }
    }

    modify_groups(cb) {
        const self = this;

        this.pool.connect((err, client, done) => {
            const cursor = client.query(new Cursor(`
                SELECT
                    json_build_object(
                        'id', id,
                        'type', 'Feature',
                        'action', 'modify',
                        'version', version,
                        'properties', JSONB_AGG(props),
                        'geometry', ST_AsGeoJSON(geom)::JSON
                    ) AS feat
                FROM modified
                GROUP BY id, version, geom
            `));

            iterate();

            /**
             * Iterate over modifed ids, looking for dups and collapsing into single features where found
             */
            function iterate() {
                cursor.read(1000, (err, rows) => {
                    if (err) return cb(err);

                    if (!rows.length) {
                        done();
                        return cb();
                    }

                    for (let row of rows) {
                        row = row.feat;
                        if (row.properties.length === 1) {
                            row.properties = row.properties[0];
                            self.output.write(JSON.stringify(row) + '\n');
                        } else {
                            row.properties = row.properties.reduce((acc, props) => {
                                acc.street = acc.street.concat(props.street);
                                return acc;
                            }, row.properties[0]);

                            row.properties.street = _.uniqBy(row.properties.street, 'display');

                            self.output.write(JSON.stringify(row) + '\n');
                        }
                    }

                    iterate();
                });
            }
        });
    }

    compare(new_address, rows) {
        if (!Array.isArray(new_address.properties.street)) {
            new_address.properties.street = [{ display: new_address.properties.street, priority: 0 }];
        }

        // The address does not exist in the database and should be created
        if (rows.length === 0) return this.create(new_address);

        // Use geometry unit cutoff instead of the geographic postgis
        rows = rows.filter((row) => {
            return turf.distance(new_address, row.feat.geometry, { units: 'kilometers' }) < 0.5;
        });

        const potentials = new_address.properties.street.map((name) => {
            return tokenize.replaceToken(tokenRegex, tokenize.main(name.display, this.opts.tokens, true).tokens.join(' '));
        });

        for (const r of rows) {
            const known = r.name.map((name) => { return name.tokenized; });

            for (const potential of potentials) {
                if (known.indexOf(potential) !== -1) {
                    const m = this.modify(r.feat, new_address);

                    if (m) return m;
                    else return;
                }
            }
        }

        return this.create(new_address);
    }

    /**
     * Given a feature that should be added to the database, output a hecate compatible feature
     *
     * @param {Object} feat GeoJSON Point Feature with address properties
     * @return {Object} GeoJSON Point Feature with additional hecate properties
     */

    create(feat) {
        feat = this.format(feat);
        if (!feat) return;

        return {
            action: 'create',
            type: 'Feature',
            properties: {
                number: feat.properties.number,
                street: feat.properties.street,
                source: feat.properties.source
            },
            geometry: feat.geometry
        };
    }

    format(feat) {
        let street = feat.properties.street;
        const number = feat.properties.number;

        if (!number) return;

        street = street.filter((streetProps) => {
            return streetProps.display;
        });

        if (!street.length) return;
        feat.properties.street = street;
        return feat;
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
        const names = JSON.parse(JSON.stringify(known.names));

        for (const pname of potential.properties.street) {
            const ptoken = tokenize.replaceToken(tokenRegex, tokenize.main(pname.display, this.opts.tokens, true).tokens.join(' '));

            let exists = false;
            for (const kname of known.names) {
                const ktoken = tokenize.replaceToken(tokenRegex, tokenize.main(kname.display, this.opts.tokens, true).tokens.join(' '));

                if (ktoken === ptoken) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                names.push(pname);
                modify = true;
            }
        }

        if (!modify) return false;

        known.names = names;
        known.action = 'modify';

        return known;
    }
}

module.exports = Compare;
