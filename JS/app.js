/**
 * PUP-PQ Academic Management System Logic Engine
 */

// MASTER FACULTY REGISTRY DATA MODEL
const facultyRegistry = [];

// RE-ORGANIZED DESIGNATION RANK SELECTION STRATEGY
const designationOptions = [
    "None (Regular Faculty Line)",
    "Director / Head of Academic Operations",
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
            'Part-time Load': 12,
            'Temporary Substitute Load': 0
        },
        totalMaxLoad: 45
    },
    'Regular': {
        ranks: [],
        loadLimits: {
            'Regular Load': 15,
            'Part-time Load': 12,
            'Temporary Substitute Load': 0
        },
        totalMaxLoad: 45
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
            'Part-time Load': 12,
            'Temporary Substitute Load': 0
        },
        totalMaxLoad: 45
    },
    'Director': {
        ranks: [],
        loadLimits: {
            'Regular Load': 3,
            'Part-time Load': 12,
            'Temporary Substitute Load': 0
        },
        totalMaxLoad: 45
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
const State = window.State || {
    activeProgram: '',
    subjectSemesterFilter: 'All',
    facultyTypeFilter: 'All',
    facultyFilter: 'all',
    facultyStatusFilter: 'all',
    db: {
        schoolYears: [],
        rooms: [],
        buildings: [],
        programs: {},
        loads: [],
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
let currentLoadEditId = null;

function parseTimeStr(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

function formatTime(minutes) {
    const period = minutes >= 720 ? 'PM' : 'AM';
    let h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) h = 12;
    if (h > 12) h -= 12;
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
        return ['Part-time Load', 'Temporary Substitute Load'];
    }
    return Object.keys(CLASSIFICATION_SYSTEM[faculty.classification]?.loadLimits || {}).filter(type => type !== 'Temporary Substitute Load' || true);
}

function canAssignLoad(facultyName, loadType, units) {
    const faculty = facultyRegistry.find(f => f.name === facultyName);
    if (!faculty) return { allowed: false, reason: 'Faculty not found' };
    
    const limits = getLoadLimitsForFaculty(faculty);
    if (!limits) return { allowed: false, reason: 'Classification not configured' };
    
    // Check if this load type is allowed for this classification
    if (!(loadType in limits.loadLimits)) {
        return { allowed: false, reason: `${loadType} not allowed for ${faculty.classification}` };
    }
    
    // Check load type limit
    const typeLimit = limits.loadLimits[loadType];
    const typeTotal = State.db.loads
        .filter(l => l.prof === facultyName && l.loadType === loadType)
        .reduce((sum, l) => sum + l.units, 0);
    
    if (typeTotal + units > typeLimit) {
        return { allowed: false, reason: `${loadType} limit is ${typeLimit} units (current: ${typeTotal} units)` };
    }
    
    // Check global load limit
    const globalTotal = calculateCumulativeLoadHours(facultyName);
    if (globalTotal + units > limits.totalMaxLoad) {
        return { allowed: false, reason: `Total load cannot exceed ${limits.totalMaxLoad} units (current: ${globalTotal} units)` };
    }
    
    return { allowed: true };
}

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
    const [start, , end] = range.split(' ');
    return {
        start: parseTimeStr(`${range.split(' - ')[0]}`),
        end: parseTimeStr(`${range.split(' - ')[1]}`)
    };
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

function persistState() {
    State.db.facultyRegistry = facultyRegistry;
    localStorage.setItem('schedulerData', JSON.stringify(State.db));
    localStorage.setItem('activeProgram', State.activeProgram);
}

function loadSavedState() {
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
            
            // Restore faculty registry with any new faculty that was added
            if (savedData.facultyRegistry && Array.isArray(savedData.facultyRegistry)) {
                facultyRegistry.splice(0, facultyRegistry.length, ...savedData.facultyRegistry);
            }
        } catch (error) {
            console.warn('Unable to restore saved scheduler data', error);
        }
    }
    const savedProgram = localStorage.getItem('activeProgram');
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
        setTimeout(() => { banner.classList.add('opacity-0'); setTimeout(()=>banner.remove(), 300); }, timeout);
    } catch (e) {}
}

function attemptLogin() {
    const errMsg = document.getElementById('login-error');
    if (errMsg) {
        errMsg.innerText = 'Login is not available on this page. Please use the main login screen.';
        errMsg.classList.remove('hidden');
    }
}

