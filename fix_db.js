const knex = require('./config/database');
async function run() {
    try {
        const hasColumn = await knex.schema.hasColumn('users', 'id_number');
        if (!hasColumn) {
            await knex.schema.alterTable('users', t => {
                t.string('id_number', 100).defaultTo('TEMP-001');
            });
            console.log("Added id_number to users.");
        } else {
            console.log("id_number already exists.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        knex.destroy();
    }
}
run();
