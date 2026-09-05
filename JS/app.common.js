
const TEMP_DATABASE = window.TEMP_DATABASE || null;
const facultyRegistry = TEMP_DATABASE?.facultyRegistry || [
    {
        id: "prof-jefferson",
        name: "Sir Jefferson",
        baseDesignation: "Instructor I",
        program: "Information Technology",
        employmentType: "Regular",
        classification: "Designee",
        classificationRank: "instructor",
        active: true,
        educationalAttainment: {
            baccalaureate: "BS Information Technology",
            masters: "MSc Computer Science",
            doctorate: "",
            postBaccalaureate: ""
        },
        licenseNumber: "LIC-9134",
        specialization: "Systems Analysis",
        nationalCertificate: "NC II",
        courseHandle: {
            genEd: "Math",
            coreSubject: "IT102",
            professionalSubject: "Software Engineering",
            technicalSubject: "Programming"
        },
        research: { production: "2", presentation: "3", publication: "1", citation: "8" },
        extension: "Community IT Training",
        natureOfAppointment: "Full-time",
        remarks: "In good standing"
    },
    {
        id: "prof-delacruz",
        name: "Dr. Maria Dela Cruz",
        baseDesignation: "Head of Academic Affairs",
        program: "Information Technology",
        employmentType: "Regular",
        classification: "Director",
        classificationRank: "",
        active: true,
        educationalAttainment: {
            baccalaureate: "BS Computer Science",
            masters: "MEd Curriculum",
            doctorate: "PhD Educational Leadership",
            postBaccalaureate: ""
        },
        licenseNumber: "LIC-7201",
        specialization: "Database Systems",
        nationalCertificate: "NC III",
        courseHandle: {
            genEd: "English",
            coreSubject: "DB Systems",
            professionalSubject: "Database Design",
            technicalSubject: "SQL Programming"
        },
        research: { production: "4", presentation: "2", publication: "2", citation: "15" },
        extension: "Research mentorship",
        natureOfAppointment: "Full-time",
        remarks: "Academic leader"
    },
    {
        id: "prof-santos",
        name: "Prof. Ricardo Santos",
        baseDesignation: "Regular Lecturer",
        program: "Computer Engineering",
        employmentType: "Regular",
        classification: "Regular",
        classificationRank: "",
        active: true,
        educationalAttainment: {
            baccalaureate: "BSE Computer Engineering",
            masters: "MEng Electronics",
            doctorate: "",
            postBaccalaureate: ""
        },
        licenseNumber: "LIC-4485",
        specialization: "Microprocessors",
        nationalCertificate: "NC IV",
        courseHandle: {
            genEd: "Physics",
            coreSubject: "Microprocessor Systems",
            professionalSubject: "Embedded Systems",
            technicalSubject: "Circuit Design"
        },
        research: { production: "1", presentation: "1", publication: "0", citation: "2" },
        extension: "Technical workshops",
        natureOfAppointment: "Full-time",
        remarks: "Consistent instructor"
    }
];

// RE-ORGANIZED DESIGNATION RANK SELECTION STRATEGY
const designationOptions = [
    "None (Regular Faculty Line)",
    "Campus Director",
    "Program Chairperson - Information Technology (IT)",
    "Program Chairperson - Hospitality Management (HM)",
    "Program Chairperson - Computer Engineering (COE)",
    "Laboratory Custodian Coordinator",
    "Area Sector Coordinator"
];

// PROFESSOR CLASSIFICATION SYSTEM WITH LOAD DISTRIBUTION RULES
const CLASSIFICATION_SYSTEM = {
    'Designee': {
        ranks: [
            { label: 'Instructor (Mr./Ms.)', value: 'instructor' },
            { label: 'Assistant Professor (Asst. Prof)', value: 'asst_prof' },
            { label: 'Associate Professor (Assoc Prof)', value: 'assoc_prof' },
            { label: 'Professor (Prof)', value: 'prof' },
            { label: 'University Professor (UNIV Prof)', value: 'univ_prof' }
        ],
        loadLimits: {
            'Regular Load': 6,
            'Part-Time Load': 12,
            'Temporary Substitute Load': 'flexible'
        },
        totalMaxLoad: 45,
        minWeeklyLoad: 42
    },
    'Regular': {
        ranks: [
            { label: 'Instructor (Mr./Ms.)', value: 'instructor' },
            { label: 'Assistant Professor (Asst. Prof)', value: 'asst_prof' },
            { label: 'Associate Professor (Assoc Prof)', value: 'assoc_prof' },
            { label: 'Professor (Prof)', value: 'prof' },
            { label: 'University Professor (UNIV Prof)', value: 'univ_prof' }
        ],
        loadLimits: {
            'Regular Load': 15,
            'Part-Time Load': 12,
            'Temporary Substitute Load': 'flexible'
        },
        totalMaxLoad: 45,
        minWeeklyLoad: 42
    },
    'Part-Time': {
        ranks: [
            { label: 'Listing (Lecturer)', value: 'listing' },
            { label: 'Exchange (Lecturer)', value: 'exchange' },
            { label: 'Special (Lecturer)', value: 'special' },
            { label: 'Part-Time (Lecturer)', value: 'part_time' },
            { label: 'Assistant (Lecturer)', value: 'assistant' },
            { label: 'Associate (Lecturer)', value: 'associate' },
            { label: 'Professorial (Lecturer)', value: 'professorial' }
        ],
        loadLimits: {
            'Part-Time Load': 12,
            'Temporary Substitute Load': 'flexible'
        },
        totalMaxLoad: 45,
        minWeeklyLoad: 42
    },
    'Director': {
        ranks: [
            { label: 'Campus Director', value: 'campus_director' }
        ],
        loadLimits: {
            'Regular Load': 3,
            'Part-time Load': 12,
            'Temporary Substitute Load': 'flexible'
        },
        totalMaxLoad: 45,
        minWeeklyLoad: 42
    }
};

// INSTITUTIONAL GLOBAL UNIT LOADING CEILING DATABASE MAP
const workloadDatabase = [
    { facultyId: "prof-jefferson", program: "HM", courseCode: "PATHFIT 1", units: 3 },
    { facultyId: "prof-jefferson", program: "IT", courseCode: "PATHFIT 1", units: 3 },
    { facultyId: "prof-jefferson", program: "COE", courseCode: "PATHFIT 1", units: 3 },
    { facultyId: "prof-jefferson", program: "IT", courseCode: "CC102 (Computer Programming)", units: 3 },
    { facultyId: "prof-delacruz", program: "IT", courseCode: "IT311 (Database Systems)", units: 3 },
    { facultyId: "prof-santos", program: "COE", courseCode: "COE412 (Microprocessor Systems)", units: 4 }
];

const GLOBAL_MAX_LOAD_CAP = 45;

// FIXED INITIAL PARAMETER SETTERS
const State = {
    activeProgram: 'Information Technology',
    subjectSemesterFilter: 'All',
    facultyTypeFilter: 'All',
    facultyFilter: 'all',          // Tracks classification: 'all', 'regular', 'designee', 'part-time'
    facultyStatusFilter: 'all',    // Tracks status toggle: 'all', 'active', 'inactive'
    db: TEMP_DATABASE?.db || {
        schoolYears: ['A.Y. 2024-2025', 'A.Y. 2025-2026', 'A.Y. 2026-2027'],
        rooms: ['Room A101', 'Room B202', 'Lab A', 'Lab B', 'Audio Visual Room'],
        buildings: ['Main Building', 'New Building'],
        programs: {
            'Information Technology': {
                profs: ['Sir Jefferson', 'Dr. Maria Dela Cruz'],
                sections: ['BSIT 1-1', 'BSIT 2-1', 'BSIT 3-1'],
                subjects: {
                    "1st Year": {
                        "1st Semester": [
                            { name: "IT101 - Introduction to Computing", units: 3 },
                            { name: "PATHFIT 1 - Movement Competency Training", units: 2 }
                        ],
                        "2nd Semester": [
                            { name: "IT102 - Computer Programming 1", units: 3 },
                            { name: "IT103 - Discrete Structures", units: 3 }
                        ]
                    },
                    "2nd Year": {
                        "1st Semester": [
                            { name: "IT201 - Data Structures and Algorithms", units: 3 },
                            { name: "IT202 - Object-Oriented Programming", units: 3 }
                        ],
                        "2nd Semester": [
                            { name: "IT203 - Web Systems and Technologies", units: 3 },
                            { name: "IT204 - Computer Architecture and Organization", units: 3 }
                        ],
                        "Summer Term": [
                            { name: "IT-INT1 - Industry Practicum 1", units: 2 }
                        ]
                    },
                    "3rd Year": {
                        "1st Semester": [
                            { name: "IT311 - Database Systems", units: 3 },
                            { name: "IT312 - Software Engineering 1", units: 3 }
                        ],
                        "2nd Semester": [
                            { name: "IT313 - Information Assurance and Security", units: 3 }
                        ]
                    }
                }
            },
            'Computer Engineering': {
                profs: ['Prof. Ricardo Santos'],
                sections: ['COE 3-1', 'COE 4-1'],
                subjects: {
                    "3rd Year": {
                        "1st Semester": [
                            { name: "COE311 - Digital Design", units: 4 }
                        ],
                        "2nd Semester": [
                            { name: "COE221 - Electronics I", units: 3 }
                        ]
                    },
                    "4th Year": {
                        "1st Semester": [
                            { name: "COE412 - Microprocessor Systems", units: 4 }
                        ]
                    }
                }
            },
            'Hospitality Management': {
                profs: ['Prof. Amelia Reyes'],
                sections: ['HM 1-1', 'HM 2-1'],
                subjects: {
                    "1st Year": {
                        "1st Semester": [
                            { name: "HM101 - Food Service Management", units: 3 },
                            { name: "PATHFIT 1 - Movement Competency Training", units: 2 }
                        ]
                    }
                }
            }
        },
        loads: [
            {
                id: 1,
                prof: 'Dr. Maria Dela Cruz',
                sub: 'IT311 - Database Systems',
                units: 3,
                loadType: 'Regular Load',
                sec: 'BSIT 2-1',
                room: 'Room A101',
                building: 'Main Building',
                day: 'Monday',
                time: '08:00 AM - 11:00 AM',
                sy: 'A.Y. 2024-2025',
                program: 'Information Technology'
            },
            {
                id: 2,
                prof: 'Prof. Ricardo Santos',
                sub: 'COE412 - Microprocessor Systems',
                units: 4,
                loadType: 'Regular Load',
                sec: 'COE 4-1',
                room: 'Room B202',
                building: 'New Building',
                day: 'Wednesday',
                time: '10:00 AM - 02:00 PM',
                sy: 'A.Y. 2024-2025',
                program: 'Computer Engineering'
            }
        ],
        noClassDays: {}
    }
};

const Days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// STRICT 30-MINUTE INTERVAL GENERATOR RECONCILIATOR
function generateTimeStarts(start = '07:00 AM', end = '09:00 PM', slotMinutes = 30) {
    const slots = [];
    function toMinutes(t) {
        const [time, period] = t.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
    }
    let s = toMinutes(start);
    const e = toMinutes(end);
    for (let t = s; t <= e; t += slotMinutes) {
        const period = t >= 720 ? 'PM' : 'AM';
        let h = Math.floor(t / 60);
        const m = t % 60;
        if (h === 0) h = 12;
        if (h > 12) h -= 12;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`);
    }
    return slots;
}

const TimeStarts = generateTimeStarts('07:00 AM', '09:00 PM', 30);
const PreferredTimeRanges = [
    '07:00 AM - 09:00 AM',
    '09:30 AM - 11:30 AM',
    '12:00 PM - 02:00 PM',
    '02:30 PM - 04:30 PM',
    '05:00 PM - 07:00 PM',
    '07:30 PM - 09:30 PM'
];

let currentLoadEditId = null;

function getAllSubjectNames() {
    const names = new Set();
    Object.values(State.db.programs || {}).forEach(program => {
        Object.values(program.subjects || {}).forEach(year => {
            Object.values(year || {}).forEach(sem => {
                (sem || []).forEach(sub => {
                    if (sub && sub.name) names.add(sub.name);
                });
            });
        });
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function getPreferredSubjectOptions(selected = '', includeNone = false) {
    const subjects = getAllSubjectNames();
    const selectedArray = Array.isArray(selected)
        ? selected
        : selected ? selected.split(',').map(s => s.trim()).filter(Boolean) : [];

    const options = [];
    if (includeNone) {
        const noneSelected = selectedArray.length === 0;
        options.push(`<option value="" ${noneSelected ? 'selected' : ''}>None</option>`);
    }

    options.push(...subjects.map(name => {
        const isSelected = selectedArray.includes(name);
        return `<option value="${name}" ${isSelected ? 'selected' : ''}>${name}${isSelected ? ' (Preferred)' : ''}</option>`;
    }));

    return options.join('');
}

function getPreferredDayOptions(selected = '') {
    return ['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => `
        <option value="${day}" ${day === selected ? 'selected' : ''}>${day || 'Choose day'}</option>`
    ).join('');
}

function getPreferredTimeOptions(selected = '') {
    return ['','07:00 AM - 09:00 AM','09:30 AM - 11:30 AM','12:00 PM - 02:00 PM','02:30 PM - 04:30 PM','05:00 PM - 07:00 PM','07:30 PM - 09:30 PM'].map(range => `
        <option value="${range}" ${range === selected ? 'selected' : ''}>${range || 'Choose time range'}</option>`
    ).join('');
}

function formatPreferredTime(day, range) {
    if (!day) return '';
    if (!range) return day;
    return `${day} ${range}`;
}

function parsePreferredTimeEntries(preferredTimes) {
    if (!preferredTimes || !preferredTimes.trim()) return [];
    return preferredTimes.split(',').map(item => item.trim()).filter(Boolean);
}

function renderPreferredTimeList(listId, entries = [], hiddenInputId) {
    const listContainer = document.getElementById(listId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!listContainer) return;

    listContainer.innerHTML = entries.map(entry => {
        const [day, ...timeParts] = entry.split(' ');
        const time = timeParts.join(' ');
        return `
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 mr-2 mb-2" data-day="${day}" data-time="${time}">
                <span>${day} ${time}</span>
                <button type="button" class="font-semibold text-slate-500 hover:text-slate-900">×</button>
            </div>`;
    }).join('');

    if (hiddenInput) {
        hiddenInput.value = entries.join(', ');
    }

    listContainer.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            const item = button.closest('[data-day][data-time]');
            if (!item) return;
            item.remove();
            if (hiddenInput) {
                const remaining = Array.from(listContainer.querySelectorAll('[data-day][data-time]'))
                    .map(el => `${el.dataset.day} ${el.dataset.time}`);
                hiddenInput.value = remaining.join(', ');
            }
        });
    });
}

function addPreferredTimeEntry(daySelectId, timeSelectId, listId, hiddenInputId) {
    const day = document.getElementById(daySelectId)?.value;
    const range = document.getElementById(timeSelectId)?.value;
    const listContainer = document.getElementById(listId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!day || !range || !listContainer || !hiddenInput) return;

    const entry = `${day} ${range}`;
    const existing = Array.from(listContainer.querySelectorAll('[data-day][data-time]')).map(el => `${el.dataset.day} ${el.dataset.time}`);
    if (existing.includes(entry)) return;

    const item = document.createElement('div');
    item.className = 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 mr-2 mb-2';
    item.dataset.day = day;
    item.dataset.time = range;
    item.innerHTML = `<span>${entry}</span><button type="button" class="font-semibold text-slate-500 hover:text-slate-900">×</button>`;
    const removeButton = item.querySelector('button');
    removeButton?.addEventListener('click', () => {
        item.remove();
        const remaining = Array.from(listContainer.querySelectorAll('[data-day][data-time]'))
            .map(el => `${el.dataset.day} ${el.dataset.time}`);
        hiddenInput.value = remaining.join(', ');
    });
    listContainer.appendChild(item);
    hiddenInput.value = existing.concat(entry).join(', ');
}

function populateNewFacultyPreferredDropdowns() {
    const subjectSelect = document.getElementById('new-faculty-pref-subjects');
    if (subjectSelect) {
        subjectSelect.innerHTML = getPreferredSubjectOptions('');
    }
    const daySelect = document.getElementById('new-faculty-pref-day');
    if (daySelect) {
        daySelect.innerHTML = getPreferredDayOptions('');
    }
    const timeSelect = document.getElementById('new-faculty-pref-times');
    if (timeSelect) {
        timeSelect.innerHTML = getPreferredTimeOptions('');
    }
    renderPreferredTimeList('new-faculty-pref-time-list', [], 'new-faculty-pref-times-hidden');
    const addButton = document.getElementById('new-faculty-pref-time-add');
    if (addButton) {
        addButton.onclick = () => addPreferredTimeEntry('new-faculty-pref-day', 'new-faculty-pref-times', 'new-faculty-pref-time-list', 'new-faculty-pref-times-hidden');
    }
}

function parsePreferredTimeComponents(preferredTimes = '') {
    const entries = parsePreferredTimeEntries(preferredTimes);
    if (entries.length === 0) return { day: '', time: '' };
    const [firstEntry] = entries;
    const [day, ...timeParts] = firstEntry.split(' ');
    return { day: day || '', time: timeParts.join(' ') || '' };
}

function populateFacultyEditPreferredDropdowns(faculty) {
    const subjectSelect = document.getElementById('faculty-update-pref-subjects');
    if (subjectSelect) subjectSelect.innerHTML = getPreferredSubjectOptions(faculty.preferredSubjects || '', true);

    const { day, time } = parsePreferredTimeComponents(faculty.preferredTimes || '');
    const daySelect = document.getElementById('faculty-update-pref-day');
    if (daySelect) daySelect.innerHTML = getPreferredDayOptions(day);
    const timeSelect = document.getElementById('faculty-update-pref-times');
    if (timeSelect) timeSelect.innerHTML = getPreferredTimeOptions(time);

    renderPreferredTimeList('faculty-update-pref-time-list', parsePreferredTimeEntries(faculty.preferredTimes || ''), 'faculty-update-pref-times-hidden');
    const addButton = document.getElementById('faculty-update-pref-time-add');
    if (addButton) {
        addButton.onclick = () => addPreferredTimeEntry('faculty-update-pref-day', 'faculty-update-pref-times', 'faculty-update-pref-time-list', 'faculty-update-pref-times-hidden');
    }
}

function parseTimeStr(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

function formatTime(minutes) {
    const normalizedMinutes = minutes % 1440;
    const period = normalizedMinutes >= 720 ? 'PM' : 'AM';
    let h = Math.floor(normalizedMinutes / 60);
    const m = normalizedMinutes % 60;
    h = h % 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

// STRICT ALIGNED SYSTEM TITLE RESOLVER FOR CATEGORIZATION MAPS
function getTitleLabel(f) {
    if (!f) return 'PROFESSOR';
    const empType = (f.employmentType || '').toUpperCase();
    const designation = (f.baseDesignation || '').toUpperCase();

    // Condition 1: Rule for Part-Timers (Always output exactly "PROFESSOR")
    if (empType.includes('PART-TIME') || empType.includes('PARTTIME')) {
        return 'PROFESSOR';
    }

    // Condition 2: Regular & Designee parsing matrices matches
    if (designation.includes('UNIVERSITY PROFESSOR') || designation.includes('UNIV. PROF')) return 'UNIV. PROF';
    if (designation.includes('ASSOCIATE PROFESSOR') || designation.includes('ASSC. PROF')) return 'ASSC. PROF';
    if (designation.includes('ASSISTANT PROFESSOR') || designation.includes('ASST. PROF')) return 'ASST. PROF';
    if (designation.includes('PROFESSOR') || designation.includes('PROF')) return 'PROF';
    if (designation.includes('INSTRUCTOR')) return 'INSTRUCTOR';

    return 'INSTRUCTOR'; // System structural fallback default
}

// CLASSIFICATION LOAD MANAGEMENT SYSTEM
function getLoadLimitsForFaculty(faculty) {
    if (!faculty || !faculty.classification) return null;
    const classification = CLASSIFICATION_SYSTEM[faculty.classification];
    if (!classification) return null;
    return {
        loadLimits: classification.loadLimits,
        totalMaxLoad: classification.totalMaxLoad
    };
}

function getAvailableLoadTypes(faculty) {
    if (!faculty) return [];
    if (faculty.classification === 'Part-Time') {
        return ['Part-Time Load', 'Temporary Substitute Load'];
    }
    return Object.keys(CLASSIFICATION_SYSTEM[faculty.classification]?.loadLimits || {});
}

// canAssignLoad is defined near renderLoadTable - see below


function getClassificationRankLabel(classification, rank) {
    const config = CLASSIFICATION_SYSTEM[classification];
    if (!config || !config.ranks) return rank;
    const rankObj = config.ranks.find(r => r.value === rank);
    return rankObj ? rankObj.label : rank;
}


function getTimeRange(start, units) {
    const startMinutes = parseTimeStr(start);
    const endMinutes = startMinutes + units * 60;
    return `${start} - ${formatTime(endMinutes)}`;
}

function parseTimeRange(range) {
    let start = parseTimeStr(`${range.split(' - ')[0]}`);
    let end = parseTimeStr(`${range.split(' - ')[1]}`);
    
    if (end === 0 && start > 0) {
        end = 1440;
    }
    if (end < start) {
        end += 1440;
    }
    return { start, end };
}

function rangesOverlap(a, b) {
    return a.start < b.end && b.start < a.end;
}

function findConflict(day, target, prof, room, sec, ignoreLoadId = null) {
    if (!day || !target || !prof || !room || !sec) return null;
    return State.db.loads.find(l => {
        if (ignoreLoadId && l.id === ignoreLoadId) return false;
        if (l.day !== day) return false;
        const other = parseTimeRange(l.time);
        if (!rangesOverlap(target, other)) return false;
        if (l.prof === prof) return true;
        if (l.room === room) return true;
        if (l.sec === sec) return true;
        return false;
    }) || null;
}

function getRoomsByBuilding(building) {
    if (!building || building === 'All') return getAllRoomNames();
    return State.db.rooms.filter(room => {
        if (typeof room === 'string') {
            return false;
        }
        return room.building === building;
    }).map(room => room.name);
}

function getAllRoomNames() {
    return State.db.rooms.map(room => typeof room === 'string' ? room : room.name);
}

function getAuthHeaders() {
    const userStr = sessionStorage.getItem('loggedInUser');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.token) {
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                };
            }
        } catch (e) { }
    }
    return { 'Content-Type': 'application/json' };
}

async function persistState() {
    State.db.facultyRegistry = facultyRegistry;
    localStorage.setItem('activeProgram', State.activeProgram);
    localStorage.setItem('schedulerData', JSON.stringify({ ...State.db, facultyRegistry }));

    const activeAcademicYear = State.db.schoolYears?.[0] || '';
    if (activeAcademicYear) {
        localStorage.setItem('activeAcademicYear', activeAcademicYear);
    }
    
    // The bulk persist-state backend endpoint has been removed for security and data integrity.
    // The frontend should now be updated to make atomic API calls (e.g., POST /api/rooms) 
    // immediately when data is modified in the UI.
}

async function updateFacultyAPI(facultyObj) {
    try {
        const response = await fetch('http://localhost:5000/api/faculty', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(facultyObj)
        });
        if (!response.ok) {
            console.error('Failed to update faculty via API');
        }
    } catch (err) {
        console.error('API Error:', err);
    }
}
async function loadSavedState() {
    const savedAcademicYear = localStorage.getItem('activeAcademicYear');
    const savedProgram = localStorage.getItem('activeProgram');

    try {
        const response = await fetch('http://localhost:5000/api/initial-state', {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            State.db.schoolYears = data.db.schoolYears || State.db.schoolYears;
            State.db.rooms = data.db.rooms || State.db.rooms;
            State.db.buildings = data.db.buildings || State.db.buildings;
            State.db.programs = data.db.programs || State.db.programs;
            State.db.loads = data.db.loads || State.db.loads;
            State.db.noClassDays = data.db.noClassDays || State.db.noClassDays;

            if (savedAcademicYear && State.db.schoolYears.includes(savedAcademicYear)) {
                State.db.schoolYears = [savedAcademicYear, ...State.db.schoolYears.filter(sy => sy !== savedAcademicYear)];
            }

            // Restore faculty registry with any new faculty that was added
            if (data.facultyRegistry && Array.isArray(data.facultyRegistry)) {
                facultyRegistry.splice(0, facultyRegistry.length, ...data.facultyRegistry);
            }
        }
    } catch (error) {
        console.warn('Unable to load database state, using local fallback', error);

        // Fallback to local storage if API is down
        const saved = localStorage.getItem('schedulerData');
        if (saved) {
            try {
                const savedData = JSON.parse(saved);
                State.db.schoolYears = savedData.schoolYears || State.db.schoolYears;
                State.db.rooms = savedData.rooms || State.db.rooms;
                State.db.buildings = savedData.buildings || State.db.buildings;
                State.db.programs = savedData.programs || State.db.programs;
                State.db.loads = savedData.loads || State.db.loads;
                State.db.noClassDays = savedData.noClassDays || State.db.noClassDays;
                if (savedData.facultyRegistry && Array.isArray(savedData.facultyRegistry)) {
                    facultyRegistry.splice(0, facultyRegistry.length, ...savedData.facultyRegistry);
                }
            } catch (e) {
                console.warn('Unable to parse fallback saved scheduler data', e);
            }
        }
    }

    if (savedAcademicYear && State.db.schoolYears.includes(savedAcademicYear)) {
        State.db.schoolYears = [savedAcademicYear, ...State.db.schoolYears.filter(sy => sy !== savedAcademicYear)];
    }

    if (savedProgram && State.db.programs[savedProgram]) {
        State.activeProgram = savedProgram;
    }
}

function showBanner(message, type = 'info', timeout = 4000) {
    try {
        let existing = document.getElementById('app-banner');
        if (existing) existing.remove();
        const banner = document.createElement('div');
        banner.id = 'app-banner';
        const base = 'fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-3xl w-[90%] rounded-2xl p-3 shadow-lg text-sm font-medium';
        const color = type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-slate-50 text-slate-800 border border-slate-200';
        banner.className = `${base} ${color}`;
        banner.innerText = message;
        document.body.appendChild(banner);
        setTimeout(() => { banner.classList.add('opacity-0'); setTimeout(() => banner.remove(), 300); }, timeout);
    } catch (e) { }
}

function showErrorModal(title, message) {
    const modalId = 'dynamic-error-modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
    
    overlay.innerHTML = `
        <div class="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden scale-95 transition-transform duration-300 relative">
            <div class="p-10 text-center">
                <div class="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 mb-4">${title}</h3>
                <p class="text-lg text-gray-600 leading-relaxed">${message}</p>
                <div class="mt-8">
                    <button onclick="document.getElementById('${modalId}').remove()" class="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-base font-bold transition shadow-md">
                        Understood
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Trigger animations
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        overlay.querySelector('div').classList.remove('scale-95');
    });
}

