const NodeCache = require('node-cache');

// Создаем кеш с временем жизни 60 секунд
const cache = new NodeCache({ stdTTL: 60 });

// Функция для получения данных из кеша
function getFromCache(key) {
    return cache.get(key);
}

// Функция для сохранения данных в кеш
function setToCache(key, value) {
    return cache.set(key, value);
}

// Функция для удаления данных из кеша
function deleteFromCache(key) {
    return cache.del(key);
}

// Функция для очистки всего кеша
function clearCache() {
    return cache.flushAll();
}

module.exports = {
    getFromCache,
    setToCache,
    deleteFromCache,
    clearCache
}; 