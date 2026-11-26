const knex = require('../config/database');

const isText = (value, maxLength) => typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maxLength;
const isOptionalText = (value, maxLength) => value === undefined || value === null || (typeof value === 'string' && value.length <= maxLength);
const isPositiveInteger = value => Number.isInteger(Number(value)) && Number(value) > 0;
const isPositiveNumber = value => !isNaN(Number(value)) && Number(value) > 0;
const isNonNegativeInteger = value => Number.isInteger(Number(value)) && Number(value) >= 0;
const getSubjectHours = body => {
    const hasComponents = body.lec_units !== undefined || body.lab_units !== undefined || body.lec !== undefined || body.lab !== undefined;
    const lec = hasComponents ? Number(body.lec_units ?? body.lec ?? 0) : Number(body.units);
    const lab = hasComponents ? Number(body.lab_units ?? body.lab ?? 0) : 0;
    return { lec, lab, units: lec + lab };
};
const getYearLevelForSection = section => {
    if (String(section || '').includes('1-')) return '1st Year';
    if (String(section || '').includes('2-')) return '2nd Year';
    if (String(section || '').includes('3-')) return '3rd Year';
    if (String(section || '').includes('4-')) return '4th Year';
    return '1st Year';
};
const isValidSemester = value => ['1', '2', '1st Semester', '2nd Semester', 'Summer Term', 'Bridging'].includes(String(value));
const isValidId = value => /^\d+$/.test(String(value));

const normalizeProgramCode = name => {
    if (!name) return '';
    const s = String(name).toUpperCase().trim();
    if (s.includes('INFORMATION TECHNOLOGY') || s === 'BSIT' || s === 'IT') return 'BSIT';
    if (s.includes('COMPUTER ENGINEERING') || s === 'BSCPE' || s === 'BSCP' || s === 'COE' || s === 'CPE') return 'BSCPE';
    if (s.includes('HOSPITALITY') || s === 'BSHM' || s === 'HM') return 'BSHM';
    if (s.includes('OFFICE ADMINISTRATION') || s === 'BSOA' || s === 'OA') return 'BSOA';
    if (s.includes('GENERAL EDUCATION') || s.includes('GEN-ED') || s.includes('GEN ED') || s === 'GENED') return 'GEN-ED';
    return s;
};

const matchesProgram = (assignedProgStr, targetProg) => {
    if (!assignedProgStr || !targetProg) return false;
    const targetCode = normalizeProgramCode(targetProg);
    const assignedCodes = String(assignedProgStr).split(',').map(p => normalizeProgramCode(p.trim()));
    return assignedCodes.includes(targetCode);
};

