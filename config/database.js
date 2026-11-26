const dbUser = process.env.DB_USER ?? 'root';
const dbPassword = process.env.DB_PASSWORD ?? '';

const connectionConfig = {
    user: dbUser,
    password: dbPassword,
    database: process.env.DB_NAME || 'pup_workload'
};

// Support Google Cloud SQL Unix Socket (Firebase Cloud Functions / Cloud Run)
if (process.env.INSTANCE_UNIX_SOCKET) {
    connectionConfig.socketPath = process.env.INSTANCE_UNIX_SOCKET;
} else {
    // Standard TCP Connection (Local or Remote Cloud Host)
    connectionConfig.host = process.env.DB_HOST || '127.0.0.1';
    connectionConfig.port = Number(process.env.DB_PORT ?? 3308);
}

// Support SSL for hosted cloud databases (Aiven, Railway, Supabase, PlanetScale)
if (process.env.DB_SSL === 'true') {
    connectionConfig.ssl = { rejectUnauthorized: false };
}

const knex = require('knex')({
    client: process.env.DB_CLIENT || 'mysql2',
    connection: connectionConfig,
    pool: { min: 0, max: 7 }
});

module.exports = knex;
