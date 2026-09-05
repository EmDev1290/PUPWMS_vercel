const knex = require('knex')({
    client: 'mysql2',
    connection: {
        host: '127.0.0.1',
        port: 3308,
        user: 'root',
        password: '',
        database: 'pup_workload'
    }
});

async function main() {
    try {
        console.log('Testing Knex connection...');
        const tables = await knex.raw('SHOW TABLES');
        console.log('Tables found:', tables[0]);
        const facultyCount = await knex('faculty').count('* as count');
        console.log('Faculty count:', facultyCount[0].count);
        process.exit(0);
    } catch (err) {
        console.error('Error connecting or querying database:', err);
        process.exit(1);
    }
}
main();