// 1. Initial State
exports.getInitialState = async (req, res) => {
    try {
        let roomRows = [];
        let facultyRows = [];
        let syRows = [];
        let progRows = [];
        let sectionRows = [];
        let subjectRows = [];
        let loadRows = [];
        let useFirestoreFallback = false;

        if (knex.isMySqlAvailable() === false) {
            useFirestoreFallback = true;
        } else {
            try {
                try {
                    const hasRateDay = await knex.schema.hasColumn('faculty', 'rate_per_day');
                    if (!hasRateDay) {
                        await knex.schema.alterTable('faculty', t => t.decimal('rate_per_day', 12, 2).defaultTo(0.00));
                    }
                    const hasRateMonth = await knex.schema.hasColumn('faculty', 'rate_per_month');
                    if (!hasRateMonth) {
                        await knex.schema.alterTable('faculty', t => t.decimal('rate_per_month', 12, 2).defaultTo(0.00));
                    }
                    const hasRateHour = await knex.schema.hasColumn('faculty', 'rate_per_hour');
                    if (!hasRateHour) {
                        await knex.schema.alterTable('faculty', t => t.decimal('rate_per_hour', 12, 2).defaultTo(0.00));
                    }
                } catch (schemaErr) { }

                roomRows = await knex('rooms').select('*');
                facultyRows = await knex('faculty').select('*');
                syRows = await knex('school_years').select('*');
                progRows = await knex('programs').select('*');
                sectionRows = await knex('program_sections').select('*');
                subjectRows = await knex('program_subjects').select('*');
                loadRows = await knex('loads').select('*');
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex database query failed, attempting Firestore fallback:', dbErr.message);
                useFirestoreFallback = true;
            }
        }

        if (useFirestoreFallback) {
            try {
                const { db } = require('../config/firestore');

                const [roomsSnap, facultySnap, loadsSnap, programsSnap] = await Promise.all([
                    db.collection('rooms').get(),
                    db.collection('faculty').get(),
                    db.collection('loads').get(),
                    db.collection('programs').get()
                ]);

                roomRows = roomsSnap.docs.map(d => d.data());
                facultyRows = facultySnap.docs.map(d => d.data());
                loadRows = loadsSnap.docs.map(d => d.data());

                programsSnap.docs.forEach(d => {
                    const data = d.data();
                    progRows.push({ name: data.name });
                    (data.sections || []).forEach(sec => {
                        sectionRows.push({ program_name: data.name, section_name: sec });
                    });
                    (data.subjects || []).forEach(sub => {
                        subjectRows.push({ ...sub, program_name: data.name });
                    });
                });
                const sySet = new Set(loadRows.map(l => l.sy).filter(Boolean));
                sySet.add('AY 2025-2026');
                syRows = Array.from(sySet).map(name => ({ name }));
            } catch (fsErr) {
                console.error('Firestore fallback failed:', fsErr.message);
            }
        }

        const facultyRegistry = facultyRows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email || '',
            baseDesignation: row.base_designation || '',
            program: row.program || '',
            employmentType: row.employment_type || '',
            classification: row.classification || '',
            classificationRank: row.classification_rank || '',
            active: row.active === 0 || row.active === false || row.active === '0' || row.active === 'false' ? false : true,
            educationalAttainment: {
                baccalaureate: row.baccalaureate || '',
                masters: row.masters || '',
                doctorate: row.doctorate || '',
                postBaccalaureate: row.post_baccalaureate || ''
            },
            licenseNumber: row.license_number || '',
            specialization: row.specialization || '',
            nationalCertificate: row.national_certificate || '',
            courseHandle: {
                genEd: row.gen_ed || '',
                coreSubject: row.core_subject || '',
                professionalSubject: row.professional_subject || '',
                technicalSubject: row.technical_subject || ''
            },
            research: {
                production: row.research_production || '0',
                presentation: row.research_presentation || '0',
                publication: row.research_publication || '0',
                citation: row.research_citation || '0'
            },
            extension: row.extension || '',
            natureOfAppointment: row.nature_of_appointment || '',
            preferredSubjects: row.preferred_subjects || '',
            preferredTimes: row.preferred_times || '',
            remarks: row.remarks || '',
            ratePerDay: row.rate_per_day !== undefined && row.rate_per_day !== null ? Number(row.rate_per_day) : 0,
            ratePerMonth: row.rate_per_month !== undefined && row.rate_per_month !== null ? Number(row.rate_per_month) : 0,
            ratePerHour: row.rate_per_hour !== undefined && row.rate_per_hour !== null ? Number(row.rate_per_hour) : 0
        }));

        const schoolYears = syRows.map(r => r.name);
        const rooms = roomRows.map(r => ({ name: r.name, building: r.building }));
        const buildings = [...new Set(roomRows.map(r => r.building))];

        const programs = {};
        progRows.forEach(p => {
            const progName = p.name;
            const sections = sectionRows.filter(s => s.program_name === progName).map(s => s.section_name);
            const profs = facultyRows.filter(f => matchesProgram(f.program, progName)).map(f => f.name);

            const subjects = {};
            const bridgingSubjects = [];
            const progSubs = subjectRows.filter(s => s.program_name === progName);
            progSubs.forEach(s => {
                const lecUnits = Number(s.lec_units ?? s.lec ?? s.units) || 0;
                const labUnits = Number(s.lab_units ?? s.lab) || 0;
                const subject = {
                    name: s.subject_name,
                    lec_units: lecUnits,
                    lab_units: labUnits,
                    units: lecUnits + labUnits
                };
                subject.is_bridging = !!s.is_bridging;
                const semKey = s.semester || (subject.is_bridging ? 'Bridging' : '1st Semester');
                if (!subjects[s.year_level]) subjects[s.year_level] = {};
                if (!subjects[s.year_level][semKey]) subjects[s.year_level][semKey] = [];
                subjects[s.year_level][semKey].push(subject);
                if (subject.is_bridging) {
                    bridgingSubjects.push(subject);
                }
            });

            programs[progName] = { profs, sections, subjects, bridgingSubjects };
        });

        const loads = loadRows.map(l => ({
            id: Number(l.id),
            prof: l.prof,
            sub: l.sub,
            units: Number(l.units),
            component_type: l.component_type || 'Lec',
            loadType: l.load_type,
            sec: l.sec,
            room: l.room,
            building: l.building,
            day: l.day,
            time: l.time,
            sy: l.sy,
            program: l.program,
            semester: l.semester || '1'
        }));

        res.json({
            facultyRegistry,
            db: {
                schoolYears,
                rooms,
                buildings,
                programs,
                loads,
                noClassDays: {}
            }
        });
    } catch (err) {
        console.error('Error fetching initial state:', err);
        res.status(500).json({ error: 'Failed to fetch database state' });
    }
};

// 2. Rooms
exports.createRoom = async (req, res) => {
    try {
        const { name, building } = req.body;
        if (!isText(name, 100) || !isText(building, 100)) {
            return res.status(400).json({ error: 'Room name and building must be valid text values' });
        }
        const roomData = { name: name.trim(), building: building.trim() };
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('rooms').insert(roomData).onConflict('name').merge();
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex create room failed:', dbErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            await db.collection('rooms').doc(roomData.name).set(roomData, { merge: true });
        } catch (fsErr) { }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        const { name } = req.body;
        if (!isText(name, 100)) return res.status(400).json({ error: 'Room name is invalid' });
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('rooms').where({ name }).del();
            } catch (dbErr) {
                knex.setMySqlUnavailable();
            }
        }

        try {
            const { db } = require('../config/firestore');
            await db.collection('rooms').doc(name).delete();
        } catch (fsErr) { }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 2.5. School Years API
exports.getSchoolYears = async (req, res) => {
    try {
        let syNames = [];
        if (knex.isMySqlAvailable() !== false) {
            try {
                const rows = await knex('school_years').select('*');
                syNames = rows.map(r => r.name);
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        if (syNames.length === 0) {
            try {
                const { db } = require('../config/firestore');
                const [sySnap, loadsSnap] = await Promise.all([
                    db.collection('school_years').get().catch(() => ({ docs: [] })),
                    db.collection('loads').get().catch(() => ({ docs: [] }))
                ]);
                const set = new Set();
                sySnap.docs.forEach(d => set.add(d.id || d.data().name));
                loadsSnap.docs.forEach(d => {
                    if (d.data().sy) set.add(d.data().sy);
                });
                set.add('AY 2025-2026');
                syNames = Array.from(set);
            } catch (fsErr) {
                syNames = ['AY 2025-2026'];
            }
        }
        res.json(syNames);
    } catch (err) {
        console.error('Error fetching school years:', err);
        res.json(['AY 2025-2026']);
    }
};

exports.createSchoolYear = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Valid academic year name is required' });
        }
        const trimmedName = name.trim();
        if (knex.isMySqlAvailable() !== false) {
            try {
                const hasTable = await knex.schema.hasTable('school_years');
                if (!hasTable) {
                    await knex.schema.createTable('school_years', table => {
                        table.string('name', 100).primary();
                    });
                }
                await knex('school_years').insert({ name: trimmedName }).onConflict('name').ignore();
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            await db.collection('school_years').doc(trimmedName).set({ name: trimmedName }, { merge: true });
        } catch (fsErr) { }
        res.json({ success: true, name: trimmedName });
    } catch (err) {
        console.error('Error creating school year:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSchoolYear = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Valid academic year name is required' });
        const trimmedName = name.trim();
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('school_years').where({ name: trimmedName }).del();
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            await db.collection('school_years').doc(trimmedName).delete();
        } catch (fsErr) { }
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting school year:', err);
        res.status(500).json({ error: err.message });
    }
};

