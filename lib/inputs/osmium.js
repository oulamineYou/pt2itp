        if (['de'].indexOf(context.country) !== -1) {
            //Einfahrt = Drive Through in German
            if (names[i].display.match(/ einfahrt$/i)) return false;
        }

        if (['us', 'ca', 'gb', 'de', 'ch', 'at'].indexOf(context.country) !== -1) {
            //Remove Drive through names like "Burger King Drive Through"
            if (names[i].display.match(/drive.?(in|through|thru)$/i)) return false;

        }




    let highway = false;
    if (name.match(/^[0-9]+[a-z]?$/) && name !== '1') { //Trans Canada shouldn't be provincial highway
        //101
        highway = `${region} ${name}`;
    } else if (name.match(new RegExp(`^${region}-[0-9]+[a-z]?$`, 'i'))) {
        //NB-101
        highway = name.replace(/-/, ' ');
    } else if (name.match(/(Highway|hwy|route|rte) [0-9]+[a-z]?$/i) || name.match(/King\'?s Highway [0-9]+[a-z]?/i)) {
        //Kings's Highway 123 (Ontario)
        //Highway 123
        //Route 123a
        highway = `${region} ${name.match(/[0-9]+[a-z]?/i)}`;
    } else if (name.match(/(Alberta|British Columbia| Saskatchewan|Manitoba|Yukon|New Brunswick|Newfoundland and Labrador|Newfoundland|Labrador|Price Edward Island|PEI|Quebec|Northwest Territories|Nunavut|Nova Scotia) (Highway|hwy|Route|rtw) [0-9]+[a-z]?/i)) {
        //Alberta Highway ##    British Columbia Highway ##     Saskatchewan Highway ##     Manitoba Highway ##     Yukon Highway ###
        //New Brunswick Route ##    Newfoundland and Labrador Route ##      Prince Edward Island Route ##       Quebec Route ##
        highway = `${region} ${name.match(/[0-9]+[a-z]?/i)}`;
    }

    //Now that we have mapped highway combinations above into a uniform `NS 123` form
    //Expand to all possible combinations
    if (highway) {
        //Highway 123
        names.push({
            display: highway.replace(new RegExp(`^${region} `, 'i'), `Highway `),
            priority: -1
        });

        //Route 123
        names.push({
            display: highway.replace(new RegExp(`^${region} `, 'i'), `Route `),
            priority: -1
        });

        //NB 123
        names.push({
            display: highway,
            priority: -2
        });

        let type = 'Highway';
        if (['NB', 'NL', 'PE', 'QC'].indexOf(region) > -1) type = 'Route';
        //New Brunswick Route 123 (Display Form)
        names.push({
            display: highway.replace(new RegExp(`^${region} `, 'i'), `${iso.CA.divisions[`CA-${region}`]} ${type} `),
            priority: -2
        });
    }

    return names;
}
