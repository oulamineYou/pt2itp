const titlecase = require('./titlecase');

module.exports = (network, address, opts = {}) => {
    opts.favor = 'network';
    return titlecase(network, address, opts);
};
