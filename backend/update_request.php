<?php
/**
 * update_request.php
 * PUT { id, status: 'accepted'|'declined' }
 * Requires login. Only the recipient of a request may accept or decline it.
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    respond(['error' => 'Method not allowed'], 405);
}

$userId = requireAuth();
$data = readJsonBody();
requireFields($data, ['id', 'status']);

if (!in_array($data['status'], ['accepted', 'declined'], true)) {
    respond(['error' => 'status must be "accepted" or "declined"'], 400);
}

$id = (int) $data['id'];

$check = $pdo->prepare('SELECT to_user_id FROM requests WHERE id = ?');
$check->execute([$id]);
$row = $check->fetch();

if (!$row) {
    respond(['error' => 'Request not found'], 404);
}
if ((int) $row['to_user_id'] !== $userId) {
    respond(['error' => 'You can only respond to requests sent to you.'], 403);
}

$stmt = $pdo->prepare('UPDATE requests SET status = ? WHERE id = ?');
$stmt->execute([$data['status'], $id]);

$stmt = $pdo->prepare('SELECT id, from_user_id, to_user_id, skill_id, skill_type, skill_name, message, status, created_at, updated_at FROM requests WHERE id = ?');
$stmt->execute([$id]);
respond($stmt->fetch());
