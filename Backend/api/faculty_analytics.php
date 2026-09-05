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

// Status filter: 'active', 'inactive', or null for all
$status = $_GET['status'] ?? null;
$activeFilter = null;
if ($status === 'active') {
    $activeFilter = 1;
} elseif ($status === 'inactive') {
    $activeFilter = 0;
}

// Base faculty list query
if ($activeFilter !== null) {
    $stmt = $pdo->prepare('SELECT name, employment_type, educational_attainment AS highest_attainment, active FROM faculty WHERE active = ?');
    $stmt->execute([$activeFilter]);
} else {
    $stmt = $pdo->query('SELECT name, employment_type, educational_attainment AS highest_attainment, active FROM faculty');
}
$facultyList = $stmt->fetchAll();

// Overall counts
$totalFaculty   = (int)$pdo->query('SELECT COUNT(*) FROM faculty')->fetchColumn();
$activeCount    = (int)$pdo->query('SELECT COUNT(*) FROM faculty WHERE active = 1')->fetchColumn();
$inactiveCount  = (int)$pdo->query('SELECT COUNT(*) FROM faculty WHERE active = 0')->fetchColumn();

// Employment breakdown
$empStmt = $pdo->query('SELECT employment_type, COUNT(*) AS cnt FROM faculty GROUP BY employment_type');
$regularCount = $partTimeCount = 0;
foreach ($empStmt->fetchAll() as $row) {
    if (strcasecmp($row['employment_type'], 'regular') === 0) {
        $regularCount = (int)$row['cnt'];
    } else {
        $partTimeCount += (int)$row['cnt'];
    }
}

// Education attainment breakdown
$baccalaureate = $masters = $doctorate = $postBaccalaureate = 0;
$eduStmt = $pdo->query('SELECT educational_attainment FROM faculty');
while ($row = $eduStmt->fetch()) {
    $att = strtolower($row['educational_attainment']);
    if (strpos($att, 'baccalaureate') !== false) {
        $baccalaureate++;
    } elseif (strpos($att, 'master') !== false) {
        $masters++;
    } elseif (strpos($att, 'doctorate') !== false) {
        $doctorate++;
    } elseif (strpos($att, 'post') !== false) {
        $postBaccalaureate++;
    }
}

// University frequency (top 5)
$universities = ['PUP','UP','UST','DLSU','Ateneo','FEU','Mapua'];
$freq = [];
foreach ($universities as $uni) {
    $stmtU = $pdo->prepare('SELECT COUNT(*) FROM faculty WHERE educational_attainment LIKE ?');
    $stmtU->execute(["%$uni%"]);
    $count = (int)$stmtU->fetchColumn();
    if ($count > 0) {
        $freq[] = ['university' => $uni, 'count' => $count];
    }
}
usort($freq, function($a, $b) { return $b['count'] <=> $a['count']; });
$freq = array_slice($freq, 0, 5);

$response = [
    'total_faculty' => $totalFaculty,
    'active_count' => $activeCount,
    'inactive_count' => $inactiveCount,
    'employment_breakdown' => [
        'regular' => $regularCount,
        'part_time' => $partTimeCount,
    ],
    'education_attainment' => [
        'baccalaureate' => $baccalaureate,
        'masters' => $masters,
        'doctorate' => $doctorate,
        'post_baccalaureate' => $postBaccalaureate,
    ],
    'university_frequency' => $freq,
    'faculty_list' => $facultyList,
];

echo json_encode($response);
?>