function logout() {
    window.location.href = 'index.html';
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
    const facultyObjs = facultyRegistry.filter(f => f.program === State.activeProgram);
    
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
                        const hours = typeof getSubjectHourParts === 'function' ? getSubjectHourParts(sub) : { lec: Number(sub.units) || 0, lab: 0, units: Number(sub.units) || 0 };
                        const isBridging = Boolean(sub.is_bridging) || (typeof getSubjectBridgingStatus === 'function' && getSubjectBridgingStatus(State.activeProgram, sub.name));
                        const bridgingBadge = isBridging ? '<span class="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] px-1.5 py-0.5 rounded mr-2 uppercase font-black tracking-wider">BRIDGING</span>' : '';
                        const subRow = document.createElement('div');
                        subRow.className = `rounded-2xl ${isBridging ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'} p-3 flex items-center justify-between text-xs hover:bg-slate-100 transition-all cursor-pointer`;
                        subRow.innerHTML = `<span class="font-medium text-gray-800">${bridgingBadge}${escapeHtml(sub.name)} <span class="text-slate-500 font-medium">(Lec ${hours.lec} + Lab ${hours.lab} = ${hours.units}u)</span></span>`;
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
    const facultyObjs = facultyRegistry.filter(f => f.program === State.activeProgram);
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
    if (cardPrograms) cardPrograms.innerText = Object.keys(State.db.programs).length;
    if (cardLoads) cardLoads.innerText = State.db.loads.length;
    if (cardConflicts) cardConflicts.innerText = 0;
    const currentProgramEl = document.getElementById('dashboard-active-program');
    if (currentProgramEl) currentProgramEl.innerText = State.activeProgram;
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
    root.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black/40 p-4';
    root.innerHTML = `<div id="global-modal-panel" class="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden"></div>`;
    document.body.appendChild(root);
}

function closeModal() {
    const root = document.getElementById('global-modal-root');
    if (!root) return;
    root.classList.add('hidden');
    const panel = document.getElementById('global-modal-panel');
    if (panel) panel.innerHTML = '';
    document.removeEventListener('keydown', handleModalKeydown);
}

