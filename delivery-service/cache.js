const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 });

module.exports = {
    get: (key) => cache.get(key),
    set: (key, value) => cache.set(key, value),
    del: (key) => cache.del(key),
    flush: () => cache.flushAll()
}; 