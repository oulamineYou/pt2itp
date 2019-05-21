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
