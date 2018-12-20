const defaults = [ //Mandatory Steps
    require('../post/id').post,
    require('../post/text').post,
    require('../post/dedupe-address').post,
    require('../post/sort').post,
    require('../post/centre').post
];

/**
 * Perform post-interpolated operations
 *
 * @class Post
 */
class Post {
    /**
     * Construct a new Post object
     *
     * @param {object} opts Config options
     * @returns Post
     */
    constructor(opts = {}) {
        this.opts = opts || {};
        this.opts.post = this.opts.post || [];

        if (!this.opts.label && !this.opts.tokens) {
            console.error('WARN: map.orphanAddr() using titlecase behavior on non-English data; English capitalization rules will be applied, potentially in error');
        }

        this.opts.label = require('../label/' + (opts.label || 'titlecase'))()

        if (opts.noDefaults) {
            this.posts = [];
        } else {
            this.posts = defaults;
        }

        for (let p of this.opts.post) {
            this.posts.push(require(`../post/${p}`).post);
        }
    }

    feat(f) {
        for (let post of this.posts) {
            f = post(f, this.opts);
        }

        return f;
    }
}

module.exports = Post;
