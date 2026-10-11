// Shared application state and mock database definitions
const TEMP_DATABASE = window.TEMP_DATABASE || null;
const facultyRegistry = TEMP_DATABASE?.facultyRegistry || [];

const designationOptions = [
    "None (Regular Faculty Line)",
    "Campus Director",
    "Program Chairperson - Information Technology (IT)",
    "Program Chairperson - Hospitality Management (HM)",
    "Program Chairperson - Computer Engineering (COE)",
    "Laboratory Custodian Coordinator",
    "Area Sector Coordinator"
];

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
            'Temporary Substitute Load': 45
        },
        totalMaxLoad: 45
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
            'Part-time Load': 12,
            'Temporary Substitute Load': 45
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
            'Temporary Substitute Load': 45
        },
        totalMaxLoad: 45
    },
    'Director': {
        ranks: [
            { label: 'Campus Director', value: 'campus_director' }
        ],
        loadLimits: {
            'Regular Load': 3,
            'Part-time Load': 12,
            'Temporary Substitute Load': 0
        },
        totalMaxLoad: 45
    }
};

const workloadDatabase = [
    { facultyId: "prof-jefferson", program: "HM", courseCode: "PATHFIT 1", units: 3 },
    { facultyId: "prof-jefferson", program: "IT", courseCode: "PATHFIT 1", units: 3 },
    { facultyId: "prof-jefferson", program: "COE", courseCode: "PATHFIT 1", units: 3 },
    { facultyId: "prof-jefferson", program: "IT", courseCode: "CC102 (Computer Programming)", units: 3 },
    { facultyId: "prof-delacruz", program: "IT", courseCode: "IT311 (Database Systems)", units: 3 },
    { facultyId: "prof-santos", program: "COE", courseCode: "COE412 (Microprocessor Systems)", units: 4 }
];

const GLOBAL_MAX_LOAD_CAP = 45;

let currentLoadEditId = null;

const State = {
    activeProgram: 'Information Technology',
    subjectSemesterFilter: 'All',
    facultyTypeFilter: 'All',
    facultyFilter: 'all',
    facultyStatusFilter: 'all',
    db: TEMP_DATABASE?.db || {
        schoolYears: [],
        buildings: [],
        rooms: [],
        programs: {},
        loads: []
    }
};

window.State = State;
window.facultyRegistry = facultyRegistry;
window.TEMP_DATABASE = TEMP_DATABASE;
window.designationOptions = designationOptions;
window.CLASSIFICATION_SYSTEM = CLASSIFICATION_SYSTEM;
window.workloadDatabase = workloadDatabase;
window.GLOBAL_MAX_LOAD_CAP = GLOBAL_MAX_LOAD_CAP;