function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required.' };
    }
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long.' };
    }
    return { valid: true };
}

const LOGIN_LOCK_INFO_KEY = 'loginLockInfo';
const MAX_FAILED_LOGINS = 3;
const LOGIN_LOCK_DURATION_MS = 10000;

function getLoginLockInfo() {
    const raw = sessionStorage.getItem(LOGIN_LOCK_INFO_KEY);
    if (!raw) return { failedAttempts: 0, lockoutUntil: 0 };
    try {
        const info = JSON.parse(raw);
        return {
            failedAttempts: Number(info.failedAttempts || 0),
            lockoutUntil: Number(info.lockoutUntil || 0)
        };
    } catch (e) {
        return { failedAttempts: 0, lockoutUntil: 0 };
    }
}

function setLoginLockInfo(info) {
    sessionStorage.setItem(LOGIN_LOCK_INFO_KEY, JSON.stringify(info));
}

function resetLoginLockInfo() {
    sessionStorage.removeItem(LOGIN_LOCK_INFO_KEY);
}

function getLoginElements() {
    return {
        button: document.getElementById('login-button'),
        username: document.getElementById('login-user'),
        password: document.getElementById('login-pass'),
        error: document.getElementById('login-error')
    };
}

function renderLoginLockState() {
    const info = getLoginLockInfo();
    const now = Date.now();
    const { button, username, password, error } = getLoginElements();
    if (info.lockoutUntil && info.lockoutUntil > now) {
        const secondsLeft = Math.ceil((info.lockoutUntil - now) / 1000);
        if (button) button.disabled = true;
        if (username) username.disabled = true;
        if (password) password.disabled = true;
        if (error) {
            error.innerText = `Too many failed attempts. Try again in ${secondsLeft} second${secondsLeft === 1 ? '' : 's'}.`;
            error.classList.remove('hidden');
        }
        window.setTimeout(renderLoginLockState, 500);
        return;
    }

    if (button) button.disabled = false;
    if (username) username.disabled = false;
    if (password) password.disabled = false;
    if (info.lockoutUntil) {
        resetLoginLockInfo();
    }
    if (error) {
        error.classList.add('hidden');
    }
}

function recordLoginFailure(message) {
    const info = getLoginLockInfo();
    info.failedAttempts = (info.failedAttempts || 0) + 1;
    if (info.failedAttempts >= MAX_FAILED_LOGINS) {
        info.lockoutUntil = Date.now() + LOGIN_LOCK_DURATION_MS;
    }
    setLoginLockInfo(info);
    renderLoginLockState();
    const { error } = getLoginElements();
    if (error) {
        if (info.lockoutUntil && info.lockoutUntil > Date.now()) {
            error.innerText = `Too many failed attempts. Login locked for ${Math.ceil(LOGIN_LOCK_DURATION_MS / 1000)} seconds.`;
        } else {
            error.innerText = `${message} (${info.failedAttempts}/${MAX_FAILED_LOGINS})`;
        }
        error.classList.remove('hidden');
    }
}

async function attemptLogin() {
    const user = document.getElementById('login-user')?.value.trim();
    const pass = document.getElementById('login-pass')?.value.trim();
    const errMsg = document.getElementById('login-error');

    const lockInfo = getLoginLockInfo();
    if (lockInfo.lockoutUntil && lockInfo.lockoutUntil > Date.now()) {
        renderLoginLockState();
        return;
    }

    if (!user || !pass) {
        if (errMsg) {
            errMsg.innerText = "Please enter both username and password.";
            errMsg.classList.remove('hidden');
        }
        return;
    }

    const passwordValidation = validatePassword(pass);
    if (!passwordValidation.valid) {
        recordLoginFailure(passwordValidation.message);
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: user, password: pass })
        });

        if (response.ok) {
            const data = await response.json();
            sessionStorage.setItem('loggedInUser', JSON.stringify({
                username: data.username,
                displayName: data.displayName,
                role: data.role,
                token: data.token
            }));
            resetLoginLockInfo();
            if (errMsg) errMsg.classList.add('hidden');
            window.location.href = 'dashboard.html';
        } else {
            const data = await response.json();
            recordLoginFailure(data.error || "Invalid username or password.");
        }
    } catch (err) {
        console.error('Login request failed', err);
        recordLoginFailure('Unable to login. Please try again later.');
    }
}

function openForgotPasswordModal() {
    const intro = 'Forgot Password\n\nTo reset your password, enter your Professor ID, username, and a new 4-8 character alphanumeric password.';
    alert(intro);

    const professorId = window.prompt('Professor ID (e.g. PUP-TEST-001):');
    if (!professorId) return;

    const username = window.prompt('Username:');
    if (!username) return;

    const newPassword = window.prompt('New password (4-8 letters and numbers only):');
    if (!newPassword) return;

    const confirmPassword = window.prompt('Confirm new password:');
    if (!confirmPassword) return;

    if (newPassword !== confirmPassword) {
        alert('New password and confirmation do not match. Please try again.');
        return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }

    fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ professorId: professorId.trim(), username: username.trim(), newPassword })
    })
    .then(async response => {
        const data = await response.json();
        if (response.ok) {
            alert(data.message || 'Password reset successful.');
        } else {
            alert(data.error || 'Unable to reset password.');
        }
    })
    .catch(err => {
        console.error('Forgot password request failed', err);
        alert('Unable to reset password right now. Try again later.');
    });
}

function logout() {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
}

function updateSidebarUser() {
    const userStr = sessionStorage.getItem('loggedInUser');
    let role = 'User';
    let name = 'Academic Aide';

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            role = user.role || 'User';
            name = user.displayName || user.username || 'Academic Aide';
        } catch (e) { }
    }

    const aside = document.querySelector('aside');
    if (aside) {
        const divs = aside.querySelectorAll('div');
        const userBlock = Array.from(divs).find(d => d.className.includes('bg-[#710000]'));
        if (userBlock) {
            const paragraphs = userBlock.querySelectorAll('p');
            if (paragraphs.length >= 2) {
                paragraphs[0].innerText = role;
                paragraphs[1].innerText = name;
            }
            userBlock.classList.add('hover:bg-[#5a0000]', 'cursor-pointer');
            userBlock.onclick = openChangeCredentialsModal;
        }
    }
}

function openChangeCredentialsModal() {
    const userStr = sessionStorage.getItem('loggedInUser');
    let currentUsername = 'aide_pq';
    if (userStr) {
        try {
            currentUsername = JSON.parse(userStr).username;
        } catch (e) { }
    }

    const body = `
        <div id="change-credentials-error" class="hidden mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-2xl text-xs"></div>
        <div class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">New Username</label>
                <input id="cred-new-username" type="text" class="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none" value="${currentUsername}">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Current Password</label>
                <input id="cred-current-password" type="password" class="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none" placeholder="Enter current password to verify">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">New Password (Leave blank to keep current)</label>
                <input id="cred-new-password" type="password" class="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none" placeholder="Enter new password">
            </div>
        </div>
    `;

    openModal({
        title: 'Change Account Credentials',
        body: body,
        submitLabel: 'Update Credentials',
        onSubmit: async () => {
            const newUsername = document.getElementById('cred-new-username')?.value.trim();
            const currentPassword = document.getElementById('cred-current-password')?.value;
            const newPassword = document.getElementById('cred-new-password')?.value;
            const errorDiv = document.getElementById('change-credentials-error');

            if (!newUsername || !currentPassword) {
                if (errorDiv) {
                    errorDiv.innerText = 'Username and Current Password are required.';
                    errorDiv.classList.remove('hidden');
                }
                return;
            }

            try {
                const response = await fetch('http://localhost:5000/api/change-credentials', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        currentUsername,
                        newUsername,
                        currentPassword,
                        newPassword
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Preserve the token
                    let currentToken = '';
                    try {
                        const userStr = sessionStorage.getItem('loggedInUser');
                        if (userStr) currentToken = JSON.parse(userStr).token;
                    } catch(e) {}
                    
                    sessionStorage.setItem('loggedInUser', JSON.stringify({
                        username: data.username,
                        displayName: data.displayName,
                        role: data.role || 'Academic Aide',
                        token: currentToken
                    }));
                    closeModal();
                    showBanner('Credentials updated successfully!', 'success');
                    updateSidebarUser();
                } else {
                    const data = await response.json();
                    if (errorDiv) {
                        errorDiv.innerText = data.error || 'Failed to update credentials.';
                        errorDiv.classList.remove('hidden');
                    }
                }
            } catch (err) {
                console.error(err);
                if (errorDiv) {
                    errorDiv.innerText = 'Connection to backend API failed.';
                    errorDiv.classList.remove('hidden');
                }
            }
        }
    });
}

function initializeSystemModules() {
    lucide.createIcons();
    populateFacultyDropdowns();
    populateFacultyProfileDropdown();
    applyQuerySelections();
    attachProgramButtonHandlers();
    renderSYDropdown();
    setSubjectSemesterFilter(State.subjectSemesterFilter);

    // Reset our matching custom filter button visual classes cleanly on boot
    filterFacultyClass(State.facultyFilter || 'all');
    filterFacultyStatus(State.facultyStatusFilter || 'all');

    refreshManagementLists();
    renderLoadTable();
    updateSectionDropdowns();
    updateRoomDropdowns();
    updateFacultyWorkloadDropdown();
    renderRoomSchedulePreview();
    renderPageSections();
}

function setSubjectSemesterFilter(value) {
    State.subjectSemesterFilter = value;
    refreshManagementLists();
}


function refreshManagementLists() {
    const progLabel = document.getElementById('current-prog-label');
    if (progLabel) progLabel.innerText = State.activeProgram;
}

function calculateCumulativeLoadHours(facultyName) {
    // Cross-program total aggregation logic checks safely mapping hours natively against database structures
    return State.db.loads
        .filter(item => item.prof === facultyName)
        .reduce((total, item) => total + (item.units || 0), 0);
}

function renderWorkloadMatrix() {
    const tableBody = document.getElementById('workload-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    State.db.loads.forEach(loadItem => {
        const globalRunningTotalLoad = calculateCumulativeLoadHours(loadItem.prof);
        const faculty = facultyRegistry.find(f => f.name === loadItem.prof);
        const limits = faculty ? getLoadLimitsForFaculty(faculty) : null;
        const maxLoad = limits ? limits.totalMaxLoad : GLOBAL_MAX_LOAD_CAP;
        const isOverLimit = globalRunningTotalLoad > maxLoad;
        const progressPercent = (globalRunningTotalLoad / maxLoad) * 100;
        const progressColor = isOverLimit ? 'bg-red-600' : (progressPercent > 80 ? 'bg-orange-500' : 'bg-green-600');

        const tableRow = document.createElement('tr');
        tableRow.className = 'hover:bg-gray-50/70 transition-colors';
        tableRow.innerHTML = `
            <td class="p-4">
                <div class="font-semibold text-gray-950">${loadItem.prof}</div>
                <div class="text-[11px] text-gray-400">${loadItem.loadType || 'Regular Load'}</div>
                ${faculty ? `<div class="text-[10px] text-gray-500 mt-0.5">📋 ${faculty.classification}</div>` : ''}
            </td>
            <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">${loadItem.program} Department</span></td>
            <td class="p-4 font-mono text-xs text-gray-700 font-semibold">${loadItem.sub}</td>
            <td class="p-4 text-center font-bold text-gray-900">${loadItem.units || 0} Units</td>
            <td class="p-4">
                <div class="flex flex-col space-y-1">
                    <div class="text-xs font-medium text-gray-600">Load: <span class="text-maroon font-bold">${globalRunningTotalLoad}</span> / <span class="font-semibold">${maxLoad} units max</span></div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5 max-w-[200px]"><div class="${progressColor} h-1.5 rounded-full" style="width: ${Math.min(progressPercent, 100)}%"></div></div>
                    ${isOverLimit ? '<div class="text-[10px] text-red-600 font-semibold">⚠️ EXCEEDS LIMIT</div>' : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(tableRow);
    });
}

// PROGRAM WORKFLOW EXTENSION FILTER FUNCTION
// Add these status tracking fields at the top of your State object inside app.js if they don't exist
State.facultyFilter = 'all';       // Tracks classification (all, regular, designee, part-time)
State.facultyStatusFilter = 'all'; // Tracks state toggle (all, active, inactive)

// REWRITTEN INTERSECTING FILTERS MANAGEMENT 
function filterFacultyClass(classMode) {
    State.facultyFilter = classMode;
    const buttons = {
        'all': document.getElementById('btn-filter-all'),
        'regular': document.getElementById('btn-filter-regular'),
        'designee': document.getElementById('btn-filter-designee'),
        'part-time': document.getElementById('btn-filter-parttime')
    };
    Object.keys(buttons).forEach(key => {
        if (!buttons[key]) return;
        buttons[key].className = "px-3 py-1.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all";
    });
    if (buttons[classMode]) {
        buttons[classMode].className = "px-3 py-1.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-sm transition-all";
    }
    renderProgramResources();
}

function filterFacultyStatus(statusMode) {
    State.facultyStatusFilter = statusMode;
    const buttons = {
        'all': document.getElementById('btn-status-all'),
        'active': document.getElementById('btn-status-active'),
        'inactive': document.getElementById('btn-status-inactive')
    };
    Object.keys(buttons).forEach(key => {
        if (!buttons[key]) return;
        // Turn unselected buttons into standard gray style text
        buttons[key].className = "px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-transparent transition-all";
    });
    if (buttons[statusMode]) {
        // Highlight the clicked status button with a white capsule pill background
        buttons[statusMode].className = "px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-slate-800 shadow-xs transition-all";
    }
    renderProgramResources();
}

// PROGRAM RESOURCES RENDERING ENGINE (INTERSECTING MATRIX WITH GROUPS)
// PROGRAM RESOURCES RENDERING ENGINE (INTERSECTING MATRIX WITH GROUPS)
// PROGRAM RESOURCES RENDERING ENGINE (INTERSECTING MATRIX WITH GROUPS)
function renderProgramResources() {
    const program = State.db.programs[State.activeProgram] || { profs: [], sections: [], subjects: {} };
    const facultyObjs = facultyRegistry.filter(f => {
        if (!f.program) return false;
        const programs = f.program.split(',').map(p => p.trim());
        return programs.includes(State.activeProgram);
    });

    const facultyCountEl = document.getElementById('resource-faculty-count');
    const subjectCountEl = document.getElementById('resource-subject-count');
    const sectionCountEl = document.getElementById('resource-section-count');

    if (facultyCountEl) facultyCountEl.innerText = facultyObjs.length;
    if (sectionCountEl) sectionCountEl.innerText = program.sections ? program.sections.length : 0;
    if (subjectCountEl) {
        let totalCount = 0;
        if (program.subjects && typeof program.subjects === 'object' && !Array.isArray(program.subjects)) {
            Object.values(program.subjects).forEach(yearLvl => {
                Object.values(yearLvl).forEach(semArr => {
                    if (Array.isArray(semArr)) totalCount += semArr.length;
                });
            });
        }
        subjectCountEl.innerText = totalCount;
    }

    if (document.getElementById('resource-program-name')) {
        document.getElementById('resource-program-name').innerText = State.activeProgram;
    }

    const facultyList = document.getElementById('resource-faculty-list');
    if (facultyList) {
        facultyList.innerHTML = '';

        // INTERSECTING MATRIX FILTER LOGIC
        let displayedStaff = [...facultyObjs];

        // Rule 1: Filter on Job Classification Mapping
        if (State.facultyFilter === 'part-time') {
            displayedStaff = displayedStaff.filter(f => f.employmentType.toLowerCase().includes('part'));
        } else if (State.facultyFilter === 'regular') {
            displayedStaff = displayedStaff.filter(f => f.employmentType === 'Regular' && (f.baseDesignation.includes('Instructor') || f.baseDesignation.includes('Lecturer') || f.baseDesignation.includes('Professor')));
        } else if (State.facultyFilter === 'designee') {
            displayedStaff = displayedStaff.filter(f => f.employmentType === 'Regular' && !f.baseDesignation.includes('Instructor') && !f.baseDesignation.includes('Lecturer'));
        }

        // Rule 2: Intersect with Status Map Toggles
        if (State.facultyStatusFilter === 'active') {
            displayedStaff = displayedStaff.filter(f => f.active !== false);
        } else if (State.facultyStatusFilter === 'inactive') {
            displayedStaff = displayedStaff.filter(f => f.active === false);
        }

        const createCard = (f) => {
            const card = document.createElement('div');
            const isProfInactive = f.active === false;
            card.className = `rounded-2xl bg-white p-3 border mb-2 transition-all flex flex-col gap-1.5 ${isProfInactive ? 'opacity-60 border-dashed border-slate-200 bg-slate-50/50' : 'border-slate-100 shadow-xs hover:border-slate-300 cursor-pointer'}`;

            const statusBadge = isProfInactive
                ? `<span class="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-50 text-red-600 border border-red-100">Inactive</span>`
                : `<span class="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">Active</span>`;

            card.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <div class="font-bold text-slate-900 text-xs">${f.name}</div>
                        <div class="text-[10px] text-slate-400 mt-0.5">${getTitleLabel(f)} • ${f.baseDesignation}</div>
                    </div>
                    <div class="flex flex-col items-end gap-1 flex-shrink-0">
                        <div class="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 border text-slate-600 font-medium">${f.employmentType}</div>
                        ${statusBadge}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => selectFaculty(f.id));
            return card;
        };

        const activeStaff = displayedStaff.filter(f => f.active !== false);
        const inactiveStaff = displayedStaff.filter(f => f.active === false);

        if (activeStaff.length > 0) {
            const block = document.createElement('div'); block.className = "mb-4";
            block.innerHTML = `<div class="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">🟢 Active (${activeStaff.length})</div>`;
            activeStaff.forEach(f => block.appendChild(createCard(f)));
            facultyList.appendChild(block);
        }
        if (inactiveStaff.length > 0) {
            const block = document.createElement('div'); block.className = "mb-2";
            block.innerHTML = `<div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">⚫ Inactive (${inactiveStaff.length})</div>`;
            inactiveStaff.forEach(f => block.appendChild(createCard(f)));
            facultyList.appendChild(block);
        }
        if (displayedStaff.length === 0) {
            facultyList.innerHTML = '<div class="text-gray-400 italic text-xs p-4 text-center">No matching records found.</div>';
        }
    }

    // Curriculum Rendering Handler Pipeline
    const subjectList = document.getElementById('resource-subject-list');
    if (subjectList) {
        subjectList.innerHTML = '';
        if (program.subjects && Object.keys(program.subjects).length > 0) {
            const yearsToRender = State.resourceYearLevel ? [State.resourceYearLevel] : Object.keys(program.subjects).sort();
            yearsToRender.forEach(yearKey => {
                if (!program.subjects[yearKey]) return;
                const yearSection = document.createElement('div'); yearSection.className = 'mb-4 space-y-2';
                yearSection.innerHTML = `<h4 class="text-xs font-bold text-red-900 tracking-wider uppercase border-b pb-1 mb-2">${yearKey} Hierarchy</h4>`;
                const semKeys = State.resourceSemester ? [State.resourceSemester] : Object.keys(program.subjects[yearKey] || {});
                semKeys.forEach(semKey => {
                    if (!program.subjects[yearKey][semKey]) return;
                    const semContainer = document.createElement('div'); semContainer.className = 'pl-2 space-y-1.5';
                    semContainer.innerHTML = `<div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">${semKey}</div>`;
                    program.subjects[yearKey][semKey].forEach(sub => {
                        const subRow = document.createElement('div');
                        subRow.className = 'rounded-2xl bg-slate-50 p-3 flex items-center justify-between text-xs hover:bg-slate-100 transition-all cursor-pointer';
                        subRow.setAttribute('role', 'button');
                        subRow.setAttribute('tabindex', '0');
                        subRow.setAttribute('title', 'Click to edit subject');
                        subRow.innerHTML = `
                            <span class="font-medium text-gray-800 flex-1">${sub.name} <span class="text-slate-400 font-normal">(${sub.units} units)</span></span>
                            <div class="flex items-center gap-2">
                                <button type="button" class="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700" onclick="event.stopPropagation(); editSubject('${(State.activeProgram||'').replace(/'/g,"\\'")}','${yearKey.replace(/'/g,"\\'")}','${semKey.replace(/'/g,"\\'")}','${sub.name.replace(/'/g,"\\'")}','${sub.units}')">Edit</button>
                                <button type="button" class="ml-1 flex-shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition" onclick="event.stopPropagation(); deleteSubjectWithVerification('${(State.activeProgram||'').replace(/'/g,"\\'")}','${yearKey.replace(/'/g,"\\'")}','${semKey.replace(/'/g,"\\'")}','${sub.name.replace(/'/g,"\\'")}')" title="Remove subject">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        `;
                        subRow.onclick = () => {
                            editSubject((State.activeProgram || ''), yearKey, semKey, sub.name, sub.units);
                        };
                        subRow.onkeydown = (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                editSubject((State.activeProgram || ''), yearKey, semKey, sub.name, sub.units);
                            }
                        };
                        semContainer.appendChild(subRow);
                    });
                    yearSection.appendChild(semContainer);
                });
                subjectList.appendChild(yearSection);
            });
        }
    }

    // Active Section List Handling Pipe
    const sectionList = document.getElementById('resource-section-list');
    if (sectionList) {
        sectionList.innerHTML = (program.sections || []).map(section => `
            <div class="rounded-3xl bg-slate-50 p-4 flex items-center justify-between">
                <span class="text-xs font-medium text-slate-800">${section}</span>
                <button class="text-slate-400 hover:text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button>
            </div>
        `).join('') || '<div class="text-gray-500 italic text-xs p-4">No active sections mapped yet.</div>';
    }
}

