<?php
/**
 * register.php
 * POST { name, email, password, contact? } -> creates an account,
 * logs the person in immediately, and returns their public profile.
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['error' => 'Method not allowed'], 405);
}

$data = readJsonBody();
requireFields($data, ['name', 'email', 'password']);

$name = trim($data['name']);
$email = strtolower(trim($data['email']));
$password = (string) $data['password'];
$contact = isset($data['contact']) ? trim($data['contact']) : '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['error' => 'Enter a valid email address.'], 400);
}
if (strlen($password) < 6) {
    respond(['error' => 'Password must be at least 6 characters.'], 400);
}

$check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$check->execute([$email]);
if ($check->fetch()) {
    respond(['error' => 'An account with that email already exists.'], 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, contact) VALUES (?, ?, ?, ?)');
$stmt->execute([$name, $email, $hash, $contact]);
$id = (int) $pdo->lastInsertId();

session_regenerate_id(true);
$_SESSION['user_id'] = $id;

respond(['id' => $id, 'name' => $name, 'email' => $email, 'contact' => $contact], 201);
