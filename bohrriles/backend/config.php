<?php
// ============================================================
// CERVESIA - config.php
// ============================================================

// ── Base de datos ─────────────────────────────────────────────
// ⚠ Cambiá estos valores con los de tu hosting
define('DB_HOST', 'localhost');
define('DB_NAME', 'cervesia');
define('DB_USER', 'root');          // tu usuario MySQL
define('DB_PASS', 'TU_PASSWORD');   // tu contraseña MySQL

try {
    $db = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Error de conexión a la base de datos.']));
}
