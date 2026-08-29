<?php
/**
 * db.php
 * Shared database connection, session bootstrap, and helper functions.
 * Included at the top of every backend script.
 */

session_start();

header('Content-Type: application/json');
header('Cache-Control: no-store');

// ---- Connection settings — edit these if your XAMPP setup differs ----
$DB_HOST = 'localhost';
$DB_NAME = 'skillexchange_db';
$DB_USER = 'root';
$DB_PASS = '';        // default XAMPP MySQL root password is blank
$DB_CHARSET = 'utf8mb4';

$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=$DB_CHARSET";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed. Check that MySQL is running in XAMPP and that skillexchange_db has been imported.', 'detail' => $e->getMessage()]);
    exit;
}

/**
 * Send a JSON response and stop execution.
 */
function respond($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

/**
 * Read and decode a JSON request body into an associative array.
 */
function readJsonBody() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Require that a set of fields exist (and are non-empty) in an array.
 * Responds with 400 and stops execution if any are missing.
 */
function requireFields($data, $fields) {
    $missing = [];
    foreach ($fields as $f) {
        if (!isset($data[$f]) || (is_string($data[$f]) && trim($data[$f]) === '')) {
            $missing[] = $f;
        }
    }
    if (!empty($missing)) {
        respond(['error' => 'Missing required field(s): ' . implode(', ', $missing)], 400);
    }
}

/**
 * Require an active login session. Responds 401 and stops execution if
 * nobody is logged in; otherwise returns the logged-in user's id.
 */
function requireAuth() {
    if (empty($_SESSION['user_id'])) {
        respond(['error' => 'Please log in to continue.'], 401);
    }
    return (int) $_SESSION['user_id'];
}
