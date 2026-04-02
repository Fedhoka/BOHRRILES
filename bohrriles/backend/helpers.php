<?php
// ============================================================
// CERVESIA - helpers.php
// ============================================================

/** Devuelve JSON de éxito y termina */
function ok(array $data): void {
    echo json_encode(array_merge(['resultado' => 1], $data));
    exit;
}

/** Devuelve JSON de error y termina */
function error(string $msg, int $errno = 0): void {
    echo json_encode(['resultado' => 0, 'errno' => $errno, 'errdes' => $msg, 'mensaje' => $msg]);
    exit;
}

/** Limpia un string de entrada */
function limpiar(string $str): string {
    return trim(strip_tags($str));
}

/** Convierte dd/mm/yyyy a yyyy-mm-dd */
function convertirFecha(string $fecha): string {
    if (empty($fecha)) return date('Y-m-d');
    $partes = explode('/', $fecha);
    if (count($partes) === 3) {
        return "{$partes[2]}-{$partes[1]}-{$partes[0]}";
    }
    return $fecha;
}

/** Verifica token de sesión web */
function verificarSesion(): array {
    session_start();
    if (empty($_SESSION['usuario'])) {
        header('Location: /login.php');
        exit;
    }
    return $_SESSION['usuario'];
}
