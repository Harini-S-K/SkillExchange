<?php
/**
 * send_request.php
 * POST { to_user_id, skill_id, skill_type: 'teach'|'learn', skill_name, message }
 * Requires login. Sends a trade proposal from the logged-in user to another user.
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['error' => 'Method not allowed'], 405);
}

$userId = requireAuth();
$data = readJsonBody();
requireFields($data, ['to_user_id', 'skill_id', 'skill_type', 'skill_name', 'message']);

if (!in_array($data['skill_type'], ['teach', 'learn'], true)) {
    respond(['error' => 'skill_type must be "teach" or "learn"'], 400);
}
if ((int) $data['to_user_id'] === $userId) {
    respond(['error' => 'You cannot send a trade request to yourself.'], 400);
}

$stmt = $pdo->prepare('INSERT INTO requests (from_user_id, to_user_id, skill_id, skill_type, skill_name, message) VALUES (?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $userId,
    (int) $data['to_user_id'],
    (int) $data['skill_id'],
    $data['skill_type'],
    trim($data['skill_name']),
    trim($data['message']),
]);

$id = $pdo->lastInsertId();
$stmt = $pdo->prepare('SELECT id, from_user_id, to_user_id, skill_id, skill_type, skill_name, message, status, created_at FROM requests WHERE id = ?');
$stmt->execute([$id]);
respond($stmt->fetch(), 201);
