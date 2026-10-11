const dbUser = process.env.DB_USER ?? 'root';
const dbPassword = process.env.DB_PASSWORD ?? '';

const knex = require('knex')({
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT ?? 3308),
        user: dbUser,
        password: dbPassword,
        database: process.env.DB_NAME || 'pup_workload'
    }
});

module.exports = knex;
