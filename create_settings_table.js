const knex = require('./config/database');

async function run() {
    try {
        const hasTable = await knex.schema.hasTable('settings');
        if (!hasTable) {
            await knex.schema.createTable('settings', t => {
                t.string('key', 100).primary();
                t.text('value');
            });
            console.log("Created 'settings' table.");

            // Insert default signatories
            await knex('settings').insert([
                { key: 'signatory_prepared_by', value: 'Jefferson F. Serrano' },
                { key: 'signatory_noted_by', value: 'Prof. Jaime P. Gutierrez Jr.' }
            ]);
            console.log("Inserted default signatories.");
        } else {
            console.log("'settings' table already exists.");
        }
    } catch (err) {
        console.error("Error creating settings table:", err);
    } finally {
        knex.destroy();
    }
}

run();
