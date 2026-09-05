const knex = require('knex')({
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD, // No longer defaults to empty string for safety
        database: process.env.DB_NAME || 'pup_workload'
    }
});

module.exports = knex;
