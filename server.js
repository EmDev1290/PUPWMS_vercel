// PUP PQ Scheduler Express Backend Server
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const xlsx = require('xlsx');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Serve static files
app.use('/Frontend', express.static(path.join(__dirname, 'Frontend')));
app.use('/JS', express.static(path.join(__dirname, 'JS')));
app.use('/style', express.static(path.join(__dirname, 'style')));

// Serve all Frontend HTML pages at root level (so relative JS redirects work)
const frontendPages = [
    'index.html',
    'dashboard.html',
    'faculty-loading.html',
    'faculty-profile.html',
    'faculty-status.html',
    'faculty-workloads.html',
    'file-management.html',
    'program-resources.html',
    'room-management.html',
    'room-schedules.html',
    'section-timetables.html',
    'add-faculty-profile.html'
];

frontendPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'Frontend', page));
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'index.html'));
});

const knex = require('./config/database');
const apiRoutes = require('./routes/api.routes');
const authRoutes = require('./routes/auth.routes');

app.use('/api', authRoutes);
app.use('/api', apiRoutes);

// ==========================================
// FILE MANAGEMENT & EXCEL SCANNER ENDPOINTS
// ==========================================

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'System_content_info');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// 1. GET /api/system-files: List Excel files inside System_content_info/
app.get('/api/system-files', (req, res) => {
    try {
        const dir = path.join(__dirname, 'System_content_info');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const files = fs.readdirSync(dir);
        const fileList = files
            .filter(f => f.endsWith('.xlsx') || f.endsWith('.ods'))
            .map(filename => {
                const filePath = path.join(dir, filename);
                const stats = fs.statSync(filePath);
                return {
                    name: filename,
                    size: stats.size,
                    mtime: stats.mtime
                };
            });
        res.json({ success: true, files: fileList });
    } catch (err) {
        console.error('List system files error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. POST /api/upload-system-file: Upload/Replace Excel or ODS file
app.post('/api/upload-system-file', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        res.json({ success: true, filename: req.file.originalname });
    } catch (err) {
        console.error('Upload system file error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. DELETE /api/delete-system-file: Delete Excel or ODS file
app.delete('/api/delete-system-file', (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) return res.status(400).json({ error: 'Missing filename' });
        const filePath = path.join(__dirname, 'System_content_info', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (err) {
        console.error('Delete system file error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. POST /api/scan-system-files: Excel database scanning & hydration engine
app.post('/api/scan-system-files', async (req, res) => {
    const trx = await knex.transaction();
    try {
        const dir = path.join(__dirname, 'System_content_info');
        if (!fs.existsSync(dir)) {
            throw new Error('System_content_info directory does not exist.');
        }
        const files = fs.readdirSync(dir);

        // Standard datasets to accumulate
        const roomsToInsert = [];
        const facultyToInsert = [];
        const sectionsToInsert = [];
        const subjectsToInsert = [];
        const loadsToInsert = [];

        // Unique trackers to prevent duplicates
        const roomNamesSet = new Set();
        const facultyNamesSet = new Set();
        const sectionKeysSet = new Set();
        const subjectKeysSet = new Set();
        const loadKeysSet = new Set();

        // ----------------------------------------------------
        // A. Parse Rooms Assigned Spreadsheet
        // ----------------------------------------------------
        const roomFile = files.find(f => f.toUpperCase().includes('ROOM-ASSIGNED') && f.endsWith('.xlsx'));
        if (roomFile) {
            const workbook = xlsx.readFile(path.join(dir, roomFile));
            workbook.SheetNames.forEach(sheetName => {
                const cleanName = sheetName.trim();
                if (!cleanName || roomNamesSet.has(cleanName)) return;

                let building = 'Main Building';
                if (cleanName.startsWith('NB-') || cleanName.includes('NB')) {
                    building = 'New Building';
                }

                roomsToInsert.push({ name: cleanName, building });
                roomNamesSet.add(cleanName);
            });
        }

        // ----------------------------------------------------
        // B. Parse Faculty Profiles Spreadsheet
        // ----------------------------------------------------
        const facultyFile = files.find(f => f.toUpperCase().includes('FACULTY-PROFILE') && f.endsWith('.xlsx'));
        if (facultyFile) {
            const workbook = xlsx.readFile(path.join(dir, facultyFile));
            const targetSheets = ['GEN-ED', 'BSCPE', 'BSIT', 'BSHM', 'BSOA'];

            workbook.SheetNames.forEach(sheetName => {
                const upperSheet = sheetName.toUpperCase().trim();
                const matchedSheet = targetSheets.find(s => upperSheet.includes(s));
                if (!matchedSheet) return;

                const sheet = workbook.Sheets[sheetName];
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
                if (rows.length < 3) return;

                // Find header row containing "BACCALAUREATE"
                let headerRowIdx = 1;
                for (let i = 0; i < Math.min(10, rows.length); i++) {
                    const row = rows[i];
                    if (row && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('baccalaureate'))) {
                        headerRowIdx = i;
                        break;
                    }
                }

                // Map Program name
                let program = 'General Education';
                if (matchedSheet === 'BSIT') program = 'Information Technology';
                else if (matchedSheet === 'BSCPE') program = 'Computer Engineering';
                else if (matchedSheet === 'BSHM') program = 'Hospitality Management';
                else if (matchedSheet === 'BSOA') program = 'Office Administration';

                // Parse Faculty data rows
                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || !row[1]) continue;

                    const nameCell = String(row[1]).trim();
                    if (!nameCell || nameCell === 'NO.' || nameCell.toLowerCase().includes('personnel') || nameCell.toLowerCase().includes('name')) continue;

                    const cleanName = nameCell.split('\n')[0].trim();
                    if (!cleanName || facultyNamesSet.has(cleanName)) continue;

                    const baccalaureate = row[2] ? String(row[2]).trim() : '';
                    const masters = row[3] ? String(row[3]).trim() : '';
                    const doctorate = row[4] ? String(row[4]).trim() : '';
                    const postBac = row[5] ? String(row[5]).trim() : '';
                    const licenseNo = row[6] ? String(row[6]).trim() : '';
                    const specialization = row[7] ? String(row[7]).trim() : '';
                    const nc = row[8] ? String(row[8]).trim() : '';

                    const genEd = row[9] ? String(row[9]).trim() : '';
                    const core = row[10] ? String(row[10]).trim() : '';
                    const prof = row[11] ? String(row[11]).trim() : '';
                    const tech = row[12] ? String(row[12]).trim() : '';

                    let appointment = 'Part-Time';
                    for (let c = 13; c < Math.min(row.length, 20); c++) {
                        const val = String(row[c] || '').toUpperCase();
                        if (val.includes('PART-TIME') || val.includes('PARTTIME')) {
                            appointment = 'Part-Time';
                            break;
                        } else if (val.includes('FULL-TIME') || val.includes('FULLTIME') || val.includes('REGULAR')) {
                            appointment = 'Full-Time';
                            break;
                        }
                    }

                    const prefList = [genEd, core, prof, tech].filter(Boolean).map(s => s.replace(/\n/g, ', '));
                    const preferredSubjects = prefList.join(', ');

                    const id = `prof-${cleanName.toLowerCase().replace(/[^a-z]/g, '')}`;
                    facultyToInsert.push({
                        id,
                        name: cleanName,
                        base_designation: 'Instructor',
                        program,
                        employment_type: appointment === 'Full-Time' ? 'Regular' : 'Part-Time',
                        classification: appointment === 'Full-Time' ? 'Regular' : 'Part-Time',
                        active: 1,
                        baccalaureate,
                        masters,
                        doctorate,
                        post_baccalaureate: postBac,
                        license_number: licenseNo,
                        specialization,
                        national_certificate: nc,
                        gen_ed: genEd,
                        core_subject: core,
                        professional_subject: prof,
                        technical_subject: tech,
                        nature_of_appointment: appointment,
                        preferred_subjects: preferredSubjects,
                        preferred_times: ''
                    });

                    facultyNamesSet.add(cleanName);
                }
            });
        }

        // ----------------------------------------------------
        // C. Parse Offerings & Class Schedules
        // ----------------------------------------------------
        const offeringFiles = files.filter(f => (f.toUpperCase().includes('OFFERING') || f.toUpperCase().includes('SCHED') || f.toUpperCase().includes('LOAD')) && (f.endsWith('.xlsx') || f.endsWith('.ods')));

        const normalizeCell = (value) => value === null || value === undefined ? '' : String(value).trim();
        const isSubjectCodeLike = (value) => {
            const text = normalizeCell(value).replace(/\s+/g, ' ');
            if (!text || text.toLowerCase().includes('subject') || text.toLowerCase().includes('time') || text.toLowerCase().includes('description')) {
                return false;
            }
            return /^[A-Z]{2,7}\s*\d{2,5}[A-Z]?$/i.test(text) || /^[A-Z]{2,7}\s*\d{2,5}[A-Z]?\s*[-/][A-Z0-9]+$/i.test(text);
        };
        const cleanProfessorName = (value) => {
            const cleaned = normalizeCell(value)
                .replace(/\r?\n/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/^Prof\.?\s*/i, '')
                .replace(/^Dr\.?\s*/i, '')
                .replace(/^Professor\s*/i, '')
                .trim();
            return cleaned;
        };
        const normalizeDay = (value) => {
            const text = normalizeCell(value).toLowerCase();
            if (!text || text === 'tba' || text === 'n/a') return '';
            if (text.includes('monday')) return 'Monday';
            if (text.includes('tuesday')) return 'Tuesday';
            if (text.includes('wednesday')) return 'Wednesday';
            if (text.includes('thursday')) return 'Thursday';
            if (text.includes('friday')) return 'Friday';
            if (text.includes('saturday')) return 'Saturday';
            if (text.includes('sunday')) return 'Sunday';
            return normalizeCell(value);
        };
        const normalizeTimeRange = (value) => {
            const raw = normalizeCell(value);
            if (!raw || raw.toLowerCase() === 'tba' || raw.toLowerCase() === 'n/a') return '';
            const compact = raw.replace(/\s+/g, '').toLowerCase();
            if (!compact.includes('-')) return raw;
            const clean = compact.replace(/[^0-9a-z:-]/g, '');
            const parts = clean.split('-');
            if (parts.length !== 2) return raw;
            const formatPart = (part) => {
                const amp = /am/.test(part) ? 'AM' : /pm/.test(part) ? 'PM' : '';
                const digits = part.replace(/[^0-9:]/g, '');
                const sub = digits.split(':');
                let hour = parseInt(sub[0], 10);
                let minute = sub[1] || '00';
                if (!Number.isNaN(hour)) {
                    if (hour < 10 && hour !== 0) hour = `0${hour}`;
                    if (hour === 0) hour = '12';
                    if (amp === 'PM' && hour !== 12) hour = Number(hour) + 12;
                    if (amp === 'AM' && hour === 12) hour = 0;
                    if (hour < 10 && String(hour).length === 1) hour = `0${hour}`;
                    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${amp}`.trim();
                }
                return part;
            };
            try {
                const start = formatPart(parts[0]);
                const end = formatPart(parts[1]);
                return `${start} - ${end}`.replace(/\s+/g, ' ').trim();
            } catch (e) {
                return raw;
            }
        };

        for (const file of offeringFiles) {
            const workbook = xlsx.readFile(path.join(dir, file));
            let defaultSemester = '1st Semester';
            if (file.toLowerCase().includes('second') || file.toLowerCase().includes('2nd') || file.toLowerCase().includes('2sem')) {
                defaultSemester = '2nd Semester';
            }

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
                if (rows.length < 2) continue;

                let headerRowIdx = -1;
                let colMapping = {};

                for (let i = 0; i < Math.min(20, rows.length); i++) {
                    const row = rows[i];
                    if (!row || !Array.isArray(row)) continue;
                    const normalizedRow = row.map(cell => typeof cell === 'string' ? cell.toLowerCase() : cell);
                    const headerMatch = normalizedRow.findIndex(cell => {
                        if (typeof cell !== 'string') return false;
                        const clean = cell.replace(/[^a-z]/g, '');
                        return clean.includes('subjectcode') || clean.includes('subject') && clean.includes('code');
                    });
                    if (headerMatch !== -1) {
                        headerRowIdx = i;
                        row.forEach((cell, idx) => {
                            if (!cell) return;
                            const normalized = String(cell).toLowerCase().replace(/[^a-z]/g, '');
                            if (normalized.includes('subjectcode')) colMapping.subCode = idx;
                            else if (normalized.includes('description') || normalized.includes('subjectname')) colMapping.desc = idx;
                            else if (normalized.includes('credited') || normalized.includes('unit')) colMapping.units = idx;
                            else if (normalized.includes('section')) colMapping.sec = idx;
                            else if (normalized.includes('room')) colMapping.room = idx;
                            else if (normalized.includes('professor') || normalized.includes('teacher')) colMapping.prof = idx;
                            else if (normalized.includes('day')) colMapping.day = idx;
                            else if (normalized.includes('time')) colMapping.time = idx;
                        });
                        break;
                    }
                }

                if (headerRowIdx === -1 || colMapping.subCode === undefined) continue;

                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || !Array.isArray(row)) continue;

                    const subjectCell = row[colMapping.subCode] !== undefined ? row[colMapping.subCode] : row[0];
                    const rawSubCode = normalizeCell(subjectCell);
                    if (!isSubjectCodeLike(rawSubCode)) continue;

                    const desc = colMapping.desc !== undefined ? normalizeCell(row[colMapping.desc]) : '';
                    const sectionName = colMapping.sec !== undefined ? normalizeCell(row[colMapping.sec]) : (row[6] ? normalizeCell(row[6]) : '');
                    const unitsValue = colMapping.units !== undefined ? parseFloat(String(row[colMapping.units] || 3)) : 3;
                    const unitsVal = Number.isFinite(unitsValue) ? unitsValue : 3;

                    if (!sectionName) continue;

                    let programName = 'General Education';
                    const secPrefix = sectionName.split(' ')[0].toUpperCase().trim();
                    if (secPrefix.startsWith('BSIT')) programName = 'Information Technology';
                    else if (secPrefix.startsWith('BSCP') || secPrefix.startsWith('BSCPE')) programName = 'Computer Engineering';
                    else if (secPrefix.startsWith('BSHM')) programName = 'Hospitality Management';
                    else if (secPrefix.startsWith('BSOA')) programName = 'Office Administration';

                    const sectionKey = `${programName}::${sectionName}`;
                    if (!sectionKeysSet.has(sectionKey)) {
                        sectionsToInsert.push({ program_name: programName, section_name: sectionName });
                        sectionKeysSet.add(sectionKey);
                    }

                    let yearLevel = '1st Year';
                    if (sectionName.includes('1-')) yearLevel = '1st Year';
                    else if (sectionName.includes('2-')) yearLevel = '2nd Year';
                    else if (sectionName.includes('3-')) yearLevel = '3rd Year';
                    else if (sectionName.includes('4-')) yearLevel = '4th Year';

                    const subCode = rawSubCode.replace(/\s+/g, ' ');
                    const subjectName = desc ? `${subCode} - ${desc}` : subCode;

                    const subjectKey = `${programName}::${yearLevel}::${defaultSemester}::${subjectName}`;
                    if (!subjectKeysSet.has(subjectKey)) {
                        subjectsToInsert.push({
                            program_name: programName,
                            year_level: yearLevel,
                            semester: defaultSemester,
                            subject_name: subjectName,
                            units: unitsVal
                        });
                        subjectKeysSet.add(subjectKey);
                    }

                    const profVal = colMapping.prof !== undefined ? normalizeCell(row[colMapping.prof]) : (row[7] ? normalizeCell(row[7]) : '');
                    const dayValRaw = colMapping.day !== undefined ? normalizeCell(row[colMapping.day]) : (row[8] ? normalizeCell(row[8]) : '');
                    const timeValRaw = colMapping.time !== undefined ? normalizeCell(row[colMapping.time]) : (row[9] ? normalizeCell(row[9]) : '');
                    const roomVal = colMapping.room !== undefined ? normalizeCell(row[colMapping.room]) : (row[7] ? normalizeCell(row[7]) : '');

                    const profNameSanitized = cleanProfessorName(profVal);
                    const dayVal = normalizeDay(dayValRaw);
                    const timeVal = normalizeTimeRange(timeValRaw);
                    const roomName = roomVal || 'TBA';

                    const hasScheduleInfo = profNameSanitized && profNameSanitized.toLowerCase() !== 'tba' && profNameSanitized.toLowerCase() !== 'n/a';
                    const loadKey = `${programName}|${defaultSemester}|${sectionName}|${subjectName}|${profNameSanitized || 'TBA'}|${dayVal || 'TBA'}|${timeVal || 'TBA'}|${roomName}`;
                    if (loadKeysSet.has(loadKey)) {
                        continue;
                    }
                    loadKeysSet.add(loadKey);

                    let profName = hasScheduleInfo ? profNameSanitized : 'TBA';
                    if (hasScheduleInfo) {
                        let matchedProf = Array.from(facultyNamesSet).find(n => n.toLowerCase().includes(profName.toLowerCase()));
                        if (matchedProf) {
                            profName = matchedProf;
                        } else if (!facultyNamesSet.has(profName)) {
                            const id = `prof-${profName.toLowerCase().replace(/[^a-z]/g, '')}`;
                            facultyToInsert.push({
                                id,
                                name: profName,
                                base_designation: 'Instructor',
                                program: programName,
                                employment_type: 'Regular',
                                classification: 'Regular',
                                active: 1,
                                baccalaureate: 'N/A',
                                masters: 'N/A',
                                nature_of_appointment: 'Full-Time',
                                preferred_subjects: subjectName,
                                preferred_times: ''
                            });
                            facultyNamesSet.add(profName);
                        }
                    }

                    if (!roomNamesSet.has(roomName) && roomName !== 'TBA') {
                        let building = 'Main Building';
                        if (roomName.startsWith('NB-') || roomName.includes('NB')) building = 'New Building';
                        roomsToInsert.push({ name: roomName, building });
                        roomNamesSet.add(roomName);
                    }

                    loadsToInsert.push({
                        id: Date.now() + loadsToInsert.length,
                        prof: profName,
                        sub: subjectName,
                        units: unitsVal,
                        load_type: 'Regular Load',
                        sec: sectionName,
                        room: roomName,
                        building: roomName === 'TBA' ? 'TBA' : (roomName.startsWith('NB-') || roomName.includes('NB') ? 'New Building' : 'Main Building'),
                        day: dayVal || 'TBA',
                        time: timeVal || 'TBA',
                        sy: 'A.Y. 2024-2025',
                        program: programName,
                        semester: defaultSemester === '2nd Semester' ? '2' : '1'
                    });
                }
            }
        }

        // ----------------------------------------------------
        // D. Commit to Database inside Transaction
        // ----------------------------------------------------
        // Truncate tables to ensure exact replication
        await trx('loads').del();
        await trx('program_subjects').del();
        await trx('program_sections').del();
        await trx('faculty').del();
        await trx('rooms').del();

        // Standard Programs seed
        const standardPrograms = [
            { name: 'Information Technology' },
            { name: 'Computer Engineering' },
            { name: 'Hospitality Management' },
            { name: 'Office Administration' },
            { name: 'General Education' }
        ];
        await trx('programs').insert(standardPrograms).onConflict('name').merge();

        if (roomsToInsert.length > 0) {
            await trx('rooms').insert(roomsToInsert);
        }
        if (facultyToInsert.length > 0) {
            await trx('faculty').insert(facultyToInsert);
        }
        if (sectionsToInsert.length > 0) {
            await trx('program_sections').insert(sectionsToInsert);
        }
        if (subjectsToInsert.length > 0) {
            await trx('program_subjects').insert(subjectsToInsert);
        }
        if (loadsToInsert.length > 0) {
            await trx('loads').insert(loadsToInsert);
        }

        await trx.commit();
        res.json({
            success: true,
            summary: {
                rooms: roomsToInsert.length,
                faculty: facultyToInsert.length,
                sections: sectionsToInsert.length,
                subjects: subjectsToInsert.length,
                loads: loadsToInsert.length
            }
        });
    } catch (err) {
        await trx.rollback();
        console.error('Scan and Sync error:', err);
        res.status(500).json({ error: err.message || 'Excel scanning failure' });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`PUP PQ Workload API server running on port ${PORT}`);
});
