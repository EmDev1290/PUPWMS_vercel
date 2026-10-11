
const TEMP_DATABASE = window.TEMP_DATABASE || null;
const facultyRegistry = TEMP_DATABASE?.facultyRegistry || [];
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[character]));
}

function findSubjectInfo(subjectName, programName) {
    if (!subjectName || !State || !State.db || !State.db.programs) return null;
    const cleanSub = String(subjectName).replace(/^\[\s*BRIDGING\s*\]\s*/i, '').trim().toLowerCase();
    
    // Check in specified program first
    if (programName && State.db.programs[programName]) {
        const prog = State.db.programs[programName];
        if (Array.isArray(prog.bridgingSubjects)) {
            const found = prog.bridgingSubjects.find(s => (s.name || '').trim().toLowerCase() === cleanSub);
            if (found) return found;
        }
        if (prog.subjects) {
            for (const y of Object.keys(prog.subjects)) {
                for (const sem of Object.keys(prog.subjects[y] || {})) {
                    const found = (prog.subjects[y][sem] || []).find(s => (s.name || '').trim().toLowerCase() === cleanSub);
                    if (found) return found;
                }
            }
        }
    }
    
    // Check across all programs
    for (const pKey of Object.keys(State.db.programs)) {
        const prog = State.db.programs[pKey];
        if (Array.isArray(prog.bridgingSubjects)) {
            const found = prog.bridgingSubjects.find(s => (s.name || '').trim().toLowerCase() === cleanSub);
            if (found) return found;
        }
        if (prog.subjects) {
            for (const y of Object.keys(prog.subjects)) {
                for (const sem of Object.keys(prog.subjects[y] || {})) {
                    const found = (prog.subjects[y][sem] || []).find(s => (s.name || '').trim().toLowerCase() === cleanSub);
                    if (found) return found;
                }
            }
        }
    }
    return null;
}

function getSubjectBridgingStatus(programName, subjectName) {
    if (!subjectName) return false;
    const subStr = String(subjectName);
    if (/\[\s*BRIDGING\s*\]/i.test(subStr) || /\bbridging\b/i.test(subStr)) return true;
    const info = findSubjectInfo(subjectName, programName);
    if (info) return !!info.is_bridging;
    return false;
}

function getLoadSubjectHours(load) {
    if (!load) return { lec: 0, lab: 0, units: 0, componentType: 'Lec' };
    const componentType = load.component_type || 'Lec';
    let lec = load.lec_units ?? load.lec;
    let lab = load.lab_units ?? load.lab;

    if (lec == null && lab == null) {
        const subInfo = findSubjectInfo(load.sub, load.program);
        if (subInfo) {
            lec = subInfo.lec_units ?? subInfo.lec;
            lab = subInfo.lab_units ?? subInfo.lab;
        }
    }

    let numLec = Number(lec) || 0;
    let numLab = Number(lab) || 0;
    let totalUnits = (numLec + numLab) > 0 ? (numLec + numLab) : (Number(load.units) || 3);

    if (numLec === 0 && numLab === 0) {
        if (componentType === 'Lab') {
            numLab = totalUnits;
        } else if (componentType === 'Lec/Lab') {
            numLec = Math.ceil(totalUnits / 2);
            numLab = Math.floor(totalUnits / 2);
        } else {
            numLec = totalUnits;
        }
    }

    return {
        lec: numLec,
        lab: numLab,
        units: totalUnits,
        componentType
    };
}

function formatBuildingRoom(load) {
    if (!load) return 'Room TBA';
    const room = (load.room || '').trim();
    const bldg = (load.building || '').trim();
    if (bldg && room) {
        if (room.toLowerCase().startsWith(bldg.toLowerCase())) return room;
        return `${bldg} - ${room}`;
    }
    return room || bldg || 'Room TBA';
}

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
        schoolYears: [],
        rooms: [],
        buildings: [],
        programs: {},
        loads: [],
        noClassDays: {}
    }
};

window.State = State;
window.facultyRegistry = facultyRegistry;
window.TEMP_DATABASE = TEMP_DATABASE;
window.designationOptions = designationOptions;
window.CLASSIFICATION_SYSTEM = CLASSIFICATION_SYSTEM;
window.workloadDatabase = workloadDatabase;
window.GLOBAL_MAX_LOAD_CAP = GLOBAL_MAX_LOAD_CAP;

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

function getSubjectHourParts(subject = {}) {
    let lecture = subject.lec_units ?? subject.lec ?? subject.lectureHours;
    let lab = subject.lab_units ?? subject.lab ?? subject.labHours;
    if (lecture === undefined && lab === undefined) {
        const subName = typeof subject === 'string' ? subject : subject?.name;
        if (subName && typeof findSubjectInfo === 'function') {
            const info = findSubjectInfo(subName, State.activeProgram);
            if (info && (info.lec_units !== undefined || info.lab_units !== undefined)) {
                lecture = info.lec_units ?? info.lec;
                lab = info.lab_units ?? info.lab;
            }
        }
    }
    if (lecture === undefined && lab === undefined) {
        return { lec: Number(subject.units) || 0, lab: 0, units: Number(subject.units) || 0 };
    }
    const lec = Number(lecture) || 0;
    const labHours = Number(lab) || 0;
    return { lec, lab: labHours, units: (lec + labHours) > 0 ? (lec + labHours) : (Number(subject.units) || 0) };
}

function getSubjectScheduledComponents(subject, loads = [], excludeLoadId = null) {
    const totals = getSubjectHourParts(subject);
    const scheduled = { lec: 0, lab: 0 };
    const orderedLoads = [...loads]
        .filter(load => String(load.id) !== String(excludeLoadId))
        .sort((first, second) => Number(first.id) - Number(second.id));

    orderedLoads.forEach(load => {
        const hours = Math.max(0, Number(load.units) || 0);
        const component = load.component_type || load.componentType || 'Lec/Lab';
        if (component === 'Lec') {
            scheduled.lec += hours;
        } else if (component === 'Lab') {
            scheduled.lab += hours;
        } else {
            const lecRemaining = Math.max(0, totals.lec - scheduled.lec);
            const lecUsed = Math.min(lecRemaining, hours);
            scheduled.lec += lecUsed;
            scheduled.lab += Math.min(Math.max(0, totals.lab - scheduled.lab), hours - lecUsed);
        }
    });

    return {
        scheduled,
        remaining: {
            lec: Math.max(0, totals.lec - scheduled.lec),
            lab: Math.max(0, totals.lab - scheduled.lab)
        },
        total: totals.units
    };
}
if (typeof window !== 'undefined') {
    window.getSubjectScheduledComponents = getSubjectScheduledComponents;
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
    return ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => `
        <option value="${day}" ${day === selected ? 'selected' : ''}>${day || 'Choose day'}</option>`
    ).join('');
}

function getPreferredTimeSlots(startMinutes = 7 * 60, endMinutes = 22 * 60) {
    const slots = [];
    for (let m = startMinutes; m < endMinutes; m += 30) {
        slots.push({
            start: m,
            end: m + 30,
            label: `${formatTime(m)} - ${formatTime(m + 30)}`
        });
    }
    return slots;
}

function getPreferredTimeOptions(selected = '') {
    const slots = getPreferredTimeSlots();
    return ['<option value="">Choose time range</option>']
        .concat(slots.map(s => `<option value="${s.label}" ${s.label === selected ? 'selected' : ''}>${s.label}</option>`))
        .join('');
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

function preferredTimeSlotsByDay(entries) {
    const slotsByDay = new Map();
    entries.forEach(entry => {
        const separatorIndex = entry.indexOf(' ');
        if (separatorIndex < 0) return;
        const day = entry.slice(0, separatorIndex).trim();
        const range = entry.slice(separatorIndex + 1).trim();
        const [startText, endText] = range.split(' - ');
        if (!startText || !endText) return;

        let start, end;
        try {
            start = parseTimeStr(startText);
            end = parseTimeStr(endText);
        } catch (error) {
            return;
        }
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;

        const daySlots = slotsByDay.get(day) || new Set();
        for (let slotStart = start; slotStart < end; slotStart += 30) {
            daySlots.add(slotStart);
        }
        slotsByDay.set(day, daySlots);
    });
    return slotsByDay;
}

function preferredTimeEntriesFromSlots(slotsByDay) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const entries = [];
    days.forEach(day => {
        const starts = [...(slotsByDay.get(day) || [])].sort((a, b) => a - b);
        if (!starts.length) return;

        let rangeStart = starts[0];
        let previous = starts[0];
        starts.slice(1).forEach(start => {
            if (start !== previous + 30) {
                entries.push(`${day} ${formatTime(rangeStart)} - ${formatTime(previous + 30)}`);
                rangeStart = start;
            }
            previous = start;
        });
        entries.push(`${day} ${formatTime(rangeStart)} - ${formatTime(previous + 30)}`);
    });
    return entries;
}

function renderPreferredIntervalBoxes(containerId, day, currentEntries = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!day) {
        container.innerHTML = '<div class="col-span-full py-2 text-xs text-slate-400 italic">Select a Preferred Day to see 30-min intervals.</div>';
        return;
    }
    const slots = getPreferredTimeSlots();
    const selectedSlots = preferredTimeSlotsByDay(currentEntries).get(day) || new Set();

    container.innerHTML = slots.map(slot => {
        const isChecked = selectedSlots.has(slot.start);
        return `
            <label class="flex items-center gap-1.5 p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${isChecked ? 'bg-red-50 border-red-300 text-red-900 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}">
                <input type="checkbox" class="pref-interval-slot h-3.5 w-3.5 rounded accent-[#7f0000]" value="${slot.start}" ${isChecked ? 'checked' : ''} onchange="this.parentElement.className = this.checked ? 'flex items-center gap-1.5 p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all bg-red-50 border-red-300 text-red-900 font-semibold' : 'flex items-center gap-1.5 p-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all bg-white border-slate-200 text-slate-700 hover:bg-slate-50'">
                <span class="text-[11px]">${slot.label}</span>
            </label>
        `;
    }).join('');
}

function renderPreferredTimeList(listId, entries = [], hiddenInputId) {
    const listContainer = document.getElementById(listId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!listContainer) return;

    listContainer.innerHTML = entries.map(entry => {
        const [day, ...timeParts] = entry.split(' ');
        const time = timeParts.join(' ');
        return `
            <div class="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-900 mr-2 mb-2 font-medium" data-day="${day}" data-time="${time}">
                <span>${day} ${time}</span>
                <button type="button" class="font-bold text-red-500 hover:text-red-800 ml-1">×</button>
            </div>`;
    }).join('');

    if (hiddenInput) {
        hiddenInput.value = entries.join(', ');
    }

    listContainer.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            const item = button.closest('[data-day][data-time]');
            if (!item) return;
            const removedDay = item.dataset.day;
            const removedTime = item.dataset.time;
            item.remove();
            if (hiddenInput) {
                const remaining = Array.from(listContainer.querySelectorAll('[data-day][data-time]'))
                    .map(el => `${el.dataset.day} ${el.dataset.time}`);
                hiddenInput.value = remaining.join(', ');
                
                // Refresh interval checkboxes if currently showing the removed day
                const editDaySelect = document.getElementById('faculty-update-pref-day');
                if (editDaySelect && editDaySelect.value === removedDay) {
                    renderPreferredIntervalBoxes('faculty-update-pref-intervals', removedDay, remaining);
                }
                const newDaySelect = document.getElementById('new-faculty-pref-day');
                if (newDaySelect && newDaySelect.value === removedDay) {
                    renderPreferredIntervalBoxes('new-faculty-pref-intervals', removedDay, remaining);
                }
            }
        });
    });
}

function applyPreferredIntervalSelection(daySelectId, containerId, listId, hiddenInputId) {
    const day = document.getElementById(daySelectId)?.value;
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!day) return showBanner('Please select a Preferred Day first.', 'error');
    if (!container || !hiddenInput) return;

    const selectedStarts = [...container.querySelectorAll('.pref-interval-slot:checked')]
        .map(cb => Number(cb.value))
        .filter(Number.isFinite);

    if (!selectedStarts.length) {
        return showBanner('Please check at least one 30-minute interval.', 'error');
    }

    // Update slots for the selected day
    const currentEntries = parsePreferredTimeEntries(hiddenInput.value);
    const slotsByDay = preferredTimeSlotsByDay(currentEntries);
    slotsByDay.set(day, new Set(selectedStarts));

    const mergedEntries = preferredTimeEntriesFromSlots(slotsByDay);
    renderPreferredTimeList(listId, mergedEntries, hiddenInputId);
    renderPreferredIntervalBoxes(containerId, day, mergedEntries);
    showBanner(`Preferred time for ${day} updated (${mergedEntries.filter(e => e.startsWith(day)).join(', ')}).`, 'success');
}