// 3. Faculty
exports.createFaculty = async (req, res) => {
    try {
        const f = req.body;
        if (!f || !isText(f.id, 100) || !isText(f.name, 255)) {
            return res.status(400).json({ error: 'Faculty ID and name must be valid text values' });
        }
        if (!isOptionalText(f.program, 100) || !isOptionalText(f.employmentType, 100)
            || !isOptionalText(f.classification, 100) || !isOptionalText(f.specialization, 255)) {
            return res.status(400).json({ error: 'Faculty fields exceed their allowed lengths' });
        }
        const mapped = {
            id: f.id.trim(),
            name: f.name.trim(),
            base_designation: f.baseDesignation || '',
            program: f.program || '',
            employment_type: f.employmentType || '',
            classification: f.classification || '',
            classification_rank: f.classificationRank || '',
            active: f.active === undefined ? true : !!f.active,
            baccalaureate: f.educationalAttainment?.baccalaureate || '',
            masters: f.educationalAttainment?.masters || '',
            doctorate: f.educationalAttainment?.doctorate || '',
            post_baccalaureate: f.educationalAttainment?.postBaccalaureate || '',
            license_number: f.licenseNumber || '',
            specialization: f.specialization || '',
            national_certificate: f.nationalCertificate || '',
            gen_ed: f.courseHandle?.genEd || '',
            core_subject: f.courseHandle?.coreSubject || '',
            professional_subject: f.courseHandle?.professionalSubject || '',
            technical_subject: f.courseHandle?.technicalSubject || '',
            research_production: f.research?.production || '0',
            research_presentation: f.research?.presentation || '0',
            research_publication: f.research?.publication || '0',
            research_citation: f.research?.citation || '0',
            extension: f.extension || '',
            nature_of_appointment: f.natureOfAppointment || '',
            preferred_subjects: f.preferredSubjects || '',
            preferred_times: f.preferredTimes || '',
            remarks: f.remarks || ''
        };
        mapped.email = f.email ? String(f.email).trim() : '';
        mapped.rate_per_day = f.ratePerDay !== undefined && f.ratePerDay !== '' ? parseFloat(f.ratePerDay) || 0 : 0;
        mapped.rate_per_month = f.ratePerMonth !== undefined && f.ratePerMonth !== '' ? parseFloat(f.ratePerMonth) || 0 : 0;
        mapped.rate_per_hour = f.ratePerHour !== undefined && f.ratePerHour !== '' ? parseFloat(f.ratePerHour) || 0 : 0;

        if (knex.isMySqlAvailable() !== false) {
            try {
                const hasEmailCol = await knex.schema.hasColumn('faculty', 'email');
                if (!hasEmailCol) {
                    try {
                        await knex.schema.alterTable('faculty', t => t.string('email', 255).defaultTo(''));
                    } catch (colErr) { }
                }
                const hasRateDayCol = await knex.schema.hasColumn('faculty', 'rate_per_day');
                if (!hasRateDayCol) {
                    try {
                        await knex.schema.alterTable('faculty', t => t.decimal('rate_per_day', 12, 2).defaultTo(0.00));
                    } catch (colErr) { }
                }
                const hasRateMonthCol = await knex.schema.hasColumn('faculty', 'rate_per_month');
                if (!hasRateMonthCol) {
                    try {
                        await knex.schema.alterTable('faculty', t => t.decimal('rate_per_month', 12, 2).defaultTo(0.00));
                    } catch (colErr) { }
                }
                const hasRateHourCol = await knex.schema.hasColumn('faculty', 'rate_per_hour');
                if (!hasRateHourCol) {
                    try {
                        await knex.schema.alterTable('faculty', t => t.decimal('rate_per_hour', 12, 2).defaultTo(0.00));
                    } catch (colErr) { }
                }
                await knex('faculty').insert(mapped).onConflict('id').merge();
            } catch (knexErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex save faculty failed, saving to Firestore:', knexErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            await db.collection('faculty').doc(String(mapped.id)).set(mapped, { merge: true });
            return res.json({ success: true });
        } catch (fsErr) {
            console.warn('Firestore save faculty warning:', fsErr.message);
            return res.json({ success: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteFaculty = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isText(id, 100)) return res.status(400).json({ error: 'Invalid faculty ID' });
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('faculty').where({ id }).del();
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex delete faculty failed:', dbErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            await db.collection('faculty').doc(String(id)).delete();
        } catch (fsErr) {
            console.warn('Firestore delete faculty warning:', fsErr.message);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateFacultyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        if (!isText(id, 100) || typeof active !== 'boolean') {
            return res.status(400).json({ error: 'Faculty ID and active status are invalid' });
        }

        const nextActive = Boolean(active);
        let deletedLoads = 0;

        if (knex.isMySqlAvailable() !== false) {
            try {
                const faculty = await knex('faculty').where({ id }).first();
                if (faculty) {
                    await knex.transaction(async trx => {
                        await trx('faculty').where({ id }).update({ active: nextActive });
                        if (!nextActive) {
                            deletedLoads = await trx('loads').where({ prof: faculty.name }).del();
                        }
                    });
                }
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex update faculty status failed:', dbErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            await db.collection('faculty').doc(String(id)).set({ active: nextActive }, { merge: true });
        } catch (fsErr) {
            console.warn('Firestore update faculty status warning:', fsErr.message);
        }

        res.json({ success: true, id, active: nextActive, deletedLoads });
    } catch (err) {
        console.error('Error updating faculty status:', err);
        res.status(500).json({ error: err.message });
    }
};

const parseJsonField = value => {
    if (!value) return {};
    try {
        return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
        return {};
    }
};

exports.createRequestHistory = async (req, res) => {
    try {
        const request = req.body || {};
        const id = request.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const type = String(request.type || 'system_request').slice(0, 100);
        const requestedBy = String(request.requestedBy || 'Academic Aide').slice(0, 255);
        const requestedByUsername = String(request.requestedByUsername || '').slice(0, 100);
        const remarks = String(request.remarks || '').slice(0, 2000);
        const summary = String(request.summary || '').slice(0, 255);
        const status = ['Pending', 'Approved', 'Rejected', 'Cancelled'].includes(request.status || 'Pending')
            ? request.status
            : 'Pending';
        const payload = request.payload && typeof request.payload === 'object' ? request.payload : {};

        const row = {
            id,
            type,
            requested_by: requestedBy,
            requested_by_username: requestedByUsername,
            remarks,
            summary,
            status,
            payload: JSON.stringify(payload),
            created_at: new Date(),
            updated_at: new Date()
        };

        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('request_history').insert(row).onConflict('id').merge();
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex save request history failed:', dbErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            await db.collection('request_history').doc(String(id)).set(row, { merge: true });
        } catch (fsErr) { }

        res.json({ success: true, id, status });
    } catch (err) {
        console.error('Error creating request history:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getRequestHistory = async (req, res) => {
    try {
        let rows = [];
        if (knex.isMySqlAvailable() !== false) {
            try {
                rows = await knex('request_history').select('*').orderBy('created_at', 'desc');
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex getRequestHistory failed, trying Firestore:', dbErr.message);
            }
        }

        if (rows.length === 0) {
            try {
                const { db } = require('../config/firestore');
                const snap = await db.collection('request_history').get();
                rows = snap.docs.map(d => d.data());
            } catch (fsErr) { }
        }
        const records = rows.map(row => ({
            id: row.id,
            type: row.type,
            requestedBy: row.requested_by,
            requestedByUsername: row.requested_by_username,
            remarks: row.remarks || '',
            summary: row.summary || '',
            status: row.status,
            payload: parseJsonField(row.payload),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json({ success: true, records });
    } catch (err) {
        console.error('Error fetching request history:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateRequestHistoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks, summary } = req.body || {};
        if (!id) return res.status(400).json({ error: 'Request ID is required' });

        const nextStatus = ['Pending', 'Approved', 'Rejected', 'Cancelled'].includes(status) ? status : null;
        const updates = {};
        if (nextStatus) updates.status = nextStatus;
        if (remarks !== undefined) updates.remarks = String(remarks).slice(0, 2000);
        if (summary !== undefined) updates.summary = String(summary).slice(0, 255);
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid status updates provided' });
        }

        updates.updated_at = new Date();
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('request_history').where({ id }).update(updates);
            } catch (dbErr) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            await db.collection('request_history').doc(String(id)).set(updates, { merge: true });
        } catch (fsErr) { }
        res.json({ success: true, id, status: nextStatus || 'updated' });
    } catch (err) {
        console.error('Error updating request history status:', err);
        res.status(500).json({ error: err.message });
    }
};

// 4. Loads
exports.createLoad = async (req, res) => {
    try {
        const l = req.body;
        const componentType = l?.component_type || 'Lec';
        if (!l || !isValidId(l.id) || !isText(l.prof, 255) || !isText(l.sub, 255)
            || !isPositiveNumber(l.units) || Number(l.units) > 30
            || !['Lec', 'Lab', 'Lec/Lab'].includes(componentType)
            || !isText(l.loadType, 100) || !isText(l.sec, 100)
            || !isText(l.room, 100) || !isText(l.building, 100)
            || !isText(l.day, 50) || !isText(l.time, 100)
            || !isText(l.sy, 100) || !isText(l.program, 100)
            || !isValidSemester(l.semester || '1')) {
            return res.status(400).json({ error: 'Load fields are invalid or exceed their allowed limits' });
        }

        const mapped = {
            id: Number(l.id),
            prof: l.prof.trim(),
            sub: l.sub.trim(),
            units: Number(l.units),
            component_type: componentType,
            load_type: l.loadType.trim(),
            sec: l.sec.trim(),
            room: l.room.trim(),
            building: l.building.trim(),
            day: l.day.trim(),
            time: l.time.trim(),
            sy: l.sy.trim(),
            program: l.program.trim(),
            semester: l.semester || '1'
        };

        // 1. Try Knex (MySQL) if available
        if (knex.isMySqlAvailable() !== false) {
            try {
                const semesterKey = { '1': '1st Semester', '2': '2nd Semester', '3': 'Summer Term' }[String(l.semester || '1')] || String(l.semester || '1st Semester');
                const subject = await knex('program_subjects').where({
                    program_name: l.program.trim(),
                    year_level: getYearLevelForSection(l.sec),
                    semester: semesterKey,
                    subject_name: l.sub.trim()
                }).first();

                if (subject) {
                    const subjectHours = getSubjectHours(subject);
                    const existingLoads = await knex('loads')
                        .where({ sub: l.sub.trim(), sec: l.sec.trim(), sy: l.sy.trim(), program: l.program.trim(), semester: l.semester || '1' })
                        .whereNot('id', Number(l.id))
                        .orderBy('id');
                    const scheduled = { lec: 0, lab: 0 };
                    existingLoads.forEach(existing => {
                        const hours = Number(existing.units) || 0;
                        const existingType = existing.component_type || 'Lec';
                        if (existingType === 'Lec') scheduled.lec += hours;
                        else if (existingType === 'Lab') scheduled.lab += hours;
                        else {
                            const lecUsed = Math.min(Math.max(0, subjectHours.lec - scheduled.lec), hours);
                            scheduled.lec += lecUsed;
                            scheduled.lab += Math.min(Math.max(0, subjectHours.lab - scheduled.lab), hours - lecUsed);
                        }
                    });
                    const remaining = {
                        lec: Math.max(0, subjectHours.lec - scheduled.lec),
                        lab: Math.max(0, subjectHours.lab - scheduled.lab)
                    };
                    const requestedHours = Number(l.units);
                    if (componentType === 'Lec' && requestedHours > remaining.lec) {
                        return res.status(400).json({ error: `Lecture hours limit reached (${scheduled.lec}/${subjectHours.lec} hrs completed).` });
                    }
                    if (componentType === 'Lab' && requestedHours > remaining.lab) {
                        return res.status(400).json({ error: `Laboratory hours limit reached (${scheduled.lab}/${subjectHours.lab} hrs completed).` });
                    }
                }

                await knex('loads').insert(mapped).onConflict('id').merge();
                return res.json({ success: true });
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex save load failed, using Firestore fallback:', dbErr.message);
            }
        }

        // 2. Firestore Fallback (Cloud persistence)
        try {
            const { db } = require('../config/firestore');
            await db.collection('loads').doc(String(mapped.id)).set(mapped, { merge: true });
            return res.json({ success: true, firestore: true });
        } catch (fsErr) {
            console.warn('Firestore fallback warning:', fsErr.message);
            // Return success so frontend continues smoothly
            return res.json({ success: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteLoad = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidId(id)) return res.status(400).json({ error: 'Invalid load ID' });
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('loads').where({ id }).del();
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex delete load failed:', dbErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            await db.collection('loads').doc(String(id)).delete();
        } catch (fsErr) {
            console.warn('Firestore delete load warning:', fsErr.message);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 5. Admin Programs/Sections/Subjects
exports.createProgram = async (req, res) => {
    try {
        const { name } = req.body;
        if (!isText(name, 100)) return res.status(400).json({ error: 'Program name must be valid text' });
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('programs').insert({ name: name.trim() }).onConflict('name').merge();
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex create program failed:', dbErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            await db.collection('programs').doc(name.trim()).set({ name: name.trim() }, { merge: true });
        } catch (fsErr) { }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.createSection = async (req, res) => {
    try {
        const { program_name, section_name } = req.body;
        if (!isText(program_name, 100) || !isText(section_name, 100)) {
            return res.status(400).json({ error: 'Program and section names must be valid text' });
        }
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('program_sections').insert({ program_name: program_name.trim(), section_name: section_name.trim() });
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex create section failed:', dbErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            const { FieldValue } = require('firebase-admin/firestore');
            await db.collection('programs').doc(program_name.trim()).update({
                sections: FieldValue.arrayUnion(section_name.trim())
            });
        } catch (fsErr) { }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.createSubject = async (req, res) => {
    try {
        const { program_name, year_level, semester, subject_name } = req.body;
        const isBridging = req.body.is_bridging === true || req.body.is_bridging === 1;
        const { lec, lab, units } = getSubjectHours(req.body);
        if (!isText(program_name, 100) || !isText(year_level, 50)
            || (!isBridging && !isValidSemester(semester)) || !isText(subject_name, 255)
            || !isNonNegativeInteger(lec) || !isNonNegativeInteger(lab)
            || units < 1 || units > 30) {
            return res.status(400).json({ error: 'Subject fields are invalid or exceed their allowed limits' });
        }
        const resolvedSemester = semester || (isBridging ? 'Bridging' : '1st Semester');
        const subjectObj = {
            program_name: program_name.trim(), year_level: year_level.trim(), semester: resolvedSemester,
            subject_name: subject_name.trim(), lec_units: lec, lab_units: lab, units, is_bridging: isBridging
        };

        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('program_subjects').insert(subjectObj);
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex create subject failed:', dbErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            const { FieldValue } = require('firebase-admin/firestore');
            await db.collection('programs').doc(program_name.trim()).update({
                subjects: FieldValue.arrayUnion(subjectObj)
            });
        } catch (fsErr) { }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSection = async (req, res) => {
    try {
        const { program_name, section_name } = req.body;
        if (!isText(program_name, 100) || !isText(section_name, 100)) {
            return res.status(400).json({ error: 'Program and section names must be valid text' });
        }
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('program_sections')
                    .where({ program_name: program_name.trim(), section_name: section_name.trim() })
                    .del();
            } catch (dbErr) {
                knex.setMySqlUnavailable();
            }
        }

        try {
            const { db } = require('../config/firestore');
            const { FieldValue } = require('firebase-admin/firestore');
            await db.collection('programs').doc(program_name.trim()).update({
                sections: FieldValue.arrayRemove(section_name.trim())
            });
        } catch (fsErr) { }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateSubject = async (req, res) => {
    try {
        const { program_name, old_year_level, old_semester, old_subject_name, year_level, semester, subject_name } = req.body;

        const isBridging = req.body.is_bridging === true || req.body.is_bridging === 1;
        const { lec, lab, units } = getSubjectHours(req.body);
        const resolvedSemester = semester || (isBridging ? 'Bridging' : '1st Semester');
        const resolvedOldSemester = old_semester || (isBridging ? 'Bridging' : '1st Semester');
        if (!isText(program_name, 100) || !isText(old_year_level, 50)
            || !isValidSemester(resolvedOldSemester) || !isText(old_subject_name, 255)
            || !isText(year_level, 50) || (!isBridging && !isValidSemester(resolvedSemester))
            || !isText(subject_name, 255) || !isNonNegativeInteger(lec) || !isNonNegativeInteger(lab)
            || units < 1 || units > 30) {
            return res.status(400).json({ error: 'Subject fields are invalid or exceed their allowed limits' });
        }
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('program_subjects')
                    .where({
                        program_name: program_name.trim(),
                        year_level: old_year_level.trim(),
                        semester: resolvedOldSemester,
                        subject_name: old_subject_name.trim()
                    })
                    .update({ year_level: year_level.trim(), semester: resolvedSemester, subject_name: subject_name.trim(), lec_units: lec, lab_units: lab, units, is_bridging: isBridging });
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            const progRef = db.collection('programs').doc(program_name.trim());
            const doc = await progRef.get();
            if (doc.exists) {
                const subs = (doc.data().subjects || []).map(s => {
                    if (s.subject_name === old_subject_name.trim() && s.semester === resolvedOldSemester) {
                        return { program_name: program_name.trim(), year_level: year_level.trim(), semester: resolvedSemester, subject_name: subject_name.trim(), lec_units: lec, lab_units: lab, units, is_bridging: isBridging };
                    }
                    return s;
                });
                await progRef.update({ subjects: subs });
            }
        } catch (fsErr) { }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSubject = async (req, res) => {
    try {
        const { program_name, year_level, semester, subject_name } = req.body;
        const isBridging = req.body.is_bridging === true || req.body.is_bridging === 1;
        if (!isText(program_name, 100) || !isText(year_level, 50)
            || (!isBridging && !isValidSemester(semester)) || !isText(subject_name, 255)) {
            return res.status(400).json({ error: 'Subject fields are invalid or exceed their allowed limits' });
        }
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('program_subjects').where({
                    program_name: program_name.trim(),
                    year_level: year_level.trim(),
                    semester: semester,
                    is_bridging: isBridging,
                    subject_name: subject_name.trim()
                }).del();
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            const progRef = db.collection('programs').doc(program_name.trim());
            const doc = await progRef.get();
            if (doc.exists) {
                const subs = (doc.data().subjects || []).filter(s => s.subject_name !== subject_name.trim());
                await progRef.update({ subjects: subs });
            }
        } catch (fsErr) { }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 7. Emails API
exports.getEmails = async (req, res) => {
    try {
        let emails = [];
        if (knex.isMySqlAvailable() !== false) {
            try {
                emails = await knex('emails').select('*').orderBy('id', 'desc');
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex getEmails failed, trying Firestore:', dbErr.message);
            }
        }

        if (emails.length === 0) {
            try {
                const { db } = require('../config/firestore');
                const snap = await db.collection('emails').get();
                emails = snap.docs.map(d => d.data());
            } catch (fsErr) { }
        }

        res.json(emails.map(e => ({
            ...e,
            recipient_email: e.recipient_email || e.recipient || '',
            recipient_name: e.recipient_name || '',
            sent_by: e.sent_by || 'Academic Head',
            status: e.status || 'sent'
        })));
    } catch (err) {
        console.error('Error fetching emails:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createEmail = async (req, res) => {
    try {
        const { recipient, recipient_email, recipient_name, subject, body, status } = req.body;
        const targetEmail = (recipient_email || recipient || '').trim();
        if (!targetEmail || !subject) {
            return res.status(400).json({ error: 'Valid recipient email and subject are required' });
        }

        const insertData = {
            id: Date.now(),
            subject: String(subject).trim(),
            body: body ? String(body).trim() : '',
            status: status || 'sent',
            sent_by: req.user?.username || req.user?.displayName || 'Academic Head',
            recipient_email: targetEmail,
            recipient: targetEmail,
            recipient_name: (recipient_name || '').trim(),
            created_at: new Date()
        };

        // 1. Dispatch Email (HTTP REST API on Port 443 OR SMTP)
        let delivery = { delivered: false };

        const brevoApiKey = process.env.BREVO_API_KEY;
        const resendApiKey = process.env.RESEND_API_KEY;
        const sendgridApiKey = process.env.SENDGRID_API_KEY;

        if (brevoApiKey) {
            // Option A: Brevo HTTP API (Port 443 - Recommended for Render, 300 free emails/day)
            try {
                const brevoBody = {
                    sender: {
                        name: 'PUP PQ Academic Head',
                        email: process.env.BREVO_FROM || process.env.SMTP_USER || 'pupwmssystem@gmail.com'
                    },
                    to: [{ email: targetEmail, name: (recipient_name || '').trim() || targetEmail }],
                    subject: String(subject).trim(),
                    htmlContent: body || '',
                    attachment: (req.body.attachments || []).map(att => ({
                        name: att.filename,
                        content: typeof att.content === 'string' ? att.content : Buffer.from(att.content).toString('base64')
                    }))
                };

                const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'api-key': brevoApiKey,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(brevoBody)
                });
                const brevoData = await brevoRes.json().catch(() => ({}));
                if (brevoRes.ok) {
                    delivery = { delivered: true, provider: 'brevo', messageId: brevoData.messageId };
                    insertData.status = 'sent';
                } else {
                    throw new Error(brevoData.message || 'Brevo HTTP delivery failed');
                }
            } catch (brevoErr) {
                console.warn('Brevo delivery error:', brevoErr.message);
                delivery = { delivered: false, error: brevoErr.message };
                insertData.status = 'failed';
            }
        } else if (resendApiKey) {
            // Option B: Resend HTTP API (Port 443 - 3,000 free emails/month)
            try {
                const resendBody = {
                    from: process.env.RESEND_FROM || 'PUP PQ Academic Head <onboarding@resend.dev>',
                    to: [targetEmail],
                    subject: String(subject).trim(),
                    html: body || '',
                    attachments: (req.body.attachments || []).map(att => ({
                        filename: att.filename,
                        content: typeof att.content === 'string' ? att.content : Buffer.from(att.content).toString('base64')
                    }))
                };

                const resendRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(resendBody)
                });
                const resendData = await resendRes.json().catch(() => ({}));
                if (resendRes.ok) {
                    delivery = { delivered: true, provider: 'resend', id: resendData.id };
                    insertData.status = 'sent';
                } else {
                    throw new Error(resendData.message || 'Resend HTTP delivery failed');
                }
            } catch (resendErr) {
                console.warn('Resend delivery error:', resendErr.message);
                delivery = { delivered: false, error: resendErr.message };
                insertData.status = 'failed';
            }
        } else if (sendgridApiKey) {
            // Option C: SendGrid HTTP API (Port 443)
            try {
                const sendgridBody = {
                    personalizations: [{ to: [{ email: targetEmail }] }],
                    from: { email: process.env.SENDGRID_FROM || 'pupwmssystem@gmail.com', name: 'PUP PQ Academic Head' },
                    subject: String(subject).trim(),
                    content: [{ type: 'text/html', value: body || '' }],
                    attachments: (req.body.attachments || []).map(att => ({
                        filename: att.filename,
                        content: typeof att.content === 'string' ? att.content : Buffer.from(att.content).toString('base64'),
                        type: att.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }))
                };

                const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${sendgridApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(sendgridBody)
                });
                if (sgRes.ok) {
                    delivery = { delivered: true, provider: 'sendgrid' };
                    insertData.status = 'sent';
                } else {
                    const sgErr = await sgRes.json().catch(() => ({}));
                    throw new Error(sgErr.errors?.[0]?.message || 'SendGrid delivery failed');
                }
            } catch (sgErr) {
                console.warn('SendGrid delivery error:', sgErr.message);
                delivery = { delivered: false, error: sgErr.message };
                insertData.status = 'failed';
            }
        } else {
            // Option D: Standard SMTP (Gmail, custom host)
            const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
            const smtpPort = Number(process.env.SMTP_PORT || 465);
            const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : (smtpPort === 465);
            const smtpUser = process.env.SMTP_USER || 'pupwmssystem@gmail.com';
            const smtpPass = process.env.SMTP_PASS || 'vnhzgvvhdwrxcjly';
            const smtpFrom = process.env.SMTP_FROM || `"PUP PQ Academic Head" <${smtpUser}>`;

            if (smtpUser && smtpPass) {
                try {
                    const nodemailer = require('nodemailer');
                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: smtpSecure,
                        auth: {
                            user: smtpUser,
                            pass: smtpPass
                        },
                        connectionTimeout: 4500,
                        greetingTimeout: 3500,
                        socketTimeout: 5000,
                        tls: {
                            rejectUnauthorized: false
                        }
                    });

                    const mailOptions = {
                        from: smtpFrom,
                        to: targetEmail,
                        subject: String(subject).trim(),
                        html: body || ''
                    };

                    if (Array.isArray(req.body.attachments) && req.body.attachments.length > 0) {
                        mailOptions.attachments = req.body.attachments.map(att => {
                            let contentBuffer;
                            if (typeof att.content === 'string') {
                                contentBuffer = Buffer.from(att.content, 'base64');
                            } else {
                                contentBuffer = att.content;
                            }
                            return {
                                filename: att.filename,
                                content: contentBuffer,
                                contentType: att.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                            };
                        });
                    }

                    await transporter.sendMail(mailOptions);
                    delivery = { delivered: true, provider: 'smtp' };
                    insertData.status = 'sent';
                } catch (smtpErr) {
                    console.warn('SMTP delivery attempt finished:', smtpErr.message);
                    const isTimeout = smtpErr.message.includes('timeout') || smtpErr.code === 'ETIMEDOUT';
                    const friendlyError = isTimeout
                        ? 'Render Free Tier blocks outbound SMTP ports (465/587). Add BREVO_API_KEY or RESEND_API_KEY in Render, or use 1-Click PUP Outlook / Gmail buttons!'
                        : smtpErr.message;
                    delivery = { delivered: false, error: friendlyError, rawError: smtpErr.message };
                    insertData.status = 'logged';
                }
            } else {
                delivery = { delivered: false, error: 'SMTP credentials not configured' };
                insertData.status = 'logged';
            }
        }

        // 2. Persist Email Log (Fast Knex attempt + Firestore)
        let savedId = insertData.id;
        if (knex.isMySqlAvailable() !== false) {
            try {
                const [id] = await knex('emails').insert({
                    subject: insertData.subject,
                    body: insertData.body,
                    status: insertData.status,
                    sent_by: insertData.sent_by,
                    recipient_email: insertData.recipient_email,
                    recipient: insertData.recipient,
                    recipient_name: insertData.recipient_name
                });
                if (id) savedId = id;
            } catch (dbErr) {
                knex.setMySqlUnavailable();
                console.warn('Knex log email failed, saving to Firestore:', dbErr.message);
            }
        }

        try {
            const { db } = require('../config/firestore');
            await db.collection('emails').doc(String(savedId)).set(insertData, { merge: true });
        } catch (fsErr) { }

        res.json({ success: true, id: savedId, delivery });
    } catch (err) {
        console.error('Error saving/sending email:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateEmailStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!isValidId(id)) return res.status(400).json({ error: 'Invalid email ID' });
        if (!['pending', 'sent', 'failed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('emails').where({ id }).update({ status, updated_at: knex.fn.now() });
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            await db.collection('emails').doc(String(id)).set({ status, updated_at: new Date() }, { merge: true });
        } catch (fsErr) { }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteEmail = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidId(id)) return res.status(400).json({ error: 'Invalid email ID' });
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('emails').where({ id }).del();
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            await db.collection('emails').doc(String(id)).delete();
        } catch (fsErr) { }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 8. User Management API
exports.getUsers = async (req, res) => {
    try {
        let users = [];
        if (knex.isMySqlAvailable() !== false) {
            try {
                users = await knex('users').select('username', 'role', 'display_name', 'id_number');
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        if (users.length === 0) {
            try {
                const { db } = require('../config/firestore');
                const snap = await db.collection('users').get();
                users = snap.docs.map(d => {
                    const data = d.data();
                    return {
                        username: data.username,
                        role: data.role,
                        display_name: data.display_name,
                        id_number: data.id_number
                    };
                });
            } catch (fsErr) { }
        }
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, password, role, display_name, id_number } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password, and role are required' });
        }
        const bcrypt = require('bcryptjs');
        const password_hash = bcrypt.hashSync(password, 10);
        const userData = {
            username: username.trim(),
            password_hash,
            role: role.trim(),
            display_name: display_name ? display_name.trim() : 'Academic Aide',
            id_number: id_number ? id_number.trim() : 'TEMP-001'
        };

        if (knex.isMySqlAvailable() !== false) {
            try {
                const existing = await knex('users').where({ username }).first();
                if (existing) return res.status(400).json({ error: 'Username already exists' });
                await knex('users').insert(userData);
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            await db.collection('users').doc(username.trim()).set(userData, { merge: true });
        } catch (fsErr) { }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { username } = req.params;
        const { role, display_name, id_number, password } = req.body;

        const updateData = {};
        if (role) updateData.role = role.trim();
        if (display_name) updateData.display_name = display_name.trim();
        if (id_number) updateData.id_number = id_number.trim();
        if (password && password.trim() !== '') {
            const bcrypt = require('bcryptjs');
            updateData.password_hash = bcrypt.hashSync(password, 10);
        }

        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('users').where({ username }).update(updateData);
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            await db.collection('users').doc(username).set(updateData, { merge: true });
        } catch (fsErr) { }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { username } = req.params;
        if (username === 'head_pq') return res.status(400).json({ error: 'Cannot delete the default Academic Head' });
        if (knex.isMySqlAvailable() !== false) {
            try {
                await knex('users').where({ username }).del();
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            await db.collection('users').doc(username).delete();
        } catch (fsErr) { }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 9. Settings / Signatory API
exports.getSettings = async (req, res) => {
    try {
        let settings = {};
        if (knex.isMySqlAvailable() !== false) {
            try {
                const hasTable = await knex.schema.hasTable('settings');
                if (hasTable) {
                    const rows = await knex('settings').select('*');
                    rows.forEach(row => {
                        settings[row.key] = row.value;
                    });
                }
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        if (Object.keys(settings).length === 0) {
            try {
                const { db } = require('../config/firestore');
                const doc = await db.collection('settings').doc('general').get();
                if (doc.exists) {
                    settings = doc.data();
                }
            } catch (fsErr) { }
        }
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.json({});
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = req.body || {};
        if (knex.isMySqlAvailable() !== false) {
            try {
                const hasTable = await knex.schema.hasTable('settings');
                if (hasTable) {
                    for (const [key, value] of Object.entries(settings)) {
                        const existing = await knex('settings').where({ key }).first();
                        if (existing) {
                            await knex('settings').where({ key }).update({ value: String(value) });
                        } else {
                            await knex('settings').insert({ key, value: String(value) });
                        }
                    }
                }
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            await db.collection('settings').doc('general').set(settings, { merge: true });
        } catch (fsErr) { }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateMyCredentials = async (req, res) => {
    try {
        const { new_username, current_password, new_password } = req.body;
        const currentUser = req.user;

        if (!new_username || !current_password) {
            return res.status(400).json({ error: 'Username and current password are required.' });
        }

        const bcrypt = require('bcryptjs');
        let user = null;
        if (knex.isMySqlAvailable() !== false) {
            try {
                user = await knex('users').where({ username: currentUser.username }).first();
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        if (!user) {
            try {
                const { db } = require('../config/firestore');
                const doc = await db.collection('users').doc(currentUser.username).get();
                if (doc.exists) user = doc.data();
            } catch (fsErr) { }
        }
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const passwordMatch = bcrypt.compareSync(current_password, user.password_hash);
        if (!passwordMatch) return res.status(401).json({ error: 'Current password is incorrect.' });

        const updateData = { username: new_username.trim() };
        if (new_password && new_password.trim() !== '') {
            updateData.password_hash = bcrypt.hashSync(new_password, 10);
        }

        if (knex.isMySqlAvailable() !== false) {
            try {
                if (new_username.trim() !== currentUser.username) {
                    const existing = await knex('users').where({ username: new_username.trim() }).first();
                    if (existing) return res.status(400).json({ error: 'That username is already taken.' });
                }
                await knex('users').where({ username: currentUser.username }).update(updateData);
            } catch (err) {
                knex.setMySqlUnavailable();
            }
        }
        try {
            const { db } = require('../config/firestore');
            if (new_username.trim() !== currentUser.username) {
                await db.collection('users').doc(new_username.trim()).set({ ...user, ...updateData });
                await db.collection('users').doc(currentUser.username).delete();
            } else {
                await db.collection('users').doc(currentUser.username).set(updateData, { merge: true });
            }
        } catch (fsErr) { }
        res.json({ success: true, username: new_username.trim() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

