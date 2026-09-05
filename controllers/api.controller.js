const knex = require('../config/database');

// 1. Initial State
exports.getInitialState = async (req, res) => {
    try {
        const roomRows = await knex('rooms').select('*');
        const facultyRows = await knex('faculty').select('*');
        const syRows = await knex('school_years').select('*');
        const progRows = await knex('programs').select('*');
        const sectionRows = await knex('program_sections').select('*');
        const subjectRows = await knex('program_subjects').select('*');
        const loadRows = await knex('loads').select('*');

        const facultyRegistry = facultyRows.map(row => ({
            id: row.id,
            name: row.name,
            baseDesignation: row.base_designation || '',
            program: row.program || '',
            employmentType: row.employment_type || '',
            classification: row.classification || '',
            classificationRank: row.classification_rank || '',
            active: !!row.active,
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
            remarks: row.remarks || ''
        }));

        const schoolYears = syRows.map(r => r.name);
        const rooms = roomRows.map(r => ({ name: r.name, building: r.building }));
        const buildings = [...new Set(roomRows.map(r => r.building))];

        const programs = {};
        progRows.forEach(p => {
            const progName = p.name;
            const sections = sectionRows.filter(s => s.program_name === progName).map(s => s.section_name);
            const profs = facultyRows.filter(f => {
                if (!f.program) return false;
                const programsList = f.program.split(',').map(s => s.trim());
                return programsList.includes(progName);
            }).map(f => f.name);

            const subjects = {};
            const progSubs = subjectRows.filter(s => s.program_name === progName);
            progSubs.forEach(s => {
                if (!subjects[s.year_level]) subjects[s.year_level] = {};
                if (!subjects[s.year_level][s.semester]) subjects[s.year_level][s.semester] = [];
                subjects[s.year_level][s.semester].push({ name: s.subject_name, units: s.units });
            });

            programs[progName] = { profs, sections, subjects };
        });

        const loads = loadRows.map(l => ({
            id: Number(l.id),
            prof: l.prof,
            sub: l.sub,
            units: Number(l.units),
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
        if (!name || !building) return res.status(400).json({ error: 'Missing parameters' });
        await knex('rooms').insert({ name, building }).onConflict('name').merge();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        const { name } = req.body; // Original code used req.body, consider changing to req.params in real apps
        if (!name) return res.status(400).json({ error: 'Missing room name' });
        await knex('rooms').where({ name }).del();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 3. Faculty
exports.createFaculty = async (req, res) => {
    try {
        const f = req.body;
        if (!f.id || !f.name) return res.status(400).json({ error: 'Missing faculty ID or Name' });
        const mapped = {
            id: f.id,
            name: f.name,
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
        await knex('faculty').insert(mapped).onConflict('id').merge();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteFaculty = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('faculty').where({ id }).del();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 4. Loads
exports.createLoad = async (req, res) => {
    try {
        const l = req.body;
        if (!l.id || !l.prof || !l.sub) return res.status(400).json({ error: 'Missing parameters' });
        const mapped = {
            id: l.id,
            prof: l.prof,
            sub: l.sub,
            units: l.units,
            load_type: l.loadType,
            sec: l.sec,
            room: l.room,
            building: l.building,
            day: l.day,
            time: l.time,
            sy: l.sy,
            program: l.program,
            semester: l.semester || '1'
        };
        await knex('loads').insert(mapped).onConflict('id').merge();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteLoad = async (req, res) => {
    try {
        const { id } = req.params;
        await knex('loads').where({ id }).del();
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
        if (!name) return res.status(400).json({ error: 'Missing name' });
        await knex('programs').insert({ name }).onConflict('name').merge();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.createSection = async (req, res) => {
    try {
        const { program_name, section_name } = req.body;
        if (!program_name || !section_name) return res.status(400).json({ error: 'Missing parameters' });
        await knex('program_sections').insert({ program_name, section_name });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.createSubject = async (req, res) => {
    try {
        const { program_name, year_level, semester, subject_name, units } = req.body;
        if (!program_name || !year_level || !semester || !subject_name || !units) {
            return res.status(400).json({ error: 'Missing parameters' });
        }
        await knex('program_subjects').insert({
            program_name, year_level, semester, subject_name, units
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