function handleModalKeydown(event) {
    if (event.key === 'Escape') closeModal();
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
        <div class="p-6">${body}</div>
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 p-5">
            <button id="global-modal-cancel" class="px-4 py-2 rounded-2xl border border-slate-300 text-sm text-slate-700 hover:bg-slate-100" type="button">Cancel</button>
            <button id="global-modal-submit" class="px-4 py-2 rounded-2xl bg-[#7f0000] text-white text-sm font-bold hover:bg-[#660000]" type="button">${submitLabel}</button>
        </div>
    `;
    root.classList.remove('hidden');
    document.getElementById('global-modal-close').onclick = closeModal;
    document.getElementById('global-modal-cancel').onclick = closeModal;
    document.getElementById('global-modal-submit').onclick = () => {
        onSubmit?.();
    };
    document.addEventListener('keydown', handleModalKeydown);
    lucide.createIcons();
}

function getProgramPalette(programName) {
    const key = String(programName || '').toUpperCase();
    if (key.includes('BSHM')) return { row: 'bg-red-100 text-red-900', pill: 'bg-red-50 text-red-700', card: 'border-red-200 bg-red-50 text-red-900' };
    if (key.includes('BSIT')) return { row: 'bg-sky-100 text-sky-900', pill: 'bg-sky-50 text-sky-700', card: 'border-sky-200 bg-sky-50 text-sky-900' };
    if (key.includes('BSOA')) return { row: 'bg-violet-100 text-violet-900', pill: 'bg-violet-50 text-violet-700', card: 'border-violet-200 bg-violet-50 text-violet-900' };
    if (key.includes('BSCPE')) return { row: 'bg-emerald-100 text-emerald-900', pill: 'bg-emerald-50 text-emerald-700', card: 'border-emerald-200 bg-emerald-50 text-emerald-900' };
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

    const programOptions = Object.keys(State.db.programs || {}).sort().map(program => {
        return `<option value="${program}" ${program === faculty.program ? 'selected' : ''}>${program}</option>`;
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
                        <label class="block text-sm font-medium text-slate-700 mb-2">Program</label>
                        <select id="faculty-update-program" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
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
            const newProgram = document.getElementById('faculty-update-program')?.value || professor.program;
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

            if (!State.db.programs[newProgram]) {
                State.db.programs[newProgram] = { profs: [], sections: [], subjects: {} };
            }
            if (oldProgram !== newProgram) {
                const oldProg = State.db.programs[oldProgram];
                if (oldProg) {
                    oldProg.profs = oldProg.profs.filter(name => name !== oldName);
                }
                if (!State.db.programs[newProgram].profs.includes(newName)) {
                    State.db.programs[newProgram].profs.push(newName);
                }
            } else if (oldName !== newName) {
                const sameProg = State.db.programs[newProgram];
                if (sameProg) {
                    const index = sameProg.profs.indexOf(oldName);
                    if (index !== -1) {
                        sameProg.profs[index] = newName;
                    } else if (!sameProg.profs.includes(newName)) {
                        sameProg.profs.push(newName);
                    }
                }
            }

            persistState();
            closeModal();
            showBanner(`Updated profile for ${professor.name}.`, 'success');
            renderProgramResources();
            renderDashboard();
            populateFacultyProfileDropdown();
            displaySelectedFacultyProfile();
        }
    });
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

function addProgram() {
    openAddProgramModal();
}

function addSection() {
    openAddSectionModal();
}

function addSubject() {
    openAddSubjectModal();
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
    const container = document.getElementById('active-program-button-list');
    if (!container) return;

    const programNames = Object.keys(State.db.programs).sort((a, b) => a.localeCompare(b));
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

function addProgram() {
    const name = prompt('Enter the new program name');
    if (!name) return;
    if (State.db.programs[name]) {
        showBanner('Program already exists.', 'error');
        return;
    }
    State.db.programs[name] = { profs: [], sections: [], subjects: {} };
    State.activeProgram = name;
    persistState();
    renderPageSections();
    showBanner(`Program “${name}” was added and selected.`, 'success');
}

function populateFacultyProfileDropdown() {
    const select = document.getElementById('faculty-profile-select');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Choose faculty</option>';
    const programs = [...new Set(facultyRegistry.map(f => f.program))].sort();
    programs.forEach(program => {
        const group = document.createElement('optgroup');
        group.label = program;
        facultyRegistry.filter(f => f.program === program).forEach(faculty => {
            const option = document.createElement('option');
            option.value = faculty.id;
            option.textContent = faculty.name;
            group.appendChild(option);
        });
        select.appendChild(group);
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
            <div class="rounded-3xl bg-slate-100 p-4 border border-slate-200">
                <p class="text-xs uppercase tracking-[0.16em] font-semibold text-slate-500">Total Assigned Load</p>
                <p class="text-lg font-bold text-gray-900 mt-2">${totalLoad} / ${limits ? limits.totalMaxLoad : '45'} Units</p>
            </div>
        </div>
    `;
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
    showBanner(`Updated profile for ${professor.name}.`, 'success');
    renderProgramResources();
    renderDashboard();
    displaySelectedFacultyProfile();
}

