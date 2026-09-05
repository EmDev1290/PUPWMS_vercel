/**
 * Room Management Page Controller
 */

let currentEditingRoomId = null;

// Initialize page on load
document.addEventListener('DOMContentLoaded', function() {
    function init() {
        renderRoomsByBuilding();
        renderActiveProgramButtons();
    }
    if (window.State && window.State.isLoaded) {
        init();
    } else {
        document.addEventListener('appStateLoaded', init);
    }
});

function renderRoomsByBuilding() {
    const newBuildingContainer = document.getElementById('new-building-rooms');
    const oldBuildingContainer = document.getElementById('old-building-rooms');
    const newBuildingCount = document.getElementById('new-building-count');
    const oldBuildingCount = document.getElementById('old-building-count');

    if (!newBuildingContainer || !oldBuildingContainer) return;

    const newBuildingRooms = State.db.rooms.filter(r => r.building === 'New Building');
    const mainBuildingRooms = State.db.rooms.filter(r => r.building === 'Main Building');

    // Render New Building rooms
    newBuildingContainer.innerHTML = newBuildingRooms.length > 0
        ? newBuildingRooms.map((room, idx) => `
            <div class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                <div class="flex items-center gap-3">
                    <i data-lucide="door-open" class="w-4 h-4 text-blue-600"></i>
                    <span class="text-sm font-semibold text-gray-900">${room.name}</span>
                </div>
                <button onclick="deleteRoom('New Building', ${idx})" class="text-red-600 hover:text-red-800 text-xs font-bold tracking-wider">DELETE</button>
            </div>
        `).join('')
        : '<div class="text-gray-500 italic text-sm p-3">No rooms added yet.</div>';

    newBuildingCount.textContent = `${newBuildingRooms.length} room${newBuildingRooms.length !== 1 ? 's' : ''}`;

    // Render Old Building rooms
    oldBuildingContainer.innerHTML = mainBuildingRooms.length > 0
        ? mainBuildingRooms.map((room, idx) => `
            <div class="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <div class="flex items-center gap-3">
                    <i data-lucide="door-open" class="w-4 h-4 text-amber-600"></i>
                    <span class="text-sm font-semibold text-gray-900">${room.name}</span>
                </div>
                <button onclick="deleteRoom('Main Building', ${idx})" class="text-red-600 hover:text-red-800 text-xs font-bold tracking-wider">DELETE</button>
            </div>
        `).join('')
        : '<div class="text-gray-500 italic text-sm p-3">No rooms added yet.</div>';

    oldBuildingCount.textContent = `${mainBuildingRooms.length} room${mainBuildingRooms.length !== 1 ? 's' : ''}`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openAddRoomModal() {
    document.getElementById('modal-room-title').textContent = 'Add Room';
    document.getElementById('room-name').value = '';
    document.getElementById('room-building').value = 'Main Building';
    document.getElementById('modal-room').classList.remove('hidden');
    document.getElementById('modal-room').classList.add('flex'); // ✅ Added to center modal
    document.getElementById('room-name').focus();
}

function closeRoomModal() {
    document.getElementById('modal-room').classList.add('hidden');
    document.getElementById('modal-room').classList.remove('flex'); // ✅ Removes flex formatting cleanly
    document.getElementById('room-name').value = '';
    currentEditingRoomId = null;
}

function saveRoom() {
    const roomName = document.getElementById('room-name')?.value.trim();
    const building = document.getElementById('room-building')?.value;

    if (!roomName) {
        showBanner('Please enter a room name.', 'error');
        return;
    }

    if (!building) {
        showBanner('Please select a building.', 'error');
        return;
    }

    // Check for duplicates
    const exists = State.db.rooms.some(r => r.name === roomName && r.building === building);
    if (exists) {
        showBanner(`Room "${roomName}" already exists in ${building}.`, 'error');
        return;
    }

    // Add room
    State.db.rooms.push({
        name: roomName,
        building: building
    });

    persistState();
    closeRoomModal();
    renderRoomsByBuilding();
    showBanner(`Room "${roomName}" added to ${building}!`, 'success');
}

function deleteRoom(building, index) {
    const roomsInBuilding = State.db.rooms.filter(r => r.building === building);
    if (index < 0 || index >= roomsInBuilding.length) return;

    const roomToDelete = roomsInBuilding[index];
    const confirmation = confirm(`Delete room "${roomToDelete.name}" from ${building}?`);
    if (!confirmation) return;

    // Remove from State.db.rooms
    State.db.rooms = State.db.rooms.filter(r => !(r.name === roomToDelete.name && r.building === building));

    persistState();
    renderRoomsByBuilding();
    showBanner(`Room "${roomToDelete.name}" deleted!`, 'success');
}