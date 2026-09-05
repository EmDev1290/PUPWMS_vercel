document.addEventListener('DOMContentLoaded', function () {
    if (window.State && window.State.isLoaded) {
        renderProgramResources();
        populateSyDropdown();
    } else {
        document.addEventListener('appStateLoaded', () => {
            renderProgramResources();
            populateSyDropdown();
        });
    }
});

function populateSyDropdown() {
    const sel = document.getElementById('active-sy-dropdown');
    if (sel && State.db.schoolYears) {
        sel.innerHTML = State.db.schoolYears.map(sy => `<option value="${sy}">${sy}</option>`).join('');
        if (State.db.schoolYears.length > 0) {
            sel.value = State.db.schoolYears[0];
        }
    }
}

function applyAcademicYearChange(updatedSchoolYears, activeYear, message, messageType = 'success') {
    State.db.schoolYears = updatedSchoolYears;
    populateSyDropdown();

    if (typeof persistState === 'function') {
        persistState();
    }

    document.dispatchEvent(new CustomEvent('academicYearChanged', {
        detail: {
            value: activeYear,
            schoolYears: State.db.schoolYears
        }
    }));

    if (typeof renderDashboard === 'function') {
        renderDashboard();
    }

    if (message && typeof showBanner === 'function') {
        showBanner(message, messageType);
    }
}

function setActiveAcademicYear(val) {
    if (!val || !State.db.schoolYears.includes(val)) return;

    const reorderedYears = [val, ...State.db.schoolYears.filter(sy => sy !== val)];
    applyAcademicYearChange(reorderedYears, val, `Active Academic Year set to ${val}`);
}

function openAddSyModal() {
    const modal = document.getElementById('modal-manage-sy');
    const list = document.getElementById('sy-list-display');
    const input = document.getElementById('new-sy-input');
    
    if (list) {
        list.innerHTML = State.db.schoolYears.map((sy, idx) => 
            `<li class="py-1 flex items-center justify-between">
                <span>${sy} ${idx === 0 ? '<span class="ml-2 text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">ACTIVE</span>' : ''}</span>
            </li>`
        ).join('');
    }
    
    if (input) input.value = '';
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.transform').classList.remove('scale-95');
        }, 10);
    }
}

function closeAddSyModal() {
    const modal = document.getElementById('modal-manage-sy');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.transform').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        }, 300);
    }
}

function addNewSy() {
    const input = document.getElementById('new-sy-input');
    if (!input || !input.value.trim()) {
        if (typeof showBanner === 'function') showBanner('Please enter a valid Academic Year', 'error');
        return;
    }
    
    const newSy = input.value.trim();
    if (State.db.schoolYears.includes(newSy)) {
        if (typeof showBanner === 'function') showBanner('This Academic Year already exists!', 'error');
        return;
    }
    
    const updatedYears = [newSy, ...State.db.schoolYears.filter(sy => sy !== newSy)];
    applyAcademicYearChange(updatedYears, newSy, 'Academic Year added successfully!');

    closeAddSyModal();
}
