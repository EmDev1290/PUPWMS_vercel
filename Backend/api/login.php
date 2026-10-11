<?php
require __DIR__ . '/common.php';

try {
    $data = readJsonBody();
    $username = trim((string)($data['username'] ?? ''));
    $password = (string)($data['password'] ?? '');

    if ($username === '' || $password === '') {
        jsonOut(['success' => false, 'error' => 'Username and password are required'], 400);
    }

    $statement = db()->prepare('SELECT * FROM users WHERE username = :username LIMIT 1');
    $statement->execute([':username' => $username]);
    $user = $statement->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonOut(['success' => false, 'error' => 'Invalid username or password'], 400);
    }

    $token = signJwt([
        'username' => $user['username'],
        'role' => $user['role'] ?? 'user',
        'displayName' => $user['display_name'] ?? $user['username'],
        'iat' => time(),
        'exp' => time() + 60 * 60 * 8,
    ]);

    jsonOut([
        'success' => true,
        'username' => $user['username'],
        'displayName' => $user['display_name'] ?? $user['username'],
        'role' => $user['role'] ?? 'user',
        'token' => $token,
    ]);
} catch (Throwable $e) {
    jsonOut(['success' => false, 'error' => $e->getMessage()], 500);
}
