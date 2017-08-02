const Cursor = require('pg-cursor');
const turf = require('@turf/turf');

class Orphan {
    constructor(pool, opts, output, post) {
        this.pool = pool;
        this.opts = opts;
        this.output = output;
        this.post = post;

        if (!this.opts.label) {
            this.label = require('./label/titlecase')();
        } else {
            this.label = require('./label/' + this.opts.label)();
        }
    }

    address(cb) {
        const self = this;

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
                        return cb();
                    }

                    rows.forEach((row) => {
                        let feat = {
                            type: 'Feature',
                            properties: {
                                'carmen:text': self.label(row),
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
                            if (coord[2] % 1 != 0 && self.opts.unitMap) {
                                let unit = parseInt(String(coord[2]).split('.')[1]);
                                let num = String(coord[2]).split('.')[0];

                                coord[2] = `${num}${self.opts.unitMap[unit]}`;
                            }

                            feat.properties['carmen:addressnumber'].push(coord.pop());
                            feat.geometry.geometries[0].coordinates.push(coord);
                        });

                        feat.properties['carmen:center'] = turf.pointOnSurface(feat.geometry.geometries[0]).geometry.coordinates;
                        feat.properties['carmen:addressnumber'] = [ feat.properties['carmen:addressnumber'] ];

                        if (self.opts.country) feat.properties['carmen:geocoder_stack'] = self.opts.country;
           
                        self.output.write(JSON.stringify(self.post.feat(feat)) + '\n');
                    }); 

                    return iterate();
                });
            }
        });
    }

    network(cb) {
        const self = this;

        this.pool.connect((err, client, done) => {
            if (err) return cb(err);

            const cursor = client.query(new Cursor(`
                SELECT _text AS network_text, _text AS address_text,  ST_AsGeoJSON(geom) AS geom FROM network_cluster WHERE address IS NULL;
            `));

            return iterate();

            function iterate() {
                cursor.read(1000, (err, rows) => {
                    if (err) return cb(err);

                    if (!rows.length) {
                        done();
                        return cb();
                    }

                    rows.forEach((row) => {
                        let feat = {
                            type: 'Feature',
                            properties: {
                                'carmen:text': self.label(row),
                                'carmen:center': false,
                                'carmen:rangetype': 'tiger'
                            },
                            geometry: {
                                type: 'GeometryCollection',
                                geometries: [
                                    JSON.parse(row.geom)
                                ]
                            }
                        };
                        
                        feat.properties['carmen:center'] = turf.pointOnSurface(feat.geometry.geometries[0]).geometry.coordinates;

                        if (self.opts.country) feat.properties['carmen:geocoder_stack'] = self.opts.country;
           
                        self.output.write(JSON.stringify(self.post.feat(feat)) + '\n');
                    }); 

                    return iterate();
                });
            }
        });
    }
}

module.exports = Orphan;
