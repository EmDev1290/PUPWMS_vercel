// Shared application state and mock database definitions
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
        classificationRank: "campus_director",
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
        schoolYears: ['A.Y. 2024-2025', 'A.Y. 2025-2026', 'A.Y. 2026-2027'],
        buildings: ['Main Building', 'New Building'],
        rooms: [
            { name: 'Room A101', building: 'Main Building' },
            { name: 'Room A102', building: 'Main Building' },
            { name: 'Lab A', building: 'Main Building' },
            { name: 'Audio Visual Room', building: 'Main Building' },
            { name: 'Room B201', building: 'New Building' },
            { name: 'Room B202', building: 'New Building' },
            { name: 'Lab B', building: 'New Building' }
        ],
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
                program: 'Information Technology',
                loadType: 'Regular Load',
                sec: 'BSIT 3-1',
                room: 'Room A101',
                day: 'Monday',
                time: '08:00 AM - 11:00 AM',
                building: 'Main Building'
            }
        ]
    }
};

window.State = State;
window.facultyRegistry = facultyRegistry;
window.TEMP_DATABASE = TEMP_DATABASE;
window.designationOptions = designationOptions;
window.CLASSIFICATION_SYSTEM = CLASSIFICATION_SYSTEM;
window.workloadDatabase = workloadDatabase;
window.GLOBAL_MAX_LOAD_CAP = GLOBAL_MAX_LOAD_CAP;
