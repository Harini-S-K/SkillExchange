<?php
/**
 * get_skills.php
 * Requires login.
 *
 * GET ?type=teach|learn                -> everyone else's skills of that type (the board),
 *                                          joined with owner name/contact
 * GET ?type=teach|learn&mine=1          -> the logged-in user's own skills of that type
 * GET (no type)                        -> everyone else's skills, all types
 * GET ?mine=1 (no type)                -> the logged-in user's own skills, all types
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(['error' => 'Method not allowed'], 405);
}

$userId = requireAuth();

$type = isset($_GET['type']) ? $_GET['type'] : null;
if ($type !== null && !in_array($type, ['teach', 'learn'], true)) {
    respond(['error' => 'type must be "teach" or "learn"'], 400);
}

if (isset($_GET['mine'])) {
    $sql = 'SELECT id, type, skill_name, category, description, created_at FROM skills WHERE user_id = ?';
    $params = [$userId];
    if ($type) { $sql .= ' AND type = ?'; $params[] = $type; }
    $sql .= ' ORDER BY created_at DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond($stmt->fetchAll());
} else {
    $sql = 'SELECT s.id, s.user_id, s.type, s.skill_name, s.category, s.description, s.created_at,
                   u.name AS owner_name, u.contact AS owner_contact
            FROM skills s
            JOIN users u ON u.id = s.user_id
            WHERE s.user_id != ?';
    $params = [$userId];
    if ($type) { $sql .= ' AND s.type = ?'; $params[] = $type; }
    $sql .= ' ORDER BY s.created_at DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond($stmt->fetchAll());
}
