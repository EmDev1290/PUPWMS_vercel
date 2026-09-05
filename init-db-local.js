const fs = require('fs');
const path = require('path');

const knex = require('knex')({
    client: 'mysql2',
    connection: {
        host: '127.0.0.1',
        port: 3308,
        user: 'root',
        password: '',
        database: 'pup_workload',
        multipleStatements: true
    }
});

async function run() {
    const sqlPath = path.join(__dirname, 'schema.sql');
    console.log('Reading schema from:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    try {
        console.log('Initializing database tables and seed data...');
        await knex.raw(sql);
        console.log('Database initialized successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
}

run();
