// General utility helpers used by multiple app modules
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

function parseTimeStr(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

function formatTime(minutes) {
    const period = minutes >= 720 ? 'PM' : 'AM';
    let h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) h = 12;
    if (h > 12) h -= 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

function getTimeRange(start, units) {
    const startMinutes = parseTimeStr(start);
    const endMinutes = startMinutes + units * 60;
    return `${start} - ${formatTime(endMinutes)}`;
}

function parseTimeRange(range) {
    return {
        start: parseTimeStr(`${range.split(' - ')[0]}`),
        end: parseTimeStr(`${range.split(' - ')[1]}`)
    };
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
    if (!building) return [];
    // Handle both old format (string array) and new format (object array)
    return State.db.rooms.filter(room => {
        if (typeof room === 'string') {
            return true; // Fallback for legacy format
        }
        return room.building === building;
    }).map(room => typeof room === 'string' ? room : room.name);
}

function getAllRoomNames() {
    return State.db.rooms.map(room => typeof room === 'string' ? room : room.name);
}
