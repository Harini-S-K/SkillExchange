<?php
/**
 * get_requests.php
 * GET ?box=received (default) -> trade requests sent TO the logged-in user
 * GET ?box=sent                -> trade requests sent BY the logged-in user
 * Requires login.
 */

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(['error' => 'Method not allowed'], 405);
}

$userId = requireAuth();
$box = isset($_GET['box']) ? $_GET['box'] : 'received';

if ($box === 'sent') {
    $sql = 'SELECT r.id, r.from_user_id, r.to_user_id, r.skill_id, r.skill_type, r.skill_name, r.message, r.status, r.created_at, r.updated_at,
                   u.name AS to_name, u.contact AS to_contact
            FROM requests r
            JOIN users u ON u.id = r.to_user_id
            WHERE r.from_user_id = ?
            ORDER BY r.created_at DESC';
} else {
    $sql = 'SELECT r.id, r.from_user_id, r.to_user_id, r.skill_id, r.skill_type, r.skill_name, r.message, r.status, r.created_at, r.updated_at,
                   u.name AS from_name, u.contact AS from_contact
            FROM requests r
            JOIN users u ON u.id = r.from_user_id
            WHERE r.to_user_id = ?
            ORDER BY r.created_at DESC';
}

$stmt = $pdo->prepare($sql);
$stmt->execute([$userId]);
respond($stmt->fetchAll());