async function saveNewFacultyProfile() {
    const name = document.getElementById('new-faculty-name')?.value.trim();
    if (!name) {
        showBanner('Please enter the faculty name.', 'error');
        return;
    }

    const program = document.getElementById('new-faculty-program')?.value || State.activeProgram;
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
        remarks: document.getElementById('new-faculty-remarks')?.value || ''
    };

    try {
        await fetch('/api/faculty', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(facultyObject)
        });

        facultyRegistry.push(facultyObject);
        if (!State.db.programs[program]) {
            State.db.programs[program] = { profs: [], sections: [], subjects: {} };
        }
        if (!State.db.programs[program].profs.includes(name)) {
            State.db.programs[program].profs.push(name);
        }
        persistState();
        populateFacultyDropdowns();
        populateFacultyProfileDropdown();
        renderProgramResources();
        renderDashboard();
        document.getElementById('new-faculty-form')?.reset();
        showBanner(`Faculty profile for ${name} has been added successfully.`, 'success');

        if (window.location.pathname.endsWith('add-faculty-profile.html') || window.location.href.includes('add-faculty-profile.html')) {
            window.location.href = `program-resources.html?new=${encodeURIComponent(name)}`;
        }
    } catch (error) {
        console.error('Failed to save faculty profile:', error);
        showBanner('The faculty could not be saved. Please try again.', 'error');
    }
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
    const facultyObjs = facultyRegistry.filter(f => f.program === State.activeProgram);
    
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
        
        if (State.facultyFilter === 'active') filteredStaff = facultyObjs.filter(f => f.active !== false);
        if (State.facultyFilter === 'inactive') filteredStaff = facultyObjs.filter(f => f.active === false);
        if (State.facultyFilter === 'part-time') filteredStaff = facultyObjs.filter(f => f.employmentType.toLowerCase().includes('part'));
        if (State.facultyFilter === 'regular') filteredStaff = facultyObjs.filter(f => f.employmentType === 'Regular' && (f.baseDesignation.includes('Instructor') || f.baseDesignation.includes('Lecturer') || f.baseDesignation.includes('Professor')));
        if (State.facultyFilter === 'designee') filteredStaff = facultyObjs.filter(f => f.employmentType === 'Regular' && !f.baseDesignation.includes('Instructor') && !f.baseDesignation.includes('Lecturer'));

        // Step 2: Card Template Component Builder Closure
        const createCard = (f) => {
            const card = document.createElement('div');
            const isProfInactive = f.active === false;
            
            card.className = `rounded-2xl bg-white p-3 border mb-2 transition-all flex flex-col gap-1.5 ${
                isProfInactive 
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
                        const hours = typeof getSubjectHourParts === 'function' ? getSubjectHourParts(sub) : { lec: Number(sub.units) || 0, lab: 0, units: Number(sub.units) || 0 };
                        const isBridging = Boolean(sub.is_bridging) || (typeof getSubjectBridgingStatus === 'function' && getSubjectBridgingStatus(State.activeProgram, sub.name));
                        const bridgingBadge = isBridging ? '<span class="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] px-1.5 py-0.5 rounded mr-2 uppercase font-black tracking-wider">BRIDGING</span>' : '';
                        const subRow = document.createElement('div');
                        subRow.className = `rounded-2xl ${isBridging ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'} p-3 flex items-center justify-between text-xs hover:bg-slate-100 transition-all cursor-pointer`;
                        subRow.innerHTML = `<span class="font-medium text-gray-800">${bridgingBadge}${escapeHtml(sub.name)} <span class="text-slate-500 font-medium">(Lec ${hours.lec} + Lab ${hours.lab} = ${hours.units}u)</span></span>`;
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

function getProfessorLoadTotals(profName) {
    return State.db.loads.filter(l => l.prof === profName).reduce((acc, load) => {
        if (load.loadType === 'Regular Load') acc.regular += load.units || 0;
        if (load.loadType === 'Part-Time Load') acc.partTime += load.units || 0;
        if (load.loadType === 'Temporary Substitute Load') acc.substitute += load.units || 0;
        acc.total += load.units || 0;
        return acc;
    }, { total: 0, regular: 0, partTime: 0, substitute: 0 });
}

function canAssignLoad(profName, units, editId, category) {
    const totals = getProfessorLoadTotals(profName);
    const caps = { 'Regular Load': 18, 'Part-Time Load': 12, 'Temporary Substitute Load': 6 };
    const maxUnits = 45;
    const loadTypeKey = category === 'Regular Load' ? 'regular' : category === 'Part-Time Load' ? 'partTime' : 'substitute';
    const wouldExceedType = totals[loadTypeKey] + units > (caps[category] || 0);
    const wouldExceedProf = totals.total + units > maxUnits;
    return { canAssign: !wouldExceedType && !wouldExceedProf, totals, caps, wouldExceedType, wouldExceedProf, maxUnits };
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

    const allProfs = [...new Set(Object.values(State.db.programs).flatMap(pr => (pr.profs || []).map(x => (typeof x === 'string' ? x : x.name))))].sort((a, b) => a.localeCompare(b));
    const profSelect = document.getElementById('ld-prof');
    profSelect.innerHTML = allProfs.length ? allProfs.map(pname => `<option>${pname}</option>`).join('') : '<option disabled>No professors available</option>';
    
    // Add event listener to update load types when professor changes
    profSelect.onchange = updateLoadTypesForProfessor;
    
    // Flatten nested structural subjects to display inside selectors perfectly
    let flattenedOptions = '';
    Object.keys(program.subjects).forEach(yKey => {
        Object.keys(program.subjects[yKey]).forEach(sKey => {
            program.subjects[yKey][sKey].forEach(sub => {
                flattenedOptions += `<option value="${sub.name}" data-units="${sub.units}">${sub.name} (${sub.units}u)</option>`;
            });
        });
    });
    document.getElementById('ld-sub').innerHTML = flattenedOptions || '<option disabled>No subjects loaded</option>';
    
    document.getElementById('ld-sec').innerHTML = program.sections.map(x => `<option>${x}</option>`).join('');
    document.getElementById('ld-room').innerHTML = State.db.rooms.map(x => `<option>${x}</option>`).join('');
    document.getElementById('ld-building').innerHTML = State.db.buildings.map(x => `<option>${x}</option>`).join('');
    document.getElementById('ld-day').innerHTML = Days.map(x => `<option>${x}</option>`).join('');

    if (load) {
        document.getElementById('ld-prof').value = load.prof;
        document.getElementById('ld-sub').value = load.sub;
        document.getElementById('ld-sec').value = load.sec;
        document.getElementById('ld-room').value = load.room;
        document.getElementById('ld-building').value = load.building;
        document.getElementById('ld-day').value = load.day;
        document.getElementById('ld-units').value = load.units || 3;
        document.getElementById('ld-category').value = load.loadType || 'Regular Load';
    } else {
        document.getElementById('ld-category').value = 'Regular Load';
    }

    // Initial population of load types
    updateLoadTypesForProfessor();
    refreshTimeSlots();
    
    if (load) {
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
    const subjectUnits = Number(sub?.selectedOptions[0]?.dataset?.units || 3);
    let units = Math.max(1, Number(unitsInput?.value || subjectUnits));
    if (category === 'Regular Load') {
        units = Math.min(6, subjectUnits);
    } else if (category === 'Part-Time Load') {
        units = Math.min(12, subjectUnits);
    } else {
        units = Math.min(6, subjectUnits);
    }
    if (unitsInput) unitsInput.value = units;
    timeSelect.innerHTML = TimeStarts.map(start => {
        const range = getTimeRange(start, units);
        const target = parseTimeRange(range);
        const conflictLoad = day && prof && room && sec ? findConflict(day, target, prof, room, sec, currentLoadEditId) : null;
        const disabled = conflictLoad ? 'disabled' : '';
        const label = conflictLoad ? ' • conflict' : '';
        return `<option value="${range}" ${disabled}>${range}${label}</option>`;
    }).join('');
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
    
    if (!time || !sub || !day || !prof || !sec || !room) {
        showBanner('Please complete all assignment fields.', 'error');
        return;
    }
    
    // Check classification-based load limits
    const validation = canAssignLoad(prof, loadCategory, units);
    if (!validation.allowed) {
        showBanner(`Cannot assign load: ${validation.reason}`, 'error');
        return;
    }
    
    // Check for schedule conflicts
    const load = {
        id: currentLoadEditId || Date.now(),
        prof, sub, units, loadType: loadCategory, sec, room, building, day, time, sy,
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

function renderRoomSchedulePreview() {
    const preview = document.getElementById('room-schedule-preview');
    if (!preview) return;
    const room = document.getElementById('view-room-select')?.value;
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears[0];
    const building = document.getElementById('view-building-select')?.value || 'All';
    const semester = document.getElementById('semester-selector')?.value || 'All';
    const semMap = { '1': '1st Semester', '2': '2nd Semester', '3': 'Summer', 'Summer': 'Summer' };
    if (!room) {
        preview.innerHTML = '<div class="text-gray-500 italic text-xs">Select a room to preview schedules.</div>';
        return;
    }
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
                const load = entry.load;
                const isBridging = typeof getSubjectBridgingStatus === 'function' ? getSubjectBridgingStatus(load.program || State.activeProgram, load.sub) : false;
                const bridgingBadge = isBridging 
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1">BRIDGING</span>' 
                    : '';
                const typeBadge = isBridging
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">BRIDGING</span>'
                    : '<span class="inline-block bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider">Regular</span>';
                const cleanSub = String(load.sub || '').replace(/^\[\s*BRIDGING\s*\]\s*/i, '');
                const compHours = Number(load.units) || 0;
                const compType = load.component_type || 'Lec';
                const bldgRoom = typeof formatBuildingRoom === 'function' ? formatBuildingRoom(load) : `${load.building || ''} - ${load.room || ''}`;
                const loadType = load.loadType || 'Regular Load';

                const palette = getProgramPalette(load.program);
                const cellBg = isBridging ? 'bg-orange-50/70 text-slate-900 border-orange-300' : (palette ? `${palette.row} text-slate-900 border-amber-300` : 'bg-amber-100 text-slate-900 border-amber-300');

                html += `<td rowspan="${entry.span}" class="border-2 p-2 align-top ${cellBg} rounded-sm text-left font-medium">
                    <div class="font-black text-[11px] leading-tight mb-0.5 text-slate-900">${bridgingBadge}${escapeHtml(cleanSub)}</div>
                    <div class="text-[10px] font-semibold text-slate-800 leading-tight">${escapeHtml(load.prof || 'TBA')}</div>
                    <div class="my-0.5">${typeBadge}</div>
                    <div class="text-[9px] font-semibold text-slate-700 leading-tight">${escapeHtml(loadType)}</div>
                    <div class="text-[9px] text-slate-600 leading-tight">${escapeHtml(load.sec || '')}</div>
                    <div class="text-[9px] text-slate-600 leading-tight"><span class="font-bold text-slate-800">${compHours} hours</span> - <span class="rounded bg-white/80 border border-slate-200 px-1 font-semibold text-[8px] text-slate-700">${escapeHtml(compType)}</span></div>
                    <div class="text-[9px] text-slate-600 font-medium leading-tight">${escapeHtml(bldgRoom)}</div>
                    <div class="text-[9px] font-bold text-slate-700 leading-tight mt-1">${escapeHtml(load.time || '')}</div>
                </td>`;
            } else {
                html += `<td class="border bg-white"></td>`;
            }
        });
        html += `</tr>`;
    });
    preview.innerHTML = html + `</tbody></table></div>`;
}