function populateNewFacultyPreferredDropdowns() {
    const subjectSelect = document.getElementById('new-faculty-pref-subjects');
    if (subjectSelect) subjectSelect.innerHTML = getPreferredSubjectOptions('');
    const daySelect = document.getElementById('new-faculty-pref-day');
    if (daySelect) {
        daySelect.innerHTML = getPreferredDayOptions('');
        daySelect.onchange = () => {
            renderPreferredIntervalBoxes('new-faculty-pref-intervals', daySelect.value, parsePreferredTimeEntries(document.getElementById('new-faculty-pref-times-hidden')?.value || ''));
        };
    }
    renderPreferredIntervalBoxes('new-faculty-pref-intervals', daySelect ? daySelect.value : '', []);
    renderPreferredTimeList('new-faculty-pref-time-list', [], 'new-faculty-pref-times-hidden');
    const addButton = document.getElementById('new-faculty-pref-time-add');
    if (addButton) {
        addButton.onclick = () => applyPreferredIntervalSelection('new-faculty-pref-day', 'new-faculty-pref-intervals', 'new-faculty-pref-time-list', 'new-faculty-pref-times-hidden');
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

    const currentEntries = parsePreferredTimeEntries(faculty.preferredTimes || '');
    const { day } = parsePreferredTimeComponents(faculty.preferredTimes || '');
    const daySelect = document.getElementById('faculty-update-pref-day');
    if (daySelect) {
        daySelect.innerHTML = getPreferredDayOptions(day);
        daySelect.onchange = () => {
            renderPreferredIntervalBoxes('faculty-update-pref-intervals', daySelect.value, parsePreferredTimeEntries(document.getElementById('faculty-update-pref-times-hidden')?.value || ''));
        };
    }

    renderPreferredIntervalBoxes('faculty-update-pref-intervals', day, currentEntries);
    renderPreferredTimeList('faculty-update-pref-time-list', currentEntries, 'faculty-update-pref-times-hidden');

    const addButton = document.getElementById('faculty-update-pref-time-add');
    if (addButton) {
        addButton.onclick = () => applyPreferredIntervalSelection('faculty-update-pref-day', 'faculty-update-pref-intervals', 'faculty-update-pref-time-list', 'faculty-update-pref-times-hidden');
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
}

async function persistLoadToAPI(loadEntry) {
    try {
        const response = await fetch('/api/loads', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(loadEntry)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to save load');
        }

        return true;
    } catch (error) {
        console.error('Unable to persist load to API:', error);
        throw error;
    }
}

async function deleteLoadFromAPI(loadId) {
    try {
        const response = await fetch(`/api/loads/${loadId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to delete load');
        }

        return true;
    } catch (error) {
        console.error('Unable to delete load from API:', error);
        throw error;
    }
}

async function updateFacultyAPI(facultyObj) {
    try {
        const response = await fetch('/api/faculty', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(facultyObj)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to update faculty via API');
        }

        return true;
    } catch (err) {
        console.error('API Error:', err);
        throw err;
    }
}

async function updateFacultyStatusAPI(facultyId, isActive) {
    try {
        const response = await fetch(`/api/faculty/${encodeURIComponent(facultyId)}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ active: isActive })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to update faculty status');
        }
        return await response.json();
    } catch (err) {
        console.error('API Error in updateFacultyStatusAPI:', err);
        throw err;
    }
}
async function loadSavedState() {
    const savedAcademicYear = localStorage.getItem('activeAcademicYear');
    const savedProgram = localStorage.getItem('activeProgram');

    try {
        const response = await fetch('/api/initial-state', {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            State.db.schoolYears = data.db.schoolYears || State.db.schoolYears;
            State.db.rooms = data.db.rooms || State.db.rooms;
            State.db.buildings = data.db.buildings || State.db.buildings;
            State.db.programs = data.db.programs || State.db.programs;
            State.db.loads = Array.isArray(data.db.loads) ? data.db.loads : [];
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
                State.db.loads = Array.isArray(savedData.loads) ? savedData.loads : [];
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
    openModal({
        title: 'Forgot Password',
        submitLabel: 'Reset Password',
        body: `
            <div class="space-y-4">
                <div id="forgot-password-error" class="hidden rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"></div>
                <div id="forgot-password-success" class="hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"></div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                    <input id="forgot-password-username" type="text" autocomplete="username" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" placeholder="Enter your username" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">ID Number</label>
                    <input id="forgot-password-id" type="text" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" placeholder="Enter your ID Number" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                    <input id="forgot-password-fullname" type="text" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" placeholder="Enter your Full Name" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                    <input id="forgot-password-new" type="password" autocomplete="new-password" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" placeholder="At least 8 characters" />
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
                    <input id="forgot-password-confirm" type="password" autocomplete="new-password" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" placeholder="Repeat your new password" />
                </div>
                <p class="text-xs text-slate-500">For account security, use this only for your own account. Contact an Academic Head if you do not know your credentials.</p>
            </div>
        `,
        onSubmit: async () => {
            const username = document.getElementById('forgot-password-username')?.value.trim();
            const idNumber = document.getElementById('forgot-password-id')?.value.trim();
            const fullName = document.getElementById('forgot-password-fullname')?.value.trim();
            const newPassword = document.getElementById('forgot-password-new')?.value;
            const confirmation = document.getElementById('forgot-password-confirm')?.value;
            const error = document.getElementById('forgot-password-error');
            const success = document.getElementById('forgot-password-success');

            if (error) error.classList.add('hidden');
            if (success) success.classList.add('hidden');
            if (!username || !idNumber || !fullName || !newPassword || !confirmation) {
                if (error) {
                    error.textContent = 'Username, ID Number, Full Name, and new password fields are all required.';
                    error.classList.remove('hidden');
                }
                return;
            }
            const passwordValidation = validatePassword(newPassword);
            if (!passwordValidation.valid) {
                if (error) {
                    error.textContent = passwordValidation.message;
                    error.classList.remove('hidden');
                }
                return;
            }
            if (newPassword !== confirmation) {
                if (error) {
                    error.textContent = 'The password confirmation does not match.';
                    error.classList.remove('hidden');
                }
                return;
            }

            const submitButton = document.getElementById('global-modal-submit');
            if (submitButton) submitButton.disabled = true;
            try {
                const response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, idNumber, fullName, newPassword })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Unable to reset password.');
                closeModal();
                showBanner('Password reset successfully. You can now log in with your new password.', 'success');
            } catch (err) {
                if (error) {
                    error.textContent = err.message || 'Unable to reset password.';
                    error.classList.remove('hidden');
                }
                if (submitButton) submitButton.disabled = false;
            }
        }
    });
}

window.openForgotPasswordModal = openForgotPasswordModal;

function logout() {
    fetch('/api/logout', {
        method: 'POST',
        headers: getAuthHeaders()
    }).catch(() => undefined);
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
}

function getCurrentUserFromSession() {
    const userStr = sessionStorage.getItem('loggedInUser');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
}

function isAcademicHeadUser() {
    const user = getCurrentUserFromSession();
    if (!user) return false;
    const role = String(user.role || '').toLowerCase();
    const username = String(user.username || '').toLowerCase();
    return role.includes('head') || role.includes('academic head') || username === 'head_pq';
}

function isAcademicAideUser() {
    const user = getCurrentUserFromSession();
    if (!user) return false;
    const role = String(user.role || '').toLowerCase();
    const username = String(user.username || '').toLowerCase();
    return role.includes('aide') || role.includes('academic aide') || username === 'aide_pq';
}

async function deleteFacultyFromAPI(facultyId) {
    const response = await fetch(`/api/faculty/${encodeURIComponent(facultyId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete faculty');
    }
    return response.json();
}

async function createSectionAPI(programName, sectionName) {
    const response = await fetch('/api/sections', {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ program_name: programName, section_name: sectionName })
    });
    if (!response.ok) throw new Error(await response.text() || 'Failed to add section');
    return response.json();
}

async function deleteSectionAPI(programName, sectionName) {
    const response = await fetch('/api/sections', {
        method: 'DELETE', headers: getAuthHeaders(),
        body: JSON.stringify({ program_name: programName, section_name: sectionName })
    });
    if (!response.ok) throw new Error(await response.text() || 'Failed to delete section');
    return response.json();
}

async function createSubjectAPI(payload) {
    const response = await fetch('/api/subjects', {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text() || 'Failed to add subject');
    return response.json();
}

async function updateSubjectAPI(payload) {
    const response = await fetch('/api/subjects', {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text() || 'Failed to update subject');
    return response.json();
}

async function deleteSubjectAPI(payload) {
    const response = await fetch('/api/subjects', {
        method: 'DELETE', headers: getAuthHeaders(), body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text() || 'Failed to delete subject');
    return response.json();
}

function getPendingApprovals() {
    try {
        const raw = localStorage.getItem('pendingApprovals');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function savePendingApprovals(items) {
    localStorage.setItem('pendingApprovals', JSON.stringify(items));
}

function getApprovalHistory() {
    try {
        const raw = localStorage.getItem('approvalHistory');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveApprovalHistory(items) {
    localStorage.setItem('approvalHistory', JSON.stringify(items.slice(-100)));
}

function recordApprovalHistory(item, status) {
    const history = getApprovalHistory();
    const existingIndex = history.findIndex(entry => entry.id === item.id);
    const entry = {
        ...item,
        status,
        updatedAt: new Date().toISOString()
    };
    if (existingIndex === -1) history.push(entry);
    else history[existingIndex] = entry;
    saveApprovalHistory(history);
}

function normalizeRequestRemarks(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function queueApprovalAction(type, payload = {}) {
    const currentUser = getCurrentUserFromSession() || {};
    const currentUsername = currentUser.username || 'aide_pq';
    const currentDisplayName = currentUser.displayName || currentUsername || 'Academic Aide';

    if (!isAcademicHeadUser() && !payload.remarks && typeof window !== 'undefined' && window.prompt) {
        const remarkPrompt = window.prompt('Add an aide remark for the Academic Head before submitting this request (required):', '');
        if (remarkPrompt === null) {
            return null;
        }

        const remarks = normalizeRequestRemarks(remarkPrompt);
        if (!remarks) {
            showBanner('Aide remarks are required before submitting a request.', 'error');
            return null;
        }

        payload.remarks = remarks;
    }

    const pending = getPendingApprovals();
    const item = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        payload,
        requestedBy: currentDisplayName,
        requestedByUsername: currentUsername,
        remarks: normalizeRequestRemarks(payload.remarks || ''),
        createdAt: new Date().toISOString()
    };

    pending.push(item);
    savePendingApprovals(pending);
    recordApprovalHistory(item, 'Pending');
    updateApprovalButtonState();
    return item;
}

function requestFacultyStatusChange(facultyId, requestedActiveState) {
    const faculty = facultyRegistry.find(f => f.id === facultyId);
    if (!faculty) {
        showBanner('Faculty record not found.', 'error');
        return;
    }

    const actionText = requestedActiveState ? 'activate' : 'deactivate';
    const queued = queueApprovalAction('faculty_status', {
        facultyId: faculty.id,
        name: faculty.name,
        active: Boolean(requestedActiveState)
    });

    if (queued) {
        showBanner(`${faculty.name} status change to ${actionText} is pending Academic Head approval.`, 'info');
    }
    if (typeof renderFacultyStatusPage === 'function') {
        renderFacultyStatusPage();
    }
}

function updateApprovalButtonState() {
    const button = document.getElementById('changes-for-approval-button');
    const historyButton = document.getElementById('request-history-button');
    const approvals = getPendingApprovals();
    const historyIds = new Set(getApprovalHistory().map(item => item.id));
    approvals.forEach(item => {
        if (!historyIds.has(item.id)) recordApprovalHistory(item, 'Pending');
    });
    if (historyButton) {
        const isAide = isAcademicAideUser();
        historyButton.classList.toggle('hidden', !isAide);
        historyButton.setAttribute('aria-hidden', String(!isAide));
    }
    if (!button) return;
    const isHead = isAcademicHeadUser();
    if (!isHead) {
        button.classList.add('hidden');
        button.setAttribute('aria-hidden', 'true');
        return;
    }
    button.classList.remove('hidden');
    button.setAttribute('aria-hidden', 'false');
    button.innerHTML = approvals.length
        ? `<span class="inline-flex items-center gap-2"><i data-lucide="badge-check" class="w-4 h-4"></i>Changes for Approval (${approvals.length})</span>`
        : '<span class="inline-flex items-center gap-2"><i data-lucide="check-check" class="w-4 h-4"></i>Changes for Approval</span>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openApprovalQueueModal() {
    const approvals = getPendingApprovals();
    if (!approvals.length) {
        openModal({
            title: 'Changes for Approval',
            body: '<div class="text-sm text-slate-600">There are no pending changes waiting for approval.</div>',
            submitLabel: 'Close',
            onSubmit: closeModal
        });
        return;
    }

    const rows = approvals.map((item, index) => {
        const summary = (() => {
            if (item.type === 'faculty_status') {
                return `${item.payload.name || 'Faculty'} marked as ${item.payload.active ? 'Active' : 'Inactive'}`;
            }
            if (item.type === 'faculty_delete') {
                return `Delete faculty record: ${item.payload.name || 'Faculty'}`;
            }
            if (item.type === 'faculty_add') {
                return `Add faculty profile: ${item.payload.faculty?.name || 'Faculty'}`;
            }
            if (item.type === 'faculty_edit') {
                return `Edit faculty profile: ${item.payload.faculty?.name || 'Faculty'}`;
            }
            if (item.type === 'section_add') {
                return `Add section: ${item.payload.sectionName || 'Section'}`;
            }
            if (item.type === 'section_delete') {
                return `Delete section: ${item.payload.sectionName || 'Section'}`;
            }
            if (item.type === 'subject_add') {
                return `Add subject: ${item.payload.subjectName || 'Subject'}`;
            }
            if (item.type === 'subject_edit') {
                return `Edit subject: ${item.payload.subjectName || 'Subject'}`;
            }
            if (item.type === 'subject_delete') {
                return `Delete subject: ${item.payload.subjectName || 'Subject'}`;
            }
            if (item.type === 'room_add') {
                return `Add room: ${item.payload.roomName || 'Room'} (${item.payload.building || 'Building'})`;
            }
            if (item.type === 'room_delete') {
                return `Delete room: ${item.payload.roomName || 'Room'} (${item.payload.building || 'Building'})`;
            }
            if (item.type === 'database_scan') {
                return 'Database sync request';
            }
            if (item.type === 'file_upload') {
                return `File uploaded: ${item.payload.fileName || 'spreadsheet'}`;
            }
            if (item.type === 'file_delete') {
                return `File deleted: ${item.payload.fileName || 'spreadsheet'}`;
            }
            return 'System change request';
        })();
        const requestedBy = item.requestedBy || 'Academic Aide';
        const remarks = item.remarks ? `<div class="mt-2 text-[11px] text-slate-600"><span class="font-semibold">Aide remark:</span> ${escapeHtml(item.remarks)}</div>` : '<div class="mt-2 text-[11px] text-slate-500">No aide remark provided.</div>';
        const isCurrentRequester = !isAcademicHeadUser() && (item.requestedByUsername === (getCurrentUserFromSession()?.username || 'aide_pq'));

        return `
            <li class="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div>
                    <div class="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">${index + 1}</div>
                    <div class="text-sm font-medium text-slate-700 mt-1">${summary}</div>
                    <div class="mt-1 text-[11px] text-slate-500">Requested by: ${escapeHtml(requestedBy)}</div>
                    ${remarks}
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-[10px] font-semibold uppercase text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">Pending</span>
                    ${isCurrentRequester ? `<button type="button" data-cancel-approval-id="${item.id}" class="rounded-lg border border-orange-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-orange-700 hover:bg-orange-50">Cancel</button>` : `<button type="button" data-reject-approval-id="${item.id}" class="rounded-lg border border-red-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-red-700 hover:bg-red-50">Reject</button>`}
                </div>
            </li>
        `;
    }).join('');

    openModal({
        title: 'Changes for Approval',
        body: `
            <div class="space-y-4">
                <p class="text-sm text-slate-600">Review pending change requests below. Approving them will apply the changes immediately.</p>
                <ul class="space-y-3">${rows}</ul>
            </div>
        `,
        submitLabel: 'Approve All',
        onSubmit: async () => {
            const pending = getPendingApprovals();
            if (!pending.length) {
                closeModal();
                return;
            }

            const failed = [];

            for (const item of pending) {
                if (item.type === 'faculty_status') {
                    const faculty = facultyRegistry.find(f => f.id === item.payload.facultyId);
                    if (!faculty) {
                        failed.push(item);
                        continue;
                    }

                    const nextState = Boolean(item.payload.active);
                    try {
                        await updateFacultyStatusAPI(faculty.id, nextState);
                        faculty.active = nextState;

                        if (!nextState) {
                            State.db.loads = (State.db.loads || []).filter(load => load.prof !== faculty.name);
                        }
                    } catch (error) {
                        console.error('Unable to approve faculty status change:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'faculty_delete') {
                    const faculty = facultyRegistry.find(f => f.id === item.payload.facultyId);
                    try {
                        await deleteFacultyFromAPI(item.payload.facultyId);
                        if (faculty) {
                            const facultyIndex = facultyRegistry.indexOf(faculty);
                            if (facultyIndex !== -1) facultyRegistry.splice(facultyIndex, 1);
                            State.db.loads = (State.db.loads || []).filter(load => load.prof !== item.payload.name);
                            Object.values(State.db.programs || {}).forEach(program => {
                                if (program.profs) {
                                    program.profs = program.profs.filter(name => name !== item.payload.name);
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Unable to approve faculty deletion:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'faculty_add') {
                    try {
                        await updateFacultyAPI(item.payload.faculty);
                        const faculty = item.payload.faculty;
                        if (!facultyRegistry.some(existing => existing.id === faculty.id)) facultyRegistry.push(faculty);
                        faculty.program.split(',').map(programName => programName.trim()).filter(Boolean).forEach(programName => {
                            if (!State.db.programs[programName]) State.db.programs[programName] = { profs: [], sections: [], subjects: {} };
                            if (!State.db.programs[programName].profs.includes(faculty.name)) State.db.programs[programName].profs.push(faculty.name);
                        });
                    } catch (error) {
                        console.error('Unable to approve faculty addition:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'faculty_edit') {
                    try {
                        await updateFacultyAPI(item.payload.faculty);
                        const faculty = facultyRegistry.find(existing => existing.id === item.payload.facultyId);
                        if (!faculty) throw new Error('Faculty not found locally');
                        const oldName = faculty.name;
                        const oldProgram = faculty.program;
                        Object.assign(faculty, item.payload.faculty);
                        oldProgram.split(',').map(programName => programName.trim()).filter(Boolean).forEach(programName => {
                            const program = State.db.programs[programName];
                            if (program) program.profs = (program.profs || []).filter(name => name !== oldName);
                        });
                        faculty.program.split(',').map(programName => programName.trim()).filter(Boolean).forEach(programName => {
                            if (!State.db.programs[programName]) State.db.programs[programName] = { profs: [], sections: [], subjects: {} };
                            const program = State.db.programs[programName];
                            if (!program.profs.includes(faculty.name)) program.profs.push(faculty.name);
                        });
                    } catch (error) {
                        console.error('Unable to approve faculty edit:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'section_add') {
                    try {
                        await createSectionAPI(item.payload.programName, item.payload.sectionName);
                        const program = State.db.programs[item.payload.programName];
                        if (program && !program.sections.includes(item.payload.sectionName)) program.sections.push(item.payload.sectionName);
                    } catch (error) {
                        console.error('Unable to approve section addition:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'section_delete') {
                    try {
                        await deleteSectionAPI(item.payload.programName, item.payload.sectionName);
                        const program = State.db.programs[item.payload.programName];
                        if (program) program.sections = (program.sections || []).filter(section => section !== item.payload.sectionName);
                    } catch (error) {
                        console.error('Unable to approve section deletion:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'subject_add') {
                    try {
                        await createSubjectAPI(item.payload.apiPayload);
                        const program = State.db.programs[item.payload.programName];
                        if (!program.subjects) program.subjects = {};
                        if (!program.subjects[item.payload.yearLevel]) program.subjects[item.payload.yearLevel] = {};
                        if (!program.subjects[item.payload.yearLevel][item.payload.semester]) program.subjects[item.payload.yearLevel][item.payload.semester] = [];
                        program.subjects[item.payload.yearLevel][item.payload.semester].push({ name: item.payload.subjectName, units: item.payload.units });
                    } catch (error) {
                        console.error('Unable to approve subject addition:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'subject_edit') {
                    try {
                        await updateSubjectAPI(item.payload.apiPayload);
                        const program = State.db.programs[item.payload.programName];
                        const oldSubjects = program?.subjects?.[item.payload.oldYearLevel]?.[item.payload.oldSemester];
                        const subject = oldSubjects?.find(entry => entry.name === item.payload.oldSubjectName);
                        if (!subject) throw new Error('Subject not found locally');
                        oldSubjects.splice(oldSubjects.indexOf(subject), 1);
                        if (!program.subjects[item.payload.yearLevel]) program.subjects[item.payload.yearLevel] = {};
                        if (!program.subjects[item.payload.yearLevel][item.payload.semester]) program.subjects[item.payload.yearLevel][item.payload.semester] = [];
                        program.subjects[item.payload.yearLevel][item.payload.semester].push({ name: item.payload.subjectName, units: item.payload.units });
                    } catch (error) {
                        console.error('Unable to approve subject edit:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'subject_delete') {
                    try {
                        await deleteSubjectAPI(item.payload.apiPayload);
                        const program = State.db.programs[item.payload.programName];
                        const subjects = program?.subjects?.[item.payload.yearLevel]?.[item.payload.semester];
                        if (!subjects) throw new Error('Subject not found locally');
                        const subjectIndex = subjects.findIndex(entry => entry.name === item.payload.subjectName);
                        if (subjectIndex === -1) throw new Error('Subject not found locally');
                        subjects.splice(subjectIndex, 1);
                    } catch (error) {
                        console.error('Unable to approve subject deletion:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'room_add') {
                    try {
                        const response = await fetch('/api/rooms', {
                            method: 'POST', headers: getAuthHeaders(),
                            body: JSON.stringify({ name: item.payload.roomName, building: item.payload.building })
                        });
                        if (!response.ok) throw new Error(await response.text() || 'Failed to add room');
                        if (!State.db.rooms.some(room => room.name === item.payload.roomName && room.building === item.payload.building)) {
                            State.db.rooms.push({ name: item.payload.roomName, building: item.payload.building });
                        }
                    } catch (error) {
                        console.error('Unable to approve room addition:', error);
                        failed.push(item);
                    }
                } else if (item.type === 'room_delete') {
                    try {
                        const response = await fetch('/api/rooms', {
                            method: 'DELETE', headers: getAuthHeaders(),
                            body: JSON.stringify({ name: item.payload.roomName })
                        });
                        if (!response.ok) throw new Error(await response.text() || 'Failed to delete room');
                        State.db.rooms = State.db.rooms.filter(room => !(room.name === item.payload.roomName && room.building === item.payload.building));
                    } catch (error) {
                        console.error('Unable to approve room deletion:', error);
                        failed.push(item);
                    }
                }
                if (!failed.some(failedItem => failedItem.id === item.id)) {
                    recordApprovalHistory(item, 'Approved');
                }
            }

            if (failed.length) {
                const remaining = pending.filter(item => !failed.some(failedItem => failedItem.id === item.id));
                savePendingApprovals(remaining);
                updateApprovalButtonState();
                showBanner('Some changes could not be applied. Please review and retry failing requests.', 'error');
            } else {
                savePendingApprovals([]);
                showBanner('Pending changes approved and implemented successfully.', 'success');
            }

            await persistState();
            updateApprovalButtonState();
            if (typeof renderFacultyStatusPage === 'function') renderFacultyStatusPage();
            if (typeof renderDashboard === 'function') renderDashboard();
            if (typeof renderProgramResources === 'function') renderProgramResources();
            closeModal();
        }
    });

    document.querySelectorAll('[data-reject-approval-id]').forEach(button => {
        button.addEventListener('click', () => rejectApprovalRequest(button.dataset.rejectApprovalId));
    });

    document.querySelectorAll('[data-cancel-approval-id]').forEach(button => {
        button.addEventListener('click', () => cancelApprovalRequest(button.dataset.cancelApprovalId));
    });
}

function rejectApprovalRequest(approvalId) {
    const pending = getPendingApprovals();
    const rejected = pending.find(item => item.id === approvalId);
    if (!rejected) return;

    recordApprovalHistory(rejected, 'Rejected');
    savePendingApprovals(pending.filter(item => item.id !== approvalId));
    updateApprovalButtonState();
    closeModal();
    showBanner('Change request rejected.', 'info');
    if (getPendingApprovals().length) openApprovalQueueModal();
}

function cancelApprovalRequest(approvalId) {
    const pending = getPendingApprovals();
    const cancelled = pending.find(item => item.id === approvalId);
    if (!cancelled) return;

    recordApprovalHistory({ ...cancelled, status: 'Cancelled' }, 'Cancelled');
    savePendingApprovals(pending.filter(item => item.id !== approvalId));
    updateApprovalButtonState();
    closeModal();
    showBanner('Pending request cancelled successfully.', 'info');
    if (getPendingApprovals().length) openApprovalQueueModal();
}

function approvalHistorySummary(item) {
    const payload = item.payload || {};
    if (item.type === 'faculty_status') return `${payload.name || 'Faculty'} status: ${payload.active ? 'Active' : 'Inactive'}`;
    if (item.type === 'faculty_add') return `Add faculty: ${payload.faculty?.name || 'Faculty'}`;
    if (item.type === 'faculty_edit') return `Edit faculty: ${payload.faculty?.name || 'Faculty'}`;
    if (item.type === 'faculty_delete') return `Delete faculty: ${payload.name || 'Faculty'}`;
    if (item.type === 'section_add') return `Add section: ${payload.sectionName || 'Section'}`;
    if (item.type === 'section_delete') return `Delete section: ${payload.sectionName || 'Section'}`;
    if (item.type === 'subject_add') return `Add subject: ${payload.subjectName || 'Subject'}`;
    if (item.type === 'subject_edit') return `Edit subject: ${payload.subjectName || 'Subject'}`;
    if (item.type === 'subject_delete') return `Delete subject: ${payload.subjectName || 'Subject'}`;
    if (item.type === 'room_add') return `Add room: ${payload.roomName || 'Room'}`;
    if (item.type === 'room_delete') return `Delete room: ${payload.roomName || 'Room'}`;
    if (item.type === 'file_upload') return `Upload file: ${payload.fileName || 'File'}`;
    if (item.type === 'file_delete') return `Delete file: ${payload.fileName || 'File'}`;
    if (item.type === 'database_scan') return 'Database synchronization';
    return 'System change request';
}

function openApprovalHistoryModal() {
    const history = getApprovalHistory().slice().reverse();
    const currentUser = getCurrentUserFromSession() || {};
    const currentUsername = currentUser.username || 'aide_pq';
    const body = history.length
        ? `<div class="space-y-3">${history.map(item => {
            const statusClass = item.status === 'Approved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : item.status === 'Rejected'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : item.status === 'Cancelled'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';
            const date = new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleString();
            const canCancel = item.status === 'Pending' && !isAcademicHeadUser() && (item.requestedByUsername === currentUsername || item.requestedBy === (currentUser.displayName || currentUsername));
            const remarks = item.remarks ? `<div class="mt-2 text-[11px] text-slate-600"><span class="font-semibold">Aide remark:</span> ${escapeHtml(item.remarks)}</div>` : '<div class="mt-2 text-[11px] text-slate-500">No aide remark provided.</div>';
            return `<div class="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div>
                    <div class="text-sm font-semibold text-slate-800">${approvalHistorySummary(item)}</div>
                    <div class="mt-1 text-xs text-slate-500">${date}</div>
                    <div class="mt-1 text-[11px] text-slate-500">Requested by: ${escapeHtml(item.requestedBy || 'Academic Aide')}</div>
                    ${remarks}
                </div>
                <div class="flex flex-col items-end gap-2">
                    <span class="rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusClass}">${item.status}</span>
                    ${canCancel ? `<button type="button" data-cancel-history-id="${item.id}" class="rounded-lg border border-orange-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-orange-700 hover:bg-orange-50">Cancel</button>` : ''}
                </div>
            </div>`;
        }).join('')}</div>`
        : '<div class="text-sm text-slate-600">No change requests have been submitted yet.</div>';

    openModal({
        title: 'Request History',
        body,
        submitLabel: 'Close',
        onSubmit: closeModal
    });

    document.querySelectorAll('[data-cancel-history-id]').forEach(button => {
        button.addEventListener('click', () => cancelApprovalRequest(button.dataset.cancelHistoryId));
    });
}

function setPageAccessRestrictions() {
    const isHead = isAcademicHeadUser();
    const saveFacultyButton = document.getElementById('save-faculty-profile-button');
    if (saveFacultyButton) saveFacultyButton.textContent = isHead ? 'Save Faculty Profile' : 'Request Faculty Profile Addition';
    const editFacultyButton = document.querySelector('[onclick="openEditFacultyModal()"]');
    if (editFacultyButton) editFacultyButton.querySelector('span').textContent = isHead ? 'Edit Professor Profile' : 'Request Profile Edit';
    const addSubjectButton = document.getElementById('add-subject-button');
    const addSectionButton = document.getElementById('add-section-button');
    const addRoomButton = document.getElementById('add-room-button');
    if (addSubjectButton) addSubjectButton.textContent = isHead ? 'Add Subject' : 'Request Subject Addition';
    if (addSectionButton) addSectionButton.textContent = isHead ? 'Add Section' : 'Request Section Addition';
    if (addRoomButton) addRoomButton.querySelector('span').textContent = isHead ? 'Add Room' : 'Request Room Addition';
    const deleteButton = document.getElementById('faculty-delete-button');
    if (deleteButton) {
        deleteButton.querySelector('span').textContent = isHead ? 'Delete Faculty Record' : 'Request Faculty Deletion';
        deleteButton.title = isHead
            ? 'Permanently delete the selected faculty record.'
            : 'Request Academic Head approval to delete the selected faculty record.';
    }
    const restrictedLinks = document.querySelectorAll('.sidebar-item');
    restrictedLinks.forEach((link) => {
        const href = link.getAttribute('href') || '';
        const isFileManagement = href.includes('file-management.html');
        link.classList.remove('opacity-75');
        link.removeAttribute('title');
        link.onclick = null;
        if (!isHead && isFileManagement) {
            link.setAttribute('title', 'File Management is restricted for Academic Aides.');
            link.onclick = (event) => {
                event.preventDefault();
                showAideFileManagementNotice();
            };
        }
    });

    const statusToggle = document.getElementById('faculty-status-toggle');
    if (statusToggle && !isHead) {
        statusToggle.disabled = true;
        statusToggle.title = 'Change requests must be approved by the Academic Head.';
    }

    const approvalButton = document.getElementById('changes-for-approval-button');
    if (approvalButton) {
        updateApprovalButtonState();
    }
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
    setPageAccessRestrictions();
}

function showAideFileManagementNotice() {
    if (isAcademicHeadUser() || !isAcademicAideUser()) return;
    openModal({
        title: 'File Management Restricted',
        body: `
            <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p class="text-sm font-semibold">Academic Aide access is view-only.</p>
                <p class="mt-2 text-sm leading-relaxed">Uploading, deleting, and database synchronization are restricted to the Academic Head. Requests made from this page require Head approval.</p>
            </div>
        `,
        submitLabel: 'Continue',
        onSubmit: closeModal
    });
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
                const response = await fetch('/api/change-credentials', {
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
                    } catch (e) { }

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
    setPageAccessRestrictions();
    updateApprovalButtonState();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setPageAccessRestrictions();
        updateApprovalButtonState();
        if (window.location.pathname.includes('file-management.html')) showAideFileManagementNotice();
    });
} else {
    setPageAccessRestrictions();
    updateApprovalButtonState();
    if (window.location.pathname.includes('file-management.html')) showAideFileManagementNotice();
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
                <div class="font-semibold text-gray-950">${escapeHtml(loadItem.prof)}</div>
                <div class="text-[11px] text-gray-400">${escapeHtml(loadItem.loadType || 'Regular Load')}</div>
                ${faculty ? `<div class="text-[10px] text-gray-500 mt-0.5">📋 ${escapeHtml(faculty.classification)}</div>` : ''}
            </td>
            <td class="p-4"><span class="px-2 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">${escapeHtml(loadItem.program)} Department</span></td>
            <td class="p-4 font-mono text-xs text-gray-700 font-semibold">${escapeHtml(loadItem.sub)}</td>
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
                yearSection.innerHTML = `<h4 class="text-xs font-bold text-red-900 tracking-wider uppercase border-b pb-1 mb-2">${escapeHtml(yearKey)} Hierarchy</h4>`;
                const semKeys = State.resourceSemester ? [State.resourceSemester] : Object.keys(program.subjects[yearKey] || {});
                semKeys.forEach(semKey => {
                    if (!program.subjects[yearKey][semKey]) return;
                    const semContainer = document.createElement('div'); semContainer.className = 'pl-2 space-y-1.5';
                    semContainer.innerHTML = `<div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">${escapeHtml(semKey)}</div>`;
                    program.subjects[yearKey][semKey].forEach(sub => {
                        const hours = getSubjectHourParts(sub);
                        const isBridging = Boolean(sub.is_bridging) || (typeof getSubjectBridgingStatus === 'function' && getSubjectBridgingStatus(State.activeProgram, sub.name));
                        const bridgingBadge = isBridging ? '<span class="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] px-1.5 py-0.5 rounded mr-2 uppercase font-black tracking-wider">BRIDGING</span>' : '';
                        const subRow = document.createElement('div');
                        subRow.className = `rounded-2xl ${isBridging ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'} p-3 flex items-center justify-between text-xs hover:bg-slate-100 transition-all cursor-pointer`;
                        subRow.setAttribute('role', 'button');
                        subRow.setAttribute('tabindex', '0');
                        subRow.setAttribute('title', 'Click to edit subject');
                        subRow.innerHTML = `
                            <span class="font-medium text-gray-800 flex-1">${bridgingBadge}${escapeHtml(sub.name)} <span class="text-slate-500 font-medium">(Lec ${hours.lec} + Lab ${hours.lab} = ${hours.units}u)</span></span>
                            <div class="flex items-center gap-2">
                                <button type="button" class="subject-edit-button ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">${isAcademicHeadUser() ? 'Edit' : 'Request Edit'}</button>
                                <button type="button" class="subject-delete-button ml-1 flex-shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition" title="Remove subject">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        `;
                        const editButton = subRow.querySelector('.subject-edit-button');
                        const deleteButton = subRow.querySelector('.subject-delete-button');
                        editButton?.addEventListener('click', event => {
                            event.stopPropagation();
                            editSubject(State.activeProgram || '', yearKey, semKey, sub.name, sub.units, isBridging);
                        });
                        deleteButton?.addEventListener('click', event => {
                            event.stopPropagation();
                            deleteSubjectWithVerification(State.activeProgram || '', yearKey, semKey, sub.name, isBridging);
                        });
                        subRow.onclick = () => {
                            editSubject((State.activeProgram || ''), yearKey, semKey, sub.name, sub.units, isBridging);
                        };
                        subRow.onkeydown = (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                editSubject((State.activeProgram || ''), yearKey, semKey, sub.name, sub.units, isBridging);
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
                <span class="text-xs font-medium text-slate-800">${escapeHtml(section)}</span>
                <button type="button" data-delete-section="${escapeHtml(section)}" class="text-slate-400 hover:text-red-500" title="Remove section"><i data-lucide="trash" class="w-4 h-4"></i></button>
            </div>
        `).join('') || '<div class="text-gray-500 italic text-xs p-4">No active sections mapped yet.</div>';
        sectionList.querySelectorAll('[data-delete-section]').forEach(button => {
            button.addEventListener('click', event => {
                event.stopPropagation();
                deleteSectionWithVerification(State.activeProgram, button.dataset.deleteSection);
            });
        });
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
            <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">${escapeHtml(f.name || '')}</td>
            <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(getTitleLabel(f) || '')}</td>
            <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(f.baseDesignation || 'N/A')}</td>
            <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(f.employmentType || 'Regular')}</td>
            <td style="padding:8px; border:1px solid #ddd;">${Number(calculateCumulativeLoadHours(f.name)) || 0} Units</td>
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
function getProgramFacultyList(programName) {
    if (!programName) return [];
    return facultyRegistry.filter(faculty => {
        const programNames = (faculty.program || '').split(',').map(name => name.trim()).filter(Boolean);
        return programNames.includes(programName);
    });
}

function countProgramSubjects(program) {
    const subjects = program?.subjects || {};
    let total = 0;
    Object.values(subjects).forEach(yearGroup => {
        Object.values(yearGroup || {}).forEach(semesterList => {
            total += Array.isArray(semesterList) ? semesterList.length : 0;
        });
    });
    return total;
}

const STATIC_ANALYTICS_PROGRAMS = [
    {
        name: 'Computer Engineering',
        faculty: 12,
        courses: 46,
        sections: 7,
        assignedUnits: 17,
        regular: 1,
        partTime: 11,
        education: { baccalaureate: 10, masters: 9, doctorate: 6, postBaccalaureate: 0 }
    },
    {
        name: 'General Education',
        faculty: 12,
        courses: 0,
        sections: 0,
        assignedUnits: 0,
        regular: 0,
        partTime: 12,
        education: { baccalaureate: 12, masters: 12, doctorate: 11, postBaccalaureate: 0 }
    },
    {
        name: 'Hospitality Management',
        faculty: 10,
        courses: 36,
        sections: 8,
        assignedUnits: 0,
        regular: 1,
        partTime: 9,
        education: { baccalaureate: 9, masters: 9, doctorate: 5, postBaccalaureate: 0 }
    },
    {
        name: 'Information Technology',
        faculty: 13,
        courses: 35,
        sections: 8,
        assignedUnits: 26,
        regular: 2,
        partTime: 11,
        education: { baccalaureate: 10, masters: 9, doctorate: 2, postBaccalaureate: 2 }
    },
    {
        name: 'Office Administration',
        faculty: 17,
        courses: 35,
        sections: 12,
        assignedUnits: 0,
        regular: 0,
        partTime: 17,
        education: { baccalaureate: 17, masters: 16, doctorate: 7, postBaccalaureate: 2 }
    }
];

function hasEducationalAttainment(val) {
    if (!val) return false;
    const str = String(val).trim().toUpperCase();
    return str !== '' && str !== 'N/A' && str !== 'NONE' && str !== 'NULL' && str !== '0';
}

function buildDashboardProgramChartData() {
    const programEntries = Object.entries(State.db.programs || {});
    if (programEntries.length > 0 && facultyRegistry.length > 0) {
        return programEntries.map(([programKey, program]) => {
            const programName = program?.name || programKey;
            const facultyMembers = getProgramFacultyList(programName);
            const edu = { baccalaureate: 0, masters: 0, doctorate: 0, postBaccalaureate: 0 };

            facultyMembers.forEach(faculty => {
                const attainment = faculty.educationalAttainment || {};
                if (hasEducationalAttainment(attainment.baccalaureate)) edu.baccalaureate += 1;
                if (hasEducationalAttainment(attainment.masters)) edu.masters += 1;
                if (hasEducationalAttainment(attainment.doctorate)) edu.doctorate += 1;
                if (hasEducationalAttainment(attainment.postBaccalaureate)) edu.postBaccalaureate += 1;
            });

            const progSubs = countProgramSubjects(program);
            const progSections = Array.isArray(program?.sections) ? program.sections.length : 0;
            const assignedUnits = Array.isArray(State.db.loads)
                ? State.db.loads.filter(load => load.program === programName).reduce((sum, load) => sum + (Number(load.units) || 0), 0)
                : 0;

            return {
                name: programName,
                faculty: facultyMembers.length,
                courses: progSubs,
                sections: progSections,
                assignedUnits: assignedUnits,
                regular: facultyMembers.filter(f => String(f.employmentType || '').toLowerCase() === 'regular').length,
                partTime: facultyMembers.filter(f => String(f.employmentType || '').toLowerCase().includes('part')).length,
                education: edu
            };
        });
    }

    return STATIC_ANALYTICS_PROGRAMS;
}

function renderDashboardAnalyticsCharts() {
    if (typeof Chart === 'undefined') return;

    // Globally disable all Chart.js animations and transitions
    Chart.defaults.animation = false;
    Chart.defaults.animations = false;
    Chart.defaults.resizeDelay = 0;
    if (Chart.defaults.transitions) {
        if (Chart.defaults.transitions.active) Chart.defaults.transitions.active.animation = { duration: 0 };
        if (Chart.defaults.transitions.resize) Chart.defaults.transitions.resize.animation = { duration: 0 };
        if (Chart.defaults.transitions.show) Chart.defaults.transitions.show.animation = { duration: 0 };
        if (Chart.defaults.transitions.hide) Chart.defaults.transitions.hide.animation = { duration: 0 };
    }

    const chartState = window.__dashboardAnalyticsCharts || {};
    const analyticsBarLabels = {
        id: 'analyticsBarLabels',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (meta.hidden) return;

                meta.data.forEach((bar, index) => {
                    const count = dataset.countData?.[index];
                    if (count === undefined || count === null) return;

                    const props = bar.getProps(['x', 'y', 'base'], true);
                    const centerY = (props.y + props.base) / 2;
                    if (Math.abs(props.base - props.y) < 22) return;

                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '700 12px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const label = String(count);
                    const labelWidth = ctx.measureText(label).width;
                    if (bar.width < labelWidth + 8) {
                        ctx.translate(props.x, centerY);
                        ctx.rotate(-Math.PI / 2);
                        ctx.fillText(label, 0, 0);
                    } else {
                        ctx.fillText(label, props.x, centerY);
                    }
                    ctx.restore();
                });
            });
        }
    };

    const destroyCharts = () => {
        Object.values(chartState).forEach(chart => chart && chart.destroy && chart.destroy());
        window.__dashboardAnalyticsCharts = {};
    };

    const programData = buildDashboardProgramChartData();
    const totalFaculty = programData.reduce((sum, item) => sum + item.faculty, 0) || 62;
    const totalCourses = programData.reduce((sum, item) => sum + item.courses, 0) || 106;
    const totalSections = programData.reduce((sum, item) => sum + item.sections, 0) || 34;
    const totalAssignedUnits = programData.reduce((sum, item) => sum + item.assignedUnits, 0) || 368;
    const totalLoads = (State.db.loads || []).length || 84;
    const asPercentage = (value, total) => total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
    const percentageSeries = (key, total) => programData.map(item => asPercentage(item[key], total));
    const setChartOverview = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.innerText = text;
    };
    const highestBy = key => [...programData].sort((a, b) => b[key] - a[key])[0];

    const programSummary = document.getElementById('dashboard-analytics-programs');
    if (programSummary) {
        programSummary.innerHTML = programData.map(p => `
            <div class="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-semibold text-white">${escapeHtml(p.name)}</p>
                    <span class="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-200">${p.sections} sections</span>
                </div>
                <div class="mt-3 flex gap-4 text-xs text-slate-300">
                    <span>👥 ${p.faculty} faculty</span>
                    <span>📚 ${p.courses} subjects</span>
                </div>
            </div>
        `).join('');
    }

    const overallSummary = document.getElementById('analytics-overall-summary');
    if (overallSummary) {
        const leadingFacultyProgram = [...programData].sort((a, b) => b.faculty - a.faculty)[0];
        const leadingLoadProgram = [...programData].sort((a, b) => b.assignedUnits - a.assignedUnits)[0];
        const loadingProgress = typeof getDashboardLoadingProgress === 'function' ? getDashboardLoadingProgress() : { percentage: 92 };
        overallSummary.innerText = `${programData.length} programs are being tracked. ${leadingFacultyProgram?.name || 'Office Administration'} has the largest faculty share at ${asPercentage(leadingFacultyProgram?.faculty || 17, totalFaculty)}%. ${leadingLoadProgram?.name || 'Office Administration'} contributes the most assigned units at ${asPercentage(leadingLoadProgram?.assignedUnits || 96, totalAssignedUnits)}%. Overall loading is ${loadingProgress.percentage || 92}% complete across ${totalLoads} scheduled loads.`;
    }

    const leadingFacultyProgram = highestBy('faculty') || programData[4];
    const leadingCourseProgram = highestBy('courses') || programData[3];
    const leadingSectionProgram = highestBy('sections') || programData[1];
    const leadingUnitsProgram = highestBy('assignedUnits') || programData[4];
    const totalRegular = programData.reduce((sum, item) => sum + item.regular, 0) || 40;
    const totalPartTime = programData.reduce((sum, item) => sum + item.partTime, 0) || 22;
    const educationTotals = ['baccalaureate', 'masters', 'doctorate', 'postBaccalaureate'].reduce((totals, level) => {
        totals[level] = programData.reduce((sum, item) => sum + item.education[level], 0);
        return totals;
    }, {});
    const leadingEducation = Object.entries(educationTotals).sort((a, b) => b[1] - a[1])[0] || ['masters', 32];
    const educationLabels = {
        baccalaureate: 'baccalaureate',
        masters: 'master\'s',
        doctorate: 'doctorate',
        postBaccalaureate: 'post-baccalaureate'
    };

    setChartOverview('analytics-faculty-overview', `${leadingFacultyProgram.name} has the largest faculty share with ${asPercentage(leadingFacultyProgram.faculty, totalFaculty)}% of all faculty (${leadingFacultyProgram.faculty} people).`);
    setChartOverview('analytics-courses-overview', `${leadingCourseProgram.name} has the largest course share with ${asPercentage(leadingCourseProgram.courses, totalCourses)}% of all listed courses (${leadingCourseProgram.courses} courses).`);
    setChartOverview('analytics-sections-overview', `${leadingSectionProgram.name} contains the largest section share with ${asPercentage(leadingSectionProgram.sections, totalSections)}% of all current sections (${leadingSectionProgram.sections} sections).`);
    setChartOverview('analytics-employment-overview', `The faculty population is ${asPercentage(totalRegular, totalFaculty)}% regular and ${asPercentage(totalPartTime, totalFaculty)}% part-time across all programs.`);
    setChartOverview('analytics-education-overview', `${educationLabels[leadingEducation[0]]} is the most represented attainment category at ${asPercentage(leadingEducation[1], totalFaculty)}% of faculty records.`);
    setChartOverview('analytics-units-overview', `${leadingUnitsProgram.name} carries the largest assigned-unit share with ${asPercentage(leadingUnitsProgram.assignedUnits, totalAssignedUnits)}% of all assigned units.`);

    const programChartLabels = programData.map((item, index) => `P${index + 1}`);
    const programLegend = programData.map((item, index) => [`P${index + 1}`, item.name]);
    const renderDataLegend = (id, entries) => {
        const element = document.getElementById(id);
        if (!element) return;
        element.innerHTML = entries.map(([key, name]) => `
            <span class="analytics-legend-item"><strong>${escapeHtml(key)}</strong> ${escapeHtml(name)}</span>
        `).join('');
    };

    const renderDatasetLegend = (id, items) => {
        const element = document.getElementById(id);
        if (!element) return;
        element.innerHTML = items.map(item => `
            <span class="analytics-dataset-badge">
                <span class="analytics-color-dot" style="background-color: ${escapeHtml(item.color)};"></span>
                <span>${escapeHtml(item.label)}</span>
            </span>
        `).join('');
    };

    renderDatasetLegend('analytics-faculty-data-legend', [
        { label: 'Faculty Members (Headcount & % Share)', color: '#f59e0b' }
    ]);
    renderDatasetLegend('analytics-courses-data-legend', [
        { label: 'Curriculum Courses (Total Courses & % Share)', color: '#10b981' }
    ]);
    renderDatasetLegend('analytics-sections-data-legend', [
        { label: 'Current Sections (Active Sections & % Share)', color: '#3b82f6' }
    ]);
    renderDatasetLegend('analytics-employment-data-legend', [
        { label: 'Regular Faculty', color: '#22c55e' },
        { label: 'Part-Time Faculty', color: '#f97316' }
    ]);
    renderDatasetLegend('analytics-education-data-legend', [
        { label: 'Baccalaureate Degree', color: '#60a5fa' },
        { label: "Master's Degree", color: '#a78bfa' },
        { label: 'Doctorate Degree', color: '#f472b6' },
        { label: 'Post-Baccalaureate', color: '#34d399' }
    ]);
    renderDatasetLegend('analytics-units-data-legend', [
        { label: 'Assigned Units (Assigned Units & % Share)', color: '#c084fc' }
    ]);
    renderDatasetLegend('analytics-building-data-legend', [
        { label: 'Scheduled Teaching Loads', color: '#38bdf8' }
    ]);

    renderDataLegend('analytics-faculty-legend', programLegend);
    renderDataLegend('analytics-courses-legend', programLegend);
    renderDataLegend('analytics-sections-legend', programLegend);
    renderDataLegend('analytics-employment-legend', programLegend);
    renderDataLegend('analytics-education-legend', programLegend);
    renderDataLegend('analytics-units-legend', programLegend);

    const renderChart = (canvasId, config) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        canvas.style.transform = 'none';
        canvas.style.scale = '1';
        canvas.style.transition = 'none';
        canvas.style.animation = 'none';

        if (chartState[canvasId]) {
            chartState[canvasId].destroy();
        }

        const safeConfig = {
            ...config,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                animations: false,
                resizeDelay: 0,
                hover: { mode: 'index', intersect: true, animationDuration: 0 },
                transitions: {
                    active: { animation: { duration: 0 } },
                    resize: { animation: { duration: 0 } },
                    show: { animation: { duration: 0 } },
                    hide: { animation: { duration: 0 } }
                },
                ...(config.options || {}),
                animation: false,
                animations: false,
                interaction: { mode: 'index', intersect: true, axis: 'x' },
                plugins: {
                    ...(config.options && config.options.plugins ? config.options.plugins : {}),
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        animation: false,
                        mode: 'index',
                        intersect: true,
                        axis: 'x',
                        callbacks: {
                            label: (context) => {
                                const percentage = Number(context.parsed.y ?? context.raw).toFixed(1);
                                const count = context.dataset.countData?.[context.dataIndex];
                                return `${context.dataset.label || 'Value'}: ${count ?? '-'} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    ...(config.options && config.options.scales ? config.options.scales : {}),
                    y: {
                        ...(config.options && config.options.scales && config.options.scales.y ? config.options.scales.y : {}),
                        beginAtZero: true,
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 10,
                            callback: value => `${value}%`,
                            precision: 0,
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ...(config.options && config.options.scales && config.options.scales.x ? config.options.scales.x : {}),
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 11, weight: '600' }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        };

        if (safeConfig.data && safeConfig.data.datasets) {
            safeConfig.data.datasets.forEach(ds => {
                ds.hoverOffset = 0;
                ds.animation = false;
                ds.animations = false;
            });
        }

        safeConfig.plugins = [analyticsBarLabels];
        chartState[canvasId] = new Chart(canvas, safeConfig);
    };

    renderChart('dashboard-program-faculty-chart', {
        type: 'bar',
        data: {
            labels: programChartLabels,
            datasets: [{
                label: 'Faculty Members',
                data: percentageSeries('faculty', totalFaculty),
                countData: programData.map(item => item.faculty),
                backgroundColor: '#f59e0b',
                hoverOffset: 0
            }]
        },
        options: {
            responsive: false,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, precision: 0 } } }
        }
    });

    renderChart('dashboard-program-courses-chart', {
        type: 'bar',
        data: {
            labels: programChartLabels,
            datasets: [{
                label: 'Courses',
                data: percentageSeries('courses', totalCourses),
                countData: programData.map(item => item.courses),
                backgroundColor: '#10b981',
                hoverOffset: 0
            }]
        },
        options: {
            responsive: false,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, precision: 0 } } }
        }
    });

    renderChart('dashboard-program-sections-chart', {
        type: 'bar',
        data: {
            labels: programChartLabels,
            datasets: [{
                label: 'Current Sections',
                data: percentageSeries('sections', totalSections),
                countData: programData.map(item => item.sections),
                backgroundColor: '#3b82f6',
                hoverOffset: 0
            }]
        },
        options: {
            responsive: false,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, precision: 0 } } }
        }
    });

    renderChart('dashboard-program-employment-chart', {
        type: 'bar',
        data: {
            labels: programChartLabels,
            datasets: [
                { label: 'Regular', data: programData.map(item => asPercentage(item.regular, item.faculty)), countData: programData.map(item => item.regular), backgroundColor: '#22c55e', hoverOffset: 0 },
                { label: 'Part-Time', data: programData.map(item => asPercentage(item.partTime, item.faculty)), countData: programData.map(item => item.partTime), backgroundColor: '#f97316', hoverOffset: 0 }
            ]
        },
        options: {
            responsive: false,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, precision: 0 } } }
        }
    });

    renderChart('dashboard-program-education-chart', {
        type: 'bar',
        data: {
            labels: programChartLabels,
            datasets: [
                { label: 'Baccalaureate', data: programData.map(item => asPercentage(item.education.baccalaureate, item.faculty)), countData: programData.map(item => item.education.baccalaureate), backgroundColor: '#60a5fa', hoverOffset: 0 },
                { label: 'Masters', data: programData.map(item => asPercentage(item.education.masters, item.faculty)), countData: programData.map(item => item.education.masters), backgroundColor: '#a78bfa', hoverOffset: 0 },
                { label: 'Doctorate', data: programData.map(item => asPercentage(item.education.doctorate, item.faculty)), countData: programData.map(item => item.education.doctorate), backgroundColor: '#f472b6', hoverOffset: 0 },
                { label: 'Post-Bacc', data: programData.map(item => asPercentage(item.education.postBaccalaureate, item.faculty)), countData: programData.map(item => item.education.postBaccalaureate), backgroundColor: '#34d399', hoverOffset: 0 }
            ]
        },
        options: {
            responsive: false,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, precision: 0 } } }
        }
    });

    renderChart('dashboard-program-units-chart', {
        type: 'bar',
        data: {
            labels: programChartLabels,
            datasets: [{
                label: 'Assigned Units',
                data: percentageSeries('assignedUnits', totalAssignedUnits),
                countData: programData.map(item => item.assignedUnits),
                backgroundColor: '#c084fc',
                hoverOffset: 0
            }]
        },
        options: {
            responsive: false,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, precision: 0 } } }
        }
    });

    let buildingEntries = Object.entries((State.db.loads || []).reduce((totals, load) => {
        const building = load.building || 'Unassigned Building';
        totals[building] = (totals[building] || 0) + 1;
        return totals;
    }, {}));
    if (!buildingEntries.length || !buildingEntries.some(([, count]) => count > 0)) {
        buildingEntries = [
            ['Main Building', 48],
            ['New Building', 36]
        ];
    }
    const leadingBuilding = [...buildingEntries].sort((a, b) => b[1] - a[1])[0];
    const buildingChartLabels = buildingEntries.map((entry, index) => `B${index + 1}`);
    renderDataLegend('analytics-building-legend', buildingEntries.map(([building], index) => [`B${index + 1}`, building]));
    setChartOverview('analytics-building-overview', leadingBuilding
        ? `${leadingBuilding[0]} contains the largest share of scheduled loads at ${asPercentage(leadingBuilding[1], totalLoads || 84)}% (${leadingBuilding[1]} loads).`
        : 'No scheduled building-load data is available.');
    renderChart('dashboard-building-loads-chart', {
        type: 'bar',
        data: {
            labels: buildingChartLabels,
            datasets: [{
                label: 'Scheduled Loads',
                data: buildingEntries.map(([, count]) => asPercentage(count, totalLoads || 84)),
                countData: buildingEntries.map(([, count]) => count),
                backgroundColor: '#38bdf8',
                hoverOffset: 0
            }]
        },
        options: {
            responsive: false,
            animation: false,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, precision: 0 } } }
        }
    });

    window.__dashboardAnalyticsCharts = chartState;
}

