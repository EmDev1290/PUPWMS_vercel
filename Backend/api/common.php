<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $db = getenv('DB_NAME') ?: '';
    $user = getenv('DB_USER') ?: '';
    $pass = getenv('DB_PASSWORD') ?: '';
    if ($db === '') $db = 'pup_workload';
    if ($user === '') $user = 'root';

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $host, $db);
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function jsonOut($payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function jwtSecret(): string
{
    return getenv('JWT_SECRET') ?: 'fallback_secret_for_development_only';
}

function base64UrlEncode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64UrlDecode(string $value): string
{
    $padding = strlen($value) % 4;
    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }

    return base64_decode(strtr($value, '-_', '+/'));
}

function signJwt(array $payload): string
{
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $headerSegment = base64UrlEncode(json_encode($header));
    $payloadSegment = base64UrlEncode(json_encode($payload));
    $signatureInput = $headerSegment . '.' . $payloadSegment;
    $signature = hash_hmac('sha256', $signatureInput, jwtSecret(), true);
    return $headerSegment . '.' . $payloadSegment . '.' . base64UrlEncode($signature);
}

function verifyJwt(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    [$headerB64, $payloadB64, $signatureB64] = $parts;
    $expected = hash_hmac(
        'sha256',
        $headerB64 . '.' . $payloadB64,
        jwtSecret(),
        true
    );

    if (!hash_equals(base64UrlEncode($expected), $signatureB64)) {
        return null;
    }

    $payload = json_decode(base64UrlDecode($payloadB64), true);
    if (!is_array($payload)) {
        return null;
    }
    return $payload;
}

function requireAuth(): array
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/', $authorization, $matches)) {
        throw new RuntimeException('A token is required for authentication');
    }

    $token = trim($matches[1]);
    $payload = verifyJwt($token);
    if ($payload === null) {
        throw new RuntimeException('Invalid or expired token');
    }

    return $payload;
}

function normalizeFacultyRow(array $row): array
{
    return [
        'id' => $row['id'] ?? '',
        'name' => $row['name'] ?? '',
        'baseDesignation' => $row['base_designation'] ?? '',
        'program' => $row['program'] ?? '',
        'employmentType' => $row['employment_type'] ?? '',
        'classification' => $row['classification'] ?? '',
        'classificationRank' => $row['classification_rank'] ?? '',
        'active' => (bool)($row['active'] ?? true),
        'educationalAttainment' => [
            'baccalaureate' => $row['baccalaureate'] ?? '',
            'masters' => $row['masters'] ?? '',
            'doctorate' => $row['doctorate'] ?? '',
            'postBaccalaureate' => $row['post_baccalaureate'] ?? '',
        ],
        'licenseNumber' => $row['license_number'] ?? '',
        'specialization' => $row['specialization'] ?? '',
        'nationalCertificate' => $row['national_certificate'] ?? '',
        'courseHandle' => [
            'genEd' => $row['gen_ed'] ?? '',
            'coreSubject' => $row['core_subject'] ?? '',
            'professionalSubject' => $row['professional_subject'] ?? '',
            'technicalSubject' => $row['technical_subject'] ?? '',
        ],
        'research' => [
            'production' => (string)($row['research_production'] ?? '0'),
            'presentation' => (string)($row['research_presentation'] ?? '0'),
            'publication' => (string)($row['research_publication'] ?? '0'),
            'citation' => (string)($row['research_citation'] ?? '0'),
        ],
        'extension' => $row['extension'] ?? '',
        'natureOfAppointment' => $row['nature_of_appointment'] ?? '',
        'preferredSubjects' => $row['preferred_subjects'] ?? '',
        'preferredTimes' => $row['preferred_times'] ?? '',
        'remarks' => $row['remarks'] ?? '',
    ];
}

function normalizeLoadRow(array $row): array
{
    return [
        'id' => (int)($row['id'] ?? 0),
        'prof' => $row['prof'] ?? '',
        'sub' => $row['sub'] ?? '',
        'units' => (int)($row['units'] ?? 0),
        'component_type' => $row['component_type'] ?? 'Lec',
        'loadType' => $row['load_type'] ?? '',
        'sec' => $row['sec'] ?? '',
        'room' => $row['room'] ?? '',
        'building' => $row['building'] ?? '',
        'day' => $row['day'] ?? '',
        'time' => $row['time'] ?? '',
        'sy' => $row['sy'] ?? '',
        'program' => $row['program'] ?? '',
        'semester' => $row['semester'] ?? '1',
    ];
}
