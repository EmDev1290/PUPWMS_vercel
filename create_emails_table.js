const knex = require('./config/database');

async function run() {
    try {
        const hasTable = await knex.schema.hasTable('emails');
        if (!hasTable) {
            await knex.schema.createTable('emails', t => {
                t.increments('id').primary();
                t.string('recipient', 255).notNullable();
                t.string('subject', 255).notNullable();
                t.text('body');
                t.string('status', 50).defaultTo('pending'); // pending, sent, failed
                t.timestamp('created_at').defaultTo(knex.fn.now());
                t.timestamp('updated_at').defaultTo(knex.fn.now());
            });
            console.log("Created 'emails' table.");
        } else {
            console.log("'emails' table already exists.");
        }
    } catch (err) {
        console.error("Error creating emails table:", err);
    } finally {
        knex.destroy();
    }
}

run();
