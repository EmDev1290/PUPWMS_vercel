<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$host = 'localhost';
$db   = 'pup_workload';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];
try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

function countUniversities(string $text, array $keywords): array {
    $counts = [];
    foreach ($keywords as $kw) {
        if (stripos($text, $kw) !== false) {
            $counts[$kw] = ($counts[$kw] ?? 0) + 1;
        }
    }
    return $counts;
}

$uniKeywords = ['PUP','UP','UST','DLSU','Ateneo','FEU','Mapua'];

$stmt = $pdo->query('SELECT id, name, employment_type, classification, active, educational_attainment FROM faculty');
$rows = $stmt->fetchAll();

$total = count($rows);
$active = $inactive = 0;
$regular = $partTime = 0;
$bacc = $masters = $doctorate = $postBacc = 0;
$universityFreq = array_fill_keys($uniKeywords, 0);
$roster = [];

foreach ($rows as $row) {
    $isActive = (bool)$row['active'];
    $isActive ? $active++ : $inactive++;

    $emp = strtolower($row['employment_type'] ?? '');
    if ($emp === 'regular') {
        $regular++;
    } else {
        $partTime++;
    }

    $edu = [];
    if (!empty($row['educational_attainment'])) {
        $edu = json_decode($row['educational_attainment'], true) ?: [];
    }
    if (!empty($edu['baccalaureate'])) $bacc++;
    if (!empty($edu['masters'])) $masters++;
    if (!empty($edu['doctorate'])) $doctorate++;
    if (!empty($edu['post_baccalaureate'])) $postBacc++;

    foreach (['baccalaureate','masters','doctorate','post_baccalaureate'] as $field) {
        if (!empty($edu[$field])) {
            $counts = countUniversities($edu[$field], $uniKeywords);
            foreach ($counts as $kw => $c) {
                $universityFreq[$kw] += $c;
            }
        }
    }
    $roster[] = $row;
}

arsort($universityFreq);
$topUni = array_slice($universityFreq, 0, 5, true);

$response = [
    'totalFaculty' => $total,
    'activeCount' => $active,
    'inactiveCount' => $inactive,
    'regularCount' => $regular,
    'partTimeCount' => $partTime,
    'baccalaureateCount' => $bacc,
    'mastersCount' => $masters,
    'doctorateCount' => $doctorate,
    'postBaccalaureateCount' => $postBacc,
    'universityFreq' => $topUni,
    'facultyList' => $roster,
];

echo json_encode($response);
?>
