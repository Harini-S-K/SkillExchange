<?php
/**
 * add_skill.php
 * POST { type: 'teach'|'learn', skill_name, category, description? }
 * Requires login. Adds a skill to the logged-in user's list.
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['error' => 'Method not allowed'], 405);
}

$userId = requireAuth();
$data = readJsonBody();
requireFields($data, ['type', 'skill_name', 'category']);

if (!in_array($data['type'], ['teach', 'learn'], true)) {
    respond(['error' => 'type must be "teach" or "learn"'], 400);
}

$stmt = $pdo->prepare('INSERT INTO skills (user_id, type, skill_name, category, description) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([
    $userId,
    $data['type'],
    trim($data['skill_name']),
    trim($data['category']),
    isset($data['description']) ? trim($data['description']) : null,
]);

$id = $pdo->lastInsertId();
$stmt = $pdo->prepare('SELECT id, user_id, type, skill_name, category, description, created_at FROM skills WHERE id = ?');
$stmt->execute([$id]);
respond($stmt->fetch(), 201);
