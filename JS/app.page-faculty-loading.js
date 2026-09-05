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
    }).sort((a, b) => a.name.localeCompare(b.name));

    profSelect.innerHTML = filteredProfs.length 
        ? filteredProfs.map(f => {
            const isGenEd = f.program.toLowerCase().includes('general education');
            const label = isGenEd ? `${f.name} (GE)` : f.name;
            return `<option value="${f.name}">${label}</option>`;
        }).join('')
        : '<option disabled>No professors available for this program</option>';
        
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
            
            let bgClass = 'bg-slate-50 text-slate-800 border-slate-200';
            if (load.loadType === 'Regular Load') {
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
                        <div class="text-[10px] font-bold leading-tight text-slate-900">${load.sub}</div>
                        <div class="text-[9px] font-medium opacity-90 mt-0.5 text-slate-700 truncate">${load.prof}</div>
                        <div class="text-[9px] font-semibold opacity-75 mt-1 text-slate-600 truncate">📍 ${load.room}</div>
                    </div>
                    <div class="text-[8px] font-bold opacity-60 text-right mt-1 text-slate-500">${load.time}</div>
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
        renderTimetableGrid();
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
    const loadCategory = document.getElementById('ld-category')?.value;
    const building = document.getElementById('ld-building')?.value;
    const room = document.getElementById('ld-room')?.value;
    const units = Math.max(1, Math.floor(Number(document.getElementById('ld-units')?.value || 3)));
    
    const sy = document.getElementById('sy-selector')?.value || State.db.schoolYears[0];
    const semester = document.getElementById('load-semester-selector')?.value || '1';
    const section = document.getElementById('load-section-selector')?.value;

    if (!prof || !sub || !loadCategory || !building || !room || !section) {
        showBanner('Please fill out all assignment fields.', 'error');
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

    // Subject Unit Validation
    const yearKey = getYearLevelFromSection(section || '');
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
                    l.sec === section && 
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
        renderTimetableGrid();
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
});