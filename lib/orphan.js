class Orphan {
    constructor(pool, opts, output) {
        this.pool = pool;
        this.opts = opts;
        this.output = output;

        if (!opts.label) {
            this.label = require('./label/titlecase')();
        } else {
            this.label = require('./label/' + argv.label)();
        }
    }

    address(cb) {
        this.pool.connect((err, client, done) => {
            if (err) return cb(err);

            const cursor = client.query(new Cursor(`
                SELECT a._text AS address_text, n._text as network_text, ST_AsGeoJSON(a.geom) AS geom FROM address_cluster a LEFT JOIN network_cluster n ON a.id = n.address WHERE n.address IS NULL;
            `));

            return iterate();

            function iterate() {
                cursor.read(1000, (err, rows) => {
                    if (err) return cb(err);

                    if (!rows.length) {
                        done();
                        return finalize();
                    }

                    rows.forEach((row) => {
                        let feat = {
                            type: 'Feature',
                            properties: {
                                'carmen:text': label(row),
                                'carmen:center': false,
                                'carmen:addressnumber': []
                            },
                            geometry: {
                                type: 'GeometryCollection',
                                geometries: [{
                                    type: 'MultiPoint',
                                    coordinates: []
                                }]
                            }
                        };
                        
                        let geom = JSON.parse(row.geom);

                        geom.coordinates.forEach((coord) => {
                            if (coord[2] % 1 != 0 && argv.unitMap) {
                                let unit = parseInt(String(coord[2]).split('.')[1]);
                                let num = String(coord[2]).split('.')[0];

                                coord[2] = `${num}${argv.unitMap[unit]}`;
                            }

                            feat.properties['carmen:addressnumber'].push(coord.pop());
                            feat.geometry.geometries[0].coordinates.push(coord);
                        });

                        feat.properties['carmen:center'] = turf.pointOnSurface(feat.geometry.geometries[0]).geometry.coordinates;
                        feat.properties['carmen:addressnumber'] = [ feat.properties['carmen:addressnumber'] ];

                        if (argv.country) feat.properties['carmen:geocoder_stack'] = argv.country;
           
                        output.write(JSON.stringify(post.feat(feat)) + '\n');
                    }); 

                    return iterate();
                });
            }
        });
    }

    network(cb) {
        this.pool.query(`
        `, (err, res) => {

            return cb(err);
        });
    }
}

module.exports = Orphan;
