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
    acquireConnectionTimeout: 2000, // Fail fast in 2s if local DB not reachable
    pool: { min: 0, max: 7, acquireTimeoutMillis: 2000 }
});

// Cloud / Offline detection flag
let isMySqlAvailable = null;

// If running on Render, Vercel, or Cloud Run without an explicit remote DB_HOST, default to offline
const isCloudEnv = Boolean(
    process.env.RENDER ||
    process.env.VERCEL ||
    process.env.FIREBASE_CONFIG ||
    process.env.K_SERVICE ||
    (process.env.FIREBASE_SERVICE_ACCOUNT_JSON && (!process.env.DB_HOST || process.env.DB_HOST === '127.0.0.1' || process.env.DB_HOST === 'localhost'))
);

if (isCloudEnv) {
    isMySqlAvailable = false;
    console.log('⚡ Cloud environment detected: Using Cloud Firestore as primary database (local MySQL bypassed for zero latency).');
}

knex.isMySqlAvailable = () => isMySqlAvailable;
knex.setMySqlUnavailable = () => { isMySqlAvailable = false; };
knex.setMySqlAvailable = () => { isMySqlAvailable = true; };

module.exports = knex;