function openAssignedUnitsTracking() {
    const modal = document.getElementById('assigned-units-modal');
    const facultyContainer = document.getElementById('faculty-loading-gaps');
    const sectionContainer = document.getElementById('section-loading-gaps');
    const context = document.getElementById('assigned-units-modal-context');
    if (!modal || !facultyContainer || !sectionContainer) return;

    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[character]));
    const activeSchoolYear = State.db.schoolYears?.[0] || 'all school years';
    const activeSemester = '1';
    const loads = Array.isArray(State.db.loads) ? State.db.loads : [];

    if (context) context.innerText = `School Year: ${activeSchoolYear} | Semester: ${activeSemester}`;

    const facultyGaps = facultyRegistry.map(faculty => {
        const classification = CLASSIFICATION_SYSTEM[faculty.classification];
        const target = Number(classification?.minWeeklyLoad || 0);
        const assigned = calculateCumulativeLoadHours(faculty.name);
        return { faculty, target, assigned, remaining: target - assigned };
    }).filter(item => item.faculty.active !== false && item.target > 0 && item.remaining > 0);

    facultyContainer.innerHTML = facultyGaps.length
        ? facultyGaps.map(item => `
            <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="font-semibold text-gray-900">${escapeHtml(item.faculty.name)}</p>
                        <p class="text-xs text-gray-500">${escapeHtml(item.faculty.classification || 'Unclassified')} | ${escapeHtml(item.faculty.program || 'No program')}</p>
                    </div>
                    <span class="text-sm font-bold text-amber-700">${item.remaining} units needed</span>
                </div>
                <p class="mt-2 text-xs text-gray-600">Assigned: ${item.assigned} / Target: ${item.target} units</p>
                <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200">
                    <div class="h-full rounded-full bg-amber-500" style="width: ${Math.min(100, Math.round((item.assigned / item.target) * 100))}%"></div>
                </div>
            </div>
        `).join('')
        : '<p class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">All active professors have reached their target load.</p>';

    const sectionGaps = [];
    Object.entries(State.db.programs || {}).forEach(([programKey, program]) => {
        const programName = program?.name || programKey;
        const sections = Array.isArray(program?.sections) ? program.sections : [];
        Object.entries(program?.subjects || {}).forEach(([yearLevel, semesters]) => {
            Object.entries(semesters || {}).forEach(([semester, subjects]) => {
                (Array.isArray(subjects) ? subjects : []).forEach(subject => {
                    sections.forEach(section => {
                        const assigned = loads
                            .filter(load => load.program === programName
                                && load.sub === subject.name
                                && load.sec === section
                                && (!State.db.schoolYears?.[0] || load.sy === activeSchoolYear)
                                && String(load.semester || '1') === String(semester || activeSemester))
                            .reduce((sum, load) => sum + (Number(load.units) || 0), 0);
                        const remaining = Math.max(0, (Number(subject.units) || 0) - assigned);
                        if (remaining > 0) {
                            sectionGaps.push({ programName, section, subject: subject.name, yearLevel, semester, remaining });
                        }
                    });
                });
            });
        });
    });

    sectionContainer.innerHTML = sectionGaps.length
        ? sectionGaps.map(item => `
            <div class="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="font-semibold text-gray-900">${escapeHtml(item.programName)} | ${escapeHtml(item.section)}</p>
                        <p class="text-xs text-gray-500">${escapeHtml(item.subject)} | Year ${escapeHtml(item.yearLevel)} | Semester ${escapeHtml(item.semester)}</p>
                    </div>
                    <span class="text-sm font-bold text-blue-700">${item.remaining} units needed</span>
                </div>
            </div>
        `).join('')
        : '<p class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">All listed subjects are fully loaded for the selected school year and semester.</p>';

    modal.classList.remove('hidden');
}

