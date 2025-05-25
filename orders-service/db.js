const { Pool } = require('pg');

const pool = new Pool({
    user: 'admin',
    host: 'postgres',
    database: 'grocery_db',
    password: 'admin123',
    port: 5432,
});

module.exports = pool;