function updateFacultyWorkloadDropdown() {
    const sel = document.getElementById('view-faculty-select');
    const programFilter = document.getElementById('workload-program-filter');
    const container = document.getElementById('faculty-calendar-container');
    if (!sel || !container || !programFilter) return;

    const profs = [...new Set(Object.values(State.db.programs).flatMap(prog => (prog.profs || [])))].sort((a, b) => a.localeCompare(b));
    sel.innerHTML = profs.length ? profs.map(p => `<option value="${p}">${p}</option>`).join('') : '<option disabled>No professors available</option>';

    const programs = Object.keys(State.db.programs || {}).sort((a, b) => a.localeCompare(b));
    programFilter.innerHTML = ['<option value="All">All Programs</option>', ...programs.map(p => `<option value="${p}">${p}</option>`)].join('');

    if (profs.length) renderFacultyCalendar();
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
    const loads = State.db.loads.filter(l => l.prof === prof && (programFilter === 'All' ? true : l.program === programFilter));
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
                const load = entry.load;
                const isBridging = typeof getSubjectBridgingStatus === 'function' ? getSubjectBridgingStatus(load.program || programName, load.sub) : false;
                const bridgingBadge = isBridging 
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1">BRIDGING</span>' 
                    : '';
                const cleanSub = String(load.sub || '').replace(/^\[\s*BRIDGING\s*\]\s*/i, '');
                const compHours = Number(load.units) || 0;
                const compType = load.component_type || 'Lec';
                const bldgRoom = typeof formatBuildingRoom === 'function' ? formatBuildingRoom(load) : `${load.building || ''} - ${load.room || ''}`;
                const loadType = load.loadType || 'Regular Load';

                let cellClasses = 'bg-slate-50 text-slate-800 border-slate-200';
                if (isBridging) {
                    cellClasses = 'bg-orange-50 text-orange-950 border-orange-200';
                } else if (load.loadType === 'Regular Load') {
                    cellClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                } else if (load.loadType === 'Part-Time Load' || load.loadType === 'Part-time Load') {
                    cellClasses = 'bg-sky-50 text-sky-800 border-sky-200';
                } else if (load.loadType === 'Temporary Substitute Load' || load.loadType === 'Temporary Substitute') {
                    cellClasses = 'bg-amber-50 text-amber-800 border-amber-200';
                }

                html += `<td rowspan="${entry.span}" class="border p-2 align-top ${cellClasses} text-left">
                    <div class="font-black text-[11px] leading-tight mb-0.5 text-slate-900">${bridgingBadge}${escapeHtml(cleanSub)}</div>
                    <div class="text-[9px] font-semibold text-slate-700 leading-tight">${escapeHtml(loadType)}</div>
                    <div class="text-[9px] text-slate-600 leading-tight">${escapeHtml(load.sec || '')}</div>
                    <div class="text-[9px] text-slate-600 leading-tight"><span class="font-bold text-slate-800">${compHours} hours</span> - <span class="rounded bg-white/80 border border-slate-200 px-1 font-semibold text-[8px] text-slate-700">${escapeHtml(compType)}</span></div>
                    <div class="text-[9px] text-slate-600 font-medium leading-tight">${escapeHtml(bldgRoom)}</div>
                    <div class="text-[9px] font-bold text-slate-700 leading-tight mt-1">${escapeHtml(load.time || '')}</div>
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
            <div class="text-xl font-black text-slate-900">${totalHours}h</div>
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
    return faculty?.program || null;
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
    const title = `${sec.toUpperCase()} SCHEDULE`;
    const subtitle = formatScheduleSubtitle(semester, sy);
    const filename = `Section_Timetable_${sec.replace(/\s+/g, '_')}_${sy.replace(/\s+/g, '_')}_${semester}`;
    const { rows, merges, cols } = buildScheduleGrid(title, subtitle, data, 'section');
    downloadExcelSheet(filename, rows, 'Section Schedule', { merges, cols });
    showBanner('Section timetable exported successfully.', 'success');
}

function exportRoomSchedule() {
    const room = document.getElementById('view-room-select')?.value;
    if (!room) return showBanner('Select room.', 'error');
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears?.[0] || '';
    const semester = document.getElementById('semester-selector')?.value || 'All';
    const data = State.db.loads.filter(l => l.room === room && l.sy === sy && matchesSemester(l, semester));
    const title = `${room.toUpperCase()} SCHEDULE`;
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
    const loads = State.db.loads.filter(l => l.sec === sec && l.sy === sy);
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
                const load = entry.load;
                const isBridging = typeof getSubjectBridgingStatus === 'function' ? getSubjectBridgingStatus(load.program || State.activeProgram, load.sub) : false;
                const bridgingBadge = isBridging 
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1">BRIDGING</span>' 
                    : '';
                const typeBadge = isBridging
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">BRIDGING</span>'
                    : '<span class="inline-block bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider">Regular</span>';
                const cleanSub = String(load.sub || '').replace(/^\[\s*BRIDGING\s*\]\s*/i, '');
                const compHours = Number(load.units) || 0;
                const compType = load.component_type || 'Lec';
                const bldgRoom = typeof formatBuildingRoom === 'function' ? formatBuildingRoom(load) : `${load.building || ''} - ${load.room || ''}`;
                const loadType = load.loadType || 'Regular Load';

                const cellBg = isBridging ? 'bg-orange-50 text-slate-900 border-orange-200' : 'bg-blue-50 text-slate-900 border-blue-200';

                html += `<td rowspan="${entry.span}" class="border p-2 align-top ${cellBg} font-medium text-left">
                    <div class="font-black text-[11px] leading-tight mb-0.5 text-slate-900">${bridgingBadge}${escapeHtml(cleanSub)}</div>
                    <div class="text-[10px] font-semibold text-slate-800 leading-tight">${escapeHtml(load.prof || 'TBA')}</div>
                    <div class="my-0.5">${typeBadge}</div>
                    <div class="text-[9px] font-semibold text-slate-700 leading-tight">${escapeHtml(loadType)}</div>
                    <div class="text-[9px] text-slate-600 leading-tight">${escapeHtml(load.sec || '')}</div>
                    <div class="text-[9px] text-slate-600 leading-tight"><span class="font-bold text-slate-800">${compHours} hours</span> - <span class="rounded bg-white/80 border border-slate-200 px-1 font-semibold text-[8px] text-slate-700">${escapeHtml(compType)}</span></div>
                    <div class="text-[9px] text-slate-600 font-medium leading-tight">${escapeHtml(bldgRoom)}</div>
                    <div class="text-[9px] font-bold text-slate-700 leading-tight mt-1">${escapeHtml(load.time || '')}</div>
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
    const loads = State.db.loads.filter(l => l.prof === profName && l.sy === sy && (programFilter === 'All' || l.program === programFilter) && matchesSemester(l, semester));
    if (loads.length === 0) return showBanner(`No workload data found for ${profName}.`, 'error');

    const title = `${profName.toUpperCase()} SCHEDULE`;
    const subtitle = formatScheduleSubtitle(semester, sy);
    const filename = `Faculty_Workload_${profName.replace(/\s+/g, '_')}_${sy.replace(/\s+/g, '_')}_${semester}`;
    const { rows, merges, cols } = buildScheduleGrid(title, subtitle, loads, 'faculty');
    downloadExcelSheet(filename, rows, 'Workload', { merges, cols });
    showBanner(`Workload exported for ${profName}.`, 'success');
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

function initApp() {
    loadSavedState();
    initializeSystemModules();
}

// EXCEL EXPORT FUNCTIONALITY
function downloadExcel(filename, data, headers) {
    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => generateAndDownloadXLSX(filename, data, headers);
        document.head.appendChild(script);
    } else {
        generateAndDownloadXLSX(filename, data, headers);
    }
}

