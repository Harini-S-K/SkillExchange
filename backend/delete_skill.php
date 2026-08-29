<?php
/**
 * delete_skill.php
 * DELETE ?id=7
 * Requires login. Only the skill's owner may delete it.
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    respond(['error' => 'Method not allowed'], 405);
}

$userId = requireAuth();

if (!isset($_GET['id'])) {
    respond(['error' => 'Missing id parameter'], 400);
}
$id = (int) $_GET['id'];

$check = $pdo->prepare('SELECT user_id FROM skills WHERE id = ?');
$check->execute([$id]);
$row = $check->fetch();

if (!$row) {
    respond(['error' => 'Skill not found'], 404);
}
if ((int) $row['user_id'] !== $userId) {
    respond(['error' => 'You can only delete your own skills.'], 403);
}

$stmt = $pdo->prepare('DELETE FROM skills WHERE id = ?');
$stmt->execute([$id]);

respond(['success' => true, 'deleted_id' => $id]);
