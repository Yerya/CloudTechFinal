const { Pool } = require('pg');

const pool = new Pool({
    user: 'pgadmin',
    host: 'mypostgresqlserver2025.postgres.database.azure.com',
    database: 'postgres',
    password: 'Admin123!',
    port: 5432,
    ssl: true,
});

module.exports = pool;