// NEW FUNCTION: GENERATES CATEGORIZED, CLEAN PRINT OUT PREVIEWS
function printFilteredFaculty() {
    const facultyObjs = facultyRegistry.filter(f => {
        if (!f.program) return false;
        const programs = f.program.split(',').map(p => p.trim());
        return programs.includes(State.activeProgram);
    });
    let filtered = [...facultyObjs];

    if (State.facultyFilter === 'part-time') {
        filtered = filtered.filter(f => f.employmentType.toLowerCase().includes('part'));
    } else if (State.facultyFilter === 'regular') {
        filtered = filtered.filter(f => f.employmentType === 'Regular' && (f.baseDesignation.includes('Instructor') || f.baseDesignation.includes('Lecturer') || f.baseDesignation.includes('Professor')));
    } else if (State.facultyFilter === 'designee') {
        filtered = filtered.filter(f => f.employmentType === 'Regular' && !f.baseDesignation.includes('Instructor') && !f.baseDesignation.includes('Lecturer'));
    }

    if (State.facultyStatusFilter === 'active') {
        filtered = filtered.filter(f => f.active !== false);
    } else if (State.facultyStatusFilter === 'inactive') {
        filtered = filtered.filter(f => f.active === false);
    }

    const activeList = filtered.filter(f => f.active !== false);
    const inactiveList = filtered.filter(f => f.active === false);

    const buildTableRows = (list) => list.map(f => `
        <tr>
            <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">${f.name}</td>
            <td style="padding:8px; border:1px solid #ddd;">${getTitleLabel(f)}</td>
            <td style="padding:8px; border:1px solid #ddd;">${f.baseDesignation}</td>
            <td style="padding:8px; border:1px solid #ddd;">${f.employmentType}</td>
            <td style="padding:8px; border:1px solid #ddd;">${calculateCumulativeLoadHours(f.name)} Units</td>
        </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Print Faculty List - ${State.activeProgram}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; }
                h2 { margin-bottom: 2px; color: #7f0000; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; font-size: 12px; }
                th { background: #f5f5f5; text-align: left; padding: 8px; border: 1px solid #ddd; }
                .section-title { font-size: 14px; font-weight: bold; margin-top: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
            </style>
        </head>
        <body>
            <h2>PUP PQ Academic Registry Report</h2>
            <p style="font-size:12px; color:#666; margin-top:0;">Program: ${State.activeProgram} &middot; Filters: Category [${State.facultyFilter.toUpperCase()}] / Status [${State.facultyStatusFilter.toUpperCase()}]</p>
            
            ${activeList.length ? `
                <div class="section-title" style="color: #10b981;">🟢 Active Teaching Staff (${activeList.length})</div>
                <table>
                    <thead><tr><th>Name</th><th>Title</th><th>Designation</th><th>Employment Type</th><th>Total Load</th></tr></thead>
                    <tbody>${buildTableRows(activeList)}</tbody>
                </table>
            ` : ''}

            ${inactiveList.length ? `
                <div class="section-title" style="color: #64748b;">⚫ Inactive Teaching Staff (${inactiveList.length})</div>
                <table>
                    <thead><tr><th>Name</th><th>Title</th><th>Designation</th><th>Employment Type</th><th>Total Load</th></tr></thead>
                    <tbody>${buildTableRows(inactiveList)}</tbody>
                </table>
            ` : ''}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// SYNCHRONIZED DASHBOARD RENDER MONITOR ENGINE
let dashboardListenersAdded = false;
function renderDashboard() {
    const cardActiveFaculty = document.getElementById('card-active-faculty') || document.getElementById('dash-prof-count');
    const cardInactiveFaculty = document.getElementById('card-inactive-faculty');
    const cardPrograms = document.getElementById('card-active-programs') || document.getElementById('dash-prog-count');
    const cardLoads = document.getElementById('card-assigned-loads') || document.getElementById('dash-load-count');
    const cardConflicts = document.getElementById('card-conflicts-detected') || document.getElementById('dash-conflict-count');

    // Derive absolute values directly from master registry arrays maps
    const activeCount = facultyRegistry.filter(f => f.active !== false).length;
    const inactiveCount = facultyRegistry.filter(f => f.active === false).length;

    if (cardActiveFaculty) cardActiveFaculty.innerText = activeCount;
    if (cardInactiveFaculty) cardInactiveFaculty.innerText = inactiveCount;

    // Attach click listeners to open modal for active/inactive faculty
    if (!dashboardListenersAdded) {
        if (cardActiveFaculty) {
            cardActiveFaculty.style.cursor = 'pointer';
            cardActiveFaculty.addEventListener('click', () => openFacultyModal('Active'));
        }
        if (cardInactiveFaculty) {
            cardInactiveFaculty.style.cursor = 'pointer';
            cardInactiveFaculty.addEventListener('click', () => openFacultyModal('Inactive'));
        }
        dashboardListenersAdded = true;
    }
    if (cardPrograms) cardPrograms.innerText = Object.keys(State.db.programs).length;
    if (cardLoads) cardLoads.innerText = State.db.loads.length;
    if (cardConflicts) cardConflicts.innerText = 0;
    const currentSyEl = document.getElementById('dashboard-current-sy');
    if (currentSyEl) currentSyEl.innerText = State.db.schoolYears[0] || 'N/A';

    // Render active programs list
    const programsList = document.getElementById('dashboard-programs-list');
    if (programsList) {
        const programs = Object.entries(State.db.programs).map(([id, prog]) => ({
            id,
            name: prog.name || id,
            faculty: (prog.profs || []).length,
            sections: (prog.sections || []).length,
            subjects: Object.values(prog.subjects || {}).reduce((sum, s) => sum + Object.values(s).reduce((c, d) => c + d.length, 0), 0)
        }));

        if (programs.length > 0) {
            programsList.innerHTML = programs.map(p => `
                <div class="p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 transition">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <p class="font-semibold text-gray-900">${p.name}</p>
                            <p class="text-xs text-gray-500 mt-1">
                                <span class="mr-4">📚 ${p.subjects} Subjects</span>
                                <span class="mr-4">👥 ${p.faculty} Faculty</span>
                                <span>📋 ${p.sections} Sections</span>
                            </p>
                        </div>
                        <button onclick="switchActiveProgram('${p.id}')" class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition">Select</button>
                    </div>
                </div>
            `).join('');
        } else {
            programsList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No programs created yet</p>';
        }
    }
}

function populateFacultyDropdowns() {
    const facultySelector = document.getElementById('faculty-selector');
    const designeeDropdown = document.getElementById('designee-dropdown');
    if (!facultySelector && !designeeDropdown) return;
    if (facultySelector) {
        facultySelector.innerHTML = '';
        facultyRegistry.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.name;
            facultySelector.appendChild(opt);
        });
    }
    if (designeeDropdown) {
        designeeDropdown.innerHTML = '';
        designationOptions.forEach(text => {
            const opt = document.createElement('option');
            opt.value = text;
            opt.textContent = text;
            designeeDropdown.appendChild(opt);
        });
        handleFacultySelectorChange();
    }
}

function displayFacultyDetailsModal(facultyId) {
    const faculty = facultyRegistry.find(f => f.id === facultyId);
    if (!faculty) return;

    const totalLoad = calculateCumulativeLoadHours(faculty.name);
    const limits = getLoadLimitsForFaculty(faculty);

    let loadInfoHTML = '';
    if (limits) {
        loadInfoHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                ${Object.entries(limits.loadLimits).map(([type, limit]) => `
                    <div class="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 border border-slate-200">
                        <p class="text-xs uppercase text-slate-500 font-semibold">${type}</p>
                        <p class="font-bold text-gray-900 mt-2">${limit} units max</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    openModal({
        title: faculty.name,
        submitLabel: 'Close',
        body: `
            <div class="space-y-6">
                <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                        <h4 class="text-2xl font-bold text-gray-900">${faculty.name}</h4>
                        <p class="text-sm text-gray-500 mt-2">${getTitleLabel(faculty)} • ${faculty.baseDesignation}</p>
                        <p class="text-sm text-slate-600">${faculty.specialization || 'N/A'}</p>
                    </div>
                    <div class="flex flex-col gap-2 text-right">
                        <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">${faculty.program}</span>
                        <span class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-700">${faculty.employmentType}</span>
                        <span class="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase text-purple-700">${faculty.classification}</span>
                        <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase ${faculty.active === false ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}">${faculty.active === false ? 'Inactive' : 'Active'}</span>
                    </div>
                </div>
                
                ${loadInfoHTML}
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                        <p class="text-xs uppercase text-slate-400 font-semibold">License No.</p>
                        <p class="mt-2 font-bold text-gray-900">${faculty.licenseNumber || 'N/A'}</p>
                    </div>
                    <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                        <p class="text-xs uppercase text-slate-400 font-semibold">Employment Type</p>
                        <p class="mt-2 font-bold text-gray-900">${faculty.employmentType}</p>
                    </div>
                </div>
            </div>
        `,
        onSubmit: () => {
            closeModal();
        }
    });
}

function selectFaculty(facultyId) {
    if (!facultyId) return;
    const faculty = facultyRegistry.find(f => f.id === facultyId);
    const profileSelect = document.getElementById('faculty-profile-select');
    if (profileSelect) {
        profileSelect.value = facultyId;
        displaySelectedFacultyProfile();
        showBanner(`Selected faculty profile: ${faculty ? faculty.name : facultyId}`, 'success');
        return;
    }

    // If on Faculty Status page, display details in modal instead of navigating
    const facultyStatusContent = document.getElementById('faculty-status-content');
    if (facultyStatusContent) {
        displayFacultyDetailsModal(facultyId);
        return;
    }

    window.location.href = `faculty-profile.html?faculty=${encodeURIComponent(facultyId)}`;
}

function applyQuerySelections() {
    const query = new URLSearchParams(window.location.search);
    const facultyId = query.get('faculty');
    if (!facultyId) return;
    const profileSelect = document.getElementById('faculty-profile-select');
    if (profileSelect) {
        profileSelect.value = facultyId;
        displaySelectedFacultyProfile();
    }
}

function ensureModalRoot() {
    if (document.getElementById('global-modal-root')) return;
    const root = document.createElement('div');
    root.id = 'global-modal-root';
    root.className = 'fixed inset-0 z-50 hidden items-center justify-center overflow-auto bg-black/40 p-4';
    root.innerHTML = `<div id="global-modal-panel" class="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden"></div>`;
    document.body.appendChild(root);
}

function closeModal() {
    const root = document.getElementById('global-modal-root');
    if (!root) return;
    root.classList.add('hidden');
    root.classList.remove('flex');
    const panel = document.getElementById('global-modal-panel');
    if (panel) panel.innerHTML = '';
    document.removeEventListener('keydown', handleModalKeydown);
}

function handleModalKeydown(event) {
    if (event.key === 'Escape') closeModal();
}

async function renderFacultyChart(ctx, data, label) {
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{ label, data: Object.values(data), backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'] }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

async function openFacultyModal(statusFilter) {
    const filtered = facultyRegistry.filter(f => statusFilter === 'Active' ? f.active !== false : f.active === false);
    const regularCount = filtered.filter(f => f.employmentType?.toLowerCase() === 'regular').length;
    const partTimeCount = filtered.filter(f => f.employmentType && f.employmentType.toLowerCase() !== 'regular').length;
    const baccCount = filtered.filter(f => f.educationalAttainment?.baccalaureate).length;
    const gradCount = filtered.filter(f => f.educationalAttainment?.masters || f.educationalAttainment?.doctorate).length;

    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black/30 flex items-center justify-center z-50';
    const modal = document.createElement('div');
    modal.className = 'bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto';

    modal.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold">${statusFilter} Faculty Overview</h3>
            <button class="text-gray-500 hover:text-gray-800" onclick="document.body.removeChild(this.parentElement.parentElement.parentElement)">✕</button>
        </div>
        <div class="grid grid-cols-2 gap-6 mb-6">
            <canvas id="chart-emp"></canvas>
            <canvas id="chart-edu"></canvas>
        </div>
        <table class="w-full text-left text-sm border-t">
            <thead class="bg-gray-50"><tr><th class="p-2">Name</th><th class="p-2">Type</th><th class="p-2">Highest Education</th></tr></thead>
            <tbody>${filtered.map(f => `<tr><td class="p-2 border-t">${f.name}</td><td class="p-2 border-t">${f.employmentType}</td><td class="p-2 border-t">${f.educationalAttainment?.doctorate ? 'Doctorate' : (f.educationalAttainment?.masters ? 'Masters' : 'Baccalaureate')}</td></tr>`).join('')}</tbody>
        </table>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    setTimeout(() => {
        renderFacultyChart(document.getElementById('chart-emp'), { Regular: regularCount, PartTime: partTimeCount }, 'Employment');
        renderFacultyChart(document.getElementById('chart-edu'), { Bacc: baccCount, Grad: gradCount }, 'Education');
    }, 100);
}


function openModal({ title, body, submitLabel = 'Save', onSubmit }) {
    ensureModalRoot();
    const root = document.getElementById('global-modal-root');
    const panel = document.getElementById('global-modal-panel');
    if (!root || !panel) return;
    panel.innerHTML = `
        <div class="border-b border-slate-200 p-5 flex items-center justify-between">
            <div>
                <h3 class="text-xl font-bold text-slate-900">${title}</h3>
            </div>
            <button id="global-modal-close" class="text-slate-400 hover:text-slate-900" type="button"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-170px)]">${body}</div>
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 p-5">
            <button id="global-modal-cancel" class="px-4 py-2 rounded-2xl border border-slate-300 text-sm text-slate-700 hover:bg-slate-100" type="button">Cancel</button>
            <button id="global-modal-submit" class="px-4 py-2 rounded-2xl bg-[#7f0000] text-white text-sm font-bold hover:bg-[#660000]" type="button">${submitLabel}</button>
        </div>
    `;
    root.classList.remove('hidden');
    root.classList.add('flex');
    document.getElementById('global-modal-close').onclick = closeModal;
    document.getElementById('global-modal-cancel').onclick = closeModal;
    document.getElementById('global-modal-submit').onclick = () => {
        onSubmit?.();
    };

    // Attach event listeners for modal form controls
    const unitsInput = document.getElementById('ld-units');
    if (unitsInput) {
        unitsInput.addEventListener('change', updateModalTimeDropdown);
        unitsInput.addEventListener('input', updateModalTimeDropdown);
    }

    document.addEventListener('keydown', handleModalKeydown);
    lucide.createIcons();
}

window.editSubject = editSubject;
window.openModal = openModal;
window.closeModal = closeModal;

function getProgramPalette(programName) {
    const key = String(programName || '').toUpperCase();
    // Match by abbreviation or full name
    const isHM = key.includes('BSHM') || key.includes('HOSPITALITY');
    const isIT = key.includes('BSIT') || key.includes('INFORMATION TECH');
    const isOA = key.includes('BSOA') || key.includes('OFFICE ADMIN');
    const isCPE = key.includes('BSCPE') || key.includes('COMPUTER ENG');
    if (isHM)  return { row: 'bg-red-100 text-red-900',     pill: 'bg-red-50 text-red-700',     card: 'border-red-200 bg-red-50 text-red-900',     border: 'border-red-300',     badge: 'bg-red-200 text-red-800' };
    if (isIT)  return { row: 'bg-sky-100 text-sky-900',     pill: 'bg-sky-50 text-sky-700',     card: 'border-sky-200 bg-sky-50 text-sky-900',     border: 'border-sky-300',     badge: 'bg-sky-200 text-sky-800' };
    if (isOA)  return { row: 'bg-violet-100 text-violet-900', pill: 'bg-violet-50 text-violet-700', card: 'border-violet-200 bg-violet-50 text-violet-900', border: 'border-violet-300', badge: 'bg-violet-200 text-violet-800' };
    if (isCPE) return { row: 'bg-emerald-100 text-emerald-900', pill: 'bg-emerald-50 text-emerald-700', card: 'border-emerald-200 bg-emerald-50 text-emerald-900', border: 'border-emerald-300', badge: 'bg-emerald-200 text-emerald-800' };
    return null;
}

function openAddProgramModal() {
    openModal({
        title: 'Add Active Program',
        submitLabel: 'Add Program',
        body: `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Program Name</label>
                    <input id="modal-program-name" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" placeholder="e.g. BSIT" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Program Code</label>
                    <input id="modal-program-code" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" placeholder="e.g. BSIT" />
                    <p class="text-xs text-slate-500 mt-2">Program code is used for schedule color coding.</p>
                </div>
            </div>
        `,
        onSubmit: () => {
            const name = document.getElementById('modal-program-name')?.value.trim();
            const code = document.getElementById('modal-program-code')?.value.trim();
            if (!name) {
                showBanner('Please enter the program name.', 'error');
                return;
            }
            const programKey = code || name;
            if (State.db.programs[programKey]) {
                showBanner('Program already exists.', 'error');
                return;
            }
            State.db.programs[programKey] = { profs: [], sections: [], subjects: {} };
            State.activeProgram = programKey;
            persistState();
            renderPageSections();
            closeModal();
            showBanner(`Program “${programKey}” was added and selected.`, 'success');
        }
    });
}

function openEditActiveProgramModal() {
    if (!State.activeProgram) {
        showBanner('No active program is selected to rename.', 'error');
        return;
    }
    openModal({
        title: 'Rename Active Program',
        submitLabel: 'Save Changes',
        body: `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Current Name</label>
                    <input id="modal-edit-program-name" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" value="${State.activeProgram}" />
                </div>
            </div>
        `,
        onSubmit: () => {
            const newName = document.getElementById('modal-edit-program-name')?.value.trim();
            if (!newName) {
                showBanner('Please enter a new program name.', 'error');
                return;
            }
            const oldName = State.activeProgram;
            if (newName === oldName) {
                closeModal();
                return;
            }
            if (State.db.programs[newName]) {
                showBanner('A program with that name already exists.', 'error');
                return;
            }
            const programData = State.db.programs[oldName];
            delete State.db.programs[oldName];
            State.db.programs[newName] = programData;
            facultyRegistry.forEach(f => {
                if (f.program === oldName) f.program = newName;
            });
            State.db.loads.forEach(load => {
                if (load.program === oldName) load.program = newName;
            });
            State.activeProgram = newName;
            persistState();
            renderPageSections();
            closeModal();
            showBanner(`Program renamed to ${newName}.`, 'success');
        }
    });
}

function openAddSectionModal() {
    if (!State.activeProgram) {
        showBanner('Select or add an active program first.', 'error');
        return;
    }
    openModal({
        title: 'Add Section',
        submitLabel: 'Add Section',
        body: `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Section Name</label>
                    <input id="modal-section-name" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" placeholder="e.g. BSIT 1-1" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Program</label>
                    <select id="modal-section-program" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                        ${Object.keys(State.db.programs || {}).sort().map(program => `<option value="${program}" ${program === State.activeProgram ? 'selected' : ''}>${program}</option>`).join('')}
                    </select>
                </div>
            </div>
        `,
        onSubmit: () => {
            const sectionName = document.getElementById('modal-section-name')?.value.trim();
            const programName = document.getElementById('modal-section-program')?.value;
            if (!sectionName) {
                showBanner('Please enter the new section name.', 'error');
                return;
            }
            const program = State.db.programs[programName];
            if (!program) {
                showBanner('Program not found.', 'error');
                return;
            }
            if (!program.sections) program.sections = [];
            if (program.sections.includes(sectionName)) {
                showBanner('Section already exists.', 'error');
                return;
            }
            program.sections.push(sectionName);
            persistState();
            renderPageSections();
            closeModal();
            showBanner(`Added section “${sectionName}”.`, 'success');
        }
    });
}

function openAddSubjectModal() {
    if (!State.activeProgram) {
        showBanner('Select or add an active program first.', 'error');
        return;
    }
    openModal({
        title: 'Add Subject',
        submitLabel: 'Add Subject',
        body: `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Subject Title</label>
                    <input id="modal-subject-name" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" placeholder="e.g. Introduction to Programming" />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Units</label>
                        <input id="modal-subject-units" type="number" min="1" value="3" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Year Level</label>
                        <input id="modal-subject-year" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" value="1st Year" />
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Semester</label>
                        <select id="modal-subject-semester" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                            <option>1st Semester</option>
                            <option>2nd Semester</option>
                            <option>Summer Term</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Program</label>
                        <select id="modal-subject-program" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                            ${Object.keys(State.db.programs || {}).sort().map(program => `<option value="${program}" ${program === State.activeProgram ? 'selected' : ''}>${program}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `,
        onSubmit: () => {
            const subjectName = document.getElementById('modal-subject-name')?.value.trim();
            const units = Math.max(1, Number(document.getElementById('modal-subject-units')?.value) || 3);
            const yearLevel = document.getElementById('modal-subject-year')?.value.trim() || '1st Year';
            const semester = document.getElementById('modal-subject-semester')?.value;
            const programName = document.getElementById('modal-subject-program')?.value;
            if (!subjectName) {
                showBanner('Please enter the new subject title.', 'error');
                return;
            }
            const program = State.db.programs[programName];
            if (!program) {
                showBanner('Program not found.', 'error');
                return;
            }
            if (!program.subjects) program.subjects = {};
            if (!program.subjects[yearLevel]) program.subjects[yearLevel] = {};
            if (!program.subjects[yearLevel][semester]) program.subjects[yearLevel][semester] = [];
            program.subjects[yearLevel][semester].push({ name: subjectName, units });
            persistState();
            renderProgramResources();
            closeModal();
            showBanner(`Added subject “${subjectName}” to ${programName}.`, 'success');
        }
    });
}

// =====================================================
// FACULTY DELETE — with name-confirmation verification
// =====================================================
function deleteFacultyWithVerification() {
    const selectedId = document.getElementById('faculty-profile-select')?.value;
    if (!selectedId) {
        showBanner('Select a faculty profile to delete first.', 'error');
        return;
    }
    const faculty = facultyRegistry.find(f => f.id === selectedId);
    if (!faculty) return;

    openModal({
        title: '⚠️ Delete Faculty Record',
        submitLabel: 'Permanently Delete',
        body: `
            <div class="space-y-4">
                <div class="rounded-2xl bg-red-50 border border-red-200 p-4">
                    <p class="text-sm font-bold text-red-700 mb-1">This action cannot be undone.</p>
                    <p class="text-xs text-red-600">Deleting <strong>${faculty.name}</strong> will permanently remove their profile and all associated data. Any existing load assignments for this faculty will also be removed.</p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Type the faculty name to confirm deletion:
                        <span class="font-bold text-red-600">${faculty.name}</span>
                    </label>
                    <input id="delete-faculty-confirm-input"
                        class="w-full rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Type exact name here..." autocomplete="off" />
                    <p id="delete-faculty-match-msg" class="text-xs mt-1 text-red-500 hidden">Name does not match.</p>
                </div>
            </div>
        `,
        onSubmit: () => {
            const typed = document.getElementById('delete-faculty-confirm-input')?.value.trim();
            const msg = document.getElementById('delete-faculty-match-msg');
            if (typed !== faculty.name) {
                if (msg) msg.classList.remove('hidden');
                showBanner('Name confirmation does not match. Deletion cancelled.', 'error');
                return;
            }
            // Remove from facultyRegistry
            const idx = facultyRegistry.findIndex(f => f.id === selectedId);
            if (idx !== -1) facultyRegistry.splice(idx, 1);
            // Remove from program profs lists
            Object.values(State.db.programs || {}).forEach(prog => {
                if (prog.profs) {
                    const pi = prog.profs.indexOf(faculty.name);
                    if (pi !== -1) prog.profs.splice(pi, 1);
                }
            });
            // Remove loads assigned to this faculty
            State.db.loads = State.db.loads.filter(l => l.prof !== faculty.name);
            persistState();
            closeModal();
            showBanner(`Faculty "${faculty.name}" has been permanently deleted.`, 'success');
            // Reset dropdown
            const sel = document.getElementById('faculty-profile-select');
            if (sel) {
                sel.value = '';
                sel.dispatchEvent(new Event('change'));
            }
            if (typeof renderActiveProgramButtons === 'function') renderActiveProgramButtons();
            if (typeof updateFacultyWorkloadDropdown === 'function') updateFacultyWorkloadDropdown();
        }
    });
}

// =====================================================
// SUBJECT DELETE — with name-confirmation verification
// =====================================================
function deleteSubjectWithVerification(programName, yearKey, semKey, subjectName) {
    openModal({
        title: '⚠️ Remove Subject from Curriculum',
        submitLabel: 'Remove Subject',
        body: `
            <div class="space-y-4">
                <div class="rounded-2xl bg-red-50 border border-red-200 p-4">
                    <p class="text-sm font-bold text-red-700 mb-1">This action cannot be undone.</p>
                    <p class="text-xs text-red-600">This will remove <strong>${subjectName}</strong> from the <strong>${programName}</strong> curriculum (${yearKey} · ${semKey}).</p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Type <span class="font-bold text-red-600">DELETE</span> to confirm removal:
                    </label>
                    <input id="delete-subject-confirm-input"
                        class="w-full rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Type DELETE here..." autocomplete="off" />
                    <p id="delete-subject-match-msg" class="text-xs mt-1 text-red-500 hidden">Must type DELETE exactly.</p>
                </div>
            </div>
        `,
        onSubmit: () => {
            const typed = document.getElementById('delete-subject-confirm-input')?.value.trim();
            const msg = document.getElementById('delete-subject-match-msg');
            if (typed !== 'DELETE') {
                if (msg) msg.classList.remove('hidden');
                showBanner('Must type DELETE exactly. Removal cancelled.', 'error');
                return;
            }
            const program = State.db.programs[programName];
            if (!program?.subjects?.[yearKey]?.[semKey]) {
                showBanner('Subject not found.', 'error');
                return;
            }
            const arr = program.subjects[yearKey][semKey];
            const idx = arr.findIndex(s => s.name === subjectName);
            if (idx !== -1) arr.splice(idx, 1);
            // Clean up empty containers
            if (arr.length === 0) delete program.subjects[yearKey][semKey];
            if (Object.keys(program.subjects[yearKey] || {}).length === 0) delete program.subjects[yearKey];
            persistState();
            closeModal();
            renderProgramResources();
            showBanner(`Subject "${subjectName}" removed from curriculum.`, 'success');
        }
    });
}

function openEditFacultyModal() {
    const selectedId = document.getElementById('faculty-profile-select')?.value;
    if (!selectedId) {
        showBanner('Select a faculty profile to edit first.', 'error');
        return;
    }
    const faculty = facultyRegistry.find(f => f.id === selectedId);
    if (!faculty) return;

    const classConfig = CLASSIFICATION_SYSTEM[faculty.classification];
    const rankOptions = classConfig && classConfig.ranks && classConfig.ranks.length > 0
        ? classConfig.ranks.map(r => `<option value="${r.value}" ${faculty.classificationRank === r.value ? 'selected' : ''}>${r.label}</option>`).join('')
        : '<option value="">N/A for this classification</option>';

    const currentPrograms = faculty.program ? faculty.program.split(',').map(p => p.trim()) : [];
    const programOptions = Object.keys(State.db.programs || {}).sort().map(program => {
        const isSelected = currentPrograms.includes(program);
        return `<option value="${program}" ${isSelected ? 'selected' : ''}>${program}</option>`;
    }).join('');

    openModal({
        title: 'Edit Faculty',
        submitLabel: 'Save Changes',
        body: `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Faculty Name</label>
                        <input id="faculty-update-name" value="${faculty.name}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Program (Ctrl+Click to select multiple)</label>
                        <select id="faculty-update-program" multiple class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000] h-28">
                            ${programOptions}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Status</label>
                        <select id="faculty-update-active" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                            <option value="active" ${faculty.active !== false ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${faculty.active === false ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Employment Type</label>
                        <input id="faculty-update-employment" value="${faculty.employmentType || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Designation / Title</label>
                    <input id="faculty-update-title" value="${faculty.baseDesignation || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Classification</label>
                        <select id="faculty-update-classification" onchange="updateClassificationRankOptions()" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                            <option value="Designee" ${faculty.classification === 'Designee' ? 'selected' : ''}>Designee</option>
                            <option value="Regular" ${faculty.classification === 'Regular' ? 'selected' : ''}>Regular</option>
                            <option value="Part-Time" ${faculty.classification === 'Part-Time' ? 'selected' : ''}>Part-Time</option>
                            <option value="Director" ${faculty.classification === 'Director' ? 'selected' : ''}>Director</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Classification Rank</label>
                        <select id="faculty-update-rank" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                            ${rankOptions}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">License Number</label>
                        <input id="faculty-update-license" value="${faculty.licenseNumber || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Specialization</label>
                        <input id="faculty-update-specialization" value="${faculty.specialization || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">National Certificate</label>
                        <input id="faculty-update-nc" value="${faculty.nationalCertificate || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Nature of Appointment</label>
                        <input id="faculty-update-nature" value="${faculty.natureOfAppointment || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Extension</label>
                    <input id="faculty-update-extension" value="${faculty.extension || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Preferred Subjects</label>
                        <select id="faculty-update-pref-subjects" multiple size="5" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                            ${getPreferredSubjectOptions(faculty.preferredSubjects || '')}
                        </select>
                        <p class="text-xs text-slate-500 mt-2">Hold Ctrl/Cmd to select multiple subjects.</p>
                    </div>
                    <div>
                        <div class="grid grid-cols-1 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-2">Preferred Day</label>
                                <select id="faculty-update-pref-day" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                                    ${getPreferredDayOptions(parsePreferredTimeComponents(faculty.preferredTimes || '').day)}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-2">Preferred Time</label>
                                <select id="faculty-update-pref-times" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                                    ${getPreferredTimeOptions(parsePreferredTimeComponents(faculty.preferredTimes || '').time)}
                                </select>
                            </div>
                            <button type="button" id="faculty-update-pref-time-add" class="w-full rounded-2xl bg-[#7f0000] px-4 py-3 text-sm font-bold text-white hover:bg-red-900 transition">Add Preferred Time</button>
                        </div>
                    </div>
                </div>
                <div class="mt-4">
                    <div id="faculty-update-pref-time-list" class="flex flex-wrap items-center"></div>
                    <input type="hidden" id="faculty-update-pref-times-hidden" value="${faculty.preferredTimes || ''}" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
                    <textarea id="faculty-update-remarks" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">${faculty.remarks || ''}</textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Baccalaureate</label>
                        <input id="faculty-update-bacc" value="${faculty.educationalAttainment?.baccalaureate || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Masters</label>
                        <input id="faculty-update-master" value="${faculty.educationalAttainment?.masters || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Doctorate</label>
                        <input id="faculty-update-doctorate" value="${faculty.educationalAttainment?.doctorate || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Post-Baccalaureate</label>
                        <input id="faculty-update-postbac" value="${faculty.educationalAttainment?.postBaccalaureate || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">GEN-ED</label>
                        <input id="faculty-update-gened" value="${faculty.courseHandle?.genEd || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Core Subject</label>
                        <input id="faculty-update-core" value="${faculty.courseHandle?.coreSubject || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Professional Subject</label>
                        <input id="faculty-update-professional" value="${faculty.courseHandle?.professionalSubject || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Technical Subject</label>
                        <input id="faculty-update-technical" value="${faculty.courseHandle?.technicalSubject || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Research Production</label>
                        <input id="faculty-update-production" value="${faculty.research?.production || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Research Presentation</label>
                        <input id="faculty-update-presentation" value="${faculty.research?.presentation || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Research Publication</label>
                        <input id="faculty-update-publication" value="${faculty.research?.publication || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Research Citation</label>
                        <input id="faculty-update-citation" value="${faculty.research?.citation || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                </div>
            </div>
        `,
        onSubmit: () => {
            const professor = facultyRegistry.find(f => f.id === selectedId);
            if (!professor) return;
            const oldName = professor.name;
            const oldProgram = professor.program;
            const newName = document.getElementById('faculty-update-name')?.value.trim() || professor.name;
            const programSelect = document.getElementById('faculty-update-program');
            let newProgram = professor.program;
            if (programSelect) {
                const selectedOptions = Array.from(programSelect.selectedOptions).map(o => o.value);
                newProgram = selectedOptions.length ? selectedOptions.join(', ') : professor.program;
            }
            const activeValue = document.getElementById('faculty-update-active')?.value;
            const employmentValue = document.getElementById('faculty-update-employment')?.value;
            const titleValue = document.getElementById('faculty-update-title')?.value.trim();
            const classificationValue = document.getElementById('faculty-update-classification')?.value;
            const rankValue = document.getElementById('faculty-update-rank')?.value;
            const licenseValue = document.getElementById('faculty-update-license')?.value.trim();
            const specializationValue = document.getElementById('faculty-update-specialization')?.value.trim();
            const ncValue = document.getElementById('faculty-update-nc')?.value.trim();
            const natureValue = document.getElementById('faculty-update-nature')?.value.trim();
            const extensionValue = document.getElementById('faculty-update-extension')?.value.trim();
            const prefSubjectsValue = Array.from(document.getElementById('faculty-update-pref-subjects')?.selectedOptions || [])
                .map(o => o.value.trim())
                .filter(Boolean)
                .join(', ');
            const prefTimesValue = document.getElementById('faculty-update-pref-times-hidden')?.value.trim() || '';
            const remarksValue = document.getElementById('faculty-update-remarks')?.value.trim();
            const baccValue = document.getElementById('faculty-update-bacc')?.value.trim();
            const masterValue = document.getElementById('faculty-update-master')?.value.trim();
            const doctorateValue = document.getElementById('faculty-update-doctorate')?.value.trim();
            const postbacValue = document.getElementById('faculty-update-postbac')?.value.trim();
            const genedValue = document.getElementById('faculty-update-gened')?.value.trim();
            const coreValue = document.getElementById('faculty-update-core')?.value.trim();
            const profValue = document.getElementById('faculty-update-professional')?.value.trim();
            const technicalValue = document.getElementById('faculty-update-technical')?.value.trim();
            const productionValue = document.getElementById('faculty-update-production')?.value.trim();
            const presentationValue = document.getElementById('faculty-update-presentation')?.value.trim();
            const publicationValue = document.getElementById('faculty-update-publication')?.value.trim();
            const citationValue = document.getElementById('faculty-update-citation')?.value.trim();

            professor.name = newName;
            professor.program = newProgram;
            professor.active = activeValue === 'active';
            professor.employmentType = employmentValue || professor.employmentType;
            professor.baseDesignation = titleValue || professor.baseDesignation;
            professor.classification = classificationValue || professor.classification;
            professor.classificationRank = rankValue || professor.classificationRank || '';
            professor.licenseNumber = licenseValue;
            professor.specialization = specializationValue;
            professor.nationalCertificate = ncValue;
            professor.natureOfAppointment = natureValue;
            professor.extension = extensionValue;
            professor.preferredSubjects = prefSubjectsValue;
            professor.preferredTimes = prefTimesValue;
            professor.remarks = remarksValue;
            professor.educationalAttainment = {
                baccalaureate: baccValue,
                masters: masterValue,
                doctorate: doctorateValue,
                postBaccalaureate: postbacValue
            };
            professor.courseHandle = {
                genEd: genedValue,
                coreSubject: coreValue,
                professionalSubject: profValue,
                technicalSubject: technicalValue
            };
            professor.research = {
                production: productionValue,
                presentation: presentationValue,
                publication: publicationValue,
                citation: citationValue
            };

            if (oldProgram !== newProgram) {
                // Remove from all old programs
                if (oldProgram) {
                    oldProgram.split(',').map(s => s.trim()).forEach(prog => {
                        const oldProg = State.db.programs[prog];
                        if (oldProg) {
                            oldProg.profs = oldProg.profs.filter(name => name !== oldName);
                        }
                    });
                }
                // Add to all new programs
                if (newProgram) {
                    newProgram.split(',').map(s => s.trim()).forEach(prog => {
                        if (!State.db.programs[prog]) {
                            State.db.programs[prog] = { profs: [], sections: [], subjects: {} };
                        }
                        if (!State.db.programs[prog].profs.includes(newName)) {
                            State.db.programs[prog].profs.push(newName);
                        }
                    });
                }
            } else if (oldName !== newName) {
                if (newProgram) {
                    newProgram.split(',').map(s => s.trim()).forEach(prog => {
                        const sameProg = State.db.programs[prog];
                        if (sameProg) {
                            const index = sameProg.profs.indexOf(oldName);
                            if (index !== -1) {
                                sameProg.profs[index] = newName;
                            } else if (!sameProg.profs.includes(newName)) {
                                sameProg.profs.push(newName);
                            }
                        }
                    });
                }
            }

            persistState();
            updateFacultyAPI(professor);
            closeModal();
            showBanner(`Updated profile for ${professor.name}.`, 'success');
            renderProgramResources();
            renderDashboard();
            populateFacultyProfileDropdown();
            displaySelectedFacultyProfile();
        }
    });

    populateFacultyEditPreferredDropdowns(faculty);
}

function updateClassificationRankOptions() {
    const classificationSelect = document.getElementById('faculty-update-classification');
    const rankSelect = document.getElementById('faculty-update-rank');
    if (!classificationSelect || !rankSelect) return;

    const selectedClassification = classificationSelect.value;
    const config = CLASSIFICATION_SYSTEM[selectedClassification];
    rankSelect.innerHTML = '';

    if (config && config.ranks && config.ranks.length > 0) {
        config.ranks.forEach(rank => {
            const option = document.createElement('option');
            option.value = rank.value;
            option.textContent = rank.label;
            rankSelect.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'N/A for this classification';
        rankSelect.appendChild(option);
    }
}

function addSection() {
    openAddSectionModal();
}

function addSubject() {
    openAddSubjectModal();
}

function editSubject(programName, yearLevel, semester, subjectName, units) {
    if (!programName || !yearLevel || !semester || !subjectName) return;

    openModal({
        title: 'Edit Subject',
        submitLabel: 'Save Changes',
        body: `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Subject Title</label>
                    <input id="modal-edit-subject-name" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" value="${subjectName}" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Units</label>
                    <input id="modal-edit-subject-units" type="number" min="1" value="${units}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                </div>
            </div>
        `,
        onSubmit: () => {
            const updatedName = document.getElementById('modal-edit-subject-name')?.value.trim();
            const updatedUnits = Math.max(1, Number(document.getElementById('modal-edit-subject-units')?.value) || 1);
            if (!updatedName) {
                showBanner('Please enter a subject title.', 'error');
                return;
            }

            const program = State.db.programs[programName];
            if (!program?.subjects?.[yearLevel]?.[semester]) {
                showBanner('Subject location not found.', 'error');
                return;
            }

            const matchingSubject = program.subjects[yearLevel][semester].find(sub => sub.name === subjectName);
            if (!matchingSubject) {
                showBanner('Subject not found.', 'error');
                return;
            }

            matchingSubject.name = updatedName;
            matchingSubject.units = updatedUnits;
            persistState();
            renderProgramResources();
            closeModal();
            showBanner(`Updated subject “${updatedName}”.`, 'success');
        }
    });
}

function setActiveProgram(programName) {
    if (!State.db.programs[programName]) {
        showBanner(`Program “${programName}” is not available.`, 'error');
        return;
    }
    State.activeProgram = programName;
    persistState();
    renderPageSections();
    showBanner(`Active program switched to ${programName}.`, 'success');
}

function attachProgramButtonHandlers() {
    renderActiveProgramButtons();
}

function renderActiveProgramButtons() {
    const programNames = Object.keys(State.db.programs).sort((a, b) => a.localeCompare(b));
    
    // 1. Sidebar Buttons (if it exists)
    const container = document.getElementById('active-program-button-list');
    if (container) {
        container.innerHTML = '';
        programNames.forEach(program => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `w-full text-left px-4 py-2 rounded-lg text-xs transition-all ${program === State.activeProgram ? 'bg-[#ffd24d] text-[#3f1f00] font-semibold' : 'bg-transparent text-gray-100 hover:bg-white/10'}`;
            button.innerText = program;
            button.addEventListener('click', () => setActiveProgram(program));
            container.appendChild(button);
        });
    }

    // 2. Program Dropdowns
    const dropdowns = document.querySelectorAll('.active-program-dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.innerHTML = '';
        programNames.forEach(program => {
            const option = document.createElement('option');
            option.value = program;
            option.innerText = program;
            if (program === State.activeProgram) option.selected = true;
            dropdown.appendChild(option);
        });
    });
}

function addProgram() {
    openAddProgramModal();
}

function populateFacultyProfileDropdown() {
    const select = document.getElementById('faculty-profile-select');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Choose faculty</option>';
    const programs = Object.keys(State.db.programs || {}).sort();
    programs.forEach(program => {
        const group = document.createElement('optgroup');
        group.label = program;
        const filteredProfs = facultyRegistry.filter(f => {
            if (!f.program) return false;
            const progs = f.program.split(',').map(p => p.trim());
            return progs.includes(program);
        });
        filteredProfs.forEach(faculty => {
            const option = document.createElement('option');
            option.value = faculty.id;
            option.textContent = faculty.name;
            group.appendChild(option);
        });
        if (group.children.length > 0) {
            select.appendChild(group);
        }
    });
    if (currentValue && [...select.options].some(option => option.value === currentValue)) {
        select.value = currentValue;
    }
}

function displaySelectedFacultyProfile() {
    const selectedId = document.getElementById('faculty-profile-select')?.value;
    const detailContainer = document.getElementById('faculty-profile-details');
    if (!detailContainer) return;
    if (!selectedId) {
        detailContainer.innerHTML = `<div class="rounded-3xl bg-slate-50 p-5 border border-slate-200"><p class="text-sm text-slate-500">No faculty selected.</p></div>`;
        return;
    }
    const faculty = facultyRegistry.find(f => f.id === selectedId);
    if (!faculty) return;
    const totalLoad = calculateCumulativeLoadHours(faculty.name);
    const limits = getLoadLimitsForFaculty(faculty);
    const rankLabel = faculty.classificationRank ? getClassificationRankLabel(faculty.classification, faculty.classificationRank) : 'N/A';

    // Build load information HTML
    let loadInfoHTML = '';
    if (limits) {
        loadInfoHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${Object.entries(limits.loadLimits).map(([type, limit]) => `
                    <div class="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 border border-slate-200">
                        <p class="text-xs uppercase text-slate-500 font-semibold">${type}</p>
                        <p class="font-bold text-gray-900 mt-2">${limit} units max</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    detailContainer.innerHTML = `
        <div class="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm space-y-6">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <h4 class="text-2xl font-bold text-gray-900">${faculty.name}</h4>
                    <p class="text-sm text-gray-500 mt-2">${getTitleLabel(faculty)} • ${faculty.baseDesignation}</p>
                    <p class="text-sm text-slate-600">${faculty.specialization}</p>
                </div>
                <div class="flex flex-col gap-2 text-right">
                    <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">${faculty.program}</span>
                    <span class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-700">${faculty.employmentType}</span>
                    <span class="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase text-purple-700">${faculty.classification}</span>
                    <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase ${faculty.active === false ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}">${faculty.active === false ? 'Inactive' : 'Active'}</span>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                    <p class="text-xs uppercase text-slate-400 font-semibold">License No.</p>
                    <p class="mt-2 font-bold text-gray-900">${faculty.licenseNumber || 'N/A'}</p>
                </div>
                <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                    <p class="text-xs uppercase text-slate-400 font-semibold">National Certificate (NC)</p>
                    <p class="mt-2 font-bold text-gray-900">${faculty.nationalCertificate || 'N/A'}</p>
                </div>
                <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                    <p class="text-xs uppercase text-slate-400 font-semibold">Nature of Appointment</p>
                    <p class="mt-2 font-bold text-gray-900">${faculty.natureOfAppointment || 'N/A'}</p>
                </div>
                <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                    <p class="text-xs uppercase text-slate-400 font-semibold">Classification Rank</p>
                    <p class="mt-2 font-bold text-gray-900">${rankLabel}</p>
                </div>
            </div>
            
            ${loadInfoHTML}
            
            <div class="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <table class="min-w-full text-left text-sm text-slate-700">
                    <thead>
                        <tr>
                            <th class="py-3 px-4 uppercase tracking-[0.12em] text-xs font-semibold">Educational Attainment</th>
                            <th class="py-3 px-4 uppercase tracking-[0.12em] text-xs font-semibold">Course Handle</th>
                            <th class="py-3 px-4 uppercase tracking-[0.12em] text-xs font-semibold">Research</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="border-t border-slate-200">
                            <td class="py-4 px-4 align-top">
                                <div class="space-y-2">
                                    <div><span class="font-semibold">Baccalaureate:</span> ${faculty.educationalAttainment.baccalaureate || 'N/A'}</div>
                                    <div><span class="font-semibold">Masters:</span> ${faculty.educationalAttainment.masters || 'N/A'}</div>
                                    <div><span class="font-semibold">Doctorate:</span> ${faculty.educationalAttainment.doctorate || 'N/A'}</div>
                                    <div><span class="font-semibold">Post-Baccalaureate:</span> ${faculty.educationalAttainment.postBaccalaureate || 'N/A'}</div>
                                </div>
                            </td>
                            <td class="py-4 px-4 align-top">
                                <div class="space-y-2">
                                    <div><span class="font-semibold">GEN-ED:</span> ${faculty.courseHandle.genEd || 'N/A'}</div>
                                    <div><span class="font-semibold">Core Subject:</span> ${faculty.courseHandle.coreSubject || 'N/A'}</div>
                                    <div><span class="font-semibold">Professional Subject:</span> ${faculty.courseHandle.professionalSubject || 'N/A'}</div>
                                    <div><span class="font-semibold">Technical Subject:</span> ${faculty.courseHandle.technicalSubject || 'N/A'}</div>
                                </div>
                            </td>
                            <td class="py-4 px-4 align-top">
                                <div class="space-y-2">
                                    <div><span class="font-semibold">Production:</span> ${faculty.research.production || '0'}</div>
                                    <div><span class="font-semibold">Presentation:</span> ${faculty.research.presentation || '0'}</div>
                                    <div><span class="font-semibold">Publication:</span> ${faculty.research.publication || '0'}</div>
                                    <div><span class="font-semibold">Citation:</span> ${faculty.research.citation || '0'}</div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                    <p class="text-xs uppercase text-slate-400 font-semibold">Specialization</p>
                    <p class="font-bold text-gray-900 mt-2">${faculty.specialization || 'N/A'}</p>
                </div>
                <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                    <p class="text-xs uppercase text-slate-400 font-semibold">Extension</p>
                    <p class="font-bold text-gray-900 mt-2">${faculty.extension || 'N/A'}</p>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                    <p class="text-xs uppercase text-slate-400 font-semibold">Preferred Subjects</p>
                    <p class="font-bold text-gray-900 mt-2">${faculty.preferredSubjects || 'N/A'}</p>
                </div>
                <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                    <p class="text-xs uppercase text-slate-400 font-semibold">Preferred Days / Times</p>
                    <p class="font-bold text-gray-900 mt-2">${faculty.preferredTimes || 'N/A'}</p>
                </div>
            </div>
            
            <div class="rounded-3xl bg-slate-100 p-4 border border-slate-200">
                <p class="text-xs uppercase tracking-[0.16em] font-semibold text-slate-500">Total Assigned Load</p>
                <p class="text-lg font-bold text-gray-900 mt-2">${totalLoad} / ${limits ? limits.totalMaxLoad : '45'} Units</p>
            </div>
        </div>
    `;
}

function toggleActiveStatusFromProfile(setActive) {
    const selectedId = document.getElementById('faculty-profile-select')?.value;
    if (!selectedId) {
        showBanner('Select a faculty profile to change status first.', 'error');
        return;
    }
    const faculty = facultyRegistry.find(f => f.id === selectedId);
    if (!faculty) return;
    faculty.active = Boolean(setActive);
    persistState();
    displaySelectedFacultyProfile();
    renderProgramResources();
    showBanner(`Faculty profile is now ${faculty.active ? 'Active' : 'Inactive'}.`, 'success');
}

function handleFacultySelectorChange() {
    const facultyId = document.getElementById('faculty-selector')?.value;
    const designeeDropdown = document.getElementById('designee-dropdown');
    if (!designeeDropdown) return;
    const professor = facultyRegistry.find(f => f.id === facultyId);
    if (professor) {
        if (designationOptions.includes(professor.baseDesignation)) {
            designeeDropdown.value = professor.baseDesignation;
        } else {
            designeeDropdown.selectedIndex = 0;
        }
    }
}

function renderFacultyProfilesModule() {
    const listContainer = document.getElementById('faculty-directory-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    facultyRegistry.forEach(f => {
        const crossProgramLoadUnits = calculateCumulativeLoadHours(f.name);
        const card = document.createElement('div');
        card.className = 'p-3 bg-white border rounded-lg shadow-xs flex items-center justify-between';
        card.innerHTML = `
            <div>
                <div class="text-sm font-bold text-gray-900">${f.name}</div>
                <div class="text-xs text-maroon font-semibold flex items-center gap-1 mt-0.5">
                    <i data-lucide="award" class="w-3 h-3"></i> ${getTitleLabel(f)} • ${f.baseDesignation}
                </div>
            </div>
            <div class="text-right">
                <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Aggregated Total Load</div>
                <div class="text-xs text-gray-700 font-medium">${crossProgramLoadUnits} Units Assigned</div>
            </div>
        `;
        listContainer.appendChild(card);
    });
    lucide.createIcons();
}

function saveDesignation() {
    const facultyId = document.getElementById('faculty-selector')?.value;
    const targetDesignationValue = document.getElementById('designee-dropdown')?.value;
    const professor = facultyRegistry.find(f => f.id === facultyId);
    if (professor) {
        professor.baseDesignation = targetDesignationValue;
        persistState();
        updateFacultyAPI(professor);
        showBanner(`Structural Profile Update: ${professor.name} is now ${targetDesignationValue}`, 'success');
        renderFacultyProfilesModule();
        renderWorkloadMatrix();
    }
}

function saveFacultyProfileUpdate() {
    const selectedId = document.getElementById('faculty-profile-select')?.value;
    if (!selectedId) return;
    const professor = facultyRegistry.find(f => f.id === selectedId);
    if (!professor) return;
    const activeValue = document.getElementById('faculty-update-active')?.value;
    const employmentValue = document.getElementById('faculty-update-employment')?.value;
    const titleValue = document.getElementById('faculty-update-title')?.value.trim();
    professor.active = activeValue === 'active';
    professor.employmentType = employmentValue || professor.employmentType;
    if (titleValue) professor.baseDesignation = titleValue;
    persistState();
    updateFacultyAPI(professor);
    showBanner(`Updated profile for ${professor.name}.`, 'success');
    renderProgramResources();
    renderDashboard();
    displaySelectedFacultyProfile();
}

function saveNewFacultyProfile() {
    const name = document.getElementById('new-faculty-name')?.value.trim();
    if (!name) {
        showBanner('Please enter the faculty name.', 'error');
        return;
    }
    const programSelect = document.getElementById('new-faculty-program');
    let program = State.activeProgram;
    if (programSelect) {
        const selectedOptions = Array.from(programSelect.selectedOptions).map(o => o.value);
        program = selectedOptions.length ? selectedOptions.join(', ') : State.activeProgram;
    }
    const classification = document.getElementById('new-faculty-classification')?.value || 'Regular';
    const classificationRank = document.getElementById('new-faculty-rank')?.value || '';

    const id = `prof-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;
    const facultyObject = {
        id, name,
        baseDesignation: document.getElementById('new-faculty-designation')?.value || '',
        program,
        employmentType: document.getElementById('new-faculty-employment')?.value || 'Regular',
        classification: classification,
        classificationRank: classificationRank,
        active: true,
        educationalAttainment: {
            baccalaureate: document.getElementById('new-faculty-bacc')?.value || '',
            masters: document.getElementById('new-faculty-master')?.value || '',
            doctorate: document.getElementById('new-faculty-doctorate')?.value || '',
            postBaccalaureate: document.getElementById('new-faculty-postbac')?.value || ''
        },
        licenseNumber: document.getElementById('new-faculty-license')?.value || '',
        specialization: document.getElementById('new-faculty-specialization')?.value || '',
        nationalCertificate: document.getElementById('new-faculty-nc')?.value || '',
        courseHandle: {
            genEd: document.getElementById('new-faculty-gened')?.value || '',
            coreSubject: document.getElementById('new-faculty-core')?.value || '',
            professionalSubject: document.getElementById('new-faculty-professional')?.value || '',
            technicalSubject: document.getElementById('new-faculty-technical')?.value || ''
        },
        research: {
            production: document.getElementById('new-faculty-production')?.value || '0',
            presentation: document.getElementById('new-faculty-presentation')?.value || '0',
            publication: document.getElementById('new-faculty-publication')?.value || '0',
            citation: document.getElementById('new-faculty-citation')?.value || '0'
        },
        extension: document.getElementById('new-faculty-extension')?.value || '',
        natureOfAppointment: document.getElementById('new-faculty-nature')?.value || '',
        preferredSubjects: Array.from(document.getElementById('new-faculty-pref-subjects')?.selectedOptions || [])
            .map(o => o.value.trim())
            .filter(Boolean)
            .join(', '),
        preferredTimes: document.getElementById('new-faculty-pref-times-hidden')?.value.trim() || '',
        remarks: document.getElementById('new-faculty-remarks')?.value || ''
    };

    facultyRegistry.push(facultyObject);
    if (program) {
        program.split(',').map(s => s.trim()).forEach(prog => {
            if (!State.db.programs[prog]) {
                State.db.programs[prog] = { profs: [], sections: [], subjects: {} };
            }
            if (!State.db.programs[prog].profs.includes(name)) {
                State.db.programs[prog].profs.push(name);
            }
        });
    }
    persistState();
    populateFacultyDropdowns();
    populateFacultyProfileDropdown();
    renderProgramResources();
    renderDashboard();
    document.getElementById('new-faculty-form')?.reset();
    showBanner(`Faculty profile for ${name} has been added successfully.`, 'success');

    try {
        if (window.location.pathname.endsWith('add-faculty-profile.html') || window.location.href.includes('add-faculty-profile.html')) {
            window.location.href = `program-resources.html?new=${encodeURIComponent(name)}`;
        }
    } catch (e) { }
}

function updateClassificationRankSelect() {
    const classificationSelect = document.getElementById('new-faculty-classification');
    const rankSelect = document.getElementById('new-faculty-rank');
    if (!classificationSelect || !rankSelect) return;

    const selectedClassification = classificationSelect.value;
    const config = CLASSIFICATION_SYSTEM[selectedClassification];
    rankSelect.innerHTML = '';

    if (config && config.ranks && config.ranks.length > 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Rank';
        rankSelect.appendChild(defaultOption);

        config.ranks.forEach(rank => {
            const option = document.createElement('option');
            option.value = rank.value;
            option.textContent = rank.label;
            rankSelect.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'N/A for this classification';
        rankSelect.appendChild(option);
    }
}

function renderPageSections() {
    renderSYDropdown();
    populateFacultyDropdowns();
    populateFacultyProfileDropdown();
    renderProgramResources();
    if (document.getElementById('load-table')) {
        updateSectionDropdowns();
        updateRoomDropdowns();
        renderLoadTable();
    }
    if (document.getElementById('faculty-calendar-container')) {
        updateFacultyWorkloadDropdown();
    }
    if (document.getElementById('timetable-container')) {
        updateSectionDropdowns();
        renderTimetable();
    }
    if (document.getElementById('room-schedule-preview')) {
        updateRoomDropdowns();
        renderRoomSchedulePreview();
    }
    if (document.getElementById('resource-program-name')) {
        document.getElementById('resource-program-name').innerText = State.activeProgram;
    }
    renderActiveProgramButtons();
    renderDashboard();
    lucide.createIcons();
}

// PROGRAM RESOURCES RENDERING MODULE
// PROGRAM RESOURCES RENDERING MODULE WITH SEPARATED STATUS SUB-LISTS
function renderProgramResources() {
    const program = State.db.programs[State.activeProgram] || { profs: [], sections: [], subjects: {} };
    const facultyObjs = facultyRegistry.filter(f => {
        if (!f.program) return false;
        const programs = f.program.split(',').map(p => p.trim());
        return programs.includes(State.activeProgram);
    });

    // Track count references
    const facultyCountEl = document.getElementById('resource-faculty-count');
    const subjectCountEl = document.getElementById('resource-subject-count');
    const sectionCountEl = document.getElementById('resource-section-count');

    if (facultyCountEl) facultyCountEl.innerText = facultyObjs.length;
    if (sectionCountEl) sectionCountEl.innerText = program.sections ? program.sections.length : 0;
    if (subjectCountEl) {
        let totalCount = 0;
        if (program.subjects && typeof program.subjects === 'object' && !Array.isArray(program.subjects)) {
            Object.values(program.subjects).forEach(yearLvl => {
                Object.values(yearLvl).forEach(semArr => {
                    if (Array.isArray(semArr)) totalCount += semArr.length;
                });
            });
        }
        subjectCountEl.innerText = totalCount;
    }

    if (document.getElementById('resource-program-name')) {
        document.getElementById('resource-program-name').innerText = State.activeProgram;
    }
    renderActiveProgramButtons();

    const yearSelect = document.getElementById('resource-year-select');
    const semesterSelect = document.getElementById('resource-semester-select');
    const yearKeys = Object.keys(program.subjects || {});
    if (yearSelect) {
        yearSelect.innerHTML = `<option value="">All Years</option>` + yearKeys.map(yk => `<option value="${yk}">${yk}</option>`).join('');
        yearSelect.value = State.resourceYearLevel || '';
    }
    const selectedYear = State.resourceYearLevel || yearKeys[0] || '';
    const semesterKeys = selectedYear && program.subjects[selectedYear] ? Object.keys(program.subjects[selectedYear]) : [];
    if (semesterSelect) {
        semesterSelect.innerHTML = `<option value="">All Semesters</option>` + semesterKeys.map(sk => `<option value="${sk}">${sk}</option>`).join('');
        semesterSelect.value = State.resourceSemester || '';
    }

    const facultyList = document.getElementById('resource-faculty-list');
    if (facultyList) {
        facultyList.innerHTML = '';

        // Step 1: Filter based strictly on classification selection criteria 
        let filteredStaff = [...facultyObjs];

        if (State.facultyFilter === 'part-time') filteredStaff = filteredStaff.filter(f => f.employmentType.toLowerCase().includes('part'));
        if (State.facultyFilter === 'regular') filteredStaff = filteredStaff.filter(f => f.employmentType === 'Regular' && (f.baseDesignation.includes('Instructor') || f.baseDesignation.includes('Lecturer') || f.baseDesignation.includes('Professor')));
        if (State.facultyFilter === 'designee') filteredStaff = filteredStaff.filter(f => f.employmentType === 'Regular' && !f.baseDesignation.includes('Instructor') && !f.baseDesignation.includes('Lecturer'));

        if (State.facultyStatusFilter === 'active') filteredStaff = filteredStaff.filter(f => f.active !== false);
        else if (State.facultyStatusFilter === 'inactive') filteredStaff = filteredStaff.filter(f => f.active === false);

        // Step 2: Card Template Component Builder Closure
        const createCard = (f) => {
            const card = document.createElement('div');
            const isProfInactive = f.active === false;

            card.className = `rounded-2xl bg-white p-3 border mb-2 transition-all flex flex-col gap-1.5 ${isProfInactive
                    ? 'opacity-60 border-dashed border-slate-200 bg-slate-50/50'
                    : 'border-slate-100 shadow-xs hover:border-slate-300 cursor-pointer'
                }`;
            card.setAttribute('data-faculty', f.id);

            // Build statuses badge markup explicitly to flag active vs inactive cleanly
            const statusBadge = isProfInactive
                ? `<span class="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">Inactive</span>`
                : `<span class="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">Active</span>`;

            card.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <div class="font-bold text-slate-900 text-xs">${f.name}</div>
                        <div class="text-[10px] text-slate-400 mt-0.5">${getTitleLabel(f)} • ${f.baseDesignation}</div>
                    </div>
                    <div class="flex flex-col items-end gap-1 flex-shrink-0">
                        <div class="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 border text-slate-600 font-medium">${f.employmentType}</div>
                        ${statusBadge}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => selectFaculty(f.id));
            return card;
        };

        // Step 3: Split into sub-arrays according to operational activity status flags
        const activeStaff = filteredStaff.filter(f => f.active !== false);
        const inactiveStaff = filteredStaff.filter(f => f.active === false);

        // Step 4: Render Active block container if matches exist
        if (activeStaff.length > 0) {
            const activeHeaderBlock = document.createElement('div');
            activeHeaderBlock.className = "mb-4";
            activeHeaderBlock.innerHTML = `<div class="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">🟢 Active Faculty (${activeStaff.length})</div>`;

            const activeCardsWrapper = document.createElement('div');
            activeStaff.forEach(f => activeCardsWrapper.appendChild(createCard(f)));
            activeHeaderBlock.appendChild(activeCardsWrapper);
            facultyList.appendChild(activeHeaderBlock);
        }

        // Step 5: Render Inactive block container if matches exist
        if (inactiveStaff.length > 0) {
            const inactiveHeaderBlock = document.createElement('div');
            inactiveHeaderBlock.className = "mb-2 mt-2";
            inactiveHeaderBlock.innerHTML = `<div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">⚫ Inactive Faculty (${inactiveStaff.length})</div>`;

            const inactiveCardsWrapper = document.createElement('div');
            inactiveStaff.forEach(f => inactiveCardsWrapper.appendChild(createCard(f)));
            inactiveHeaderBlock.appendChild(inactiveCardsWrapper);
            facultyList.appendChild(inactiveHeaderBlock);
        }

        // Empty fallbacks handler
        if (filteredStaff.length === 0) {
            facultyList.innerHTML = '<div class="text-gray-400 italic text-xs p-4 text-center">No instructors match this selection choice.</div>';
        }
    }

    // Curriculum render pipelines
    const subjectList = document.getElementById('resource-subject-list');
    if (subjectList) {
        subjectList.innerHTML = '';
        if (!program.subjects || Object.keys(program.subjects).length === 0) {
            subjectList.innerHTML = '<div class="text-gray-500 italic text-xs p-4">No curriculum items loaded for this program.</div>';
        } else {
            const yearsToRender = State.resourceYearLevel ? [State.resourceYearLevel] : Object.keys(program.subjects).sort();
            yearsToRender.forEach(yearKey => {
                if (!program.subjects[yearKey]) return;
                const yearSection = document.createElement('div');
                yearSection.className = 'mb-4 space-y-2';
                yearSection.innerHTML = `<h4 class="text-xs font-bold text-red-900 tracking-wider uppercase border-b pb-1 mb-2">${yearKey} Hierarchy</h4>`;
                const semKeys = State.resourceSemester ? [State.resourceSemester] : Object.keys(program.subjects[yearKey] || {});
                semKeys.forEach(semKey => {
                    if (!program.subjects[yearKey][semKey]) return;
                    const semContainer = document.createElement('div');
                    semContainer.className = 'pl-2 space-y-1.5';
                    semContainer.innerHTML = `<div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">${semKey}</div>`;
                    program.subjects[yearKey][semKey].forEach(sub => {
                        const subRow = document.createElement('div');
                        subRow.className = 'rounded-2xl bg-slate-50 p-3 flex items-center justify-between text-xs hover:bg-slate-100 transition-all cursor-pointer';
                        subRow.setAttribute('role', 'button');
                        subRow.setAttribute('tabindex', '0');
                        subRow.setAttribute('title', 'Click to edit subject');
                        const pName = State.activeProgram || '';
                        subRow.innerHTML = `
                            <span class="font-medium text-gray-800 flex-1">${sub.name} <span class="text-slate-400 font-normal">(${sub.units} units)</span></span>
                            <div class="flex items-center gap-2">
                                <button type="button" class="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700" onclick="event.stopPropagation(); editSubject('${pName.replace(/'/g,"\\'")}','${yearKey.replace(/'/g,"\\'")}','${semKey.replace(/'/g,"\\'")}','${sub.name.replace(/'/g,"\\'")}','${sub.units}')">Edit</button>
                                <button type="button" onclick="event.stopPropagation(); deleteSubjectWithVerification('${pName.replace(/'/g,"\\'")}','${yearKey.replace(/'/g,"\\'")}','${semKey.replace(/'/g,"\\'")}','${sub.name.replace(/'/g,"\\'")}')" class="ml-1 flex-shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition" title="Remove subject">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        `;
                        subRow.onclick = () => editSubject(pName, yearKey, semKey, sub.name, sub.units);
                        subRow.onkeydown = (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                editSubject(pName, yearKey, semKey, sub.name, sub.units);
                            }
                        };
                        semContainer.appendChild(subRow);
                    });
                    yearSection.appendChild(semContainer);
                });
                subjectList.appendChild(yearSection);
            });
        }
    }

    const sectionList = document.getElementById('resource-section-list');
    if (sectionList) {
        sectionList.innerHTML = (program.sections || []).map(section => `
            <div class="rounded-3xl bg-slate-50 p-4 flex items-center justify-between">
                <span class="text-xs font-medium text-slate-800">${section}</span>
                <button class="text-slate-400 hover:text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button>
            </div>
        `).join('') || '<div class="text-gray-500 italic text-xs p-4">No active sections mapped yet.</div>';
    }
}

function setResourceYearLevel(value) {
    State.resourceYearLevel = value;
    if (!value) State.resourceSemester = '';
    renderProgramResources();
}

function renderFacultyStatusPage() {
    const pageContainer = document.getElementById('faculty-status-content');
    if (!pageContainer) return;

    renderActiveProgramButtons();
    const programNames = Object.keys(State.db.programs).sort();
    if (programNames.length === 0) {
        pageContainer.innerHTML = '<div class="rounded-3xl bg-white p-6 border border-slate-200 text-slate-600">No programs are configured yet.</div>';
        return;
    }

    const activeProgram = State.activeProgram && State.db.programs[State.activeProgram] ? State.activeProgram : programNames[0];
    if (!State.activeProgram) State.activeProgram = activeProgram;

    const programOptions = programNames.map(program => `
        <option value="${program}" ${program === activeProgram ? 'selected' : ''}>${program}</option>
    `).join('');

    const facultyObjs = facultyRegistry.filter(f => {
        if (!f.program) return false;
        const programs = f.program.split(',').map(p => p.trim());
        return programs.includes(activeProgram);
    });
    const activeStaff = facultyObjs.filter(f => f.active !== false);
    const inactiveStaff = facultyObjs.filter(f => f.active === false);

    const buildFacultyCards = (list) => {
        if (!list.length) {
            return '<div class="text-gray-500 italic text-sm">No faculty found for this status.</div>';
        }
        return list.map(f => `
            <button type="button" onclick="selectFaculty('${f.id}')" class="w-full text-left rounded-3xl border border-slate-200 bg-slate-50 p-4 mb-3 hover:bg-slate-100 transition-all">
                <div class="flex justify-between gap-4 items-start">
                    <div>
                        <div class="text-sm font-semibold text-slate-900">${f.name}</div>
                        <div class="text-[11px] text-slate-500 mt-1">${getTitleLabel(f)} • ${f.baseDesignation}</div>
                    </div>
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${f.active === false ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}">${f.active === false ? 'Inactive' : 'Active'}</span>
                </div>
            </button>
        `).join('');
    };

    pageContainer.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
                <div class="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                    <div class="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h3 class="text-xl font-bold text-slate-900">Faculty Status Overview</h3>
                            <p class="text-sm text-slate-500 mt-1">Review active and inactive instructors by program.</p>
                        </div>
                        <button type="button" onclick="openEditActiveProgramModal()" class="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200">Rename Program</button>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                            <p class="text-xs uppercase tracking-widest text-slate-400 font-semibold">Program</p>
                            <p class="mt-2 font-semibold text-slate-900">${activeProgram}</p>
                        </div>
                        <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                            <p class="text-xs uppercase tracking-widest text-slate-400 font-semibold">Active Faculty</p>
                            <p class="mt-2 font-semibold text-emerald-700">${activeStaff.length}</p>
                        </div>
                        <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                            <p class="text-xs uppercase tracking-widest text-slate-400 font-semibold">Inactive Faculty</p>
                            <p class="mt-2 font-semibold text-red-700">${inactiveStaff.length}</p>
                        </div>
                    </div>
                </div>
                <div class="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                    <label class="block text-sm font-semibold text-slate-700 mb-2">Select Program</label>
                    <select id="faculty-status-program-select" onchange="handleFacultyStatusProgramChange(event)" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                        ${programOptions}
                    </select>
                    <div class="mt-4 text-sm text-slate-500">Tap a faculty tile to open their profile page.</div>
                </div>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div class="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                    <div class="text-sm font-semibold text-slate-900 mb-4">🟢 Active Faculty (${activeStaff.length})</div>
                    ${buildFacultyCards(activeStaff)}
                </div>
                <div class="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                    <div class="text-sm font-semibold text-slate-900 mb-4">⚫ Inactive Faculty (${inactiveStaff.length})</div>
                    ${buildFacultyCards(inactiveStaff)}
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function handleFacultyStatusProgramChange(event) {
    const programName = event.target.value;
    setActiveProgram(programName);
    renderFacultyStatusPage();
}

function setResourceSemester(value) {
    State.resourceSemester = value;
    renderProgramResources();
}

function renderSYDropdown() {
    const sel = document.getElementById('sy-selector');
    if (!sel) return;
    sel.innerHTML = State.db.schoolYears.map(sy => `<option value="${sy}">${sy}</option>`).join('');
    if (!sel.value) sel.value = State.db.schoolYears[0] || '';
}

function getProfessorLoadTotals(profName, sy, semester, excludeLoadId) {
    const currentSy = sy || document.getElementById('sy-selector')?.value || State.db.schoolYears[0];
    const currentSem = semester || document.getElementById('ld-semester')?.value || '1';

    return State.db.loads.filter(l => {
        // Filter out the load being edited
        if (excludeLoadId && String(l.id) === String(excludeLoadId)) return false;
        
        // Match professor name
        if (l.prof !== profName) return false;
        
        // Match school year
        if (currentSy && l.sy !== currentSy) return false;
        
        // Match semester
        if (currentSem && l.semester) {
            const semVal = currentSem.toString();
            const lSemVal = l.semester.toString();
            const semMap = { '1': '1st Semester', '2': '2nd Semester', '3': 'Summer Term' };
            if (semMap[semVal] !== lSemVal && semMap[lSemVal] !== semVal && semVal !== lSemVal) {
                return false;
            }
        }
        return true;
    }).reduce((acc, load) => {
        if (load.loadType === 'Regular Load') acc.regular += load.units || 0;
        if (load.loadType === 'Part-Time Load') acc.partTime += load.units || 0;
        if (load.loadType === 'Temporary Substitute Load') acc.substitute += load.units || 0;
        acc.total += load.units || 0;
        return acc;
    }, { total: 0, regular: 0, partTime: 0, substitute: 0 });
}

function canAssignLoad(profName, loadType, units, sy, semester, excludeLoadId) {
    try {
        const faculty = facultyRegistry.find(f => f.name === profName || String(f.id) === String(profName));
        if (!faculty) {
            return { allowed: false, reason: `Faculty member not found: ${profName}` };
        }

        const classConfig = CLASSIFICATION_SYSTEM[faculty.classification];
        if (!classConfig) {
            return { allowed: false, reason: `Unknown classification: ${faculty.classification}` };
        }

        const totals = getProfessorLoadTotals(profName, sy, semester, excludeLoadId);
        const caps = classConfig.loadLimits || {};
        const maxUnits = classConfig.totalMaxLoad || 45;

        // Check total load ceiling
        if ((totals.total || 0) + units > maxUnits) {
            return { allowed: false, reason: `Total load exceeds ${maxUnits} units (current: ${totals.total || 0} units)` };
        }

        // Check per-type cap
        const typeCap = caps[loadType];
        if (typeCap === undefined) {
            return { allowed: false, reason: `Faculty classification '${faculty.classification}' is not allowed to take '${loadType}'` };
        }

        if (typeCap !== 'flexible') {
            const loadTypeKey = loadType === 'Regular Load' ? 'regular' : loadType === 'Part-Time Load' ? 'partTime' : 'substitute';
            const currentUnits = totals[loadTypeKey] || 0;
            if (currentUnits + units > typeCap) {
                return { allowed: false, reason: `${loadType} limit is ${typeCap} units. Current: ${currentUnits} units. Cannot add ${units} units.` };
            }
        }

        return { allowed: true };
    } catch (err) {
        console.error('canAssignLoad error:', err);
        return { allowed: false, reason: "An internal error occurred while validating the load." };
    }
}

function updateSectionDropdowns() {
    const sel = document.getElementById('view-section-select');
    if (!sel) return;
    const program = State.db.programs[State.activeProgram] || { sections: [] };
    sel.innerHTML = program.sections.map(s => `<option>${s}</option>`).join('') || '<option disabled>No Sections</option>';
}

function updateRoomDropdowns() {
    const sel = document.getElementById('view-room-select');
    if (!sel) return;
    const buildingSelect = document.getElementById('view-building-select');
    const building = buildingSelect?.value;
    const rooms = building && building !== 'All'
        ? getRoomsByBuilding(building)
        : getAllRoomNames();
    sel.innerHTML = rooms.length
        ? rooms.map(r => `<option>${r}</option>`).join('')
        : '<option disabled>No Rooms</option>';
    renderRoomSchedulePreview();
}

function renderLoadTable() {
    const table = document.getElementById('load-table');
    if (!table) return;
    const data = State.db.loads.filter(l => l.program === State.activeProgram);
    table.innerHTML = data.map(l => {
        const labelClass = l.loadType === 'Part-Time Load'
            ? 'text-blue-600 bg-blue-50 border border-blue-200'
            : 'text-emerald-600 bg-emerald-50 border border-emerald-200';
        return `
            <tr class="border-b hover:bg-gray-50 transition-colors">
                <td class="p-4 font-bold text-red-900">${l.prof}</td>
                <td class="p-4 text-xs font-semibold">
                    <div class="text-slate-900 text-sm font-semibold mb-1">${l.sub} (${l.units || 3}u)</div>
                    <span class="inline-block text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${labelClass}">${l.loadType || 'Regular Load'}</span>
                </td>
                <td class="p-4">
                    <div><span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-[10px] font-bold">${l.sec}</span></div>
                    <div class="mt-2 text-[10px] text-slate-600">Room ${l.room}</div>
                </td>
                <td class="p-4 text-[10px] font-medium text-gray-500">
                    ${l.day}<br>
                    <span class="text-gray-900 font-bold">${l.time}</span><br>
                    <span class="text-[10px] font-semibold text-gray-700">${l.building}</span>
                </td>
                <td class="p-4 text-right space-x-2">
                    <button onclick="editLoad(${l.id})" class="text-blue-500 hover:underline text-[10px] font-bold">EDIT</button>
                    <button onclick="deleteLoad(${l.id})" class="text-red-500 hover:underline text-[10px] font-bold">CANCEL</button>
                </td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="5" class="p-10 text-center text-gray-300 italic">No assignments found for this program.</td></tr>`;
}

function getYearLevelFromSection(sectionName) {
    if (!sectionName) return '1st Year';
    if (sectionName.includes('1-')) return '1st Year';
    if (sectionName.includes('2-')) return '2nd Year';
    if (sectionName.includes('3-')) return '3rd Year';
    if (sectionName.includes('4-')) return '4th Year';
    return '1st Year';
}

function parsePreferredTimes(preferredTimesStr) {
    const dayRanges = {
        'monday': [],
        'tuesday': [],
        'wednesday': [],
        'thursday': [],
        'friday': [],
        'saturday': [],
        'sunday': []
    };
    
    if (!preferredTimesStr || preferredTimesStr.trim() === '') return dayRanges;
    
    const parts = preferredTimesStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    let accumulatedDays = [];
    
    for (const part of parts) {
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        let matchedDay = null;
        
        for (const d of dayNames) {
            if (part.includes(d)) {
                matchedDay = d;
                break;
            }
        }
        
        const hasTimeRange = part.includes('-') && (part.includes('am') || part.includes('pm') || part.includes(':'));
        
        if (matchedDay) {
            if (hasTimeRange) {
                const timeStr = part.replace(matchedDay, '').trim();
                dayRanges[matchedDay].push(timeStr);
                
                for (const accDay of accumulatedDays) {
                    dayRanges[accDay].push(timeStr);
                }
                accumulatedDays = [];
            } else {
                accumulatedDays.push(matchedDay);
            }
        } else if (hasTimeRange) {
            for (const accDay of accumulatedDays) {
                dayRanges[accDay].push(part);
            }
            accumulatedDays = [];
        }
    }
    
    for (const accDay of accumulatedDays) {
        dayRanges[accDay].push('all-day');
    }
    
    return dayRanges;
}

function isPreferredTime(day, range, preferredTimes) {
    if (!preferredTimes || preferredTimes.trim() === '') return true;

    const dayRanges = parsePreferredTimes(preferredTimes);
    const targetDay = day.toLowerCase().trim();
    const ranges = dayRanges[targetDay];
    
    if (!ranges || ranges.length === 0) {
        return false;
    }
    
    if (ranges.includes('all-day')) {
        return true;
    }
    
    const proposed = parseTimeRange(range);
    
    return ranges.some(r => {
        const parts = r.split('-').map(p => p.trim());
        if (parts.length !== 2) return false;
        
        try {
            const parseShortTime = (str) => {
                let s = str.toUpperCase().trim();
                let period = 'AM';
                if (s.includes('PM')) {
                    period = 'PM';
                    s = s.replace('PM', '').trim();
                } else if (s.includes('AM')) {
                    s = s.replace('AM', '').trim();
                }
                
                let hours = 0;
                let minutes = 0;
                if (s.includes(':')) {
                    const [h, m] = s.split(':').map(Number);
                    hours = h;
                    minutes = m;
                } else {
                    hours = Number(s);
                }
                
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
                return hours * 60 + minutes;
            };

            const prefStart = parseShortTime(parts[0]);
            const prefEnd = parseShortTime(parts[1]);

            return proposed.start >= prefStart && proposed.end <= prefEnd;
        } catch (e) {
            console.error('Failed to parse preferred time window:', r, e);
            return false;
        }
    });
}

function isPreferredCalendarSlot(day, startTime, preferredTimes) {
    if (!preferredTimes || !preferredTimes.trim()) return false;
    const endMinutes = parseTimeStr(startTime) + 30;
    const range = `${startTime} - ${formatTime(endMinutes)}`;
    return isPreferredTime(day, range, preferredTimes);
}

function getPreferredSummary(faculty) {
    if (!faculty) return '';
    const subjects = faculty.preferredSubjects ? faculty.preferredSubjects.split(',').map(s => s.trim()).filter(Boolean) : [];
    const times = faculty.preferredTimes ? parsePreferredTimeEntries(faculty.preferredTimes) : [];
    const subjectText = subjects.length ? `Preferred subjects: ${subjects.join(', ')}` : '';
    const timeText = times.length ? `Preferred times: ${times.join(', ')}` : '';
    return [subjectText, timeText].filter(Boolean).join(' · ');
}

function populateModalSubjects() {
    const program = State.db.programs[State.activeProgram];
    if (!program || !program.subjects) return;

    const selectedSec = document.getElementById('ld-sec')?.value || document.getElementById('load-section-selector')?.value;
    const selectedSemValue = document.getElementById('ld-semester')?.value || document.getElementById('load-semester-selector')?.value || '1';

    let semKey = '1st Semester';
    if (selectedSemValue === '2') semKey = '2nd Semester';
    else if (selectedSemValue === '3') semKey = 'Summer Term';

    const yearKey = getYearLevelFromSection(selectedSec || '');

    let filteredSubjects = [];
    if (program.subjects[yearKey] && program.subjects[yearKey][semKey]) {
        filteredSubjects = program.subjects[yearKey][semKey];
    }

    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears[0];

    const subSelect = document.getElementById('ld-sub');
    if (subSelect) {
        const currentSubVal = subSelect.value;
        const professor = facultyRegistry.find(f => f.name === document.getElementById('ld-prof')?.value);
        const preferredSubjects = professor && professor.preferredSubjects
            ? professor.preferredSubjects.split(',').map(s => s.trim()).filter(Boolean)
            : [];
        const preferredSet = new Set(preferredSubjects);
        const sortedSubjects = [...filteredSubjects].sort((a, b) => {
            const aPref = preferredSet.has(a.name) ? 0 : 1;
            const bPref = preferredSet.has(b.name) ? 0 : 1;
            if (aPref !== bPref) return aPref - bPref;
            return a.name.localeCompare(b.name);
        });

        subSelect.innerHTML = sortedSubjects.length
            ? sortedSubjects.map(sub => {
                const assignedUnits = State.db.loads
                    .filter(l => 
                        l.sub === sub.name && 
                        l.sec === selectedSec && 
                        l.sy === sy &&
                        String(l.semester) === String(selectedSemValue) &&
                        String(l.id) !== String(currentLoadEditId)
                    )
                    .reduce((total, l) => total + Number(l.units || 0), 0);
                const remaining = sub.units - assignedUnits;
                const disabled = remaining <= 0 ? 'disabled' : '';
                const preferred = preferredSet.has(sub.name);
                const label = remaining <= 0
                    ? `${sub.name} (Completed)`
                    : `${sub.name} (${sub.units}u) - ${remaining}u left${preferred ? ' • Preferred' : ''}`;
                return `<option value="${sub.name}" data-units="${sub.units}" ${disabled}>${label}</option>`;
            }).join('')
            : '<option disabled>No subjects available for this semester</option>';
        if (currentSubVal && filteredSubjects.some(sub => sub.name === currentSubVal)) {
            subSelect.value = currentSubVal;
        }
    }
}

function openLoadModal(loadId = null) {
    const program = State.db.programs[State.activeProgram];
    if (!program) return alert('No active program selected!');
    const load = loadId ? State.db.loads.find(l => l.id === loadId) : null;
    currentLoadEditId = load?.id || null;

    if (!program.profs) program.profs = [];
    if (!program.sections) program.sections = [];
    if (!program.subjects) program.subjects = {};
    State.db.rooms = State.db.rooms || [];
    State.db.buildings = State.db.buildings || [];

    if (program.profs.length === 0 || program.sections.length === 0) return alert('Add faculty and sections first!');

    document.getElementById('modal-load-title').innerText = load ? 'EDIT ASSIGNMENT' : 'ASSIGN CLASS LOAD';
    document.getElementById('save-load-button').innerText = load ? 'Update Assignment' : 'Apply to Schedule';
    
    const delBtn = document.getElementById('delete-load-button');
    if (delBtn) {
        if (load) {
            delBtn.classList.remove('hidden');
        } else {
            delBtn.classList.add('hidden');
        }
    }

    // Build prof list from facultyRegistry (use names, not raw IDs from program.profs)
    const allProfNames = facultyRegistry.map(f => f.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const profSelect = document.getElementById('ld-prof');
    profSelect.innerHTML = allProfNames.length ? allProfNames.map(pname => `<option value="${pname}">${pname}</option>`).join('') : '<option disabled>No professors available</option>';

    document.getElementById('ld-sec').innerHTML = program.sections.map(x => `<option>${x}</option>`).join('');

    // Bind change listeners to trigger subject and time filtering dynamically
    profSelect.onchange = () => {
        updateLoadTypesForProfessor();
        populateModalSubjects();
        refreshTimeSlots();
    };

    document.getElementById('ld-sec').onchange = () => {
        populateModalSubjects();
        refreshTimeSlots();
    };

    document.getElementById('ld-semester').onchange = () => {
        populateModalSubjects();
        refreshTimeSlots();
    };

    // Populate buildings dropdown
    document.getElementById('ld-building').innerHTML = State.db.buildings.map(x => `<option>${x}</option>`).join('');

    // Initialize room dropdown with all rooms or filtered by default building
    const buildingSelect = document.getElementById('ld-building');
    const roomSelect = document.getElementById('ld-room');
    if (buildingSelect && roomSelect) {
        const selectedBuilding = buildingSelect.value || State.db.buildings[0];
        const roomsForBuilding = getRoomsByBuilding(selectedBuilding);
        roomSelect.innerHTML = roomsForBuilding.map(r => `<option>${r}</option>`).join('') || '<option disabled>No rooms available</option>';

        buildingSelect.onchange = function () {
            const building = this.value;
            const rooms = getRoomsByBuilding(building);
            roomSelect.innerHTML = rooms.map(r => `<option>${r}</option>`).join('') || '<option disabled>No rooms available</option>';
            refreshTimeSlots();
        };
    }

    document.getElementById('ld-day').innerHTML = Days.map(x => `<option>${x}</option>`).join('');

    if (load) {
        document.getElementById('ld-prof').value = load.prof;
        document.getElementById('ld-sec').value = load.sec;
        document.getElementById('ld-semester').value = load.semester || '1';
        document.getElementById('ld-room').value = load.room;
        document.getElementById('ld-building').value = load.building;
        document.getElementById('ld-day').value = load.day;
        document.getElementById('ld-units').value = load.units || 3;
        document.getElementById('ld-category').value = load.loadType || 'Regular Load';
    } else {
        document.getElementById('ld-category').value = 'Regular Load';
        if (document.getElementById('ld-semester')) {
            document.getElementById('ld-semester').value = '1';
        }
    }

    // Populate filtered subjects and initial load types/time slots
    populateModalSubjects();
    updateLoadTypesForProfessor();
    refreshTimeSlots();

    // Attach event listener to units input to refresh time slots when units change
    const unitsInput = document.getElementById('ld-units');
    if (unitsInput) {
        unitsInput.addEventListener('change', refreshTimeSlots);
        unitsInput.addEventListener('input', refreshTimeSlots);
    }

    if (load) {
        document.getElementById('ld-sub').value = load.sub;
        document.getElementById('ld-time').value = load.time;
    }
    document.getElementById('modal-load').classList.remove('hidden');
    lucide.createIcons();
}

function updateLoadTypesForProfessor() {
    const prof = document.getElementById('ld-prof')?.value;
    const categorySelect = document.getElementById('ld-category');
    if (!prof || !categorySelect) return;

    const faculty = facultyRegistry.find(f => f.name === prof);
    const availableTypes = faculty ? getAvailableLoadTypes(faculty) : ['Regular Load', 'Part-time Load'];

    categorySelect.innerHTML = availableTypes.map(type => `<option value="${type}">${type}</option>`).join('');
}

function refreshTimeSlots() {
    const day = document.getElementById('ld-day')?.value;
    const prof = document.getElementById('ld-prof')?.value;
    const sec = document.getElementById('ld-sec')?.value;
    const room = document.getElementById('ld-room')?.value;
    const sub = document.getElementById('ld-sub');
    const category = document.getElementById('ld-category')?.value;
    const unitsInput = document.getElementById('ld-units');
    const timeSelect = document.getElementById('ld-time');
    if (!timeSelect) return;

    let units = Number(unitsInput?.value);
    if (!units || units < 1) {
        const subjectUnits = Number(sub?.selectedOptions[0]?.dataset?.units || 3);
        units = Math.max(1, subjectUnits);
        if (unitsInput) unitsInput.value = units;
    }

    const faculty = facultyRegistry.find(f => f.name === prof);
    const startTimes = TimeStarts.filter(start => {
        const range = getTimeRange(start, units);
        if (faculty && faculty.preferredTimes) {
            return isPreferredTime(day, range, faculty.preferredTimes);
        }
        return true;
    });

    timeSelect.innerHTML = startTimes.map(start => {
        const range = getTimeRange(start, units);
        const target = parseTimeRange(range);
        const conflictLoad = day && prof && room && sec ? findConflict(day, target, prof, room, sec, currentLoadEditId) : null;
        const disabled = conflictLoad ? 'disabled' : '';
        const label = conflictLoad ? ' • conflict' : '';
        return `<option value="${range}" ${disabled}>${range}${label}</option>`;
    }).join('') || '<option disabled>No preferred times on this day</option>';
}

function saveLoad() {
    const time = document.getElementById('ld-time')?.value;
    const sub = document.getElementById('ld-sub')?.value;
    const day = document.getElementById('ld-day')?.value;
    const loadCategory = document.getElementById('ld-category')?.value;
    const prof = document.getElementById('ld-prof')?.value;
    const units = Math.max(1, Math.floor(Number(document.getElementById('ld-units')?.value || 3)));
    const sec = document.getElementById('ld-sec')?.value;
    const room = document.getElementById('ld-room')?.value;
    const building = document.getElementById('ld-building')?.value || State.db.buildings?.[0] || 'Main Building';
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears[0];
    const semester = document.getElementById('ld-semester')?.value || '1';

    if (!time || !sub || !day || !prof || !sec || !room) {
        showBanner('Please complete all assignment fields.', 'error');
        return;
    }

    // Subject Unit Validation
    const yearKey = getYearLevelFromSection(sec || '');
    let semKey = '1st Semester';
    if (semester === '2') semKey = '2nd Semester';
    else if (semester === '3') semKey = 'Summer Term';

    const programData = State.db.programs[State.activeProgram];
    if (programData && programData.subjects && programData.subjects[yearKey] && programData.subjects[yearKey][semKey]) {
        const subjectData = programData.subjects[yearKey][semKey].find(s => s.name === sub);
        if (subjectData) {
            const assignedUnits = State.db.loads
                .filter(l => 
                    l.sub === sub && 
                    l.sec === sec && 
                    l.sy === sy &&
                    String(l.semester) === String(semester) &&
                    String(l.id) !== String(currentLoadEditId)
                )
                .reduce((total, l) => total + Number(l.units || 0), 0);
            
            if (assignedUnits + units > subjectData.units) {
                if (typeof showErrorModal === 'function') {
                    showErrorModal('Subject Unit Limit Exceeded', `The subject ${sub} only has ${subjectData.units - assignedUnits} units remaining for this section. You tried to assign ${units} units.`);
                } else {
                    showBanner(`Subject Unit Limit Exceeded for ${sub}`, 'error');
                }
                return;
            }
        }
    }

    // Check classification-based load limits
    const validation = canAssignLoad(prof, loadCategory, units);
    if (!validation.allowed) {
        showErrorModal('Load Limit Exceeded', validation.reason);
        return;
    }

    // Check for schedule conflicts
    const load = {
        id: currentLoadEditId || Date.now(),
        prof, sub, units, loadType: loadCategory, sec, room, building, day, time, sy, semester,
        program: State.activeProgram
    };

    const parsedTarget = parseTimeRange(load.time);
    const conflict = State.db.loads.find(l => {
        if (l.id === load.id) return false;
        if (l.day !== load.day) return false;
        if (!rangesOverlap(parsedTarget, parseTimeRange(l.time))) return false;
        if (l.prof === load.prof) return true;
        if (l.room === load.room) return true;
        if (l.sec === load.sec) return true;
        return false;
    });

    if (conflict) {
        showBanner(`Time conflict found with: Professor: ${conflict.prof}, Room: ${conflict.room}, Section: ${conflict.sec}, Time: ${conflict.time}`, 'error');
        return;
    }

    if (currentLoadEditId) {
        const existing = State.db.loads.find(l => l.id === currentLoadEditId);
        if (existing) Object.assign(existing, load);
    } else {
        State.db.loads.push(load);
    }

    currentLoadEditId = null;
    persistState();
    document.getElementById('modal-load').classList.add('hidden');
    showBanner(`Load assignment saved successfully for ${prof}.`, 'success');
    renderPageSections();
}

function editLoad(id) { openLoadModal(id); }
function deleteLoad(id) {
    State.db.loads = State.db.loads.filter(l => l.id !== id);
    persistState();
    renderPageSections();
}

function deleteCurrentEditLoad() {
    if (currentLoadEditId) {
        if (confirm('Are you sure you want to remove this scheduled load?')) {
            deleteLoad(currentLoadEditId);
            // Reset the form
            currentLoadEditId = null;
            openLoadModal(); 
            showBanner('Load assignment removed.', 'success');
        }
    }
}

function renderRoomSchedulePreview() {
    const preview = document.getElementById('room-schedule-preview');
    if (!preview) return;
    const room = document.getElementById('view-room-select')?.value;
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears[0];
    const building = document.getElementById('view-building-select')?.value || 'All';
    if (!room) {
        preview.innerHTML = '<div class="text-gray-500 italic text-xs">Select a room to preview schedules.</div>';
        return;
    }
    const semester = document.getElementById('semester-selector')?.value || 'All';
    const semMap = { '1': '1st Semester', '2': '2nd Semester', '3': 'Summer', 'Summer': 'Summer' };
    const loads = State.db.loads
        .filter(l => {
            if (l.room !== room || l.sy !== sy) return false;
            if (building && building !== 'All' && l.building !== building) return false;
            if (semester !== 'All') {
                const lSem = (l.semester || '1').toString();
                const filterSem = semester.toString();
                const lSemLabel = semMap[lSem] || lSem;
                const filterLabel = semMap[filterSem] || filterSem;
                if (lSemLabel !== filterLabel && lSem !== filterSem) return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (a.day !== b.day) return Days.indexOf(a.day) - Days.indexOf(b.day);
            return parseTimeRange(a.time).start - parseTimeRange(b.time).start;
        });
    if (loads.length === 0) {
        preview.innerHTML = `<div class="text-gray-500 italic text-xs">No scheduled classes found for ${room}.</div>`;
        return;
    }
    const scheduleMap = {}; const skipCell = {};
    Days.forEach(day => { scheduleMap[day] = {}; skipCell[day] = {}; });
    loads.forEach(load => {
        const start = load.time.split(' - ')[0];
        const startIndex = TimeStarts.indexOf(start);
        if (startIndex === -1) return;
        const span = (load.units || 3) * 2;
        scheduleMap[load.day][start] = { load, span };
        for (let offset = 1; offset < span; offset++) {
            const slot = TimeStarts[startIndex + offset];
            if (slot) skipCell[load.day][slot] = true;
        }
    });
    let html = `<div class="overflow-x-auto"><table class="min-w-full border-collapse text-[11px]"><thead><tr><th class="border bg-slate-100 px-3 py-2 text-left uppercase text-slate-500">TIME </th>${Days.map(day => `<th class="border bg-slate-100 px-3 py-2 text-left uppercase text-slate-500">${day}</th>`).join('')}</tr></thead><tbody>`;
    TimeStarts.forEach(start => {
        html += `<tr class="odd:bg-white even:bg-slate-50/50"><td class="border px-3 py-1.5 font-semibold text-slate-500">${start}</td>`;
        Days.forEach(day => {
            if (skipCell[day][start]) return;
            const entry = scheduleMap[day][start];
            if (entry) {
                const palette = getProgramPalette(entry.load.program);
                const cellBg = palette ? palette.row : 'bg-amber-100 text-amber-900';
                const badgeCls = palette ? palette.badge : 'bg-amber-200 text-amber-800';
                const borderCls = palette ? palette.border : 'border-amber-300';
                const semMapDisp = { '1': '1st Sem', '2': '2nd Sem', '3': 'Summer', '1st Semester': '1st Sem', '2nd Semester': '2nd Sem', 'Summer': 'Summer' };
                const semLabel = semMapDisp[entry.load.semester] || entry.load.semester || '';
                html += `<td rowspan="${entry.span}" class="border-2 ${borderCls} p-2 align-top ${cellBg} rounded-sm">
                    <div class="font-black text-[11px] leading-tight mb-0.5">${entry.load.sub}</div>
                    <div class="text-[10px] font-semibold text-slate-700 leading-tight">${entry.load.prof}</div>
                    <div class="text-[10px] text-slate-600 leading-tight">${entry.load.program || ''} · ${entry.load.sec}</div>
                    <div class="text-[9px] text-slate-500 leading-tight mt-0.5">${entry.load.time || ''}</div>
                    <div class="flex items-center gap-1 mt-1 flex-wrap">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${badgeCls}">${semLabel}</span>
                        <span class="text-[9px] text-slate-500 font-medium">${entry.load.room} · ${entry.load.building}</span>
                    </div>
                </td>`;
            } else {
                html += `<td class="border bg-white"></td>`;
            }
        });
        html += `</tr>`;
    });
    preview.innerHTML = html + `</tbody></table></div>`;
}

function filterWorkloadProfessorsByProgram() {
    const sel = document.getElementById('view-faculty-select');
    const programFilter = document.getElementById('workload-program-filter');
    if (!sel || !programFilter) return;

    const selectedProgram = programFilter.value;
    const currentSelectedProf = sel.value;

    let filteredProfs = facultyRegistry;
    if (selectedProgram !== 'All') {
        filteredProfs = facultyRegistry.filter(f => {
            if (!f.program) return false;
            const programs = f.program.split(',').map(p => p.trim().toLowerCase());
            return programs.includes(selectedProgram.toLowerCase());
        });
    }

    const profNames = filteredProfs.map(f => f.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
    
    sel.innerHTML = profNames.length 
        ? profNames.map(p => `<option value="${p}">${p}</option>`).join('')
        : '<option disabled>No professors available for this program</option>';

    if (currentSelectedProf && profNames.includes(currentSelectedProf)) {
        sel.value = currentSelectedProf;
    }
}

function updateFacultyWorkloadDropdown() {
    const sel = document.getElementById('view-faculty-select');
    const programFilter = document.getElementById('workload-program-filter');
    const container = document.getElementById('faculty-calendar-container');
    if (!sel || !container || !programFilter) return;

    if (programFilter.options.length <= 1) {
        const programs = Object.keys(State.db.programs || {}).sort((a, b) => a.localeCompare(b));
        programFilter.innerHTML = ['<option value="All">All Programs</option>', ...programs.map(p => `<option value="${p}">${p}</option>`)].join('');
        
        programFilter.onchange = () => {
            filterWorkloadProfessorsByProgram();
            renderFacultyCalendar();
        };
    }

    filterWorkloadProfessorsByProgram();

    if (sel.value) renderFacultyCalendar();
}

function renderFacultyCalendar() {
    const container = document.getElementById('faculty-calendar-container');
    const headerStats = document.getElementById('workload-header-stats');
    const loadTypesSummary = document.getElementById('workload-type-summary');
    const subtitle = document.getElementById('workload-page-subtitle');
    const prof = document.getElementById('view-faculty-select')?.value;
    if (!container || !headerStats || !loadTypesSummary || !subtitle) return;
    if (!prof) {
        subtitle.innerText = 'Program: Information Technology';
        headerStats.innerHTML = '';
        loadTypesSummary.innerHTML = '';
        container.innerHTML = '<div class="text-gray-500 italic text-xs">Select a professor.</div>';
        return;
    }
    const programFilter = document.getElementById('workload-program-filter')?.value || 'All';
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears[0];
    const semester = document.getElementById('semester-selector')?.value || 'All';
    const semMap = { '1': '1st Semester', '2': '2nd Semester', '3': 'Summer', 'Summer': 'Summer' };
    const loads = State.db.loads.filter(l => {
        if (l.prof !== prof || l.sy !== sy) return false;
        if (programFilter !== 'All' && l.program !== programFilter) return false;
        if (semester !== 'All') {
            const lSem = (l.semester || '1').toString();
            const filterSem = semester.toString();
            const lSemLabel = semMap[lSem] || lSem;
            const filterLabel = semMap[filterSem] || filterSem;
            if (lSemLabel !== filterLabel && lSem !== filterSem) return false;
        }
        return true;
    });
    const programName = displayProfessorProgram(prof) || State.activeProgram;
    const palette = getProgramPalette(programName);
    subtitle.innerHTML = `Professor: ${prof} · <span class="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${palette ? palette.pill : 'bg-slate-100 text-slate-700'}">${programName}</span>`;
    headerStats.innerHTML = renderWorkloadHeaderStats(loads, prof, sy, programName);
    loadTypesSummary.innerHTML = renderWorkloadTypeSummary(loads);

    const scheduleMap = {}; const skipCell = {};
    Days.forEach(day => { scheduleMap[day] = {}; skipCell[day] = {}; });
    loads.forEach(load => {
        const start = load.time.split(' - ')[0];
        const startIndex = TimeStarts.indexOf(start);
        if (startIndex === -1) return;
        const span = Math.max(1, (load.units || 3) * 2);
        scheduleMap[load.day][start] = { load, span };
        for (let offset = 1; offset < span; offset++) {
            const slot = TimeStarts[startIndex + offset];
            if (slot) skipCell[load.day][slot] = true;
        }
    });
    let html = `<div class="overflow-x-auto"><table class="min-w-full border-collapse text-[11px]"><thead><tr><th class="border bg-slate-100 px-3 py-2 text-left text-slate-500 uppercase">TIME</th>${Days.map(day => `<th class="border bg-slate-100 px-3 py-2 text-left text-slate-500 uppercase">${day}</th>`).join('')}</tr></thead><tbody>`;
    TimeStarts.forEach(start => {
        html += `<tr class="odd:bg-white even:bg-slate-50/50"><td class="border px-3 py-1.5 font-semibold text-slate-500">${start}</td>`;
        Days.forEach(day => {
            if (skipCell[day][start]) return;
            const entry = scheduleMap[day][start];
            if (entry) {
                let cellClasses = 'bg-slate-50 text-slate-800 border-slate-200';
                if (entry.load.loadType === 'Regular Load') {
                    cellClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                } else if (entry.load.loadType === 'Part-Time Load' || entry.load.loadType === 'Part-time Load') {
                    cellClasses = 'bg-sky-50 text-sky-800 border-sky-200';
                } else if (entry.load.loadType === 'Temporary Substitute Load' || entry.load.loadType === 'Temporary Substitute') {
                    cellClasses = 'bg-amber-50 text-amber-800 border-amber-200';
                }
                const semMapDisp2 = { '1': '1st Sem', '2': '2nd Sem', '3': 'Summer', '1st Semester': '1st Sem', '2nd Semester': '2nd Sem', 'Summer': 'Summer' };
                const semLabel2 = semMapDisp2[entry.load.semester] || entry.load.semester || '';
                html += `<td rowspan="${entry.span}" class="border p-2 align-top ${cellClasses}">
                    <div class="font-black text-[11px] leading-tight mb-0.5">${entry.load.sub}</div>
                    <div class="text-[10px] text-slate-600 leading-tight">${entry.load.program || ''} · ${entry.load.sec}</div>
                    <div class="text-[9px] text-slate-500 leading-tight mt-0.5">${entry.load.time || ''}</div>
                    <div class="flex items-center gap-1 mt-1 flex-wrap">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/60">${semLabel2}</span>
                        <span class="text-[9px] text-slate-500 font-medium">${entry.load.room}</span>
                    </div>
                </td>`;
            } else {
                html += `<td class="border bg-white"></td>`;
            }
        });
        html += `</tr>`;
    });
    container.innerHTML = html + `</tbody></table></div>`;
}

function renderWorkloadHeaderStats(loads, professor, sy, programName) {
    const totalLoads = loads.length;
    const totalHours = loads.reduce((sum, load) => sum + (load.units || 0), 0);
    const palette = getProgramPalette(programName);
    const programCard = palette ? `border ${palette.card}` : 'border border-slate-200 bg-white';

    return `
        <div class="rounded-xl ${palette ? palette.card : 'border border-slate-200 bg-white'} px-3 py-2.5 shadow-sm h-20 flex flex-col justify-between">
            <div class="text-[9px] uppercase tracking-wider font-bold ${palette ? palette.text : 'text-slate-400'}">Total Loads</div>
            <div class="text-xl font-black ${palette ? palette.text : 'text-slate-900'}">${totalLoads}</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm h-20 flex flex-col justify-between">
            <div class="text-[9px] uppercase tracking-wider font-bold text-slate-400">Total Hours</div>
            <div class="text-xl font-black text-slate-900">${totalHours}</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm h-20 flex flex-col justify-between">
            <div class="text-[9px] uppercase tracking-wider font-bold text-slate-400">Academic Year</div>
            <div class="text-sm font-black text-slate-900 leading-tight">${sy}</div>
        </div>
        <div class="rounded-xl ${programCard} px-3 py-2.5 shadow-sm h-20 flex flex-col justify-between">
            <div class="text-[9px] uppercase tracking-wider font-bold ${palette ? palette.text : 'text-slate-400'}">Professor</div>
            <div class="text-xs font-black ${palette ? palette.text : 'text-slate-900'} truncate" title="${professor}">${professor}</div>
        </div>
    `;
}

function renderWorkloadTypeSummary(loads) {
    const counts = loads.reduce((acc, load) => {
        const type = load.loadType || 'Regular Load';
        if (!acc[type]) acc[type] = 0;
        acc[type] += 1;
        return acc;
    }, { 'Regular Load': 0, 'Part-Time Load': 0, 'Temporary Substitute Load': 0 });

    const items = [
        { label: 'Regular Load', count: counts['Regular Load'], bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        { label: 'Part-Time Load', count: counts['Part-Time Load'], bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
        { label: 'Temporary Substitute Load', count: counts['Temporary Substitute Load'], bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    ];

    return items.map(item => `
        <div class="rounded-xl border ${item.border} ${item.bg} px-3 py-2.5 shadow-sm h-20 flex flex-col justify-between">
            <div class="text-[9px] uppercase tracking-wider font-bold ${item.text}">${item.label}</div>
            <div class="text-2xl font-black ${item.text}">${item.count}</div>
        </div>
    `).join('');
}

function displayProfessorProgram(professorName) {
    const faculty = facultyRegistry.find(f => f.name === professorName);
    if (!faculty || !faculty.program) return null;
    const programFilter = document.getElementById('workload-program-filter')?.value || 'All';
    const programs = faculty.program.split(',').map(p => p.trim());
    if (programFilter !== 'All' && programs.includes(programFilter)) {
        return programFilter;
    }
    return programs[0];
}

function toggleCalendarFullscreen(target = null) {
    document.body.classList.toggle('calendar-fullscreen');
    if (target === 'sections') renderTimetable();
    if (target === 'rooms') renderRoomSchedulePreview();
    if (target === 'workloads') renderFacultyCalendar();
    lucide.createIcons();
}

function exportSectionTimetable() {
    const sec = document.getElementById('view-section-select')?.value;
    if (!sec) return showBanner('Please select a section.', 'error');
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears?.[0] || '';
    const semester = document.getElementById('semester-selector')?.value || 'All';
    const data = State.db.loads.filter(l => l.sec === sec && l.sy === sy && matchesSemester(l, semester));
    const title = `${sec} SCHEDULE`;
    const subtitle = formatScheduleSubtitle(semester, sy);
    const filename = `Section_Timetable_${sec.replace(/\s+/g, '_')}_${sy.replace(/\s+/g, '_')}_${semester}`;
    const { rows, merges, cols } = buildScheduleGrid(title, subtitle, data, 'section');
    downloadExcelSheet(filename, rows, 'Section Schedule', { merges, cols });
    showBanner('Section timetable exported successfully.', 'success');
}

function exportRoomSchedule() {
    const room = document.getElementById('view-room-select')?.value;
    const building = document.getElementById('view-building-select')?.value || 'All';
    if (!room) return showBanner('Select room.', 'error');
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears?.[0] || '';
    const semester = document.getElementById('semester-selector')?.value || 'All';
    const data = State.db.loads.filter(l => {
        if (l.room !== room || l.sy !== sy) return false;
        if (building && building !== 'All' && l.building !== building) return false;
        return matchesSemester(l, semester);
    });
    const title = `${room} SCHEDULE`;
    const subtitle = formatScheduleSubtitle(semester, sy);
    const filename = `Room_Schedule_${room.replace(/\s+/g, '_')}_${sy.replace(/\s+/g, '_')}_${semester}`;
    const { rows, merges, cols } = buildScheduleGrid(title, subtitle, data, 'room');
    downloadExcelSheet(filename, rows, 'Room Schedule', { merges, cols });
    showBanner('Room schedule exported successfully.', 'success');
}

function renderTimetable() {
    const sec = document.getElementById('view-section-select')?.value;
    const container = document.getElementById('timetable-container');
    if (!container) return;
    if (!sec) {
        container.innerHTML = '<div class="text-gray-500 italic text-xs">Select a section.</div>';
        return;
    }
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears[0];
    const semester = document.getElementById('semester-selector')?.value || 'All';
    const semMap = { '1': '1st Semester', '2': '2nd Semester', '3': 'Summer', 'Summer': 'Summer' };
    const loads = State.db.loads.filter(l => {
        if (l.sec !== sec || l.sy !== sy) return false;
        if (semester !== 'All') {
            const lSem = (l.semester || '1').toString();
            const filterSem = semester.toString();
            const lSemLabel = semMap[lSem] || lSem;
            const filterLabel = semMap[filterSem] || filterSem;
            if (lSemLabel !== filterLabel && lSem !== filterSem) return false;
        }
        return true;
    });
    const scheduleMap = {}; const skipCell = {};
    Days.forEach(day => { scheduleMap[day] = {}; skipCell[day] = {}; });
    loads.forEach(load => {
        const start = load.time.split(' - ')[0];
        const startIndex = TimeStarts.indexOf(start);
        if (startIndex === -1) return;
        const span = (load.units || 3) * 2;
        scheduleMap[load.day][start] = { load, span };
        for (let offset = 1; offset < span; offset++) {
            const slot = TimeStarts[startIndex + offset];
            if (slot) skipCell[load.day][slot] = true;
        }
    });
    let html = `<div class="overflow-x-auto"><table class="min-w-full border-collapse text-[11px]"><thead><tr><th class="border bg-slate-100 px-3 py-2 text-left uppercase text-slate-500">TIME</th>${Days.map(day => `<th class="border bg-slate-100 px-3 py-2 text-left uppercase text-slate-500">${day}</th>`).join('')}</tr></thead><tbody>`;
    TimeStarts.forEach(start => {
        html += `<tr class="odd:bg-white even:bg-slate-50/50"><td class="border px-3 py-1.5 font-semibold text-slate-500">${start}</td>`;
        Days.forEach(day => {
            if (skipCell[day][start]) return;
            const entry = scheduleMap[day][start];
            if (entry) {
                const semMapDisp3 = { '1': '1st Sem', '2': '2nd Sem', '3': 'Summer', '1st Semester': '1st Sem', '2nd Semester': '2nd Sem', 'Summer': 'Summer' };
                const semLabel3 = semMapDisp3[entry.load.semester] || entry.load.semester || '';
                html += `<td rowspan="${entry.span}" class="border p-2 align-top bg-blue-50 text-slate-900 font-medium">
                    <div class="font-black text-[11px] leading-tight mb-0.5">${entry.load.sub}</div>
                    <div class="text-[10px] font-semibold text-slate-700 leading-tight">${entry.load.prof}</div>
                    <div class="text-[10px] text-slate-600 leading-tight">${entry.load.program || ''} · ${entry.load.sec}</div>
                    <div class="text-[9px] text-slate-500 leading-tight mt-0.5">${entry.load.time || ''}</div>
                    <div class="flex items-center gap-1 mt-1 flex-wrap">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-200 text-blue-800">${semLabel3}</span>
                        <span class="text-[9px] text-slate-500 font-medium">${entry.load.room}</span>
                    </div>
                </td>`;
            } else {
                html += `<td class="border bg-white"></td>`;
            }
        });
        html += `</tr>`;
    });
    container.innerHTML = html + `</tbody></table></div>`;
}

function downloadWorkload() {
    const prof = document.getElementById('view-faculty-select')?.value;
    if (prof) exportFacultyWorkload(prof);
}

function exportFacultyWorkload(profName) {
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears?.[0] || '';
    const semester = document.getElementById('semester-selector')?.value || 'All';
    const programFilter = document.getElementById('workload-program-filter')?.value || 'All';
    const loads = State.db.loads.filter(l => l.prof === profName && l.sy === sy && (programFilter === 'All' || l.program === programFilter));
    if (loads.length === 0) {
        return showBanner(`No workload data found for ${profName}.`, 'error');
    }

    const faculty = facultyRegistry.find(f => f.name === profName);
    const program = displayProfessorProgram(profName) || programFilter || 'All Programs';
    const rows = [
        ['Faculty Workload Report'],
        ['Professor', profName],
        ['Program', program],
        ['Academic Year', sy],
        ['Semester', semester === 'All' ? 'All Semesters' : semester === '1' ? '1st Semester' : semester === '2' ? '2nd Semester' : 'Summer'],
        ['Classification', faculty?.classification || 'N/A'],
        ['Designation', faculty?.baseDesignation || 'N/A'],
        [],
        ['#', 'Subject', 'Section', 'Units', 'Load Type', 'Room', 'Day', 'Time', 'Program', 'Academic Year', 'Semester']
    ];

    loads.sort((a, b) => {
        const dayOrder = Days.indexOf(a.day) - Days.indexOf(b.day);
        if (dayOrder !== 0) return dayOrder;
        return parseTimeStr(a.time.split(' - ')[0]) - parseTimeStr(b.time.split(' - ')[0]);
    });

    loads.forEach((load, idx) => {
        rows.push([
            idx + 1,
            load.sub || '',
            load.sec || '',
            load.units || 0,
            load.loadType || '',
            load.room || '',
            load.day || '',
            load.time || '',
            load.program || '',
            load.sy || '',
            load.semester || ''
        ]);
    });

    const filename = `Faculty_Workload_${profName.replace(/\s+/g, '_')}_${sy.replace(/\s+/g, '_')}_${semester}`;
    downloadExcelSheet(filename, rows, 'Workload');
    showBanner(`Workload exported for ${profName}.`, 'success');
}

function downloadExcelSheet(filename, rows, sheetName = 'Sheet1', options = {}) {
    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => {
            createXLSX(rows, filename, sheetName, options);
        };
        document.head.appendChild(script);
    } else {
        createXLSX(rows, filename, sheetName, options);
    }
}

function createXLSX(rows, filename, sheetName, options = {}) {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    if (options.merges) worksheet['!merges'] = options.merges;
    if (options.cols) worksheet['!cols'] = options.cols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function matchesSemester(load, semester) {
    if (semester === 'All' || semester === undefined || semester === null) return true;
    const semMap = { '1': '1st Semester', '2': '2nd Semester', '3': 'Summer', 'Summer': 'Summer' };
    const filterLabel = semMap[semester] || semester;
    const loadLabel = semMap[load.semester] || load.semester || '';
    return String(filterLabel).toLowerCase() === String(loadLabel).toLowerCase() || String(load.semester) === String(semester);
}

function formatScheduleSubtitle(semester, sy) {
    const semLabel = semester === '1' ? 'FIRST SEMESTER' : semester === '2' ? 'SECOND SEMESTER' : semester === '3' || semester === 'Summer' ? 'SUMMER' : (semester === 'All' ? 'ALL SEMESTERS' : String(semester).toUpperCase());
    if (sy) return `${semLabel}, ${sy}`;
    return semLabel;
}

function normalizeTimeString(time) {
    if (!time) return '';
    try {
        return formatTime(parseTimeStr(time.trim()));
    } catch (e) {
        return time.trim();
    }
}

function formatScheduleCell(load, type) {
    const lines = [];
    if (load.sub) lines.push(load.sub);
    if (type === 'faculty') {
        if (load.sec) lines.push(load.sec);
        if (load.room) lines.push(load.room);
        if (load.program) lines.push(load.program);
    } else if (type === 'room') {
        if (load.sec) lines.push(load.sec);
        if (load.prof) lines.push(load.prof);
        if (load.program) lines.push(load.program);
    } else if (type === 'section') {
        if (load.prof) lines.push(load.prof);
        if (load.room) lines.push(load.room);
        if (load.program) lines.push(load.program);
    } else {
        if (load.prof) lines.push(load.prof);
    }
    if (load.loadType) lines.push(load.loadType);
    return lines.filter(Boolean).join('\n');
}

function getTimeRangeLabel(time) {
    const startMinutes = parseTimeStr(time);
    const endMinutes = startMinutes + 30;
    return `${formatTime(startMinutes).replace(/\s?AM|\s?PM/g, '')} - ${formatTime(endMinutes).replace(/\s?AM|\s?PM/g, '')}`;
}

function buildScheduleGrid(title, subtitle, loads, type) {
    const headerRow = ['Time', ...Days.map(day => day.toUpperCase())];
    const rows = [[title.toString().toUpperCase()], [subtitle], headerRow];
    const loadMap = {};
    const usedRowKeys = new Set();
    const createKey = (timeKey, day) => `${timeKey}|${day}`;

    loads.forEach(load => {
        const rawDay = load.day ? String(load.day).trim().toUpperCase() : '';
        const start = load.time ? load.time.split(' - ')[0].trim() : '';
        const timeKey = normalizeTimeString(start);
        if (!rawDay || !timeKey) return;
        const key = createKey(timeKey, rawDay);
        loadMap[key] = loadMap[key] || [];
        loadMap[key].push(load);
    });

    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }];
    const cols = [{ wch: 16 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];

    TimeStarts.forEach((time, index) => {
        const normalizedTime = normalizeTimeString(time);
        const rowLabel = getTimeRangeLabel(time);
        const row = [rowLabel];
        Days.forEach(day => {
            const key = createKey(normalizedTime, day.toUpperCase());
            if (usedRowKeys.has(key)) {
                row.push(null);
                return;
            }
            const entries = loadMap[key] || [];
            if (entries.length === 0) {
                row.push('');
                return;
            }
            const cellText = entries.map(load => formatScheduleCell(load, type)).join('\n\n');
            row.push(cellText);
            const span = (entries[0].units || 3) * 2;
            if (span > 1) {
                const colIndex = Days.indexOf(day) + 1;
                for (let offset = 1; offset < span; offset++) {
                    const nextTime = TimeStarts[index + offset];
                    if (!nextTime) break;
                    usedRowKeys.add(createKey(normalizeTimeString(nextTime), day.toUpperCase()));
                }
                merges.push({ s: { r: rows.length, c: colIndex }, e: { r: rows.length + span - 1, c: colIndex } });
            }
        });
        rows.push(row);
    });

    return { rows, merges, cols };
}

function exportFacultyProfileExcel() {
    const selectedId = document.getElementById('faculty-profile-select')?.value;
    if (!selectedId) return showBanner('Select a faculty profile first.', 'error');
    const faculty = facultyRegistry.find(f => f.id === selectedId);
    if (!faculty) return showBanner('Faculty profile not found.', 'error');

    const rows = [
        ['Name', faculty.name],
        ['Program', faculty.program],
        ['Employment Type', faculty.employmentType],
        ['Designation / Title', faculty.baseDesignation],
        ['Classification', faculty.classification],
        ['Classification Rank', getClassificationRankLabel(faculty.classification, faculty.classificationRank) || 'N/A'],
        ['Status', faculty.active !== false ? 'Active' : 'Inactive'],
        ['License Number', faculty.licenseNumber || 'N/A'],
        ['Specialization', faculty.specialization || 'N/A'],
        ['National Certificate', faculty.nationalCertificate || 'N/A'],
        ['Nature of Appointment', faculty.natureOfAppointment || 'N/A'],
        ['Extension', faculty.extension || 'N/A'],
        ['Remarks', faculty.remarks || 'N/A'],
        ['Baccalaureate', faculty.educationalAttainment?.baccalaureate || 'N/A'],
        ['Masters', faculty.educationalAttainment?.masters || 'N/A'],
        ['Doctorate', faculty.educationalAttainment?.doctorate || 'N/A'],
        ['Post-Baccalaureate', faculty.educationalAttainment?.postBaccalaureate || 'N/A'],
        ['GEN-ED', faculty.courseHandle?.genEd || 'N/A'],
        ['Core Subject', faculty.courseHandle?.coreSubject || 'N/A'],
        ['Professional Subject', faculty.courseHandle?.professionalSubject || 'N/A'],
        ['Technical Subject', faculty.courseHandle?.technicalSubject || 'N/A'],
        ['Research Production', faculty.research?.production || '0'],
        ['Research Presentation', faculty.research?.presentation || '0'],
        ['Research Publication', faculty.research?.publication || '0'],
        ['Research Citation', faculty.research?.citation || '0']
    ];

    downloadExcel(`Faculty_Profile_${faculty.name.replace(/\s+/g, '_')}`, rows, ['Field', 'Value']);
    showBanner('Faculty profile exported successfully.', 'success');
}

async function initApp() {
    await loadSavedState();
    initializeSystemModules();
    updateSidebarUser();
    
    State.isLoaded = true;
    document.dispatchEvent(new CustomEvent('appStateLoaded'));
}

// EXCEL EXPORT FUNCTIONALITY
function downloadExcel(filename, data, headers) {
    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => {
            generateAndDownloadXLSX(filename, data, headers);
        };
        document.head.appendChild(script);
    } else {
        generateAndDownloadXLSX(filename, data, headers);
    }
}

function generateAndDownloadXLSX(filename, data, headers) {
    const rows = [headers, ...data];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function exportFacultyWorkloadReport() {
    const filename = `Faculty_Workload_Report_${State.activeProgram.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Faculty Name', 'Classification', 'Title/Rank', 'Subject Code', 'Section', 'Load Type', 'Units', 'Room', 'Day', 'Time', 'Program'];

    const data = State.db.loads.map(load => {
        const faculty = facultyRegistry.find(f => f.name === load.prof);
        const rankLabel = faculty && faculty.classificationRank ? getClassificationRankLabel(faculty.classification, faculty.classificationRank) : 'N/A';
        return [
            load.prof,
            faculty ? faculty.classification : 'N/A',
            faculty ? faculty.baseDesignation : 'N/A',
            load.sub,
            load.sec,
            load.loadType,
            load.units,
            load.room,
            load.day,
            load.time,
            load.program
        ];
    });

    downloadExcel(filename, data, headers);
    showBanner(`Workload report exported successfully!`, 'success');
}

function exportFacultyRoster() {
    const filename = `Faculty_Roster_${State.activeProgram.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Faculty Name', 'Classification', 'Classification Rank', 'Title/Designation', 'Employment Type', 'Program', 'Status', 'Total Load (Units)', 'License Number', 'Specialization'];

    const programFaculty = facultyRegistry.filter(f => {
        if (!f.program) return false;
        const programs = f.program.split(',').map(p => p.trim());
        return programs.includes(State.activeProgram);
    });
    const data = programFaculty.map(faculty => {
        const totalLoad = calculateCumulativeLoadHours(faculty.name);
        const rankLabel = faculty.classificationRank ? getClassificationRankLabel(faculty.classification, faculty.classificationRank) : 'N/A';
        const limits = getLoadLimitsForFaculty(faculty);
        return [
            faculty.name,
            faculty.classification || 'N/A',
            rankLabel,
            faculty.baseDesignation,
            faculty.employmentType,
            faculty.program,
            faculty.active ? 'Active' : 'Inactive',
            `${totalLoad} / ${limits ? limits.totalMaxLoad : '45'}`,
            faculty.licenseNumber,
            faculty.specialization
        ];
    });

    downloadExcel(filename, data, headers);
    showBanner(`Faculty roster exported successfully!`, 'success');
}

function exportAllFacultyRoster() {
    const filename = `All_Faculty_Roster_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Faculty Name', 'Classification', 'Classification Rank', 'Title/Designation', 'Employment Type', 'Program', 'Status', 'Total Load (Units)', 'License Number', 'Specialization'];
    const data = facultyRegistry.map(faculty => {
        const totalLoad = calculateCumulativeLoadHours(faculty.name);
        const rankLabel = faculty.classificationRank ? getClassificationRankLabel(faculty.classification, faculty.classificationRank) : 'N/A';
        const limits = getLoadLimitsForFaculty(faculty);
        return [
            faculty.name,
            faculty.classification || 'N/A',
            rankLabel,
            faculty.baseDesignation,
            faculty.employmentType,
            faculty.program,
            faculty.active ? 'Active' : 'Inactive',
            `${totalLoad} / ${limits ? limits.totalMaxLoad : '45'}`,
            faculty.licenseNumber,
            faculty.specialization
        ];
    });
    downloadExcel(filename, data, headers);
    showBanner(`All faculty roster exported successfully!`, 'success');
}

function exportLoadDistributionSummary() {
    const filename = `Load_Distribution_Summary_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Professor Name', 'Classification', 'Load Type Limits', 'Total Limit', 'Current Load', 'Remaining Capacity', 'Status'];

    const uniqueFaculty = [...new Set(State.db.loads.map(l => l.prof))];
    const data = uniqueFaculty.map(profName => {
        const faculty = facultyRegistry.find(f => f.name === profName);
        const limits = faculty ? getLoadLimitsForFaculty(faculty) : null;
        const currentLoad = calculateCumulativeLoadHours(profName);
        const maxLoad = limits ? limits.totalMaxLoad : 45;
        const remaining = Math.max(0, maxLoad - currentLoad);
        const status = currentLoad > maxLoad ? 'EXCEEDS LIMIT' : (currentLoad > maxLoad * 0.8 ? 'WARNING' : 'OK');

        let loadTypesStr = '';
        if (limits) {
            loadTypesStr = Object.entries(limits.loadLimits)
                .map(([type, limit]) => `${type}: ${limit}`)
                .join(' | ');
        }

        return [
            profName,
            faculty ? faculty.classification : 'N/A',
            loadTypesStr,
            maxLoad,
            currentLoad,
            remaining,
            status
        ];
    });

    downloadExcel(filename, data, headers);
    showBanner(`Load distribution summary exported successfully!`, 'success');
}

function exportProgramCurriculum() {
    const filename = `Program_Curriculum_${State.activeProgram.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Year Level', 'Semester', 'Subject Code', 'Subject Name', 'Units'];

    const program = State.db.programs[State.activeProgram];
    const data = [];

    if (program && program.subjects) {
        Object.keys(program.subjects).forEach(yearKey => {
            Object.keys(program.subjects[yearKey]).forEach(semKey => {
                program.subjects[yearKey][semKey].forEach(subject => {
                    const subjCode = subject.name.split(' - ')[0] || 'N/A';
                    const subjName = subject.name || '';
                    data.push([yearKey, semKey, subjCode, subjName, subject.units]);
                });
            });
        });
    }

    downloadExcel(filename, data, headers);
    showBanner(`Program curriculum exported successfully!`, 'success');
}

document.addEventListener('DOMContentLoaded', initApp);
// ✅ End of file. No extra brackets here.