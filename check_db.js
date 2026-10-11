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

async function check() {
  try {
    const schoolYears = await knex('school_years').select('*');
    console.log('School Years:', JSON.stringify(schoolYears));
    
    const programs = await knex('programs').select('*');
    console.log('Programs:', JSON.stringify(programs));
    
    // Try inserting a test load
    const testLoad = {
      id: 999999,
      prof: 'Test Prof',
      sub: 'TEST 101',
      units: 3,
      load_type: 'Regular Load',
      sec: 'BSIT 1-1',
      room: 'Room 101',
      building: 'Main Building',
      day: 'Monday',
      time: '07:00 AM - 08:00 AM',
      sy: schoolYears.length > 0 ? schoolYears[0].name : 'A.Y. 2024-2025',
      program: programs.length > 0 ? programs[0].name : 'Information Technology',
      semester: '1'
    };
    console.log('Attempting to insert test load with sy:', testLoad.sy, 'and program:', testLoad.program);
    await knex('loads').insert(testLoad);
    console.log('Test load inserted successfully!');
    await knex('loads').where({ id: 999999 }).del();
    console.log('Test load cleaned up.');
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Full error:', err.sqlMessage || err);
  } finally {
    knex.destroy();
  }
}
check();
