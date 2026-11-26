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

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'style', 'PUP LOGO.png'));
});

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
        const roomFile = files.find(f => (f.toUpperCase().includes('ROOM-ASSIGNED') || f.toUpperCase().includes('ROOM')) && (f.endsWith('.xlsx') || f.endsWith('.ods')));
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
        // (Extracts Name, Designation, Degree/Attainment, Nature, Program)
        // NOTE: Loads are NOT extracted here. Loading is handled in scheduling.
        // ----------------------------------------------------
        const facultyFile = files.find(f => (f.toUpperCase().includes('FACULTY-PROFILE') || f.toUpperCase().includes('FACULTY PROFILE') || f.toUpperCase().includes('FACULTY_PROFILE') || f.toUpperCase().includes('FACULTY')) && (f.endsWith('.xlsx') || f.endsWith('.ods')));
        if (facultyFile) {
            const workbook = xlsx.readFile(path.join(dir, facultyFile));

            const normalizeFacultySheetProgram = (sheetName) => {
                const upper = sheetName.toUpperCase().replace(/\s+/g, ' ').trim();
                if (upper.includes('ALL FACULTY')) return null; // Summary list processed after departmental sheets
                if (upper.includes('BSIT')) return 'Information Technology';
                if (upper.includes('BSCPE') || upper.includes('BSCP')) return 'Computer Engineering';
                if (upper.includes('BSHM')) return 'Hospitality Management';
                if (upper.includes('BSOA')) return 'Office Administration';
                if (upper.includes('GEN-ED') || upper.includes('GEN ED') || upper.includes('GENERAL EDUCATION')) return 'General Education';
                return null;
            };

            const facultyMap = new Map();

            // Sort sheets: 2nd sem specific sheets first, then base sheets, then ALL FACULTY summary sheet
            const sortedFacultySheets = [...workbook.SheetNames].sort((a, b) => {
                const aAll = a.toUpperCase().includes('ALL FACULTY');
                const bAll = b.toUpperCase().includes('ALL FACULTY');
                if (aAll !== bAll) return aAll ? 1 : -1;
                const a2nd = a.toUpperCase().includes('2ND SEM');
                const b2nd = b.toUpperCase().includes('2ND SEM');
                if (a2nd !== b2nd) return b2nd ? 1 : -1;
                return 0;
            });

            sortedFacultySheets.forEach(sheetName => {
                const program = normalizeFacultySheetProgram(sheetName) || 'General Education';
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

                // Parse Faculty data rows
                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || !row[1]) continue;

                    const nameCell = String(row[1]).trim();
                    if (!nameCell || nameCell === 'NO.' || nameCell.toLowerCase().includes('personnel') || nameCell.toLowerCase().includes('name')) continue;

                    const nameParts = nameCell.split('\n').map(s => s.trim()).filter(Boolean);
                    const cleanName = nameParts[0];
                    if (!cleanName) continue;

                    const cleanKey = cleanName.replace(/[^A-Za-z]/g, '').toLowerCase();

                    // Find if instructor already exists (match exact or match without middle initial)
                    let existingFaculty = null;
                    for (const [k, v] of facultyMap.entries()) {
                        if (k === cleanKey || (cleanKey.length > 8 && (k.startsWith(cleanKey) || cleanKey.startsWith(k)))) {
                            existingFaculty = v;
                            break;
                        }
                    }

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

                    const researchProd = row[13] ? String(row[13]).trim() : '0';
                    const researchPres = row[14] ? String(row[14]).trim() : '0';
                    const researchPub = row[15] ? String(row[15]).trim() : '0';
                    const researchCit = row[16] ? String(row[16]).trim() : '0';
                    const extension = row[17] ? String(row[17]).trim() : '';
                    const remarks = row[19] ? String(row[19]).trim() : '';

                    const prefList = [genEd, core, prof, tech].filter(Boolean).map(s => s.replace(/\n/g, ', '));
                    const preferredSubjects = prefList.join(', ');

                    if (existingFaculty) {
                        if (program && !sheetName.toUpperCase().includes('ALL FACULTY')) {
                            const existingPrograms = existingFaculty.program.split(',').map(p => p.trim());
                            if (!existingPrograms.includes(program)) {
                                existingFaculty.program += ', ' + program;
                            }
                        }
                        if (!existingFaculty.baccalaureate && baccalaureate) existingFaculty.baccalaureate = baccalaureate;
                        if (!existingFaculty.masters && masters) existingFaculty.masters = masters;
                        if (!existingFaculty.doctorate && doctorate) existingFaculty.doctorate = doctorate;
                        if (!existingFaculty.post_baccalaureate && postBac) existingFaculty.post_baccalaureate = postBac;
                        if (!existingFaculty.license_number && licenseNo) existingFaculty.license_number = licenseNo;
                        if (!existingFaculty.specialization && specialization) existingFaculty.specialization = specialization;
                        if (!existingFaculty.national_certificate && nc) existingFaculty.national_certificate = nc;
                        if (!existingFaculty.preferred_subjects && preferredSubjects) existingFaculty.preferred_subjects = preferredSubjects;
                        continue;
                    }

                    let baseDesignation = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Instructor';

                    let appointment = 'Part-Time';
                    for (let c = 6; c < Math.min(row.length, 22); c++) {
                        const val = String(row[c] || '').toUpperCase();
                        if (val.includes('PART-TIME') || val.includes('PARTTIME')) {
                            appointment = 'Part-Time';
                            break;
                        } else if (val.includes('FULL-TIME') || val.includes('FULLTIME') || val.includes('REGULAR')) {
                            appointment = 'Full-Time';
                            break;
                        }
                    }

                    const id = `prof-${cleanName.toLowerCase().replace(/[^a-z]/g, '')}`;
                    facultyMap.set(cleanKey, {
                        id,
                        name: cleanName,
                        base_designation: baseDesignation,
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
                        research_production: researchProd,
                        research_presentation: researchPres,
                        research_publication: researchPub,
                        research_citation: researchCit,
                        extension: extension,
                        nature_of_appointment: appointment,
                        preferred_subjects: preferredSubjects,
                        preferred_times: '',
                        remarks: remarks
                    });
                }
            });

            facultyToInsert.push(...facultyMap.values());
        }

        // ----------------------------------------------------
        // C. Parse Course Curriculum / Offerings
        // (Extracts Program, Year, Semester, Subject, Lec, Lab, Units, Sections)
        // NOTE: Loads are NOT extracted here. Loading is handled in scheduling.
        // ----------------------------------------------------
        const spreadsheetFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.ods'));
        const curriculumFiles = spreadsheetFiles.filter(f => f !== roomFile && f !== facultyFile);

        const normalizeCell = (value) => value === null || value === undefined ? '' : String(value).trim();

        const cleanYearLevel = (text) => {
            const s = String(text || '').toLowerCase();
            if (s.includes('first') || s.includes('1st') || s.includes('1-')) return '1st Year';
            if (s.includes('second') || s.includes('2nd') || s.includes('2-')) return '2nd Year';
            if (s.includes('third') || s.includes('3rd') || s.includes('3-')) return '3rd Year';
            if (s.includes('fourth') || s.includes('4th') || s.includes('4-')) return '4th Year';
            return '1st Year';
        };

        const mapProgramFromText = (text) => {
            const t = String(text || '').toUpperCase();
            if (t.includes('INFORMATION TECHNOLOGY') || t.startsWith('BSIT')) return 'Information Technology';
            if (t.includes('COMPUTER ENGINEERING') || t.startsWith('BSCPE') || t.startsWith('BSCP')) return 'Computer Engineering';
            if (t.includes('HOSPITALITY') || t.startsWith('BSHM')) return 'Hospitality Management';
            if (t.includes('OFFICE ADMINISTRATION') || t.startsWith('BSOA')) return 'Office Administration';
            return 'General Education';
        };

        for (const file of curriculumFiles) {
            const workbook = xlsx.readFile(path.join(dir, file));
            let fileDefaultSemester = '1st Semester';
            if (file.toLowerCase().includes('second') || file.toLowerCase().includes('2nd') || file.toLowerCase().includes('2sem')) {
                fileDefaultSemester = '2nd Semester';
            }

            for (const sheetName of workbook.SheetNames) {
                // If there are duplicate _forposting sheets, skip if base sheet exists in workbook
                if (sheetName.includes('_for') && workbook.SheetNames.includes(sheetName.replace(/_for_?posting/i, ''))) {
                    continue;
                }

                const sheet = workbook.Sheets[sheetName];
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
                if (rows.length < 2) continue;

                let currentProgram = mapProgramFromText(sheetName);
                let currentSemester = fileDefaultSemester;
                let currentYear = '1st Year';
                const isBridgingSheet = sheetName.toUpperCase().includes('BRIDGING');
                if (isBridgingSheet) currentSemester = 'Bridging';
                if (sheetName.toUpperCase().includes('SUMMER')) currentSemester = 'Summer Semester';

                let headerRowIdx = -1;
                let colMapping = {};

                for (let i = 0; i < Math.min(15, rows.length); i++) {
                    const row = rows[i];
                    if (!row || !Array.isArray(row)) continue;

                    row.forEach((cell, idx) => {
                        const cellStr = normalizeCell(cell);
                        if (!cellStr) return;

                        if (cellStr.toUpperCase().includes('BACHELOR OF SCIENCE') || cellStr.toUpperCase().includes('DEPARTMENT')) {
                            currentProgram = mapProgramFromText(cellStr);
                        }
                        if (cellStr.toLowerCase().includes('first semester')) currentSemester = '1st Semester';
                        if (cellStr.toLowerCase().includes('second semester')) currentSemester = '2nd Semester';
                        if (cellStr.toLowerCase().includes('summer')) currentSemester = 'Summer Semester';
                        if (cellStr.toLowerCase().includes('year') && !cellStr.toLowerCase().includes('subject')) {
                            currentYear = cleanYearLevel(cellStr);
                        }

                        const clean = cellStr.toLowerCase().replace(/[^a-z]/g, '');
                        if (clean.includes('subjectcode') || (clean.includes('subject') && clean.includes('code'))) colMapping.subCode = idx;
                        else if (clean.includes('description') || clean.includes('subjectname')) colMapping.desc = idx;
                        else if (clean === 'lec' || clean === 'lecunits' || clean === 'lechours') colMapping.lec = idx;
                        else if (clean === 'lab' || clean === 'labunits' || clean === 'labhours') colMapping.lab = idx;
                        else if (clean.includes('credited') || clean.includes('units') || clean === 'unit') colMapping.units = idx;
                        else if (clean.includes('section')) colMapping.sec = idx;
                        else if (clean.includes('yearlevel')) colMapping.year = idx;
                        else if (clean.includes('program')) colMapping.prog = idx;
                    });

                    if (colMapping.subCode !== undefined && (colMapping.desc !== undefined || colMapping.units !== undefined)) {
                        headerRowIdx = i;
                        break;
                    }
                }

                // Fallback for sheets without explicit header labels (e.g. SUMMER sheets)
                if (headerRowIdx === -1) {
                    for (let i = 0; i < Math.min(5, rows.length); i++) {
                        const r = rows[i];
                        if (r && r[0] && /^[A-Z]{2,7}\s*\d{2,5}/i.test(normalizeCell(r[0]))) {
                            headerRowIdx = 0;
                            colMapping = { subCode: 0, desc: 1, lec: 2, lab: 3, units: 5, sec: 6 };
                            break;
                        }
                    }
                }

                if (headerRowIdx === -1 || colMapping.subCode === undefined) continue;

                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || !Array.isArray(row)) continue;

                    const rowText = row.filter(c => c !== '').join(' ');
                    if (!rowText) continue;

                    // Detect year level change rows (e.g. 'Second Year', 'Third Year', etc.)
                    if (rowText.toLowerCase().includes('first year')) { currentYear = '1st Year'; continue; }
                    if (rowText.toLowerCase().includes('second year')) { currentYear = '2nd Year'; continue; }
                    if (rowText.toLowerCase().includes('third year')) { currentYear = '3rd Year'; continue; }
                    if (rowText.toLowerCase().includes('fourth year')) { currentYear = '4th Year'; continue; }
                    if (rowText.toUpperCase().includes('BACHELOR OF SCIENCE')) {
                        currentProgram = mapProgramFromText(rowText);
                        continue;
                    }

                    if (colMapping.prog !== undefined && row[colMapping.prog]) {
                        currentProgram = mapProgramFromText(normalizeCell(row[colMapping.prog]));
                    }
                    if (colMapping.year !== undefined && row[colMapping.year]) {
                        currentYear = cleanYearLevel(normalizeCell(row[colMapping.year]));
                    }

                    const rawSubCode = normalizeCell(row[colMapping.subCode]);
                    const desc = colMapping.desc !== undefined ? normalizeCell(row[colMapping.desc]) : '';
                    if (!rawSubCode && !desc) continue;
                    if (rawSubCode.toLowerCase().includes('subject') || desc.toLowerCase().includes('description')) continue;

                    const lecVal = colMapping.lec !== undefined ? parseFloat(String(row[colMapping.lec] || 0)) || 0 : 0;
                    const labVal = colMapping.lab !== undefined ? parseFloat(String(row[colMapping.lab] || 0)) || 0 : 0;
                    let unitsVal = colMapping.units !== undefined ? parseFloat(String(row[colMapping.units] || (lecVal + labVal))) : (lecVal + labVal);
                    if (!unitsVal || isNaN(unitsVal)) unitsVal = lecVal + labVal || 3;

                    const subCode = rawSubCode.replace(/\s+/g, ' ');
                    const subjectName = subCode && desc ? `${subCode} - ${desc}` : (subCode || desc);

                    const sectionName = colMapping.sec !== undefined ? normalizeCell(row[colMapping.sec]) : '';
                    if (sectionName) {
                        const secPrefix = sectionName.split(' ')[0].toUpperCase().trim();
                        let secProg = currentProgram;
                        if (secPrefix.startsWith('BSIT')) secProg = 'Information Technology';
                        else if (secPrefix.startsWith('BSCP') || secPrefix.startsWith('BSCPE')) secProg = 'Computer Engineering';
                        else if (secPrefix.startsWith('BSHM')) secProg = 'Hospitality Management';
                        else if (secPrefix.startsWith('BSOA')) secProg = 'Office Administration';

                        const sectionKey = `${secProg}::${sectionName}`;
                        if (!sectionKeysSet.has(sectionKey)) {
                            sectionsToInsert.push({ program_name: secProg, section_name: sectionName });
                            sectionKeysSet.add(sectionKey);
                        }
                    }

                    const subjectKey = `${currentProgram}::${currentYear}::${currentSemester}::${subjectName}`;
                    if (!subjectKeysSet.has(subjectKey)) {
                        subjectsToInsert.push({
                            program_name: currentProgram,
                            year_level: currentYear,
                            semester: currentSemester,
                            subject_name: subjectName,
                            lec_units: lecVal,
                            lab_units: labVal,
                            units: unitsVal,
                            is_bridging: isBridgingSheet ? 1 : 0
                        });
                        subjectKeysSet.add(subjectKey);
                    }
                }
            }
        }

        // ----------------------------------------------------
        // D. Commit to Database inside Transaction
        // ----------------------------------------------------
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
            await trx('rooms').del();
            await trx('rooms').insert(roomsToInsert);
        }
        if (facultyToInsert.length > 0) {
            await trx('faculty').del();
            await trx('faculty').insert(facultyToInsert);
        }
        if (sectionsToInsert.length > 0) {
            await trx('program_sections').del();
            await trx('program_sections').insert(sectionsToInsert);
        }
        if (subjectsToInsert.length > 0) {
            await trx('program_subjects').del();
            await trx('program_subjects').insert(subjectsToInsert);
        }

        // NOTE: LOADS ARE NEVER GENERATED OR MODIFIED DURING FILE IMPORT!
        // Loads are created exclusively during the faculty loading / scheduling process.

        await trx.commit();
        res.json({
            success: true,
            summary: {
                rooms: roomsToInsert.length,
                faculty: facultyToInsert.length,
                sections: sectionsToInsert.length,
                subjects: subjectsToInsert.length,
                loads: 0
            }
        });
    } catch (err) {
        await trx.rollback();
        console.error('Scan and Sync error:', err);
        res.status(500).json({ error: err.message || 'Excel scanning failure' });
    }
});

// Start Server if run directly
if (require.main === module) {
    const PORT = process.env.PORT || 5002;
    app.listen(PORT, () => {
        console.log(`PUP PQ Workload API server running on port ${PORT}`);
    });
}

module.exports = app;
