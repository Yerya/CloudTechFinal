const NodeCache = require('node-cache');

// Создаем кеш с временем жизни 60 секунд
const cache = new NodeCache({ stdTTL: 60 });

module.exports = {
    get: (key) => cache.get(key),
    set: (key, value) => cache.set(key, value),
    del: (key) => cache.del(key),
    flush: () => cache.flushAll()
}; 