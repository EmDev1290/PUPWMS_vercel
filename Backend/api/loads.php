<?php
require __DIR__ . '/common.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $rows = db()->query('SELECT * FROM loads ORDER BY id')->fetchAll();
        jsonOut(array_map(fn ($row) => normalizeLoadRow($row), $rows));
    }

    if ($method === 'POST') {
        requireAuth();
        $data = readJsonBody();

        $id = (int)($data['id'] ?? 0);
        $prof = trim((string)($data['prof'] ?? ''));
        $sub = trim((string)($data['sub'] ?? ''));
        $componentType = (string)($data['component_type'] ?? 'Lec');

        if ($id <= 0 || $prof === '' || $sub === '' || !in_array($componentType, ['Lec', 'Lab', 'Lec/Lab'], true)) {
            jsonOut(['success' => false, 'error' => 'Missing required load fields'], 400);
        }

        $sql = 'INSERT INTO loads (
            id, prof, sub, units, component_type, load_type, sec, room, building, day, time, sy, program, semester
        ) VALUES (
            :id, :prof, :sub, :units, :component_type, :load_type, :sec, :room, :building, :day, :time, :sy, :program, :semester
        ) ON DUPLICATE KEY UPDATE
            prof = VALUES(prof),
            sub = VALUES(sub),
            units = VALUES(units),
            component_type = VALUES(component_type),
            load_type = VALUES(load_type),
            sec = VALUES(sec),
            room = VALUES(room),
            building = VALUES(building),
            day = VALUES(day),
            time = VALUES(time),
            sy = VALUES(sy),
            program = VALUES(program),
            semester = VALUES(semester)';

        $statement = db()->prepare($sql);
        $statement->execute([
            ':id' => $id,
            ':prof' => $prof,
            ':sub' => $sub,
            ':units' => (int)($data['units'] ?? 0),
            ':component_type' => $componentType,
            ':load_type' => $data['loadType'] ?? '',
            ':sec' => $data['sec'] ?? '',
            ':room' => $data['room'] ?? '',
            ':building' => $data['building'] ?? '',
            ':day' => $data['day'] ?? '',
            ':time' => $data['time'] ?? '',
            ':sy' => $data['sy'] ?? '',
            ':program' => $data['program'] ?? '',
            ':semester' => $data['semester'] ?? '1',
        ]);

        jsonOut(['success' => true]);
    }

    if ($method === 'DELETE') {
        requireAuth();
        $requestUri = $_SERVER['REQUEST_URI'] ?? '/';
        $parts = explode('/', trim($requestUri, '/'));
        $id = (int)end($parts);

        if ($id <= 0) {
            jsonOut(['success' => false, 'error' => 'Load id is required'], 400);
        }

        $statement = db()->prepare('DELETE FROM loads WHERE id = :id');
        $statement->execute([':id' => $id]);

        jsonOut(['success' => true, 'deletedId' => $id]);
    }

    jsonOut(['success' => false, 'error' => 'Unsupported method'], 405);
} catch (Throwable $e) {
    jsonOut(['success' => false, 'error' => $e->getMessage()], 500);
}
