/**
 * Faculty Loading Page Controller Module (Interactive Calendar-Based Design)
 */

let selectedDay = null;
let selectedTime = null;

// Populate global selectors on boot
function initGlobalDropdowns() {
    const programSelect = document.getElementById('load-program-selector');
    const sectionSelect = document.getElementById('load-section-selector');
    const semesterSelect = document.getElementById('load-semester-selector');
    const sySelect = document.getElementById('sy-selector');
    const profSelect = document.getElementById('ld-prof');
    const buildingSelect = document.getElementById('ld-building');

    if (!programSelect || !sectionSelect || !semesterSelect || !sySelect) return;

    // 1. Populate Academic Year
    if (State.db.schoolYears && State.db.schoolYears.length > 0) {
        sySelect.innerHTML = State.db.schoolYears.map(sy => `<option value="${sy}">${sy}</option>`).join('');
    }

    // 2. Populate Program
    const programs = Object.keys(State.db.programs || {});
    if (programs.length > 0) {
        programSelect.innerHTML = programs.map(p => `<option value="${p}">${p}</option>`).join('');
        if (programs.includes(State.activeProgram)) {
            programSelect.value = State.activeProgram;
        } else {
            State.activeProgram = programs[0];
            programSelect.value = State.activeProgram;
        }
    }

    // 3. Populate Section
    updateSectionSelector();

    // 4. Semester defaults to '1'
    semesterSelect.value = '1';

    // 5. Populate Professor dropdown (from facultyRegistry, filtered by program)
    updateProfessorDropdown();
    if (profSelect) {
        profSelect.onchange = () => {
            const selectedProf = facultyRegistry.find(f => f.name === profSelect.value);
            if (selectedProf && selectedProf.active === false) {
                showBanner(`${selectedProf.name} is inactive and cannot be assigned loads.`, 'error');
                const firstActive = facultyRegistry.find(f => f.active !== false);
                if (firstActive) profSelect.value = firstActive.name;
                return;
            }
            updateLoadCategoryDropdown();
            populateModalSubjects();
            updatePreferredHints();
            renderTimetableGrid();
        };
    }

    // 6. Populate Building dropdown
    if (buildingSelect && State.db.buildings && State.db.buildings.length > 0) {
        buildingSelect.innerHTML = State.db.buildings.map(b => `<option value="${b}">${b}</option>`).join('');
        buildingSelect.onchange = updateRoomByBuilding;
    }

    // Initialize rooms, load type, and subjects
    updateRoomByBuilding();
    updateLoadCategoryDropdown();
    populateModalSubjects();
    updatePreferredHints();
}

