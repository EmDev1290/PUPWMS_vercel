/**
 * MySQL to Cloud Firestore Automated Migration Script
 * PUP PQ-Scheduler
 * 
 * Reads all relational data from MySQL (via Knex) and writes it
 * in batch operations into structured Cloud Firestore collections.
 * 
 * Usage:
 *   node scripts/migrate-mysql-to-firestore.js
 */
require('dotenv').config();
const knex = require('../config/database');
const { db, sanitizeDocId } = require('../config/firestore');

function cleanData(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) {
            out[k] = v === null ? null : v;
        }
    }
    return out;
}

async function migrate() {
    console.log('🚀 Starting MySQL to Cloud Firestore Migration...');

    try {
        // 1. Migrate Users
        if (await knex.schema.hasTable('users')) {
            console.log('📌 Migrating Users...');
            const users = await knex('users').select('*');
            if (users.length > 0) {
                const userBatch = db.batch();
                for (const user of users) {
                    const docRef = db.collection('users').doc(sanitizeDocId(user.username));
                    userBatch.set(docRef, cleanData({
                        username: user.username,
                        password_hash: user.password_hash,
                        role: user.role,
                        display_name: user.display_name,
                        id_number: user.id_number || ''
                    }), { merge: true });
                }
                await userBatch.commit();
            }
            console.log(`   ✅ Migrated ${users.length} users.`);
        }

        // 2. Migrate Rooms
        if (await knex.schema.hasTable('rooms')) {
            console.log('📌 Migrating Rooms...');
            const rooms = await knex('rooms').select('*');
            if (rooms.length > 0) {
                const roomBatch = db.batch();
                for (const room of rooms) {
                    const docRef = db.collection('rooms').doc(sanitizeDocId(room.name));
                    roomBatch.set(docRef, cleanData({
                        name: room.name,
                        building: room.building
                    }), { merge: true });
                }
                await roomBatch.commit();
            }
            console.log(`   ✅ Migrated ${rooms.length} rooms.`);
        }

        // 3. Migrate Faculty Members
        if (await knex.schema.hasTable('faculty')) {
            console.log('📌 Migrating Faculty...');
            const facultyList = await knex('faculty').select('*');
            for (let i = 0; i < facultyList.length; i += 400) {
                const chunk = facultyList.slice(i, i + 400);
                const batch = db.batch();
                for (const f of chunk) {
                    const docRef = db.collection('faculty').doc(sanitizeDocId(f.id));
                    batch.set(docRef, cleanData({
                        ...f,
                        active: Boolean(f.active)
                    }), { merge: true });
                }
                await batch.commit();
            }
            console.log(`   ✅ Migrated ${facultyList.length} faculty profiles.`);
        }

        // 4. Migrate Programs, Sections, and Subjects
        if (await knex.schema.hasTable('programs')) {
            console.log('📌 Migrating Programs & Curriculum...');
            const programs = await knex('programs').select('*');
            const sections = (await knex.schema.hasTable('program_sections')) 
                ? await knex('program_sections').select('*') 
                : [];
            const subjects = (await knex.schema.hasTable('program_subjects')) 
                ? await knex('program_subjects').select('*') 
                : [];

            if (programs.length > 0) {
                const progBatch = db.batch();
                for (const prog of programs) {
                    const progSections = sections
                        .filter(s => s.program_name === prog.name)
                        .map(s => s.section_name);
                    const progSubjects = subjects
                        .filter(s => s.program_name === prog.name)
                        .map(s => cleanData(s));

                    const docRef = db.collection('programs').doc(sanitizeDocId(prog.name));
                    progBatch.set(docRef, cleanData({
                        name: prog.name,
                        sections: progSections,
                        subjects: progSubjects
                    }), { merge: true });
                }
                await progBatch.commit();
            }
            console.log(`   ✅ Migrated ${programs.length} programs with sections and subjects.`);
        }

        // 5. Migrate Loads (Faculty Class Schedules)
        if (await knex.schema.hasTable('loads')) {
            console.log('📌 Migrating Faculty Loads...');
            const loads = await knex('loads').select('*');
            for (let i = 0; i < loads.length; i += 400) {
                const chunk = loads.slice(i, i + 400);
                const batch = db.batch();
                for (const load of chunk) {
                    const docRef = db.collection('loads').doc(String(load.id));
                    batch.set(docRef, cleanData(load), { merge: true });
                }
                await batch.commit();
            }
            console.log(`   ✅ Migrated ${loads.length} faculty loads.`);
        }

        // 6. Migrate Request History
        if (await knex.schema.hasTable('request_history')) {
            console.log('📌 Migrating Request History...');
            const requests = await knex('request_history').select('*');
            for (let i = 0; i < requests.length; i += 400) {
                const chunk = requests.slice(i, i + 400);
                const batch = db.batch();
                for (const req of chunk) {
                    const docRef = db.collection('request_history').doc(sanitizeDocId(req.id));
                    batch.set(docRef, cleanData(req), { merge: true });
                }
                await batch.commit();
            }
            console.log(`   ✅ Migrated ${requests.length} request history records.`);
        }

        // 7. Migrate Email Logs
        if (await knex.schema.hasTable('emails')) {
            console.log('📌 Migrating Email Logs...');
            const emails = await knex('emails').select('*');
            for (let i = 0; i < emails.length; i += 400) {
                const chunk = emails.slice(i, i + 400);
                const batch = db.batch();
                for (const em of chunk) {
                    const docRef = db.collection('emails').doc(String(em.id));
                    batch.set(docRef, cleanData(em), { merge: true });
                }
                await batch.commit();
            }
            console.log(`   ✅ Migrated ${emails.length} email records.`);
        }

        console.log('\n🎉 ALL DATA SUCCESSFULLY MIGRATED TO CLOUD FIRESTORE!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
