const knex = require('knex');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
  try {
    const db = knex({
      client: process.env.DB_CLIENT || 'mysql2',
      connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pup_workload'
      }
    });

    const hash = bcrypt.hashSync('password', 10);
    console.log('Generated hash:', hash);

    const updated = await db('users')
      .whereIn('username', ['aide_pq', 'head_pq'])
      .update({ password_hash: hash });

    console.log('Updated rows:', updated);

    const user = await db('users').where({ username: 'aide_pq' }).first();
    console.log('Stored row:', user);
    console.log('Password compare result:', bcrypt.compareSync('password', user.password_hash));

    await db.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();