function updateProfessorDropdown() {
    const profSelect = document.getElementById('ld-prof');
    if (!profSelect) return;

    const activeProgram = State.activeProgram || '';
    const filteredProfs = facultyRegistry.filter(f => {
        if (!f.program) return false;
        const programs = f.program.split(',').map(p => p.trim().toLowerCase());
        return programs.includes(activeProgram.toLowerCase()) || programs.includes('general education');
    }).sort((a, b) => {
        // Active professors first, then alphabetical
        const aActive = a.active !== false;
        const bActive = b.active !== false;
        if (aActive !== bActive) return aActive ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    if (!filteredProfs.length) {
        profSelect.innerHTML = '<option disabled selected>No professors available for this program</option>';
        updateLoadCategoryDropdown();
        populateModalSubjects();
        return;
    }

    profSelect.innerHTML = filteredProfs.map(f => {
        const isGenEd = f.program.toLowerCase().includes('general education');
        const isInactive = f.active === false;
        const label = `${f.name}${isGenEd ? ' (GE)' : ''}${isInactive ? ' (Inactive - Disabled)' : ''}`;
        return `<option value="${f.name}" ${isInactive ? 'disabled class="text-gray-400 bg-gray-100 italic cursor-not-allowed"' : ''}>${label}</option>`;
    }).join('');

    // Ensure the selected professor is active
    const currentVal = profSelect.value;
    const currentSelectedProf = facultyRegistry.find(f => f.name === currentVal);
    if (!currentSelectedProf || currentSelectedProf.active === false) {
        const firstActive = filteredProfs.find(f => f.active !== false);
        if (firstActive) {
            profSelect.value = firstActive.name;
        }
    }
        
    updateLoadCategoryDropdown();
    populateModalSubjects();
}

function updateSectionSelector() {
    const sectionSelect = document.getElementById('load-section-selector');
    if (!sectionSelect) return;

    const program = State.db.programs[State.activeProgram];
    const sections = program?.sections || [];
    sectionSelect.innerHTML = sections.length 
        ? sections.map(sec => `<option value="${sec}">${sec}</option>`).join('')
        : '<option disabled>No sections available</option>';
}

function handleGlobalProgramChange(val) {
    State.activeProgram = val;
    localStorage.setItem('activeProgram', val);
    updateProfessorDropdown();
    updateSectionSelector();
    populateModalSubjects();
    renderTimetableGrid();
    clearFormSelection();
}

// Handler for when active section is selected globally
function handleGlobalSectionChange(val) {
    populateModalSubjects();
    renderTimetableGrid();
    clearFormSelection();
}

// Handler for when semester is changed globally
function handleGlobalSemesterChange(val) {
    populateModalSubjects();
    renderTimetableGrid();
    clearFormSelection();
}

// Handler for when SY is changed globally
function handleGlobalSYChange(val) {
    renderTimetableGrid();
    clearFormSelection();
}

// Filter rooms dropdown based on selected building
function updateRoomByBuilding() {
    const building = document.getElementById('ld-building')?.value;
    const roomSelect = document.getElementById('ld-room');
    if (!roomSelect) return;

    const rooms = (State.db.rooms || []).filter(r => {
        if (typeof r === 'string') {
            return !building || building === 'All';
        }
        return !building || r.building === building;
    });

    const roomNames = rooms.map(r => typeof r === 'string' ? r : r.name);
    roomSelect.innerHTML = roomNames.length
        ? roomNames.map(n => `<option value="${n}">${n}</option>`).join('')
        : '<option disabled>No rooms in this building</option>';
}

// Update load type dropdown based on professor's classification
function updateLoadCategoryDropdown() {
    const profName = document.getElementById('ld-prof')?.value;
    const categorySelect = document.getElementById('ld-category');
    if (!profName || !categorySelect) return;

    const faculty = facultyRegistry.find(f => f.name === profName);
    if (!faculty) return;

    const availableTypes = getAvailableLoadTypes(faculty);
    categorySelect.innerHTML = availableTypes.length > 0 
        ? availableTypes.map(type => `<option>${type}</option>`).join('')
        : '<option disabled>No load types available</option>';
    
    if (availableTypes.length > 0) {
        categorySelect.value = availableTypes[0];
    }
}

function updatePreferredHints() {
    const hint = document.getElementById('preferred-hint');
    if (!hint) return;
    const profName = document.getElementById('ld-prof')?.value;
    const faculty = facultyRegistry.find(f => f.name === profName);
    const summary = getPreferredSummary(faculty);
    if (summary) {
        hint.innerText = summary;
        hint.classList.remove('hidden');
    } else {
        hint.innerText = '';
        hint.classList.add('hidden');
    }
}

function getCurrentSubjectLoadContext() {
    const program = State.db.programs[State.activeProgram];
    const section = document.getElementById('load-section-selector')?.value;
    const semester = document.getElementById('load-semester-selector')?.value || '1';
    const year = document.getElementById('sy-selector')?.value || State.db.schoolYears?.[0];
    const semesterKey = semester === '2' ? '2nd Semester' : semester === '3' ? 'Summer Term' : '1st Semester';
    const yearKey = getYearLevelFromSection(section || '');
    const subjectName = document.getElementById('ld-sub')?.value;
    const subject = program?.subjects?.[yearKey]?.[semesterKey]?.find(item => item.name === subjectName);
    const loads = (State.db.loads || []).filter(load => load.sub === subjectName
        && load.sec === section
        && load.program === State.activeProgram
        && load.sy === year
        && String(load.semester || '1') === String(semester));
    return { subject, loads, semester, section, year };
}

function updateSelectedSubjectHours() {
    const componentSelect = document.getElementById('ld-component-type');
    const hoursInput = document.getElementById('ld-units');
    if (!componentSelect || !hoursInput) return;

    const { subject, loads } = getCurrentSubjectLoadContext();
    if (!subject) return;

    const capacity = getSubjectScheduledComponents(subject, loads, currentLoadEditId);
    const remaining = capacity.remaining;
    const availableByType = {
        Lec: remaining.lec,
        Lab: remaining.lab,
        'Lec/Lab': remaining.lec > 0 && remaining.lab > 0 ? remaining.lec + remaining.lab : 0
    };
    Array.from(componentSelect.options).forEach(option => {
        option.disabled = availableByType[option.value] <= 0;
    });
    if (componentSelect.selectedOptions[0]?.disabled) {
        const nextAvailable = Array.from(componentSelect.options).find(option => !option.disabled);
        if (nextAvailable) componentSelect.value = nextAvailable.value;
    }

    const selectedType = componentSelect.value;
    const availableHours = availableByType[selectedType] || 0;
    hoursInput.max = String(Math.max(1, availableHours));
    hoursInput.value = String(availableHours);
    hoursInput.dataset.componentRemaining = String(availableHours);
}

// Generate rows and overlay scheduled workload block cards
function renderTimetableGrid() {
    const container = document.getElementById('calendar-grid-body');
    if (!container) return;

    const programSelect = document.getElementById('load-program-selector');
    if (programSelect && programSelect.value !== State.activeProgram) {
        programSelect.value = State.activeProgram;
        updateSectionSelector();
    }

    const SLOT_HEIGHT = 40;
    // Exclude 09:00 PM since it is the end of the last slot (starts at 8:30 PM)
    const rowsTimes = TimeStarts.filter(t => t !== '09:00 PM');
    const selectedProfName = document.getElementById('ld-prof')?.value;
    const selectedProfessor = facultyRegistry.find(f => f.name === selectedProfName);

    let gridHtml = '';

    // Render Time slots and Day cells
    rowsTimes.forEach((startStr) => {
        gridHtml += `
            <div class="grid grid-cols-8 border-b border-slate-100 h-10 select-none relative z-10">
                <div class="p-2 border-r border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 text-center w-[80px] flex items-center justify-center sticky left-0 z-20">${startStr}</div>
                ${Days.map(day => {
                    const isPreferred = selectedProfessor && selectedProfessor.preferredTimes && isPreferredCalendarSlot(day, startStr, selectedProfessor.preferredTimes);
                    const preferredClass = isPreferred ? 'bg-amber-100/70 border-amber-300' : '';
                    const title = isPreferred ? 'Preferred time for selected professor' : 'Click to select slot';
                    return `
                        <div onclick="selectCalendarCell('${day}', '${startStr}')" 
                             class="calendar-cell border-r border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center ${preferredClass}"
                             title="${title}">
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    });

    // Draw the scheduled workload cards
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears[0];
    const sem = document.getElementById('load-semester-selector')?.value || '1';
    const sec = document.getElementById('load-section-selector')?.value;
    const program = State.activeProgram;

    if (sec) {
        const matchedLoads = State.db.loads.filter(l => 
            l.sy === sy && 
            l.semester === sem && 
            l.sec === sec && 
            l.program === program
        );

        matchedLoads.forEach(load => {
            const dayIndex = Days.indexOf(load.day);
            if (dayIndex === -1) return;
            
            const target = parseTimeRange(load.time);
            // Calculate slots from 07:00 AM (420 mins)
            const startOffsetSlot = (target.start - 420) / 30;
            const durationSlots = (target.end - target.start) / 30;
            
            const top = startOffsetSlot * SLOT_HEIGHT;
            const height = durationSlots * SLOT_HEIGHT;
            const left = `calc(80px + ${dayIndex * 100 / 7}%)`;
            const width = `calc(100% / 7 - 4px)`;
            
            const isBridging = typeof getSubjectBridgingStatus === 'function'
                ? getSubjectBridgingStatus(load.program || State.activeProgram, load.sub)
                : false;
            const bridgingBadge = isBridging 
                ? '<span class="inline-block bg-orange-100 text-orange-800 border border-orange-300 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1">BRIDGING</span>' 
                : '';
            const cleanSub = String(load.sub || '').replace(/^\[\s*BRIDGING\s*\]\s*/i, '');
            const compHours = Number(load.units) || 0;
            const compType = load.component_type || 'Lec';
            const bldgRoom = typeof formatBuildingRoom === 'function' ? formatBuildingRoom(load) : `${load.building || ''} - ${load.room || ''}`;
            const loadType = load.loadType || 'Regular Load';

            let bgClass = 'bg-slate-50 text-slate-800 border-slate-200';
            if (isBridging) {
                bgClass = 'bg-orange-50 text-orange-950 border-orange-200 hover:bg-orange-100/80';
            } else if (load.loadType === 'Regular Load') {
                bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80';
            } else if (load.loadType === 'Part-Time Load') {
                bgClass = 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/80';
            } else if (load.loadType === 'Temporary Substitute Load') {
                bgClass = 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80';
            }
            
            gridHtml += `
                <div onclick="editSelectedLoad('${load.id}', event)" 
                     class="absolute rounded-xl p-2 border text-left shadow-sm transition-all hover:shadow-md cursor-pointer overflow-hidden z-30 flex flex-col justify-between ${bgClass}"
                     style="top: ${top}px; height: ${height}px; left: ${left}; width: ${width}; margin-left: 2px; margin-top: 1px;">
                    <div>
                        <div class="text-[10px] font-bold leading-tight text-slate-900">${bridgingBadge}${escapeHtml(cleanSub)}</div>
                        <div class="text-[9px] font-semibold text-slate-700 leading-tight mt-0.5">${escapeHtml(loadType)}</div>
                        <div class="text-[9px] text-slate-600 leading-tight mt-0.5">${escapeHtml(load.sec || '')}</div>
                        <div class="text-[9px] text-slate-600 leading-tight mt-0.5"><span class="font-bold text-slate-800">${compHours} hours</span> - <span class="rounded bg-white/80 border border-slate-200 px-1 font-semibold text-[8px] text-slate-700">${escapeHtml(compType)}</span></div>
                        <div class="text-[9px] text-slate-600 font-medium leading-tight mt-0.5 truncate">${escapeHtml(bldgRoom)}</div>
                    </div>
                    <div class="text-[8px] font-bold text-right mt-1 text-slate-700">${escapeHtml(load.time || '')}</div>
                </div>
            `;
        });
    }

    container.innerHTML = gridHtml;
}

// User selects calendar cell
function selectCalendarCell(day, startStr) {
    selectedDay = day;
    selectedTime = startStr;
    currentLoadEditId = null;

    document.getElementById('form-selected-slot-display').innerText = `${day} @ ${startStr}`;
    document.getElementById('panel-form-title').innerText = 'Assign Workload';
    document.getElementById('save-load-button').innerText = 'Apply Load';
    
    // Reset inputs
    document.getElementById('ld-units').value = 3;
    const componentSelect = document.getElementById('ld-component-type');
    if (componentSelect) componentSelect.value = 'Lec';
    
    // Hide edit actions
    document.getElementById('form-edit-actions').classList.add('hidden');
    const newDelBtn = document.getElementById('delete-load-button');
    if (newDelBtn) newDelBtn.classList.add('hidden');
    
    // Update category & subjects
    updateLoadCategoryDropdown();
    populateModalSubjects();
}

// User clicks a card to edit it
function editSelectedLoad(id, event) {
    if (event) event.stopPropagation();

    const load = State.db.loads.find(l => String(l.id) === String(id));
    if (!load) return;

    currentLoadEditId = id;
    selectedDay = load.day;
    selectedTime = load.time.split(' - ')[0];

    document.getElementById('form-selected-slot-display').innerText = `${load.day} @ ${selectedTime}`;
    document.getElementById('panel-form-title').innerText = 'Edit Workload';
    document.getElementById('save-load-button').innerText = 'Update Load';

    // Populate fields
    document.getElementById('ld-prof').value = load.prof;
    updateLoadCategoryDropdown();
    document.getElementById('ld-category').value = load.loadType;
    
    populateModalSubjects();
    document.getElementById('ld-sub').value = load.sub;
    const componentSelect = document.getElementById('ld-component-type');
    if (componentSelect) componentSelect.value = load.component_type || 'Lec';
    updateSelectedSubjectHours();
    
    document.getElementById('ld-building').value = load.building;
    updateRoomByBuilding();
    document.getElementById('ld-room').value = load.room;
    document.getElementById('ld-units').value = load.units || 3;

    // Show edit action buttons
    document.getElementById('form-edit-actions').classList.remove('hidden');
    const newDelBtn = document.getElementById('delete-load-button');
    if (newDelBtn) newDelBtn.classList.remove('hidden');
}

// Clear selected slot and form values
function clearFormSelection() {
    selectedDay = null;
    selectedTime = null;
    currentLoadEditId = null;

    document.getElementById('form-selected-slot-display').innerText = 'Please click a slot on calendar';
    document.getElementById('panel-form-title').innerText = 'Assign Workload';
    document.getElementById('save-load-button').innerText = 'Apply Load';
    document.getElementById('ld-units').value = 3;
    const componentSelect = document.getElementById('ld-component-type');
    if (componentSelect) componentSelect.value = 'Lec';

    // Hide edit actions
    document.getElementById('form-edit-actions').classList.add('hidden');
    const newDelBtn = document.getElementById('delete-load-button');
    if (newDelBtn) newDelBtn.classList.add('hidden');
}

// Delete Selected load from form
async function deleteSelectedLoad() {
    if (!currentLoadEditId) return;
    
    const load = State.db.loads.find(l => String(l.id) === String(currentLoadEditId));
    if (!load) return;

    if (!confirm(`Delete workload: ${load.sub} for ${load.prof}?`)) return;

    try {
        await deleteLoadFromAPI(load.id);
        State.db.loads = State.db.loads.filter(l => String(l.id) !== String(currentLoadEditId));
        await persistState();
        renderPageSections();
        clearFormSelection();
        showBanner('Workload deleted successfully!', 'success');
    } catch (error) {
        showBanner('Could not remove the workload from the database.', 'error');
    }
}

// Save Workload
async function saveLoad() {
    if (!selectedDay || !selectedTime) {
        showBanner('Please select a slot on the calendar grid first.', 'error');
        return;
    }

    const prof = document.getElementById('ld-prof')?.value;
    const sub = document.getElementById('ld-sub')?.value;
    const componentType = document.getElementById('ld-component-type')?.value;
    const loadCategory = document.getElementById('ld-category')?.value;
    const building = document.getElementById('ld-building')?.value;
    const room = document.getElementById('ld-room')?.value;
    const units = Math.max(1, Math.floor(Number(document.getElementById('ld-units')?.value || 3)));
    
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears[0];
    const semester = document.getElementById('load-semester-selector')?.value || '1';
    const section = document.getElementById('load-section-selector')?.value;

    if (!prof || !sub || !componentType || !loadCategory || !building || !room || !section) {
        showBanner('Please fill out all assignment fields.', 'error');
        return;
    }

    const faculty = facultyRegistry.find(f => f.name === prof || String(f.id) === String(prof));
    if (faculty && faculty.active === false) {
        showBanner(`Cannot assign load: ${faculty.name} is currently inactive and cannot be scheduled.`, 'error');
        return;
    }

    // Calculate time range
    const startMinutes = parseTimeStr(selectedTime);
    const endMinutes = startMinutes + units * 60;
    
    if (endMinutes > 1440) {
        showBanner('Workload extends past midnight!', 'error');
        return;
    }

    const timeRangeStr = `${selectedTime} - ${formatTime(endMinutes)}`;

    const { subject: subjectData, loads: subjectLoads } = getCurrentSubjectLoadContext();
    if (!subjectData) {
        showBanner(`Subject details for ${sub} were not found.`, 'error');
        return;
    }
    const subjectHours = getSubjectHourParts(subjectData);
    const capacity = getSubjectScheduledComponents(subjectData, subjectLoads, currentLoadEditId);
    const showComponentError = (title, message) => {
        if (typeof showErrorModal === 'function') showErrorModal(title, message);
        else showBanner(message, 'error');
    };
    if (componentType === 'Lec' && units > capacity.remaining.lec) {
        showComponentError('Lecture Hours Limit Reached', `Lecture hours limit reached (${capacity.scheduled.lec}/${subjectHours.lec} hrs completed). Only ${capacity.remaining.lec} lecture hours remain.`);
        return;
    }
    if (componentType === 'Lab' && units > capacity.remaining.lab) {
        showComponentError('Laboratory Hours Limit Reached', `Laboratory hours limit reached (${capacity.scheduled.lab}/${subjectHours.lab} hrs completed). Only ${capacity.remaining.lab} laboratory hours remain.`);
        return;
    }
    if (componentType === 'Lec/Lab') {
        if (capacity.remaining.lec <= 0 || capacity.remaining.lab <= 0) {
            showComponentError('Combined Hours Not Available', `A combined Lec/Lab block requires remaining lecture and laboratory hours (${capacity.remaining.lec} Lec, ${capacity.remaining.lab} Lab remain).`);
            return;
        }
        const combinedRemaining = capacity.remaining.lec + capacity.remaining.lab;
        if (units !== combinedRemaining) {
            showComponentError('Combined Hours Must Match', `A Lec/Lab block must schedule all remaining components together: ${capacity.remaining.lec} Lec + ${capacity.remaining.lab} Lab = ${combinedRemaining} hours.`);
            return;
        }
    }

    // Validate limit checks
    const validation = canAssignLoad(prof, loadCategory, units, sy, semester, currentLoadEditId);
    if (!validation.allowed) {
        if (typeof showErrorModal === 'function') {
            showErrorModal('Load Limit Exceeded', validation.reason);
        } else {
            showBanner(`Cannot assign load: ${validation.reason}`, 'error');
        }
        return;
    }

    // Conflict detection
    const proposed = { start: startMinutes, end: endMinutes };
    const conflict = State.db.loads.find(l => {
        if (String(l.id) === String(currentLoadEditId)) return false;
        if (l.sy !== sy || l.semester !== semester) return false;
        if (l.day !== selectedDay) return false;

        const other = parseTimeRange(l.time);
        if (!rangesOverlap(proposed, other)) return false;

        // Check if same prof, room, or section
        if (l.prof === prof) return true;
        if (l.room === room) return true;
        if (l.sec === section) return true;
        
        return false;
    });

    if (conflict) {
        let reason = 'Schedule conflict detected!';
        if (conflict.prof === prof) reason = `Conflict: ${prof} is already scheduled at this time!`;
        else if (conflict.room === room) reason = `Conflict: Room ${room} is already booked at this time!`;
        else if (conflict.sec === section) reason = `Conflict: Section ${section} is already scheduled at this time!`;
        
        showBanner(reason, 'error');
        return;
    }

    const load = {
        id: currentLoadEditId || Date.now(),
        prof,
        sub,
        units,
        component_type: componentType,
        loadType: loadCategory,
        sec: section,
        room,
        building,
        day: selectedDay,
        time: timeRangeStr,
        sy,
        semester,
        program: State.activeProgram
    };

    if (currentLoadEditId) {
        const index = State.db.loads.findIndex(l => String(l.id) === String(currentLoadEditId));
        if (index !== -1) {
            State.db.loads[index] = load;
        } else {
            State.db.loads.push(load);
        }
    } else {
        State.db.loads.push(load);
    }

    try {
        await persistLoadToAPI(load);
        await persistState();
        renderPageSections();
        clearFormSelection();
        showBanner('Workload assigned successfully!', 'success');
    } catch (error) {
        showBanner('Could not save the workload to the database.', 'error');
    }
}

// Bind load table rendering wrapper to our calendar renderer
function renderLoadTable() {
    renderTimetableGrid();
}

// Initialize everything on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    // 1. Bind change event listeners programmatically
    const programSelect = document.getElementById('load-program-selector');
    if (programSelect) {
        programSelect.onchange = (e) => handleGlobalProgramChange(e.target.value);
    }

    const sectionSelect = document.getElementById('load-section-selector');
    if (sectionSelect) {
        sectionSelect.onchange = (e) => handleGlobalSectionChange(e.target.value);
    }

    const semesterSelect = document.getElementById('load-semester-selector');
    if (semesterSelect) {
        semesterSelect.onchange = (e) => handleGlobalSemesterChange(e.target.value);
    }

    const sySelect = document.getElementById('sy-selector');
    if (sySelect) {
        sySelect.onchange = (e) => handleGlobalSYChange(e.target.value);
    }

    const buildingSelect = document.getElementById('ld-building');
    if (buildingSelect) {
        buildingSelect.onchange = updateRoomByBuilding;
    }

    // 2. Initialize dropdowns and render grid once database has loaded
    function runInitialization() {
        initGlobalDropdowns();
        renderTimetableGrid();
    }

    if (window.State && window.State.isLoaded) {
        runInitialization();
    } else {
        document.addEventListener('appStateLoaded', runInitialization);
    }

    // 3. React to faculty active/inactive status changes across tabs/modules
    window.addEventListener('facultyStatusChanged', () => {
        updateProfessorDropdown();
        renderTimetableGrid();
    });
});