function generateAndDownloadXLSX(filename, data, headers) {
    const rows = [headers, ...data];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function downloadExcelSheet(filename, rows, sheetName = 'Sheet1', options = {}) {
    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => createXLSX(rows, filename, sheetName, options);
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
    return sy ? `${semLabel}, ${sy}` : semLabel;
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
    const isBridging = typeof getSubjectBridgingStatus === 'function'
        ? getSubjectBridgingStatus(load.program || State.activeProgram, load.sub)
        : false;
    const cleanSub = String(load.sub || '').replace(/^\[\s*BRIDGING\s*\]\s*/i, '');
    const subjectTitle = isBridging ? `[BRIDGING] ${cleanSub}` : cleanSub;
    const compHours = Number(load.units) || 0;
    const compType = load.component_type || 'Lec';
    const hoursText = `${compHours} hours - ${compType}`;
    const bldgRoom = typeof formatBuildingRoom === 'function' ? formatBuildingRoom(load) : `${load.building || ''} - ${load.room || ''}`;
    const loadType = load.loadType || 'Regular Load';

    const lines = [];
    if (type === 'faculty') {
        lines.push(subjectTitle);
        lines.push(`Load Type: ${loadType}`);
        lines.push(`Section: ${load.sec || 'N/A'}`);
        lines.push(`Hours: ${hoursText}`);
        lines.push(bldgRoom);
        lines.push(`Time: ${load.time || 'N/A'}`);
    } else {
        lines.push(subjectTitle);
        lines.push(`Professor: ${load.prof || 'TBA'}`);
        lines.push(`Type: ${isBridging ? 'Bridging' : 'Regular'}`);
        lines.push(`Load Type: ${loadType}`);
        lines.push(`Section: ${load.sec || 'N/A'}`);
        lines.push(`Hours: ${hoursText}`);
        lines.push(bldgRoom);
        lines.push(`Time: ${load.time || 'N/A'}`);
    }
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

function exportFacultyWorkloadReport() {
    const buildWorkbook = () => {
        const filename = `Faculty_Workload_Report_${String(State.activeProgram || 'All_Programs').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
        const workbook = XLSX.utils.book_new();
        const context = getExportContext();
        const allLoads = Array.isArray(State.db.loads) ? State.db.loads : [];

        if (allLoads.length === 0) {
            const emptyRows = [
                ['Academic Year', context.schoolYear],
                ['Term', context.semesterLabel],
                [],
                ['Status', 'No workload data available for this current selection.']
            ];
            const worksheet = XLSX.utils.aoa_to_sheet(emptyRows);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'No_Data');
            XLSX.writeFile(workbook, `${filename}.xlsx`);
            showBanner('Workload report exported successfully with no data rows.', 'success');
            return;
        }

        const groupedLoads = {};

        allLoads.forEach(load => {
            const facultyName = load.prof || 'Unknown Faculty';
            if (!groupedLoads[facultyName]) groupedLoads[facultyName] = [];
            groupedLoads[facultyName].push(load);
        });

        Object.entries(groupedLoads)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([facultyName, loads]) => {
                const title = `PROF. (${facultyName.toUpperCase()}) SCHEDULE`;
                const subtitle = `${context.semesterLabel.toUpperCase()} AY A.Y. ${context.schoolYear}`;
                const { rows, merges, cols } = buildScheduleGrid(title, subtitle, loads, 'faculty');

                const safeSheetName = String(facultyName || 'Faculty').replace(/[\\/*?:\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
                const finalSheetName = safeSheetName.slice(0, 31) || 'Faculty';
                const worksheet = XLSX.utils.aoa_to_sheet(rows);
                worksheet['!merges'] = merges;
                worksheet['!cols'] = cols;
                XLSX.utils.book_append_sheet(workbook, worksheet, finalSheetName);
            });

        XLSX.writeFile(workbook, `${filename}.xlsx`);
        showBanner(`Workload report exported successfully!`, 'success');
    };

    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = buildWorkbook;
        script.onerror = () => showBanner('Workbook library failed to load. Please try again.', 'error');
        document.head.appendChild(script);
        return;
    }

    buildWorkbook();
}

function exportFacultyRoster() {
    const filename = `Faculty_Roster_${State.activeProgram.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Faculty Name', 'Classification', 'Classification Rank', 'Title/Designation', 'Employment Type', 'Program', 'Status', 'Total Load (Units)', 'License Number', 'Specialization'];
    
    const programFaculty = facultyRegistry.filter(f => f.program === State.activeProgram);
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