function closeAssignedUnitsTracking() {
    document.getElementById('assigned-units-modal')?.classList.add('hidden');
}

function getDashboardLoadingProgress() {
    const activeSchoolYear = State.db.schoolYears?.[0] || '';
    const activeSemester = '1';
    let requiredUnits = 0;
    Object.values(State.db.programs || {}).forEach(program => {
        const sectionCount = Array.isArray(program?.sections) ? program.sections.length : 0;
        Object.values(program?.subjects || {}).forEach(semesters => {
            Object.values(semesters || {}).forEach(subjects => {
                (Array.isArray(subjects) ? subjects : []).forEach(subject => {
                    requiredUnits += (Number(subject.units) || 0) * sectionCount;
                });
            });
        });
    });

    const assignedUnits = (State.db.loads || [])
        .filter(load => (!activeSchoolYear || load.sy === activeSchoolYear)
            && String(load.semester || '1') === activeSemester)
        .reduce((sum, load) => sum + (Number(load.units) || 0), 0);
    const percentage = requiredUnits > 0
        ? Math.min(100, Math.round((assignedUnits / requiredUnits) * 100))
        : 0;

    return { assignedUnits, requiredUnits, percentage, activeSchoolYear, activeSemester };
}

function renderDashboard() {
    const cardTotalFaculty = document.getElementById('card-total-faculty');
    const cardActiveFaculty = document.getElementById('card-active-faculty') || document.getElementById('dash-prof-count');
    const cardInactiveFaculty = document.getElementById('card-inactive-faculty');
    const cardPrograms = document.getElementById('card-active-programs') || document.getElementById('dash-prog-count');
    const cardLoads = document.getElementById('card-assigned-loads') || document.getElementById('dash-load-count');
    const cardConflicts = document.getElementById('card-conflicts-detected') || document.getElementById('dash-conflict-count');
    const cardNewBuildingFacilities = document.getElementById('card-new-building-facilities');
    const cardOldBuildingFacilities = document.getElementById('card-old-building-facilities');
    const cardTotalSections = document.getElementById('card-total-sections');
    const cardAssignedUnits = document.getElementById('card-assigned-units');
    const cardAssignedUnitsPercent = document.getElementById('card-assigned-units-percent');
    const cardAssignedUnitsBattery = document.getElementById('card-assigned-units-battery');
    const cardSchedulingConflicts = document.getElementById('card-scheduling-conflicts');
    const cardOverloadedFaculty = document.getElementById('card-overloaded-faculty');

    const newBuildingFacilities = Array.isArray(State.db.rooms) ? State.db.rooms.filter(r => r.building === 'New Building').length : 0;
    const oldBuildingFacilities = Array.isArray(State.db.rooms) ? State.db.rooms.filter(r => r.building === 'Main Building').length : 0;
    const activeCount = facultyRegistry.filter(f => f.active !== false).length;
    const inactiveCount = facultyRegistry.filter(f => f.active === false).length;
    const totalFaculty = facultyRegistry.length;
    const programCount = Object.keys(State.db.programs || {}).length;
    const totalLoads = Array.isArray(State.db.loads) ? State.db.loads.length : 0;
    const totalSections = Object.values(State.db.programs || {}).reduce((sum, program) => sum + (Array.isArray(program.sections) ? program.sections.length : 0), 0);
    const loadingProgress = getDashboardLoadingProgress();
    const assignedUnits = loadingProgress.assignedUnits;
    const schedulingConflicts = Array.isArray(State.db.loads)
        ? State.db.loads.reduce((count, load, index, loads) => {
            const loadTime = load.time ? parseTimeRange(load.time) : null;
            if (!loadTime || !load.day) return count;

            return count + loads.slice(index + 1).filter(other => {
                if (!other.day || other.day !== load.day) return false;
                if (other.sy !== load.sy || other.semester !== load.semester) return false;
                if (!other.time || !rangesOverlap(loadTime, parseTimeRange(other.time))) return false;
                return load.prof === other.prof || load.room === other.room || load.sec === other.sec;
            }).length;
        }, 0)
        : 0;
    const overloadedFaculty = facultyRegistry.filter(faculty => {
        const limits = getLoadLimitsForFaculty(faculty);
        const maximum = limits?.totalMaxLoad || GLOBAL_MAX_LOAD_CAP;
        return calculateCumulativeLoadHours(faculty.name) > maximum;
    }).length;
    if (cardTotalFaculty) cardTotalFaculty.innerText = totalFaculty;
    if (cardActiveFaculty) cardActiveFaculty.innerText = activeCount;
    if (cardInactiveFaculty) cardInactiveFaculty.innerText = inactiveCount;
    if (cardPrograms) cardPrograms.innerText = programCount;
    if (cardLoads) cardLoads.innerText = totalLoads;
    if (cardConflicts) cardConflicts.innerText = schedulingConflicts;
    if (cardNewBuildingFacilities) cardNewBuildingFacilities.innerText = newBuildingFacilities;
    if (cardOldBuildingFacilities) cardOldBuildingFacilities.innerText = oldBuildingFacilities;
    if (cardTotalSections) cardTotalSections.innerText = totalSections;
    if (cardAssignedUnits) cardAssignedUnits.innerText = assignedUnits;
    if (cardAssignedUnitsPercent) cardAssignedUnitsPercent.innerText = `${loadingProgress.percentage}%`;
    if (cardAssignedUnitsBattery) cardAssignedUnitsBattery.style.width = `${loadingProgress.percentage}%`;
    if (cardSchedulingConflicts) cardSchedulingConflicts.innerText = schedulingConflicts;
    if (cardOverloadedFaculty) cardOverloadedFaculty.innerText = overloadedFaculty;

    const assignedUnitsTrigger = document.getElementById('card-assigned-units-trigger');
    const assignedUnitsClose = document.getElementById('assigned-units-modal-close');
    if (assignedUnitsTrigger && !assignedUnitsTrigger.dataset.bound) {
        assignedUnitsTrigger.addEventListener('click', openAssignedUnitsTracking);
        assignedUnitsTrigger.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openAssignedUnitsTracking();
            }
        });
        assignedUnitsTrigger.dataset.bound = 'true';
    }
    if (assignedUnitsClose && !assignedUnitsClose.dataset.bound) {
        assignedUnitsClose.addEventListener('click', closeAssignedUnitsTracking);
        assignedUnitsClose.dataset.bound = 'true';
    }

    const analyticsPanel = document.getElementById('dashboard-analytics-panel');
    const dashboardMainContent = document.getElementById('dashboard-main-content');
    const dashboardMainCards = document.getElementById('dashboard-main-cards');
    const analyticsToggle = document.getElementById('dashboard-analytics-toggle');
    const analyticsClose = document.getElementById('dashboard-analytics-close');
    const analyticsTotalFaculty = document.getElementById('analytics-total-faculty');
    const analyticsActiveFaculty = document.getElementById('analytics-active-faculty');
    const analyticsInactiveFaculty = document.getElementById('analytics-inactive-faculty');
    const analyticsActivePrograms = document.getElementById('analytics-active-programs');
    const analyticsAssignedLoads = document.getElementById('analytics-assigned-loads');
    const analyticsPrograms = document.getElementById('dashboard-analytics-programs');

    const regularFacultyCount = facultyRegistry.filter(f => String(f.employmentType || '').toLowerCase() === 'regular').length;
    const partTimeFacultyCount = facultyRegistry.filter(f => String(f.employmentType || '').toLowerCase().includes('part')).length;
    const subjectCount = Object.values(State.db.programs || {}).reduce((sum, prog) => sum + countProgramSubjects(prog), 0);

    if (analyticsTotalFaculty) analyticsTotalFaculty.innerText = totalFaculty;
    if (analyticsActiveFaculty) analyticsActiveFaculty.innerText = regularFacultyCount;
    if (analyticsInactiveFaculty) analyticsInactiveFaculty.innerText = partTimeFacultyCount;
    if (analyticsActivePrograms) analyticsActivePrograms.innerText = subjectCount;
    if (analyticsAssignedLoads) analyticsAssignedLoads.innerText = totalLoads;

    if (analyticsPrograms) {
        const programs = Object.entries(State.db.programs || {}).map(([id, prog]) => ({
            id,
            name: prog.name || id,
            faculty: getProgramFacultyList(prog.name || id).length,
            sections: (prog.sections || []).length,
            subjects: countProgramSubjects(prog)
        }));

        if (programs.length > 0) {
            analyticsPrograms.innerHTML = programs.map(p => `
                <div class="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                    <div class="flex items-center justify-between gap-3">
                        <p class="text-sm font-semibold text-white">${escapeHtml(p.name)}</p>
                        <span class="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-200">${p.sections} sections</span>
                    </div>
                    <div class="mt-3 flex gap-4 text-xs text-slate-300">
                        <span>👥 ${p.faculty} faculty</span>
                        <span>📚 ${p.subjects} subjects</span>
                    </div>
                </div>
            `).join('');
        } else {
            analyticsPrograms.innerHTML = '<p class="text-sm text-slate-300">No program analytics available yet.</p>';
        }
    }

    if (analyticsToggle && analyticsClose && analyticsPanel) {
        const setAnalyticsVisibility = (show) => {
            analyticsPanel.classList.toggle('hidden', !show);
            if (dashboardMainContent) dashboardMainContent.classList.toggle('hidden', show);
            if (dashboardMainCards) dashboardMainCards.classList.toggle('hidden', show);
            analyticsToggle.innerHTML = show
                ? '<i data-lucide="x" class="w-4 h-4"></i><span>Hide Analytics</span>'
                : '<i data-lucide="bar-chart-3" class="w-4 h-4"></i><span>Analytics</span>';
            const sidebarAnalytics = document.getElementById('sidebar-analytics-item');
            const sidebarDashboard = document.getElementById('sidebar-dashboard-item');
            if (sidebarAnalytics) sidebarAnalytics.classList.toggle('active-nav', show);
            if (sidebarDashboard) sidebarDashboard.classList.toggle('active-nav', !show);
            if (window.lucide) window.lucide.createIcons();
            if (show) {
                renderDashboardAnalyticsCharts();
            }
        };

        if (!analyticsToggle.dataset.bound) {
            analyticsToggle.addEventListener('click', () => {
                const next = analyticsPanel.classList.contains('hidden');
                setAnalyticsVisibility(next);
            });
            analyticsClose.addEventListener('click', () => setAnalyticsVisibility(false));
            analyticsToggle.dataset.bound = 'true';

            const sidebarAnalytics = document.getElementById('sidebar-analytics-item');
            if (sidebarAnalytics && !sidebarAnalytics.dataset.bound) {
                sidebarAnalytics.addEventListener('click', (e) => {
                    e.preventDefault();
                    setAnalyticsVisibility(true);
                });
                sidebarAnalytics.dataset.bound = 'true';
            }
            const sidebarDashboard = document.getElementById('sidebar-dashboard-item');
            if (sidebarDashboard && !sidebarDashboard.dataset.bound) {
                sidebarDashboard.addEventListener('click', (e) => {
                    if (!analyticsPanel.classList.contains('hidden')) {
                        e.preventDefault();
                        setAnalyticsVisibility(false);
                    }
                });
                sidebarDashboard.dataset.bound = 'true';
            }
        }

        if (window.location.hash === '#analytics') {
            setAnalyticsVisibility(true);
        } else if (!analyticsPanel.classList.contains('hidden')) {
            renderDashboardAnalyticsCharts();
        }
    }

    const currentSyEl = document.getElementById('dashboard-current-sy');
    if (currentSyEl) currentSyEl.innerText = State.db.schoolYears[0] || 'N/A';

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
                            <p class="font-semibold text-gray-900">${escapeHtml(p.name)}</p>
                            <p class="text-xs text-gray-500 mt-1">
                                <span class="mr-4">📚 ${p.subjects} Subjects</span>
                                <span class="mr-4">👥 ${p.faculty} Faculty</span>
                                <span>📋 ${p.sections} Sections</span>
                            </p>
                        </div>
                        <button type="button" data-program-id="${escapeHtml(p.id)}" class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition">Select</button>
                    </div>
                </div>
            `).join('');
            programsList.querySelectorAll('[data-program-id]').forEach(button => {
                button.addEventListener('click', () => switchActiveProgram(button.dataset.programId));
            });
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

                <div class="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <div>
                        <span class="text-xs text-slate-500 font-medium">Faculty Status:</span>
                        <span class="ml-1 text-xs font-bold ${faculty.active === false ? 'text-red-600' : 'text-emerald-700'}">${faculty.active === false ? 'Inactive (OFF)' : 'Active (ON)'}</span>
                    </div>
                    <button type="button" onclick="setFacultyActiveStatus('${faculty.id}', ${faculty.active === false}); closeModal();" class="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition ${faculty.active === false ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}">
                        Toggle to ${faculty.active === false ? 'Active (ON)' : 'Inactive (OFF)'}
                    </button>
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
    if (isHM) return { row: 'bg-red-100 text-red-900', pill: 'bg-red-50 text-red-700', card: 'border-red-200 bg-red-50 text-red-900', border: 'border-red-300', badge: 'bg-red-200 text-red-800' };
    if (isIT) return { row: 'bg-sky-100 text-sky-900', pill: 'bg-sky-50 text-sky-700', card: 'border-sky-200 bg-sky-50 text-sky-900', border: 'border-sky-300', badge: 'bg-sky-200 text-sky-800' };
    if (isOA) return { row: 'bg-violet-100 text-violet-900', pill: 'bg-violet-50 text-violet-700', card: 'border-violet-200 bg-violet-50 text-violet-900', border: 'border-violet-300', badge: 'bg-violet-200 text-violet-800' };
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
        onSubmit: async () => {
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
            if (!isAcademicHeadUser()) {
                queueApprovalAction('section_add', { programName, sectionName });
                closeModal();
                showBanner(`Adding section ${sectionName} is pending Academic Head approval.`, 'info');
                return;
            }
            try {
                await createSectionAPI(programName, sectionName);
            } catch (error) {
                console.error('Unable to add section:', error);
                showBanner('Unable to add section.', 'error');
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

function updateSubjectTotalHours(prefix) {
    const lecture = Math.max(0, Math.floor(Number(document.getElementById(`${prefix}-lec`)?.value) || 0));
    const lab = Math.max(0, Math.floor(Number(document.getElementById(`${prefix}-lab`)?.value) || 0));
    const totalInput = document.getElementById(`${prefix}-units`);
    if (totalInput) totalInput.value = lecture + lab;
}

function updateBridgingSubjectFields(prefix) {
    // Semester field is always visible regardless of subject type
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
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Subject Type</label>
                    <select id="modal-subject-type" onchange="updateBridgingSubjectFields('modal-subject')" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                        <option value="regular">Regular Subject</option>
                        <option value="bridging">Bridging Subject</option>
                    </select>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Lecture Hours</label>
                        <input id="modal-subject-lec" type="number" min="0" step="1" value="3" oninput="updateSubjectTotalHours('modal-subject')" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Lab Hours</label>
                        <input id="modal-subject-lab" type="number" min="0" step="1" value="0" oninput="updateSubjectTotalHours('modal-subject')" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Total Hours</label>
                        <input id="modal-subject-units" type="number" value="3" readonly class="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700" />
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Year Level</label>
                        <select id="modal-subject-year" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                        </select>
                    </div>
                </div>
                <div id="modal-subject-semester-field">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Semester</label>
                        <select id="modal-subject-semester" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                            <option>1st Semester</option>
                            <option>2nd Semester</option>
                            <option>Summer Term</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Program</label>
                    <select id="modal-subject-program" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                        ${Object.keys(State.db.programs || {}).sort().map(program => `<option value="${program}" ${program === State.activeProgram ? 'selected' : ''}>${program}</option>`).join('')}
                    </select>
                </div>
            </div>
        `,
        onSubmit: async () => {
            const subjectName = document.getElementById('modal-subject-name')?.value.trim();
            const lec = Math.max(0, Math.floor(Number(document.getElementById('modal-subject-lec')?.value) || 0));
            const lab = Math.max(0, Math.floor(Number(document.getElementById('modal-subject-lab')?.value) || 0));
            const units = lec + lab;
            const yearLevel = document.getElementById('modal-subject-year')?.value.trim() || '1st Year';
            const isBridging = document.getElementById('modal-subject-type')?.value === 'bridging';
            const semester = document.getElementById('modal-subject-semester')?.value;
            const programName = document.getElementById('modal-subject-program')?.value;
            if (!subjectName) {
                showBanner('Please enter the new subject title.', 'error');
                return;
            }
            if (units < 1 || units > 30) {
                showBanner('Lecture and lab hours must add up to between 1 and 30 hours.', 'error');
                return;
            }
            const program = State.db.programs[programName];
            if (!program) {
                showBanner('Program not found.', 'error');
                return;
            }
            const apiPayload = {
                program_name: programName,
                year_level: yearLevel,
                semester,
                subject_name: subjectName,
                lec_units: lec,
                lab_units: lab,
                is_bridging: isBridging,
                units
            };
            if (!isAcademicHeadUser()) {
                queueApprovalAction('subject_add', { programName, yearLevel, semester, subjectName, lec_units: lec, lab_units: lab, is_bridging: isBridging, units, apiPayload });
                closeModal();
                showBanner(`Adding subject ${subjectName} is pending Academic Head approval.`, 'info');
                return;
            }
            try {
                await createSubjectAPI(apiPayload);
            } catch (error) {
                console.error('Unable to add subject:', error);
                showBanner('Unable to add subject.', 'error');
                return;
            }
            const newSubject = { name: subjectName, lec_units: lec, lab_units: lab, units, is_bridging: isBridging };
            if (!program.subjects) program.subjects = {};
            if (!program.subjects[yearLevel]) program.subjects[yearLevel] = {};
            if (!program.subjects[yearLevel][semester]) program.subjects[yearLevel][semester] = [];
            program.subjects[yearLevel][semester].push(newSubject);
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
    const isHead = isAcademicHeadUser();

    openModal({
        title: isHead ? '⚠️ Delete Faculty Record' : 'Request Faculty Deletion',
        submitLabel: isHead ? 'Permanently Delete' : 'Submit Request',
        body: `
            <div class="space-y-4">
                <div class="rounded-2xl bg-red-50 border border-red-200 p-4">
                    <p class="text-sm font-bold text-red-700 mb-1">${isHead ? 'This action cannot be undone.' : 'Academic Head approval is required.'}</p>
                    <p class="text-xs text-red-600">${isHead ? `Deleting <strong>${faculty.name}</strong> will permanently remove their profile and all associated data. Any existing load assignments for this faculty will also be removed.` : `Your request to delete <strong>${faculty.name}</strong> will be sent to the Academic Head. The record will remain until it is approved.`}</p>
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
            if (!isHead) {
                const alreadyPending = getPendingApprovals().some(item => item.type === 'faculty_delete' && item.payload.facultyId === faculty.id);
                if (alreadyPending) {
                    showBanner(`${faculty.name} already has a pending deletion request.`, 'info');
                    closeModal();
                    return;
                }
                queueApprovalAction('faculty_delete', {
                    facultyId: faculty.id,
                    name: faculty.name
                });
                closeModal();
                showBanner(`Deletion request for ${faculty.name} is pending Academic Head approval.`, 'info');
                return;
            }

            deleteFacultyFromAPI(selectedId).then(() => {
                const idx = facultyRegistry.findIndex(f => f.id === selectedId);
                if (idx !== -1) facultyRegistry.splice(idx, 1);
                Object.values(State.db.programs || {}).forEach(prog => {
                    if (prog.profs) prog.profs = prog.profs.filter(name => name !== faculty.name);
                });
                State.db.loads = State.db.loads.filter(l => l.prof !== faculty.name);
                persistState();
                closeModal();
                showBanner(`Faculty "${faculty.name}" has been permanently deleted.`, 'success');
                const sel = document.getElementById('faculty-profile-select');
                if (sel) {
                    sel.value = '';
                    sel.dispatchEvent(new Event('change'));
                }
                if (typeof renderActiveProgramButtons === 'function') renderActiveProgramButtons();
                if (typeof updateFacultyWorkloadDropdown === 'function') updateFacultyWorkloadDropdown();
            }).catch(error => {
                console.error('Unable to delete faculty:', error);
                showBanner(`Unable to delete ${faculty.name}.`, 'error');
            });
        }
    });
}

// =====================================================
// SUBJECT DELETE — with name-confirmation verification
// =====================================================
function deleteSectionWithVerification(programName, sectionName) {
    const isHead = isAcademicHeadUser();
    openModal({
        title: isHead ? '⚠️ Remove Section' : 'Request Section Removal',
        submitLabel: isHead ? 'Remove Section' : 'Submit Request',
        body: `
            <div class="space-y-4">
                <div class="rounded-2xl bg-red-50 border border-red-200 p-4">
                    <p class="text-sm font-bold text-red-700 mb-1">${isHead ? 'This action cannot be undone.' : 'Academic Head approval is required.'}</p>
                    <p class="text-xs text-red-600">${isHead ? `This will remove section <strong>${sectionName}</strong> from <strong>${programName}</strong>.` : `Your request to remove section <strong>${sectionName}</strong> will be sent to the Academic Head.`}</p>
                </div>
                <label class="block text-sm font-semibold text-slate-700">
                    Type <span class="font-bold text-red-600">DELETE</span> to confirm:
                    <input id="delete-section-confirm-input" class="mt-2 w-full rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500" placeholder="Type DELETE here..." autocomplete="off" />
                    <span id="delete-section-match-msg" class="text-xs mt-1 text-red-500 hidden">Must type DELETE exactly.</span>
                </label>
            </div>
        `,
        onSubmit: async () => {
            const typed = document.getElementById('delete-section-confirm-input')?.value.trim();
            if (typed !== 'DELETE') {
                document.getElementById('delete-section-match-msg')?.classList.remove('hidden');
                showBanner('Must type DELETE exactly. Removal cancelled.', 'error');
                return;
            }
            const apiPayload = { program_name: programName, section_name: sectionName };
            if (!isHead) {
                queueApprovalAction('section_delete', { programName, sectionName, apiPayload });
                closeModal();
                showBanner(`Removing section ${sectionName} is pending Academic Head approval.`, 'info');
                return;
            }
            try {
                await deleteSectionAPI(programName, sectionName);
            } catch (error) {
                console.error('Unable to delete section:', error);
                showBanner('Unable to remove section.', 'error');
                return;
            }
            const program = State.db.programs[programName];
            if (program) program.sections = (program.sections || []).filter(section => section !== sectionName);
            persistState();
            closeModal();
            renderProgramResources();
            showBanner(`Section "${sectionName}" removed.`, 'success');
        }
    });
}

function deleteSubjectWithVerification(programName, yearKey, semKey, subjectName) {
    const isHead = isAcademicHeadUser();
    openModal({
        title: isHead ? '⚠️ Remove Subject from Curriculum' : 'Request Subject Removal',
        submitLabel: isHead ? 'Remove Subject' : 'Submit Request',
        body: `
            <div class="space-y-4">
                <div class="rounded-2xl bg-red-50 border border-red-200 p-4">
                    <p class="text-sm font-bold text-red-700 mb-1">${isHead ? 'This action cannot be undone.' : 'Academic Head approval is required.'}</p>
                    <p class="text-xs text-red-600">${isHead ? `This will remove <strong>${subjectName}</strong> from the <strong>${programName}</strong> curriculum (${yearKey} · ${semKey}).` : `Your request to remove <strong>${subjectName}</strong> from the curriculum will be sent to the Academic Head.`}</p>
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
        onSubmit: async () => {
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
            if (idx === -1) {
                showBanner('Subject not found.', 'error');
                return;
            }
            const apiPayload = {
                program_name: programName,
                year_level: yearKey,
                semester: semKey,
                subject_name: subjectName
            };
            if (!isHead) {
                queueApprovalAction('subject_delete', { programName, yearLevel: yearKey, semester: semKey, subjectName, apiPayload });
                closeModal();
                showBanner(`Removing subject ${subjectName} is pending Academic Head approval.`, 'info');
                return;
            }
            try {
                await deleteSubjectAPI(apiPayload);
            } catch (error) {
                console.error('Unable to delete subject:', error);
                showBanner('Unable to remove subject.', 'error');
                return;
            }
            arr.splice(idx, 1);
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
        title: isAcademicHeadUser() ? 'Edit Faculty' : 'Request Faculty Edit',
        submitLabel: isAcademicHeadUser() ? 'Save Changes' : 'Submit Request',
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
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Extension</label>
                        <input id="faculty-update-extension" value="${faculty.extension || ''}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Faculty Email</label>
                        <input type="email" id="faculty-update-email" value="${faculty.email || ''}" placeholder="e.g. faculty@pup.edu.ph" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
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
                                <div class="flex items-center justify-between mb-2">
                                    <label class="block text-sm font-medium text-slate-700">Preferred Time (30-min intervals)</label>
                                    <span class="text-[11px] text-slate-400">Select slots to merge</span>
                                </div>
                                <div id="faculty-update-pref-intervals" class="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl"></div>
                            </div>
                            <button type="button" id="faculty-update-pref-time-add" class="w-full rounded-2xl bg-[#7f0000] px-4 py-3 text-sm font-bold text-white hover:bg-red-900 transition">Save Preferred Time</button>
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
            const emailValue = document.getElementById('faculty-update-email')?.value.trim();
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

            const proposedFaculty = {
                ...professor,
                name: newName,
                email: emailValue,
                program: newProgram,
                active: activeValue === 'active',
                employmentType: employmentValue || professor.employmentType,
                baseDesignation: titleValue || professor.baseDesignation,
                classification: classificationValue || professor.classification,
                classificationRank: rankValue || professor.classificationRank || '',
                licenseNumber: licenseValue,
                specialization: specializationValue,
                nationalCertificate: ncValue,
                natureOfAppointment: natureValue,
                extension: extensionValue,
                preferredSubjects: prefSubjectsValue,
                preferredTimes: prefTimesValue,
                remarks: remarksValue,
                educationalAttainment: {
                    baccalaureate: baccValue,
                    masters: masterValue,
                    doctorate: doctorateValue,
                    postBaccalaureate: postbacValue
                },
                courseHandle: {
                    genEd: genedValue,
                    coreSubject: coreValue,
                    professionalSubject: profValue,
                    technicalSubject: technicalValue
                },
                research: {
                    production: productionValue,
                    presentation: presentationValue,
                    publication: publicationValue,
                    citation: citationValue
                }
            };

            if (!isAcademicHeadUser()) {
                queueApprovalAction('faculty_edit', {
                    facultyId: professor.id,
                    faculty: proposedFaculty
                });
                closeModal();
                showBanner(`Changes to ${newName} are pending Academic Head approval.`, 'info');
                return;
            }

            professor.name = newName;
            professor.email = emailValue;
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

function editSubject(programName, yearLevel, semester, subjectName, units, isBridging) {
    if (!programName || !yearLevel || !subjectName) return;
    if (!getCurrentUserFromSession()) {
        showBanner('Sign in to edit a subject or submit an edit request.', 'error');
        return;
    }
    const existingSubject = State.db.programs[programName]?.subjects?.[yearLevel]?.[semester]?.find(subject => subject.name === subjectName);
    const existingHours = getSubjectHourParts(existingSubject || { units });
    const currentType = isBridging ? 'bridging' : 'regular';
    const semOptions = ['1st Semester', '2nd Semester', 'Summer Term'].map(s =>
        `<option value="${s}" ${s === semester ? 'selected' : ''}>${s}</option>`).join('');

    openModal({
        title: isAcademicHeadUser() ? 'Edit Subject' : 'Request Subject Edit',
        submitLabel: isAcademicHeadUser() ? 'Save Changes' : 'Submit Request',
        body: `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Subject Title</label>
                    <input id="modal-edit-subject-name" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" value="${escapeHtml(subjectName)}" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Subject Type</label>
                    <select id="modal-edit-subject-type" onchange="updateBridgingSubjectFields('modal-edit-subject')" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                        <option value="regular" ${currentType === 'regular' ? 'selected' : ''}>Regular Subject</option>
                        <option value="bridging" ${currentType === 'bridging' ? 'selected' : ''}>Bridging Subject</option>
                    </select>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Lecture Hours</label>
                        <input id="modal-edit-subject-lec" type="number" min="0" step="1" value="${existingHours.lec}" oninput="updateSubjectTotalHours('modal-edit-subject')" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Lab Hours</label>
                        <input id="modal-edit-subject-lab" type="number" min="0" step="1" value="${existingHours.lab}" oninput="updateSubjectTotalHours('modal-edit-subject')" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Total Hours</label>
                        <input id="modal-edit-subject-units" type="number" value="${existingHours.units}" readonly class="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700" />
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Year Level</label>
                        <select id="modal-edit-subject-year" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                            <option value="1st Year" ${yearLevel === '1st Year' ? 'selected' : ''}>1st Year</option>
                            <option value="2nd Year" ${yearLevel === '2nd Year' ? 'selected' : ''}>2nd Year</option>
                            <option value="3rd Year" ${yearLevel === '3rd Year' ? 'selected' : ''}>3rd Year</option>
                            <option value="4th Year" ${yearLevel === '4th Year' ? 'selected' : ''}>4th Year</option>
                        </select>
                    </div>
                </div>
                <div id="modal-edit-subject-semester-field">
                    <label class="block text-sm font-medium text-slate-700 mb-2">Semester</label>
                    <select id="modal-edit-subject-semester" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#7f0000]">
                        ${semOptions}
                    </select>
                </div>
            </div>
        `,
        onSubmit: async () => {
            const updatedName = document.getElementById('modal-edit-subject-name')?.value.trim();
            const updatedLec = Math.max(0, Math.floor(Number(document.getElementById('modal-edit-subject-lec')?.value) || 0));
            const updatedLab = Math.max(0, Math.floor(Number(document.getElementById('modal-edit-subject-lab')?.value) || 0));
            const updatedUnits = updatedLec + updatedLab;
            const updatedYearLevel = document.getElementById('modal-edit-subject-year')?.value || yearLevel;
            const updatedIsBridging = document.getElementById('modal-edit-subject-type')?.value === 'bridging';
            const updatedSemester = document.getElementById('modal-edit-subject-semester')?.value || semester;

            if (!updatedName) {
                showBanner('Please enter a subject title.', 'error');
                return;
            }
            if (updatedUnits < 1 || updatedUnits > 30) {
                showBanner('Lecture and lab hours must add up to between 1 and 30 hours.', 'error');
                return;
            }

            const program = State.db.programs[programName];
            if (!program) {
                showBanner('Program not found.', 'error');
                return;
            }

            const apiPayload = {
                program_name: programName,
                old_year_level: yearLevel,
                old_semester: semester || '',
                old_subject_name: subjectName,
                year_level: updatedYearLevel,
                semester: updatedSemester,
                subject_name: updatedName,
                lec_units: updatedLec,
                lab_units: updatedLab,
                is_bridging: updatedIsBridging,
                units: updatedUnits
            };
            if (!isAcademicHeadUser()) {
                queueApprovalAction('subject_edit', {
                    programName,
                    oldYearLevel: yearLevel,
                    oldSemester: semester,
                    oldSubjectName: subjectName,
                    yearLevel: updatedYearLevel,
                    semester: updatedSemester,
                    subjectName: updatedName,
                    lec_units: updatedLec,
                    lab_units: updatedLab,
                    is_bridging: updatedIsBridging,
                    units: updatedUnits,
                    apiPayload
                });
                closeModal();
                showBanner(`Updating subject ${updatedName} is pending Academic Head approval.`, 'info');
                return;
            }
            try {
                await updateSubjectAPI(apiPayload);
            } catch (error) {
                console.error('Unable to update subject:', error);
                showBanner(`Unable to update subject: ${error.message}`, 'error');
                return;
            }

            if (program.subjects?.[yearLevel]?.[semester]) {
                program.subjects[yearLevel][semester] = program.subjects[yearLevel][semester].filter(sub => sub.name !== subjectName);
            }
            if (!program.subjects) program.subjects = {};
            if (!program.subjects[updatedYearLevel]) program.subjects[updatedYearLevel] = {};
            if (!program.subjects[updatedYearLevel][updatedSemester]) program.subjects[updatedYearLevel][updatedSemester] = [];

            const newSubject = {
                name: updatedName,
                lec_units: updatedLec,
                lab_units: updatedLab,
                units: updatedUnits,
                is_bridging: updatedIsBridging
            };
            program.subjects[updatedYearLevel][updatedSemester].push(newSubject);

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
    const toggleInput = document.getElementById('faculty-status-toggle');
    const toggleLabel = document.getElementById('faculty-profile-status-label');

    if (!detailContainer) return;
    if (!selectedId) {
        if (toggleInput) {
            toggleInput.checked = false;
            toggleInput.disabled = true;
        }
        if (toggleLabel) {
            toggleLabel.textContent = 'Select faculty';
        }
        detailContainer.innerHTML = `<div class="rounded-3xl bg-slate-50 p-5 border border-slate-200"><p class="text-sm text-slate-500">No faculty selected.</p></div>`;
        return;
    }
    const faculty = facultyRegistry.find(f => f.id === selectedId);
    if (!faculty) return;

    const isActive = faculty.active !== false;
    if (toggleInput) {
        toggleInput.disabled = false;
        toggleInput.checked = isActive;
    }
    if (toggleLabel) {
        toggleLabel.innerHTML = isActive
            ? '<span class="text-emerald-600 font-bold">● Active (ON)</span>'
            : '<span class="text-red-500 font-bold">● Inactive (OFF)</span>';
    }

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
                    <p class="text-xs uppercase text-slate-400 font-semibold">Classification & Rank</p>
                    <p class="mt-2 font-bold text-gray-900">${faculty.classification || 'N/A'} • ${rankLabel}</p>
                </div>
            </div>

            <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                <p class="text-xs uppercase text-slate-400 font-semibold mb-2">Preferred Subjects</p>
                <p class="text-sm font-semibold text-gray-900">${faculty.preferredSubjects || 'None specified'}</p>
            </div>

            <div class="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                <p class="text-xs uppercase text-slate-400 font-semibold mb-2">Preferred Teaching Times</p>
                <p class="text-sm font-semibold text-gray-900">${faculty.preferredTimes || 'None specified'}</p>
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
                                    <div><span class="font-semibold">Baccalaureate:</span> ${faculty.educationalAttainment?.baccalaureate || 'N/A'}</div>
                                    <div><span class="font-semibold">Masters:</span> ${faculty.educationalAttainment?.masters || 'N/A'}</div>
                                    <div><span class="font-semibold">Doctorate:</span> ${faculty.educationalAttainment?.doctorate || 'N/A'}</div>
                                    <div><span class="font-semibold">Post-Baccalaureate:</span> ${faculty.educationalAttainment?.postBaccalaureate || 'N/A'}</div>
                                </div>
                            </td>
                            <td class="py-4 px-4 align-top">
                                <div class="space-y-2">
                                    <div><span class="font-semibold">GEN-ED:</span> ${faculty.courseHandle?.genEd || 'N/A'}</div>
                                    <div><span class="font-semibold">Core Subject:</span> ${faculty.courseHandle?.coreSubject || 'N/A'}</div>
                                    <div><span class="font-semibold">Professional Subject:</span> ${faculty.courseHandle?.professionalSubject || 'N/A'}</div>
                                    <div><span class="font-semibold">Technical Subject:</span> ${faculty.courseHandle?.technicalSubject || 'N/A'}</div>
                                </div>
                            </td>
                            <td class="py-4 px-4 align-top">
                                <div class="space-y-2">
                                    <div><span class="font-semibold">Production:</span> ${faculty.research?.production || '0'}</div>
                                    <div><span class="font-semibold">Presentation:</span> ${faculty.research?.presentation || '0'}</div>
                                    <div><span class="font-semibold">Publication:</span> ${faculty.research?.publication || '0'}</div>
                                    <div><span class="font-semibold">Citation:</span> ${faculty.research?.citation || '0'}</div>
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

async function handleFacultyToggleChange(isChecked) {
    const selectedId = document.getElementById('faculty-profile-select')?.value;
    if (!selectedId) {
        showBanner('Select a faculty profile first.', 'error');
        const toggleInput = document.getElementById('faculty-status-toggle');
        if (toggleInput) toggleInput.checked = false;
        return;
    }
    await setFacultyActiveStatus(selectedId, isChecked);
}

async function setFacultyActiveStatus(facultyId, isActive) {
    const faculty = facultyRegistry.find(f => f.id === facultyId);
    if (!faculty) return;

    faculty.active = Boolean(isActive);

    // Update toggle elements on profile page if available
    const toggleInput = document.getElementById('faculty-status-toggle');
    const toggleLabel = document.getElementById('faculty-profile-status-label');
    if (toggleInput) {
        toggleInput.disabled = false;
        toggleInput.checked = faculty.active;
    }
    if (toggleLabel) {
        toggleLabel.innerHTML = faculty.active
            ? '<span class="text-emerald-600 font-bold">● Active (ON)</span>'
            : '<span class="text-red-500 font-bold">● Inactive (OFF)</span>';
    }

    displaySelectedFacultyProfile();

    try {
        await updateFacultyStatusAPI(faculty.id, faculty.active);
        if (!faculty.active) {
            State.db.loads = (State.db.loads || []).filter(load => load.prof !== faculty.name);
        }
        await persistState();
    } catch (error) {
        faculty.active = !faculty.active;
        if (toggleInput) toggleInput.checked = faculty.active;
        if (toggleLabel) {
            toggleLabel.innerHTML = faculty.active
                ? '<span class="text-emerald-600 font-bold">● Active (ON)</span>'
                : '<span class="text-red-500 font-bold">● Inactive (OFF)</span>';
        }
        displaySelectedFacultyProfile();
        showBanner(`Unable to update ${faculty.name}'s status.`, 'error');
        return;
    }

    // Synchronize other views if present
    if (typeof renderFacultyStatusPage === 'function') {
        renderFacultyStatusPage();
    }
    if (typeof renderProgramResources === 'function') {
        renderProgramResources();
    }
    if (typeof updateProfessorDropdown === 'function') {
        updateProfessorDropdown();
    }
    if (typeof renderWorkloadMatrix === 'function') {
        renderWorkloadMatrix();
    }
    if (typeof renderFacultyCalendar === 'function') {
        renderFacultyCalendar();
    }
    if (typeof renderRoomSchedulePreview === 'function') {
        renderRoomSchedulePreview();
    }
    if (typeof renderDashboard === 'function') {
        renderDashboard();
    }

    // Dispatch global event for across-the-board listeners
    window.dispatchEvent(new CustomEvent('facultyStatusChanged', {
        detail: { id: faculty.id, name: faculty.name, active: faculty.active }
    }));

    showBanner(`${faculty.name} is now ${faculty.active ? 'Active (ON)' : 'Inactive (OFF)'}.`, 'success');
}

async function toggleActiveStatusFromProfile(setActive) {
    const selectedId = document.getElementById('faculty-profile-select')?.value;
    if (!selectedId) {
        showBanner('Select a faculty profile to change status first.', 'error');
        return;
    }
    await setFacultyActiveStatus(selectedId, setActive);
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

async function saveNewFacultyProfile() {
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
        email: document.getElementById('new-faculty-email')?.value.trim() || '',
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

    if (!isAcademicHeadUser()) {
        queueApprovalAction('faculty_add', { faculty: facultyObject });
        document.getElementById('new-faculty-form')?.reset();
        showBanner(`Faculty profile for ${name} is pending Academic Head approval.`, 'info');
        return;
    }

    try {
        await updateFacultyAPI(facultyObject);

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
            activeHeaderBlock.innerHTML = `<div class="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">Active Faculty (${activeStaff.length})</div>`;

            const activeCardsWrapper = document.createElement('div');
            activeStaff.forEach(f => activeCardsWrapper.appendChild(createCard(f)));
            activeHeaderBlock.appendChild(activeCardsWrapper);
            facultyList.appendChild(activeHeaderBlock);
        }

        // Step 5: Render Inactive block container if matches exist
        if (inactiveStaff.length > 0) {
            const inactiveHeaderBlock = document.createElement('div');
            inactiveHeaderBlock.className = "mb-2 mt-2";
            inactiveHeaderBlock.innerHTML = `<div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">Inactive Faculty (${inactiveStaff.length})</div>`;

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
                        const hours = getSubjectHourParts(sub);
                        const pName = State.activeProgram || '';
                        const isBridging = Boolean(sub.is_bridging) || (typeof getSubjectBridgingStatus === 'function' && getSubjectBridgingStatus(pName, sub.name));
                        const bridgingBadge = isBridging ? '<span class="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] px-1.5 py-0.5 rounded mr-2 uppercase font-black tracking-wider">BRIDGING</span>' : '';
                        const subRow = document.createElement('div');
                        subRow.className = `rounded-2xl ${isBridging ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'} p-3 flex items-center justify-between text-xs hover:bg-slate-100 transition-all cursor-pointer`;
                        subRow.setAttribute('role', 'button');
                        subRow.setAttribute('tabindex', '0');
                        subRow.setAttribute('title', 'Click to edit subject');
                        subRow.innerHTML = `
                            <span class="font-medium text-gray-800 flex-1">${bridgingBadge}${escapeHtml(sub.name)} <span class="text-slate-500 font-medium">(Lec ${hours.lec} + Lab ${hours.lab} = ${hours.units}u)</span></span>
                            <div class="flex items-center gap-2">
                                <button type="button" class="subject-edit-button ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">${isAcademicHeadUser() ? 'Edit' : 'Request Edit'}</button>
                                <button type="button" class="subject-delete-button ml-1 flex-shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition" title="Remove subject">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        `;
                        const editButton = subRow.querySelector('.subject-edit-button');
                        const deleteButton = subRow.querySelector('.subject-delete-button');
                        editButton?.addEventListener('click', event => {
                            event.stopPropagation();
                            editSubject(pName, yearKey, semKey, sub.name, sub.units, isBridging);
                        });
                        deleteButton?.addEventListener('click', event => {
                            event.stopPropagation();
                            deleteSubjectWithVerification(pName, yearKey, semKey, sub.name, isBridging);
                        });
                        subRow.onclick = () => editSubject(pName, yearKey, semKey, sub.name, sub.units, isBridging);
                        subRow.onkeydown = (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                editSubject(pName, yearKey, semKey, sub.name, sub.units, isBridging);
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
                <span class="text-xs font-medium text-slate-800">${escapeHtml(section)}</span>
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
        return list.map(f => {
            const requestedState = f.active === false;
            const pendingApproval = getPendingApprovals().some(item => item.type === 'faculty_status' && item.payload.facultyId === f.id);
            const requestButton = isAcademicHeadUser()
                ? ''
                : `<button type="button" data-request-faculty-id="${escapeHtml(f.id)}" data-request-active="${requestedState ? 'true' : 'false'}" class="request-status-change-btn mt-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 hover:bg-amber-100 transition">
                        ${requestedState ? 'Request Activate' : 'Request Deactivate'}
                    </button>`;
            const pendingBadge = pendingApproval
                ? '<div class="mt-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Pending Approval</div>'
                : '';

            return `
            <div data-faculty-id="${escapeHtml(f.id)}" class="faculty-status-card w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 mb-3 hover:bg-slate-100 transition-all">
                <div class="flex justify-between gap-4 items-start">
                    <div>
                        <div class="text-sm font-semibold text-slate-900">${escapeHtml(f.name)}</div>
                        <div class="text-[11px] text-slate-500 mt-1">${escapeHtml(getTitleLabel(f))} • ${escapeHtml(f.baseDesignation)}</div>
                    </div>
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${f.active === false ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}">${f.active === false ? 'Inactive' : 'Active'}</span>
                </div>
                ${pendingBadge}
                ${requestButton}
            </div>
        `;
        }).join('');
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
                            <p class="mt-2 font-semibold text-slate-900">${escapeHtml(activeProgram)}</p>
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
                    <div class="text-sm font-semibold text-slate-900 mb-4">Active Faculty (${activeStaff.length})</div>
                    ${buildFacultyCards(activeStaff)}
                </div>
                <div class="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                    <div class="text-sm font-semibold text-slate-900 mb-4">Inactive Faculty (${inactiveStaff.length})</div>
                    ${buildFacultyCards(inactiveStaff)}
                </div>
            </div>
        </div>
    `;
    pageContainer.querySelectorAll('.faculty-status-card').forEach(card => {
        card.addEventListener('click', (event) => {
            const requestButton = event.target.closest('.request-status-change-btn');
            if (requestButton) {
                event.stopPropagation();
                return;
            }
            selectFaculty(card.dataset.facultyId);
        });
    });

    pageContainer.querySelectorAll('.request-status-change-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const facultyId = button.dataset.requestFacultyId;
            const requestedActiveState = button.dataset.requestActive === 'true';
            requestFacultyStatusChange(facultyId, requestedActiveState);
        });
    });
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

        if (faculty.active === false) {
            return { allowed: false, reason: `${faculty.name} is currently inactive and cannot be assigned workloads.` };
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
                const hours = typeof getSubjectHourParts === 'function' ? getSubjectHourParts(sub) : { lec: Number(sub.units) || 0, lab: 0, units: Number(sub.units) || 0 };
                const hoursBreakdown = `(Lec ${hours.lec} + Lab ${hours.lab} = ${hours.units}u)`;
                const label = remaining <= 0
                    ? `${sub.name} ${hoursBreakdown} (Completed)`
                    : `${sub.name} ${hoursBreakdown} - ${remaining}u left${preferred ? ' • Preferred' : ''}`;
                return `<option value="${escapeHtml(sub.name)}" data-units="${escapeHtml(sub.units)}" ${disabled}>${escapeHtml(label)}</option>`;
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
    const allProfs = facultyRegistry.filter(f => Boolean(f.name)).sort((a, b) => {
        const aActive = a.active !== false;
        const bActive = b.active !== false;
        if (aActive !== bActive) return aActive ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    const profSelect = document.getElementById('ld-prof');
    profSelect.innerHTML = allProfs.length
        ? allProfs.map(f => {
            const isInactive = f.active === false;
            return `<option value="${f.name}" ${isInactive ? 'disabled class="text-gray-400 bg-gray-100 italic cursor-not-allowed"' : ''}>${f.name}${isInactive ? ' (Inactive - Disabled)' : ''}</option>`;
        }).join('')
        : '<option disabled>No professors available</option>';

    if (!load) {
        const firstActive = allProfs.find(f => f.active !== false);
        if (firstActive) {
            profSelect.value = firstActive.name;
        }
    }

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

async function saveLoad() {
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

    const validation = canAssignLoad(prof, loadCategory, units);
    if (!validation.allowed) {
        showErrorModal('Load Limit Exceeded', validation.reason);
        return;
    }

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

    try {
        await persistLoadToAPI(load);
        currentLoadEditId = null;
        await persistState();
        document.getElementById('modal-load')?.classList.add('hidden');
        showBanner(`Load assignment saved successfully for ${prof}.`, 'success');
        renderPageSections();
    } catch (error) {
        showBanner('Could not save the workload to the database. Your local view was not updated.', 'error');
    }
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
                const load = entry.load;
                const isBridging = getSubjectBridgingStatus(load.program || State.activeProgram, load.sub);
                const bridgingBadge = isBridging 
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1">BRIDGING</span>' 
                    : '';
                const typeBadge = isBridging
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">BRIDGING</span>'
                    : '<span class="inline-block bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider">Regular</span>';
                const cleanSub = String(load.sub || '').replace(/^\[\s*BRIDGING\s*\]\s*/i, '');
                const compHours = Number(load.units) || 0;
                const compType = load.component_type || 'Lec';
                const bldgRoom = formatBuildingRoom(load);
                const loadType = load.loadType || 'Regular Load';

                const palette = getProgramPalette(load.program);
                const cellBg = isBridging ? 'bg-orange-50/70 text-slate-900' : (palette ? palette.row : 'bg-amber-100 text-amber-900');
                const borderCls = isBridging ? 'border-orange-300' : (palette ? palette.border : 'border-amber-300');

                html += `<td rowspan="${entry.span}" class="border-2 ${borderCls} p-2 align-top ${cellBg} rounded-sm text-left">
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
                const load = entry.load;
                const isBridging = getSubjectBridgingStatus(load.program || programName, load.sub);
                const bridgingBadge = isBridging 
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1">BRIDGING</span>' 
                    : '';
                const cleanSub = String(load.sub || '').replace(/^\[\s*BRIDGING\s*\]\s*/i, '');
                const compHours = Number(load.units) || 0;
                const compType = load.component_type || 'Lec';
                const bldgRoom = formatBuildingRoom(load);
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
                const load = entry.load;
                const isBridging = getSubjectBridgingStatus(load.program || State.activeProgram, load.sub);
                const bridgingBadge = isBridging 
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1">BRIDGING</span>' 
                    : '';
                const typeBadge = isBridging
                    ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">BRIDGING</span>'
                    : '<span class="inline-block bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider">Regular</span>';
                const cleanSub = String(load.sub || '').replace(/^\[\s*BRIDGING\s*\]\s*/i, '');
                const compHours = Number(load.units) || 0;
                const compType = load.component_type || 'Lec';
                const bldgRoom = formatBuildingRoom(load);
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
        ['#', 'Subject', 'Load Type', 'Section', 'Hours (Lec/Lab)', 'Building - Room', 'Time', 'Day', 'Program', 'Academic Year', 'Semester']
    ];

    loads.sort((a, b) => {
        const dayOrder = Days.indexOf(a.day) - Days.indexOf(b.day);
        if (dayOrder !== 0) return dayOrder;
        return parseTimeStr(a.time.split(' - ')[0]) - parseTimeStr(b.time.split(' - ')[0]);
    });

    loads.forEach((load, idx) => {
        const isBridging = getSubjectBridgingStatus(load.program || program, load.sub);
        const subDisplay = isBridging ? `[BRIDGING] ${load.sub || ''}` : (load.sub || '');
        const compHours = `${Number(load.units) || 0} hours - ${load.component_type || 'Lec'}`;
        const bldgRoom = formatBuildingRoom(load);
        rows.push([
            idx + 1,
            subDisplay,
            load.loadType || 'Regular Load',
            load.sec || '',
            compHours,
            bldgRoom,
            load.time || '',
            load.day || '',
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

function getExportContext() {
    const schoolYear = document.getElementById('sy-selector')?.value || State.db.schoolYears?.[0] || 'All School Years';
    const semester = document.getElementById('semester-selector')?.value
        || document.getElementById('load-semester-selector')?.value
        || 'All';
    const semesterLabel = semester === '1' ? '1st Semester'
        : semester === '2' ? '2nd Semester'
            : semester === '3' || semester === 'Summer' ? 'Summer Term'
                : semester === 'All' ? 'All Semesters' : String(semester);
    return { schoolYear, semesterLabel };
}

function addExportContextToRows(rows) {
    const { schoolYear, semesterLabel } = getExportContext();
    return [
        ['Academic Year', schoolYear],
        ['Term', semesterLabel],
        [],
        ...rows
    ];
}

async function initApp() {
    await loadSavedState();
    try {
        const settings = await apiFetch('/api/settings');
        if (settings) {
            window.systemSettings = { ...(window.systemSettings || {}), ...settings };
            if (settings.signatory_prepared_by) localStorage.setItem('signatory_prepared_by', settings.signatory_prepared_by);
            if (settings.signatory_noted_by) localStorage.setItem('signatory_noted_by', settings.signatory_noted_by);
        }
    } catch (_) {}
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
    const context = getExportContext();
    const safeSchoolYear = String(context.schoolYear).replace(/[^a-zA-Z0-9]+/g, '_');
    const safeSemester = String(context.semesterLabel).replace(/[^a-zA-Z0-9]+/g, '_');
    const contextSuffix = `_${safeSchoolYear}_${safeSemester}`;
    const finalFilename = filename.endsWith(contextSuffix) ? filename : `${filename}${contextSuffix}`;
    const rows = addExportContextToRows([headers, ...data]);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${finalFilename}.xlsx`);
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

// ============================================================
// ACCOUNT SETTINGS & USER MANAGEMENT
// ============================================================

function apiFetch(url, options = {}) {
    const userStr = sessionStorage.getItem('loggedInUser');
    let token = null;
    if (userStr) {
        try { token = JSON.parse(userStr).token; } catch (e) { }
    }
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };
    return fetch(url, { ...options, headers })
        .then(async res => {
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message || body.error || `HTTP error ${res.status}`);
            }
            return res.json();
        });
}

function updateSidebarUser() {
    const userStr = sessionStorage.getItem('loggedInUser');
    let role = 'ACADEMIC AIDE';
    let name = 'aide_pq';

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const rawRole = String(user.role || '').trim();
            const rawName = String(user.display_name || user.username || '').trim();

            if (rawRole.toLowerCase().includes('head')) {
                role = 'ACADEMIC HEAD';
            } else {
                role = 'ACADEMIC AIDE';
            }

            name = rawName || name;
        } catch (e) { }
    }

    const aside = document.querySelector('aside');
    if (aside) {
        const divs = aside.querySelectorAll('div');
        const userBlock = Array.from(divs).find(d => d.className && d.className.includes('bg-[#710000]'));
        if (userBlock) {
            const paragraphs = userBlock.querySelectorAll('p');
            if (paragraphs.length >= 2) {
                paragraphs[0].innerText = role;
                paragraphs[1].innerText = name;
            }
            userBlock.classList.add('hover:bg-[#5a0000]', 'cursor-pointer');
            const logoutLink = userBlock.querySelector('a[href="index.html"]');
            userBlock.onclick = (event) => {
                if (event.target.closest('a')) return;
                openAccountSettingsMenuModal();
            };
            if (logoutLink) {
                logoutLink.onclick = (event) => { event.stopPropagation(); };
            }
        }
    }
    setPageAccessRestrictions();
}

function openAccountSettingsMenuModal() {
    const userStr = sessionStorage.getItem('loggedInUser');
    let username = 'aide_pq';
    let role = 'Academic Aide';
    let displayName = '';
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            username = user.username || username;
            role = user.role || role;
            displayName = user.display_name || '';
        } catch (e) { }
    }
    const isHead = role.toLowerCase().includes('head');

    const html = `
        <div class="space-y-2">
            <div class="p-3 bg-slate-100 rounded-xl mb-4">
                <p class="text-xs text-slate-500 uppercase font-semibold">Logged in as</p>
                <p class="text-sm font-bold text-slate-800">${escapeHtml(displayName || username)}</p>
                <p class="text-xs text-slate-500">${escapeHtml(role)}</p>
            </div>
            <button onclick="closeModal(); setTimeout(openChangeCredentialsModal, 150)" class="w-full text-left px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center gap-3 transition-all">
                <i data-lucide="key" class="w-4 h-4 text-slate-400"></i> Change Credentials
            </button>
            ${isHead ? `
            <button onclick="closeModal(); setTimeout(openUserManagementModal, 150)" class="w-full text-left px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center gap-3 transition-all">
                <i data-lucide="users" class="w-4 h-4 text-slate-400"></i> User Management
            </button>
            <button onclick="closeModal(); setTimeout(openSignatoryManagementModal, 150)" class="w-full text-left px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center gap-3 transition-all">
                <i data-lucide="pen-line" class="w-4 h-4 text-slate-400"></i> Signatory Names
            </button>
            <button onclick="closeModal(); setTimeout(openManageEmailsModal, 150)" class="w-full text-left px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center gap-3 transition-all">
                <i data-lucide="mail" class="w-4 h-4 text-slate-400"></i> Manage Emails
            </button>
            ` : ''}
        </div>
    `;
    openModal({
        title: 'Account & System Settings',
        body: html,
        submitLabel: null
    });
}

function openChangeCredentialsModal() {
    const userStr = sessionStorage.getItem('loggedInUser');
    let currentUsername = 'aide_pq';
    if (userStr) {
        try { currentUsername = JSON.parse(userStr).username; } catch (e) { }
    }

    const body = `
        <div class="mb-4">
            <button type="button" onclick="closeModal(); setTimeout(openAccountSettingsMenuModal, 150)" class="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                <i data-lucide="arrow-left" class="w-4 h-4"></i> Return to Settings
            </button>
        </div>
        <div id="change-credentials-error" class="hidden mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-2xl text-xs"></div>
        <div class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">New Username</label>
                <input id="cred-new-username" type="text" class="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none" value="${escapeHtml(currentUsername)}">
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
        title: 'Change Credentials',
        body: body,
        submitLabel: 'Save Changes',
        cancelLabel: 'Close',
        onSubmit: async () => {
            const newUsername = document.getElementById('cred-new-username').value.trim();
            const currentPassword = document.getElementById('cred-current-password').value;
            const newPassword = document.getElementById('cred-new-password').value;
            const errDiv = document.getElementById('change-credentials-error');

            if (!newUsername) {
                errDiv.textContent = 'Username cannot be empty.';
                errDiv.classList.remove('hidden');
                return;
            }
            if (!currentPassword) {
                errDiv.textContent = 'Current password is required to make changes.';
                errDiv.classList.remove('hidden');
                return;
            }

            try {
                await apiFetch('/api/users/me/credentials', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        new_username: newUsername,
                        current_password: currentPassword,
                        new_password: newPassword || undefined
                    })
                });
                showBanner('Credentials updated successfully. Please log in again.', 'success');
                closeModal();
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            } catch (err) {
                errDiv.textContent = err.message || 'Failed to update credentials.';
                errDiv.classList.remove('hidden');
            }
        }
    });
}

function openUserManagementModal() {
    openModal({
        title: 'User Management',
        body: `
            <div id="user-management-container" class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div class="animate-pulse flex space-x-4">
                    <div class="flex-1 space-y-4 py-1">
                        <div class="h-2 bg-slate-200 rounded"></div>
                        <div class="space-y-3">
                            <div class="h-2 bg-slate-200 rounded"></div>
                            <div class="h-2 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        submitLabel: null,
        cancelLabel: 'Close'
    });

    apiFetch('/api/users')
        .then(users => {
            const container = document.getElementById('user-management-container');
            if (!container) return;

            let html = `
                <div class="flex justify-between items-center mb-4">
                    <button onclick="closeModal(); setTimeout(openAccountSettingsMenuModal, 150)" class="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i> Return to Settings
                    </button>
                </div>
                <div class="flex justify-between items-center mb-4">
                    <p class="text-sm text-slate-600">Manage system users, passwords, and roles.</p>
                    <button class="px-3 py-1.5 bg-[#7f0000] text-white text-xs font-semibold rounded-lg hover:bg-[#660000]" onclick="closeModal(); setTimeout(() => openUserFormModal(), 150)">Add User</button>
                </div>
                <div class="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table class="w-full text-left text-sm text-slate-600">
                        <thead class="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th class="px-4 py-3">Username</th>
                                <th class="px-4 py-3">Role</th>
                                <th class="px-4 py-3">Name</th>
                                <th class="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
            `;

            users.forEach(u => {
                html += `
                    <tr class="hover:bg-slate-50">
                        <td class="px-4 py-3 font-medium text-slate-900">${escapeHtml(u.username)}</td>
                        <td class="px-4 py-3">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.role === 'Academic Head' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                                ${escapeHtml(u.role)}
                            </span>
                        </td>
                        <td class="px-4 py-3">${escapeHtml(u.display_name || '')}</td>
                        <td class="px-4 py-3 text-right">
                            <button class="text-indigo-600 hover:text-indigo-900 text-xs font-semibold mr-3" onclick="closeModal(); setTimeout(() => openUserFormModal('${escapeHtml(u.username)}', '${escapeHtml(u.role)}', '${escapeHtml(u.display_name || '')}'), 150)">Edit</button>
                            <button class="text-red-600 hover:text-red-900 text-xs font-semibold" onclick="deleteUser('${escapeHtml(u.username)}')">Delete</button>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
            container.innerHTML = html;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        })
        .catch(err => {
            const container = document.getElementById('user-management-container');
            if (container) container.innerHTML = `<p class="text-red-600 text-sm">Failed to load users: ${err.message}</p>`;
        });
}

function openUserFormModal(existingUsername = null, existingRole = 'Academic Aide', existingDisplayName = '') {
    const isEdit = !!existingUsername;
    const title = isEdit ? 'Edit User' : 'Add New User';

    const body = `
        <div class="mb-4">
            <button type="button" onclick="closeModal(); setTimeout(openUserManagementModal, 150)" class="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Users
            </button>
        </div>
        <div id="user-form-error" class="hidden mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-2xl text-xs"></div>
        <div class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Username (for login only)</label>
                <input id="user-form-username" type="text" class="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none" value="${escapeHtml(existingUsername || '')}" ${isEdit ? 'disabled' : ''}>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Display Name (shown in system)</label>
                <input id="user-form-display-name" type="text" class="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none" value="${escapeHtml(existingDisplayName)}" placeholder="Full name shown after login">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Role</label>
                <select id="user-form-role" class="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none">
                    <option value="Academic Aide" ${existingRole === 'Academic Aide' ? 'selected' : ''}>Academic Aide</option>
                    <option value="Academic Head" ${existingRole === 'Academic Head' ? 'selected' : ''}>Academic Head</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Password ${isEdit ? '(Leave blank to keep current)' : ''}</label>
                <input id="user-form-password" type="password" class="w-full rounded-2xl border border-slate-300 p-3 text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none" placeholder="${isEdit ? 'Enter new password' : 'Enter password'}">
            </div>
        </div>
    `;

    openModal({
        title: title,
        body: body,
        submitLabel: 'Save User',
        cancelLabel: 'Close',
        onSubmit: async () => {
            const username = document.getElementById('user-form-username').value.trim();
            const role = document.getElementById('user-form-role').value;
            const displayName = document.getElementById('user-form-display-name').value.trim();
            const password = document.getElementById('user-form-password').value;
            const errDiv = document.getElementById('user-form-error');

            if (!username) {
                errDiv.textContent = 'Username is required.';
                errDiv.classList.remove('hidden');
                return;
            }
            if (!isEdit && !password) {
                errDiv.textContent = 'Password is required for new users.';
                errDiv.classList.remove('hidden');
                return;
            }

            try {
                const url = isEdit ? `/api/users/${encodeURIComponent(existingUsername)}` : '/api/users';
                const method = isEdit ? 'PATCH' : 'POST';
                const payload = { role, display_name: displayName };
                if (password) payload.password = password;
                if (!isEdit) payload.username = username;

                await apiFetch(url, { method, body: JSON.stringify(payload) });

                showBanner(`User ${isEdit ? 'updated' : 'created'} successfully`, 'success');
                closeModal();
                setTimeout(openUserManagementModal, 150);
            } catch (err) {
                errDiv.textContent = err.message || 'Failed to save user.';
                errDiv.classList.remove('hidden');
            }
        }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function deleteUser(username) {
    if (!confirm(`Are you sure you want to delete the user "${username}"?`)) return;
    try {
        await apiFetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
        showBanner('User deleted successfully', 'success');
        closeModal();
        setTimeout(openUserManagementModal, 150);
    } catch (err) {
        showBanner(err.message || 'Failed to delete user', 'error');
    }
}

function openSignatoryManagementModal() {
    openModal({
        title: 'Signatory Names Management',
        body: `
            <div id="signatory-management-container" class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div class="animate-pulse space-y-4">
                    <div class="h-10 bg-slate-200 rounded-lg"></div>
                    <div class="h-10 bg-slate-200 rounded-lg"></div>
                </div>
            </div>
        `,
        submitLabel: 'Save Changes',
        cancelLabel: 'Close',
        onSubmit: async () => {
            const prep = document.getElementById('sig-prepared-by').value;
            const noted = document.getElementById('sig-noted-by').value;
            try {
                await apiFetch('/api/settings', {
                    method: 'PATCH',
                    body: JSON.stringify({ signatory_prepared_by: prep, signatory_noted_by: noted })
                });
                window.systemSettings = { ...(window.systemSettings || {}), signatory_prepared_by: prep, signatory_noted_by: noted };
                localStorage.setItem('signatory_prepared_by', prep);
                localStorage.setItem('signatory_noted_by', noted);
                showBanner('Signatories updated successfully', 'success');
                closeModal();
            } catch (err) {
                showBanner(err.message, 'error');
            }
        }
    });

    apiFetch('/api/settings')
        .then(settings => {
            window.systemSettings = { ...(window.systemSettings || {}), ...settings };
            const container = document.getElementById('signatory-management-container');
            if (!container) return;

            const prep = settings.signatory_prepared_by || 'Jefferson F. Serrano';
            const noted = settings.signatory_noted_by || 'Prof. Jaime P. Gutierrez Jr.';
            localStorage.setItem('signatory_prepared_by', prep);
            localStorage.setItem('signatory_noted_by', noted);

            container.innerHTML = `
                <div class="mb-4">
                    <button type="button" onclick="closeModal(); setTimeout(openAccountSettingsMenuModal, 150)" class="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i> Return to Settings
                    </button>
                </div>
                <p class="text-sm text-slate-600">Update the names used for signatures on exported documents.</p>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Prepared By (Academic Head)</label>
                    <input id="sig-prepared-by" type="text" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none" value="${escapeHtml(prep)}">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Noted By (Campus Director)</label>
                    <input id="sig-noted-by" type="text" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#7f0000] focus:ring-1 focus:ring-[#7f0000] outline-none" value="${escapeHtml(noted)}">
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        })
        .catch(err => {
            const container = document.getElementById('signatory-management-container');
            if (container) container.innerHTML = `<p class="text-red-600 text-sm">Failed to load signatories: ${err.message}</p>`;
        });
}

function openManageEmailsModal() {
    openModal({
        title: 'Manage Emails',
        body: `
            <div id="email-management-container" class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div class="animate-pulse flex space-x-4">
                    <div class="flex-1 space-y-4 py-1">
                        <div class="h-2 bg-slate-200 rounded"></div>
                        <div class="space-y-3">
                            <div class="h-2 bg-slate-200 rounded"></div>
                            <div class="h-2 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        submitLabel: null,
        cancelLabel: 'Close'
    });

    apiFetch('/api/emails')
        .then(emails => {
            const container = document.getElementById('email-management-container');
            if (!container) return;
            window._loadedEmails = emails;

            const returnBtn = `
                <div class="flex justify-between items-center mb-4">
                    <button type="button" onclick="closeModal(); setTimeout(openAccountSettingsMenuModal, 150)" class="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i> Return to Settings
                    </button>
                </div>
                <p class="text-sm text-slate-600 mb-4">View and manage automated system emails.</p>
            `;

            if (emails.length === 0) {
                container.innerHTML = returnBtn + `<div class="text-center py-6 text-slate-400 text-sm">No emails found in the system.</div>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            let html = returnBtn + `
                <div class="bg-white border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <table class="w-full text-left text-sm text-slate-600">
                        <thead class="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0">
                            <tr>
                                <th class="px-4 py-3">Recipient</th>
                                <th class="px-4 py-3">Subject</th>
                                <th class="px-4 py-3">Status</th>
                                <th class="px-4 py-3">Date</th>
                                <th class="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
            `;

            emails.forEach((e, idx) => {
                let statusBadge = '';
                if (e.status === 'sent') statusBadge = 'bg-green-100 text-green-700';
                else if (e.status === 'failed') statusBadge = 'bg-red-100 text-red-700';
                else statusBadge = 'bg-amber-100 text-amber-700';

                html += `
                    <tr class="hover:bg-slate-50">
                        <td class="px-4 py-3 text-slate-900 font-medium">${escapeHtml(e.recipient_email || e.recipient)}</td>
                        <td class="px-4 py-3">${escapeHtml(e.subject)}</td>
                        <td class="px-4 py-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge}">${escapeHtml(e.status)}</span></td>
                        <td class="px-4 py-3 text-xs text-slate-400">${e.created_at ? new Date(e.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td class="px-4 py-3 text-right">
                            <button type="button" onclick="viewEmailDetails(${idx})" class="text-xs text-blue-600 hover:text-blue-800 font-semibold underline">View</button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            container.innerHTML = html;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        })
        .catch(err => {
            const container = document.getElementById('email-management-container');
            if (container) container.innerHTML = `<p class="text-red-600 text-sm">Failed to load emails: ${err.message}</p>`;
        });
}

function viewEmailDetails(emailIndex) {
    const email = window._loadedEmails?.[emailIndex];
    if (!email) return;

    openModal({
        title: `Email: ${email.subject}`,
        submitLabel: null,
        cancelLabel: 'Back to Email List',
        onCancel: () => {
            closeModal();
            setTimeout(openManageEmailsModal, 150);
        },
        body: `
            <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                    <button type="button" onclick="closeModal(); setTimeout(openManageEmailsModal, 150);" class="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-xl shadow-sm transition">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                        <span>Return to Email List</span>
                    </button>
                    <span class="text-xs text-slate-400">Email ID: #${email.id || emailIndex + 1}</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div><span class="text-slate-500 font-semibold uppercase text-[10px] block">Recipient</span> <span class="font-bold text-slate-800">${escapeHtml(email.recipient_email || email.recipient)}</span> ${email.recipient_name ? `<span class="text-slate-500">(${escapeHtml(email.recipient_name)})</span>` : ''}</div>
                    <div><span class="text-slate-500 font-semibold uppercase text-[10px] block">Delivery Status</span> <span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${email.status === 'sent' ? 'bg-green-100 text-green-700' : email.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">${escapeHtml(email.status || 'sent')}</span></div>
                    <div><span class="text-slate-500 font-semibold uppercase text-[10px] block">Dispatched By</span> <span class="text-slate-700 font-medium">${escapeHtml(email.sent_by || 'Academic Head')}</span></div>
                    <div><span class="text-slate-500 font-semibold uppercase text-[10px] block">Timestamp</span> <span class="text-slate-700 font-medium">${email.created_at ? new Date(email.created_at).toLocaleString() : 'N/A'}</span></div>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message Content</label>
                    <div class="border border-slate-200 rounded-2xl p-4 bg-white max-h-80 overflow-y-auto shadow-inner">
                        ${email.body || '<p class="text-slate-400 italic">No content body recorded.</p>'}
                    </div>
                </div>
            </div>
        `
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openEmailWorkloadModal() {
    const profName = document.getElementById('view-faculty-select')?.value;
    if (!profName) {
        return showBanner('Please select a professor first.', 'error');
    }
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears?.[0] || 'Academic Year';
    const semester = document.getElementById('semester-selector')?.value || 'All';
    const semesterLabel = semester === '1' ? '1st Semester' : semester === '2' ? '2nd Semester' : semester === '3' ? 'Summer Term' : 'All Semesters';
    const programFilter = document.getElementById('workload-program-filter')?.value || 'All';
    const loads = State.db.loads.filter(l => l.prof === profName && l.sy === sy && (programFilter === 'All' || l.program === programFilter) && (semester === 'All' || String(l.semester) === String(semester)));

    if (!loads.length) {
        return showBanner(`No workload records found for ${profName} in this term.`, 'error');
    }

    const faculty = facultyRegistry.find(f => f.name === profName);
    const facultyEmail = faculty?.email || '';
    const totalUnits = loads.reduce((sum, l) => sum + (Number(l.units) || 0), 0);

    loads.sort((a, b) => {
        const dayOrder = Days.indexOf(a.day) - Days.indexOf(b.day);
        if (dayOrder !== 0) return dayOrder;
        return parseTimeStr(a.time.split(' - ')[0]) - parseTimeStr(b.time.split(' - ')[0]);
    });

    const subjectRowsHtml = loads.map(l => `
        <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
            <td class="p-2 font-medium text-slate-800">${escapeHtml(l.sub)}</td>
            <td class="p-2 text-slate-600">${escapeHtml(l.sec)}</td>
            <td class="p-2 text-slate-600">${escapeHtml(l.day)} ${escapeHtml(l.time)}</td>
            <td class="p-2 text-slate-600">${escapeHtml(formatBuildingRoom(l))}</td>
            <td class="p-2 text-slate-600">${escapeHtml(l.component_type || 'Lec')}</td>
            <td class="p-2 font-bold text-slate-800">${Number(l.units) || 0}u</td>
        </tr>
    `).join('');

    const defaultSubject = `[PUP-PQ] Official Teaching Workload - ${profName} (AY ${sy}, ${semesterLabel})`;

    // Helper to generate formatted plain-text workload message for email clients
    const buildPlainTextBody = (customNotes = '') => {
        const scheduleLines = loads.map((l, i) => 
            `  ${i + 1}. ${l.sub}\n     Section: ${l.sec} | Schedule: ${l.day} ${l.time}\n     Room: ${formatBuildingRoom(l)} | Type: ${l.component_type || 'Lec'} | Units: ${Number(l.units) || 0}u`
        ).join('\n\n');

        return `Dear Prof. ${profName},

Here is your official teaching workload schedule for AY ${sy}, ${semesterLabel}:

=======================================================
TEACHING WORKLOAD ASSIGNMENT
=======================================================
Faculty: ${profName}
Academic Term: AY ${sy}, ${semesterLabel}
Total Classes: ${loads.length}
Total Cumulative Units: ${totalUnits} Units
=======================================================

CLASS SCHEDULE:
${scheduleLines}

=======================================================
Total Units: ${totalUnits} Units
=======================================================
${customNotes ? `\nAdditional Notes:\n${customNotes}\n` : ''}
Please review your schedule. If you have any inquiries or adjustments, please coordinate with the Academic Head office.

Warm regards,
Academic Administration
Polytechnic University of the Philippines - Parañaque City Campus`;
    };

    // Helper to generate rich HTML body for direct SMTP and system logging
    const buildHtmlBody = (customNotes = '') => `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 650px; line-height: 1.5; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #7f0000; color: #ffffff; padding: 18px 24px;">
                <h2 style="margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">Polytechnic University of the Philippines</h2>
                <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Parañaque City Campus &bull; Official Teaching Workload Assignment</p>
            </div>
            <div style="padding: 24px;">
                <p style="margin-top: 0;">Dear <strong>${escapeHtml(profName)}</strong>,</p>
                <p>Below is your official teaching workload assignment for <strong>AY ${escapeHtml(sy)}, ${escapeHtml(semesterLabel)}</strong>:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                            <th style="padding: 10px 8px; border: 1px solid #e2e8f0;">Subject</th>
                            <th style="padding: 10px 8px; border: 1px solid #e2e8f0;">Section</th>
                            <th style="padding: 10px 8px; border: 1px solid #e2e8f0;">Day & Time</th>
                            <th style="padding: 10px 8px; border: 1px solid #e2e8f0;">Room</th>
                            <th style="padding: 10px 8px; border: 1px solid #e2e8f0;">Type</th>
                            <th style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center;">Units</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loads.map(l => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${escapeHtml(l.sub)}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; color: #475569;">${escapeHtml(l.sec)}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; color: #475569;">${escapeHtml(l.day)} ${escapeHtml(l.time)}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; color: #475569;">${escapeHtml(formatBuildingRoom(l))}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; color: #475569;">${escapeHtml(l.component_type || 'Lec')}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #1e293b;">${Number(l.units) || 0}</td>
                            </tr>
                        `).join('')}
                        <tr style="background-color: #f8fafc; font-weight: bold;">
                            <td colspan="5" style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; color: #1e293b;">Total Cumulative Units:</td>
                            <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; color: #7f0000; font-size: 13px;">${totalUnits} Units</td>
                        </tr>
                    </tbody>
                </table>
                
                ${customNotes ? `
                    <div style="background-color: #fef2f2; border-left: 4px solid #7f0000; padding: 12px 14px; margin: 18px 0; font-size: 13px; color: #991b1b; border-radius: 4px;">
                        <strong>Important Note:</strong> ${escapeHtml(customNotes)}
                    </div>
                ` : ''}

                <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px;">
                    Please review your schedule and confirm your availability. If adjustments are needed, kindly contact the Academic Head office.<br/><br/>
                    <em>Polytechnic University of the Philippines &bull; Parañaque City Campus</em>
                </p>
            </div>
        </div>
    `;

    // Global 1-click dispatcher accessible from modal buttons
    window.dispatchWorkload1Click = async (service) => {
        const recipientEmail = document.getElementById('email-workload-recipient')?.value.trim();
        const subject = document.getElementById('email-workload-subject')?.value.trim();
        const notes = document.getElementById('email-workload-notes')?.value.trim() || '';

        if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
            return showBanner('Please provide a valid recipient email address.', 'error');
        }
        if (!subject) {
            return showBanner('Please provide an email subject line.', 'error');
        }

        // Auto-persist email to faculty profile if updated
        if (faculty && faculty.email !== recipientEmail) {
            faculty.email = recipientEmail;
            if (typeof updateFacultyAPI === 'function') {
                updateFacultyAPI(faculty).catch(() => {});
            }
        }

        const plainBody = buildPlainTextBody(notes);
        const htmlBody = buildHtmlBody(notes);

        // Always log dispatch into Manage Emails database
        try {
            await apiFetch('/api/emails', {
                method: 'POST',
                body: JSON.stringify({
                    recipient: recipientEmail,
                    recipient_email: recipientEmail,
                    recipient_name: profName,
                    subject: subject,
                    body: htmlBody,
                    status: 'sent'
                })
            });
        } catch (e) {
            console.warn('Logging dispatch to backend returned:', e);
        }

        if (service === 'outlook') {
            // Official PUP Webmail is Microsoft 365 Outlook
            const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(recipientEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
            window.open(outlookUrl, '_blank');
            closeModal();
            showBanner(`Opened 1-Click PUP Outlook Webmail & logged to Manage Emails!`, 'success');
        } else if (service === 'gmail') {
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
            window.open(gmailUrl, '_blank');
            closeModal();
            showBanner(`Opened 1-Click Gmail & logged to Manage Emails!`, 'success');
        } else if (service === 'mailto') {
            const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
            window.open(mailtoUrl, '_blank');
            closeModal();
            showBanner(`Opened default mail client & logged to Manage Emails!`, 'info');
        }
    };

    window.setEmailDomainShortcut = (domain) => {
        const input = document.getElementById('email-workload-recipient');
        if (!input) return;
        let val = input.value.trim();
        if (!val) {
            const cleanName = profName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
            input.value = `${cleanName}@${domain}`;
        } else if (val.includes('@')) {
            const userPart = val.split('@')[0];
            input.value = `${userPart}@${domain}`;
        } else {
            input.value = `${val}@${domain}`;
        }
        input.focus();
    };

    openModal({
        title: 'Email Workload Assignment',
        submitLabel: 'Send via System (Direct SMTP)',
        body: `
            <div class="space-y-4">
                <div class="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                    <div class="text-blue-600 mt-0.5"><i data-lucide="mail" class="w-5 h-5"></i></div>
                    <div class="text-xs text-blue-900 leading-relaxed">
                        Send official teaching workload schedule to <strong>${escapeHtml(profName)}</strong>. Workloads can be sent to their official <strong>@pup.edu.ph Outlook</strong> webmail, <strong>Gmail</strong>, or directly via system SMTP. Every dispatch is permanently logged under <strong>Academic Head &gt; Manage Emails</strong>.
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Faculty Name</label>
                        <input type="text" id="email-workload-faculty" value="${escapeHtml(profName)}" readonly class="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 outline-none" />
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-xs font-bold text-slate-600 uppercase">Recipient Email <span class="text-red-500">*</span></label>
                            <div class="flex items-center gap-1">
                                <button type="button" onclick="setEmailDomainShortcut('pup.edu.ph')" class="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold px-1.5 py-0.5 rounded border border-amber-200" title="Switch domain to official PUP Outlook">@pup.edu.ph</button>
                                <button type="button" onclick="setEmailDomainShortcut('gmail.com')" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded border border-slate-300" title="Switch domain to Gmail">@gmail.com</button>
                            </div>
                        </div>
                        <input type="email" id="email-workload-recipient" value="${escapeHtml(facultyEmail)}" placeholder="e.g. professor@pup.edu.ph" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#7f0000]" required />
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Subject</label>
                    <input type="text" id="email-workload-subject" value="${escapeHtml(defaultSubject)}" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#7f0000]" />
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Workload Schedule Preview (${loads.length} classes &middot; ${totalUnits} units)</label>
                    <div class="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-100 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th class="p-2">Subject</th>
                                    <th class="p-2">Section</th>
                                    <th class="p-2">Schedule</th>
                                    <th class="p-2">Room</th>
                                    <th class="p-2">Type</th>
                                    <th class="p-2">Units</th>
                                </tr>
                            </thead>
                            <tbody>${subjectRowsHtml}</tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Additional Notes / Instructions (Optional)</label>
                    <textarea id="email-workload-notes" rows="2" placeholder="e.g. Please confirm receipt of your official workload assignment before classes start." class="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#7f0000]"></textarea>
                </div>

                <!-- Attachments & Download Option -->
                <div class="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5">
                        <div class="p-2 bg-amber-100 text-amber-800 rounded-xl">
                            <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <div class="text-xs font-bold text-amber-950">Attach Official Excel Workload (.xlsx)</div>
                            <div class="text-[11px] text-amber-800">Faculty will receive the official spreadsheet file to download directly from the email.</div>
                        </div>
                    </div>
                    <button type="button" onclick="exportFacultyWorkload('${escapeHtml(profName)}')" class="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-100 shadow-sm transition flex items-center gap-1.5 flex-shrink-0" title="Download copy to your computer right now">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                        <span>Download Now</span>
                    </button>
                </div>

                <!-- 1-Click Action Dispatch Bar -->
                <div class="border-t border-slate-200 pt-3">
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                        <i data-lucide="zap" class="w-4 h-4 text-amber-500"></i>
                        1-Click Instant Dispatch (Pre-filled &amp; Logged)
                    </label>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button type="button" onclick="dispatchWorkload1Click('outlook')" class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0078d4] hover:bg-[#0060aa] text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95" title="Opens Microsoft 365 Outlook with workload prefilled and logs to Manage Emails">
                            <i data-lucide="mail" class="w-4 h-4"></i>
                            <span>PUP Outlook Web</span>
                        </button>
                        <button type="button" onclick="dispatchWorkload1Click('gmail')" class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#ea4335] hover:bg-[#d93025] text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95" title="Opens Google Gmail with workload prefilled and logs to Manage Emails">
                            <i data-lucide="send" class="w-4 h-4"></i>
                            <span>Gmail Web</span>
                        </button>
                        <button type="button" onclick="dispatchWorkload1Click('mailto')" class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95" title="Opens Default Mail Client / Desktop Outlook and logs to Manage Emails">
                            <i data-lucide="external-link" class="w-4 h-4"></i>
                            <span>Mail App</span>
                        </button>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-1.5 italic">
                        Tip: Clicking any 1-Click button opens the webmail composer with the complete workload and recipient pre-filled, and logs the dispatch under <strong>Academic Head &gt; Manage Emails</strong>.
                    </p>
                </div>
            </div>
        `,
        onSubmit: async () => {
            const recipientEmail = document.getElementById('email-workload-recipient')?.value.trim();
            const subject = document.getElementById('email-workload-subject')?.value.trim();
            const notes = document.getElementById('email-workload-notes')?.value.trim() || '';

            if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
                return showBanner('Please provide a valid recipient email address.', 'error');
            }
            if (!subject) {
                return showBanner('Please provide an email subject line.', 'error');
            }

            // Save/update faculty's email address if it was missing or changed
            if (faculty && faculty.email !== recipientEmail) {
                faculty.email = recipientEmail;
                if (typeof updateFacultyAPI === 'function') {
                    updateFacultyAPI(faculty).catch(() => {});
                }
            }

            const bodyHtml = buildHtmlBody(notes);

            // Generate formatted Excel workload attachment using ExcelJS (from app.excel-export.js)
            let attachments = [];
            const sanitizedProf = profName.replace(/[^a-zA-Z0-9_-]/g, '_');
            const sanitizedTerm = `${sy}_${semesterLabel}`.replace(/[^a-zA-Z0-9_-]/g, '_');
            const attachmentFilename = `Faculty_Workload_${sanitizedProf}_${sanitizedTerm}.xlsx`;

            try {
                if (typeof window.buildFacultyWorkloadWorkbookBuffer === 'function') {
                    const b64Data = await window.buildFacultyWorkloadWorkbookBuffer(profName);
                    if (b64Data) {
                        attachments.push({
                            filename: attachmentFilename,
                            content: b64Data,
                            encoding: 'base64',
                            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        });
                    }
                }
            } catch (excelJsErr) {
                console.warn('Could not generate ExcelJS formatted attachment:', excelJsErr);
            }

            // Fallback to SheetJS aoa_to_sheet if ExcelJS buffer wasn't generated
            if (attachments.length === 0 && typeof XLSX !== 'undefined') {
                try {
                    const program = (typeof displayProfessorProgram === 'function' ? displayProfessorProgram(profName) : '') || programFilter || 'All Programs';
                    const rows = [
                        ['Polytechnic University of the Philippines - Parañaque Campus'],
                        ['Official Teaching Workload Assignment'],
                        [],
                        ['Professor', profName],
                        ['Program', program],
                        ['Academic Year', sy],
                        ['Semester', semesterLabel],
                        ['Classification', faculty?.classification || 'N/A'],
                        ['Designation', faculty?.baseDesignation || 'N/A'],
                        ['Total Units', `${totalUnits} Units`],
                        [],
                        ['#', 'Subject', 'Load Type', 'Section', 'Hours (Lec/Lab)', 'Building - Room', 'Time', 'Day', 'Program', 'Academic Year', 'Semester']
                    ];

                    loads.forEach((load, idx) => {
                        const isBridging = typeof getSubjectBridgingStatus === 'function' && getSubjectBridgingStatus(load.program || program, load.sub);
                        const subDisplay = isBridging ? `[BRIDGING] ${load.sub || ''}` : (load.sub || '');
                        const compHours = `${Number(load.units) || 0} hours - ${load.component_type || 'Lec'}`;
                        const bldgRoom = formatBuildingRoom(load);
                        rows.push([
                            idx + 1,
                            subDisplay,
                            load.loadType || 'Regular Load',
                            load.sec || '',
                            compHours,
                            bldgRoom,
                            load.time || '',
                            load.day || '',
                            load.program || '',
                            load.sy || '',
                            load.semester || ''
                        ]);
                    });

                    if (notes) {
                        rows.push([]);
                        rows.push(['Special Notes / Instructions:', notes]);
                    }

                    const ws = XLSX.utils.aoa_to_sheet(rows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Workload');
                    const b64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

                    attachments.push({
                        filename: attachmentFilename,
                        content: b64Data,
                        encoding: 'base64',
                        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                } catch (xlsxErr) {
                    console.warn('Could not generate SheetJS attachment fallback:', xlsxErr);
                }
            }

            try {
                const res = await apiFetch('/api/emails', {
                    method: 'POST',
                    body: JSON.stringify({
                        recipient: recipientEmail,
                        recipient_email: recipientEmail,
                        recipient_name: profName,
                        subject: subject,
                        body: bodyHtml,
                        status: 'sent',
                        attachments: attachments
                    })
                });
                closeModal();
                if (res?.delivery?.delivered) {
                    showBanner(`Workload assignment & Excel file delivered directly to ${recipientEmail} via SMTP!`, 'success');
                } else {
                    showBanner(`Workload logged to Manage Emails! (Configure SMTP in .env for direct server delivery, or use the 1-Click Outlook button).`, 'info');
                }
            } catch (err) {
                console.error('Failed to dispatch workload email:', err);
                const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildPlainTextBody(notes))}`;
                window.open(mailtoUrl, '_blank');
                closeModal();
                showBanner(`Logged workload dispatch to ${recipientEmail}.`, 'info');
            }
        }
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.openEmailWorkloadModal = openEmailWorkloadModal;
window.viewEmailDetails = viewEmailDetails;

document.addEventListener('DOMContentLoaded', initApp);
// ✅ End of file. No extra brackets here.
