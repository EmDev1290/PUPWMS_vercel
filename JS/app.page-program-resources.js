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

    const input = document.getElementById('new-sy-input');
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addNewSy();
            }
        });
    }
});

function populateSyDropdown() {
    const sel = document.getElementById('active-sy-dropdown');
    if (sel && State.db.schoolYears) {
        sel.innerHTML = State.db.schoolYears.map(sy => `<option value="${sy}">${sy}</option>`).join('');
        const active = localStorage.getItem('activeAcademicYear') || State.db.schoolYears[0];
        if (active && State.db.schoolYears.includes(active)) {
            sel.value = active;
        } else if (State.db.schoolYears.length > 0) {
            sel.value = State.db.schoolYears[0];
        }
    }
}

function applyAcademicYearChange(updatedSchoolYears, activeYear, message, messageType = 'success') {
    State.db.schoolYears = updatedSchoolYears;
    if (activeYear) {
        localStorage.setItem('activeAcademicYear', activeYear);
    }
    populateSyDropdown();

    if (typeof persistState === 'function') {
        persistState();
    }

    // Persist active school year in settings table if available
    if (typeof apiFetch === 'function' && activeYear) {
        apiFetch('/api/settings', {
            method: 'PATCH',
            body: JSON.stringify({ active_academic_year: activeYear })
        }).catch(() => {});
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
    if (!val || !State.db.schoolYears || !State.db.schoolYears.includes(val)) return;

    const reorderedYears = [val, ...State.db.schoolYears.filter(sy => sy !== val)];
    applyAcademicYearChange(reorderedYears, val, `Active Academic Year set to ${val}`);
    renderSyListInModal();
}

function renderSyListInModal() {
    const list = document.getElementById('sy-list-display');
    if (!list || !State.db.schoolYears) return;

    if (State.db.schoolYears.length === 0) {
        list.innerHTML = '<li class="py-2 text-center text-xs text-slate-400">No Academic Years found.</li>';
        return;
    }

    list.innerHTML = State.db.schoolYears.map((sy, idx) => {
        const isActive = idx === 0;
        return `
            <li class="py-1.5 px-2 flex items-center justify-between hover:bg-slate-100 rounded-lg transition-colors">
                <span class="font-medium text-slate-800 flex items-center text-xs">
                    ${sy}
                    ${isActive ? '<span class="ml-2 text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">ACTIVE</span>' : ''}
                </span>
                <div class="flex items-center gap-1.5">
                    ${!isActive ? `<button type="button" onclick="setActiveAcademicYear('${sy}')" class="text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">Set Active</button>` : ''}
                    <button type="button" onclick="deleteSy('${sy}')" class="text-xs text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" title="Delete Academic Year">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </li>
        `;
    }).join('');

    if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

function openAddSyModal() {
    const modal = document.getElementById('modal-manage-sy');
    const input = document.getElementById('new-sy-input');

    renderSyListInModal();

    if (input) input.value = '';

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.transform').classList.remove('scale-95');
            if (input) input.focus();
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

async function addNewSy() {
    const input = document.getElementById('new-sy-input');
    const addBtn = document.querySelector('#modal-manage-sy button[onclick="addNewSy()"]');
    if (!input || !input.value.trim()) {
        if (typeof showBanner === 'function') showBanner('Please enter a valid Academic Year', 'error');
        return;
    }

    const newSy = input.value.trim();
    if (!State.db.schoolYears) {
        State.db.schoolYears = [];
    }

    if (State.db.schoolYears.includes(newSy)) {
        if (typeof showBanner === 'function') showBanner('This Academic Year already exists!', 'error');
        return;
    }

    const originalBtnText = addBtn ? addBtn.innerText : '';
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.innerText = 'Saving...';
    }

    try {
        // Persist to database via API
        if (typeof apiFetch === 'function') {
            await apiFetch('/api/school-years', {
                method: 'POST',
                body: JSON.stringify({ name: newSy })
            });
        } else {
            const userStr = sessionStorage.getItem('loggedInUser');
            let token = null;
            if (userStr) {
                try { token = JSON.parse(userStr).token; } catch (e) {}
            }
            const res = await fetch('/api/school-years', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ name: newSy })
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || body.message || `HTTP error ${res.status}`);
            }
        }

        const updatedYears = [newSy, ...State.db.schoolYears.filter(sy => sy !== newSy)];
        applyAcademicYearChange(updatedYears, newSy, `Academic Year "${newSy}" added and saved successfully!`);
        input.value = '';
        closeAddSyModal();
    } catch (err) {
        console.error('Failed to save Academic Year to database:', err);
        if (typeof showBanner === 'function') {
            showBanner(`Failed to save Academic Year: ${err.message}`, 'error');
        } else {
            alert(`Failed to save Academic Year: ${err.message}`);
        }
    } finally {
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerText = originalBtnText;
        }
    }
}

async function deleteSy(sy) {
    if (!sy) return;
    if (State.db.schoolYears && State.db.schoolYears.length <= 1) {
        if (typeof showBanner === 'function') {
            showBanner('Cannot delete the only remaining Academic Year.', 'warning');
        } else {
            alert('Cannot delete the only remaining Academic Year.');
        }
        return;
    }

    if (!confirm(`Are you sure you want to delete "${sy}"?`)) {
        return;
    }

    try {
        if (typeof apiFetch === 'function') {
            await apiFetch(`/api/school-years/${encodeURIComponent(sy)}`, {
                method: 'DELETE'
            });
        } else {
            const userStr = sessionStorage.getItem('loggedInUser');
            let token = null;
            if (userStr) {
                try { token = JSON.parse(userStr).token; } catch (e) {}
            }
            const res = await fetch(`/api/school-years/${encodeURIComponent(sy)}`, {
                method: 'DELETE',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || body.message || `HTTP error ${res.status}`);
            }
        }

        const updatedYears = State.db.schoolYears.filter(item => item !== sy);
        const newActive = updatedYears[0] || '';
        applyAcademicYearChange(updatedYears, newActive, `Academic Year "${sy}" deleted successfully.`);
        renderSyListInModal();
    } catch (err) {
        console.error('Failed to delete Academic Year:', err);
        if (typeof showBanner === 'function') {
            showBanner(`Failed to delete Academic Year: ${err.message}`, 'error');
        } else {
            alert(`Failed to delete Academic Year: ${err.message}`);
        }
    }
}

