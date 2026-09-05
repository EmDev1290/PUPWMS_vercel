// Faculty-related business logic helpers
function getTitleLabel(f) {
    if (!f) return 'PROFESSOR';
    const empType = (f.employmentType || '').toUpperCase();
    const designation = (f.baseDesignation || '').toUpperCase();
    if (empType.includes('PART-TIME') || empType.includes('PARTTIME')) {
        return 'PROFESSOR';
    }
    if (designation.includes('UNIVERSITY PROFESSOR') || designation.includes('UNIV. PROF')) return 'UNIV. PROF';
    if (designation.includes('ASSOCIATE PROFESSOR') || designation.includes('ASSC. PROF')) return 'ASSC. PROF';
    if (designation.includes('ASSISTANT PROFESSOR') || designation.includes('ASST. PROF')) return 'ASST. PROF';
    if (designation.includes('PROFESSOR') || designation.includes('PROF')) return 'PROF';
    if (designation.includes('INSTRUCTOR')) return 'INSTRUCTOR';
    return 'INSTRUCTOR';
}

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
    return Object.keys(CLASSIFICATION_SYSTEM[faculty.classification]?.loadLimits || {});
}

function getClassificationRankLabel(classification, rank) {
    const config = CLASSIFICATION_SYSTEM[classification];
    if (!config || !config.ranks) return rank;
    const rankObj = config.ranks.find(r => r.value === rank);
    return rankObj ? rankObj.label : rank;
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
