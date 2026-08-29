<?php
/**
 * login.php
 * POST   { email, password } -> verifies credentials, starts a session, returns profile
 * GET    -> "who am I" — returns the current session's profile, or 401 if not logged in
 * DELETE -> logs out (destroys the session)
 */

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'DELETE') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    respond(['success' => true]);
}

if ($method === 'GET') {
    if (empty($_SESSION['user_id'])) {
        respond(['error' => 'Not logged in'], 401);
    }
    $stmt = $pdo->prepare('SELECT id, name, email, contact FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        respond(['error' => 'Not logged in'], 401);
    }
    respond($user);
}

if ($method !== 'POST') {
    respond(['error' => 'Method not allowed'], 405);
}

$data = readJsonBody();
requireFields($data, ['email', 'password']);

$email = strtolower(trim($data['email']));

$stmt = $pdo->prepare('SELECT id, name, email, password_hash, contact FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify((string) $data['password'], $user['password_hash'])) {
    respond(['error' => 'Incorrect email or password.'], 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
unset($user['password_hash']);

respond($user);
