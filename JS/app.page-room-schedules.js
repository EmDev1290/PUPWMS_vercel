
// Update room dropdown based on selected building
function updateRoomSelectFromBuilding() {
    const buildingSelect = document.getElementById('view-building-select');
    const roomSelect = document.getElementById('view-room-select');
    if (!buildingSelect || !roomSelect) return;

    const selectedBuilding = buildingSelect.value;
    const rooms = selectedBuilding && selectedBuilding !== 'All'
        ? getRoomsByBuilding(selectedBuilding)
        : getAllRoomNames();

    roomSelect.innerHTML = rooms.length > 0
        ? rooms.map(name => `<option value="${name}">${name}</option>`).join('')
        : '<option disabled>No rooms in this building</option>';
    renderRoomSchedulePreview();
}

// Page-specific initialization for the room schedules page.
document.addEventListener('DOMContentLoaded', function () {
    function init() {
        renderSYDropdown();
        updateRoomSelectFromBuilding();
        renderRoomSchedulePreview();
    }
    if (window.State && window.State.isLoaded) {
        init();
    } else {
        document.addEventListener('appStateLoaded', init);
    }

    window.addEventListener('facultyStatusChanged', () => {
        renderRoomSchedulePreview();
    });
});

function renderRoomDropdownForSchedules() {
    const selector = document.getElementById('view-room-select');
    if (!selector) return;
    
    const rooms = State.db.rooms || [];
    selector.innerHTML = rooms.length > 0
        ? rooms.map(r => `<option value="${r.name || r}">${r.name || r}</option>`).join('')
        : '<option disabled>No rooms available</option>';
}