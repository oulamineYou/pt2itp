    let addrCount = 0;
    let itpCount = 0;
    let totCount = 0;

    rl.on('line', (line) => {
        if (!line) return;

        let feat = JSON.parse(line);

        totCount++;

        if (feat.properties['carmen:addressnumber']) {
            for (sngFeat of feat.properties['carmen:addressnumber']) {
                if (!sngFeat) continue;

                addrCount = addrCount + sngFeat.length;
            }
        }

        for (geom of feat.geometry.geometries) {
            if (geom.type !== "MultiLineString") continue;

            itpCount = itpCount + geom.coordinates.length;
        }

    });

    rl.on('error', (err) => {
        return cb(err);
    });

    rl.on('close', () => {
        console.error('Stats:');
        console.error(`Addresses: ${addrCount}`);
        console.error(`Networks: ${itpCount}`);
        console.error(`Features: ${totCount}`)

        return cb();
    });
}
