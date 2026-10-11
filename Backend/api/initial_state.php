<?php
require __DIR__ . '/common.php';

try {
    $pdo = db();

    $roomRows = $pdo->query('SELECT name, building FROM rooms ORDER BY name')->fetchAll();
    $facultyRows = $pdo->query('SELECT * FROM faculty ORDER BY name')->fetchAll();
    $schoolYearRows = $pdo->query('SELECT name FROM school_years ORDER BY name')->fetchAll();
    $programRows = $pdo->query('SELECT name FROM programs ORDER BY name')->fetchAll();
    $sectionRows = $pdo->query('SELECT program_name, section_name FROM program_sections ORDER BY program_name, section_name')->fetchAll();
    try {
        $subjectRows = $pdo->query('SELECT program_name, year_level, semester, subject_name, lec_units, lab_units, units FROM program_subjects ORDER BY program_name, year_level, semester, subject_name')->fetchAll();
    } catch (PDOException $error) {
        $subjectRows = $pdo->query('SELECT program_name, year_level, semester, subject_name, units FROM program_subjects ORDER BY program_name, year_level, semester, subject_name')->fetchAll();
        foreach ($subjectRows as &$subjectRow) {
            $subjectRow['lec_units'] = $subjectRow['units'];
            $subjectRow['lab_units'] = 0;
        }
        unset($subjectRow);
    }
    $loadRows = $pdo->query('SELECT * FROM loads ORDER BY id')->fetchAll();

    $facultyRegistry = array_map(fn ($row) => normalizeFacultyRow($row), $facultyRows);

    $schoolYears = array_map(fn ($row) => $row['name'], $schoolYearRows);
    $rooms = array_map(fn ($row) => ['name' => $row['name'], 'building' => $row['building']], $roomRows);
    $buildings = array_values(array_unique(array_map(fn ($row) => $row['building'], $roomRows)));

    $programs = [];
    foreach ($programRows as $programRow) {
        $programName = $programRow['name'];
        $sections = array_values(array_map(
            fn ($section) => $section['section_name'],
            array_values(array_filter($sectionRows, fn ($section) => $section['program_name'] === $programName))
        ));

        $profs = array_values(array_map(
            fn ($faculty) => $faculty['name'],
            array_values(array_filter($facultyRows, function ($faculty) use ($programName) {
                if (empty($faculty['program'])) {
                    return false;
                }

                $programsList = array_map('trim', explode(',', $faculty['program']));
                return in_array($programName, $programsList, true);
            }))
        ));

        $subjects = [];
        foreach ($subjectRows as $subject) {
            if ($subject['program_name'] !== $programName) {
                continue;
            }

            $year = $subject['year_level'];
            $semester = $subject['semester'];
            if (!isset($subjects[$year])) {
                $subjects[$year] = [];
            }
            if (!isset($subjects[$year][$semester])) {
                $subjects[$year][$semester] = [];
            }

            $lectureUnits = (int)($subject['lec_units'] ?? $subject['units']);
            $laboratoryUnits = (int)($subject['lab_units'] ?? 0);

            $subjects[$year][$semester][] = [
                'name' => $subject['subject_name'],
                'lec_units' => $lectureUnits,
                'lab_units' => $laboratoryUnits,
                'units' => $lectureUnits + $laboratoryUnits,
            ];
        }

        $programs[$programName] = [
            'profs' => $profs,
            'sections' => $sections,
            'subjects' => $subjects,
        ];
    }

    $loads = array_map(fn ($row) => normalizeLoadRow($row), $loadRows);

    jsonOut([
        'facultyRegistry' => $facultyRegistry,
        'db' => [
            'schoolYears' => $schoolYears,
            'rooms' => $rooms,
            'buildings' => $buildings,
            'programs' => $programs,
            'loads' => $loads,
            'noClassDays' => [],
        ],
    ]);
} catch (Throwable $e) {
    jsonOut(['error' => $e->getMessage()], 500);
}
