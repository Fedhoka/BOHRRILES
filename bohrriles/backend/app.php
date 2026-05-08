<?php
// ============================================================
// CERVESIA - app.php
// API principal que consume la app móvil
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'config.php';
require_once 'helpers.php';

$accion = $_REQUEST['accion'] ?? '';

switch ($accion) {

    // ── AUTENTICACIÓN ─────────────────────────────────────────
    case 'login':
        $login    = limpiar($_REQUEST['login']    ?? '');
        $password = $_REQUEST['password'] ?? '';
        if (!$login || !$password) { error('Faltan datos.'); }

        $stmt = $db->prepare(
            "SELECT * FROM usuarios WHERE login = ? AND activo = 1"
        );
        $stmt->execute([$login]);
        $usuario = $stmt->fetch();

        if (!$usuario || !password_verify($password, $usuario['password'])) {
            error('Usuario o contraseña incorrectos.');
        }

        $token = bin2hex(random_bytes(32));
        $db->prepare("UPDATE usuarios SET token = ? WHERE id = ?")
           ->execute([$token, $usuario['id']]);

        ok([
            'idUsuario' => $usuario['id'],
            'nombre'    => $usuario['nombre'],
            'apellido'  => $usuario['apellido'],
            'permiso'   => $usuario['permiso'],
            'token'     => $token,
        ]);
        break;

    // ── ESCANEO DE BARRILES ───────────────────────────────────
    case 'scan_barril':
        $cod = limpiar($_REQUEST['codBarril'] ?? '');
        if (!$cod) { error('Código vacío.'); }

        $stmt = $db->prepare(
            "SELECT b.*, e.id AS idEnvasado,
                    tc.nombre AS nombreTipoCerveza,
                    e.fecha_envasado AS fechaEnvasado,
                    e.fecha_vencimiento AS fechaVencimiento
             FROM barriles b
             LEFT JOIN envasados e ON e.id_barril = b.id
                 AND e.id = (SELECT MAX(id) FROM envasados WHERE id_barril = b.id)
             LEFT JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             WHERE b.codigo = ? AND b.activo = 1"
        );
        $stmt->execute([$cod]);
        $barril = $stmt->fetch();

        if (!$barril) { error('Barril no encontrado.', 1); }

        ok([
            'idBarril'    => $barril['id'],
            'nombreBarril'=> $barril['nombre'],
            'codBarril'   => $barril['codigo'],
            'estado'      => $barril['estado'],
            'idEnvasado'  => $barril['idEnvasado'],
            'nombreTipoCerveza' => $barril['nombreTipoCerveza'],
            'fechaEnvasado'     => $barril['fechaEnvasado'],
            'fechaVencimiento'  => $barril['fechaVencimiento'],
        ]);
        break;

    case 'scan_barril_envasar':
        $cod = limpiar($_REQUEST['codBarril'] ?? '');
        $stmt = $db->prepare(
            "SELECT * FROM barriles WHERE codigo = ? AND activo = 1"
        );
        $stmt->execute([$cod]);
        $barril = $stmt->fetch();
        if (!$barril) { error('Barril no encontrado.', 1); }
        if ($barril['estado'] === 'entregado') {
            error('El barril está actualmente en un cliente.', 2);
        }
        ok([
            'idBarril'    => $barril['id'],
            'nombreBarril'=> $barril['nombre'],
            'codBarril'   => $barril['codigo'],
        ]);
        break;

    case 'scan_barril_vaciar':
        $cod = limpiar($_REQUEST['codBarril'] ?? '');
        $stmt = $db->prepare(
            "SELECT b.*, e.id AS idEnvasado,
                    tc.nombre AS nombreTipoCerveza,
                    e.fecha_envasado AS fechaEnvasado,
                    e.fecha_vencimiento AS fechaVencimiento
             FROM barriles b
             LEFT JOIN envasados e ON e.id_barril = b.id
                 AND e.id = (SELECT MAX(id) FROM envasados WHERE id_barril = b.id)
             LEFT JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             WHERE b.codigo = ? AND b.activo = 1"
        );
        $stmt->execute([$cod]);
        $barril = $stmt->fetch();
        if (!$barril) { error('Barril no encontrado.', 1); }
        ok([
            'idBarril'           => $barril['id'],
            'nombreBarril'       => $barril['nombre'],
            'codBarril'          => $barril['codigo'],
            'nombreTipoCerveza'  => $barril['nombreTipoCerveza'] ?? '',
            'fechaEnvasado'      => $barril['fechaEnvasado']     ?? '',
            'fechaVencimiento'   => $barril['fechaVencimiento']  ?? '',
        ]);
        break;

    case 'scan_barril_entregar':
        $cod = limpiar($_REQUEST['codBarril'] ?? '');
        $stmt = $db->prepare(
            "SELECT b.*, e.id AS idEnvasado,
                    tc.nombre AS nombreTipoCerveza,
                    e.fecha_envasado AS fechaEnvasado,
                    e.fecha_vencimiento AS fechaVencimiento
             FROM barriles b
             INNER JOIN envasados e ON e.id_barril = b.id
                 AND e.id = (SELECT MAX(id) FROM envasados WHERE id_barril = b.id)
             LEFT JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             WHERE b.codigo = ? AND b.activo = 1 AND b.estado = 'envasado'"
        );
        $stmt->execute([$cod]);
        $barril = $stmt->fetch();
        if (!$barril) { error('Barril no disponible para entrega.', 1); }
        ok([
            'idBarril'          => $barril['id'],
            'nombreBarril'      => $barril['nombre'],
            'codBarril'         => $barril['codigo'],
            'idEnvasado'        => $barril['idEnvasado'],
            'nombreTipoCerveza' => $barril['nombreTipoCerveza'],
            'fechaEnvasado'     => $barril['fechaEnvasado'],
            'fechaVencimiento'  => $barril['fechaVencimiento'],
        ]);
        break;

    case 'scan_barril_devolver':
        $cod = limpiar($_REQUEST['codBarril'] ?? '');
        $stmt = $db->prepare(
            "SELECT b.*, ent.id AS idEntrega,
                    c.nombre AS nombreComercio,
                    ent.fecha AS fechaEntrega,
                    DATEDIFF(CURDATE(), ent.fecha) AS cantidadDias,
                    e.id AS idEnvasado,
                    tc.nombre AS nombreTipoCerveza,
                    e.fecha_envasado AS fechaEnvasado,
                    e.fecha_vencimiento AS fechaVencimiento
             FROM barriles b
             INNER JOIN entregas ent ON ent.id_barril = b.id AND ent.estado = 'entregado'
             INNER JOIN clientes c ON c.id = ent.id_cliente
             INNER JOIN envasados e ON e.id = ent.id_envasado
             LEFT JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             WHERE b.codigo = ? AND b.activo = 1"
        );
        $stmt->execute([$cod]);
        $barril = $stmt->fetch();
        if (!$barril) { error('Barril no encontrado o no está entregado.', 1); }
        ok([
            'idBarril'          => $barril['id'],
            'nombreBarril'      => $barril['nombre'],
            'codBarril'         => $barril['codigo'],
            'nombreComercio'    => $barril['nombreComercio'],
            'fechaEntrega'      => $barril['fechaEntrega'],
            'cantidadDias'      => $barril['cantidadDias'],
            'idEnvasado'        => $barril['idEnvasado'],
            'nombreTipoCerveza' => $barril['nombreTipoCerveza'],
            'fechaEnvasado'     => $barril['fechaEnvasado'],
            'fechaVencimiento'  => $barril['fechaVencimiento'],
        ]);
        break;

    // ── OPERACIONES DE BARRILES ───────────────────────────────
    case 'get_lista_tipocervezas':
        $stmt = $db->query("SELECT id AS idTipoCerveza, nombre AS nombreTipoCerveza
                            FROM tipo_cervezas WHERE activo = 1 ORDER BY nombre");
        ok(['tipocervezas' => $stmt->fetchAll()]);
        break;

    case 'doEnvasar':
        $idUsuario      = intval($_REQUEST['idUsuario']      ?? 0);
        $idTipoCerveza  = intval($_REQUEST['idTipoCerveza']  ?? 0);
        $idBarril       = intval($_REQUEST['idBarril']       ?? 0);
        $fechaEnvasado  = limpiar($_REQUEST['fechaEnvasado']  ?? '');
        $fechaVencimiento = limpiar($_REQUEST['fechaVencimiento'] ?? '');

        if (!$idUsuario || !$idTipoCerveza || !$idBarril) {
            error('Faltan datos obligatorios.');
        }

        // Convertir fecha dd/mm/yyyy → yyyy-mm-dd
        $fEnv = convertirFecha($fechaEnvasado);
        $fVen = $fechaVencimiento ? convertirFecha($fechaVencimiento) : null;

        $db->prepare(
            "INSERT INTO envasados (id_barril, id_tipo_cerveza, id_usuario, fecha_envasado, fecha_vencimiento)
             VALUES (?,?,?,?,?)"
        )->execute([$idBarril, $idTipoCerveza, $idUsuario, $fEnv, $fVen]);

        $db->prepare("UPDATE barriles SET estado = 'envasado' WHERE id = ?")
           ->execute([$idBarril]);

        ok(['resultado' => 1, 'mensaje' => 'Barril envasado correctamente.']);
        break;

    case 'doVaciar':
        $idUsuario = intval($_REQUEST['idUsuario'] ?? 0);
        $idBarril  = intval($_REQUEST['idBarril']  ?? 0);
        if (!$idUsuario || !$idBarril) { error('Faltan datos.'); }

        $db->prepare(
            "INSERT INTO vaciados (id_barril, id_usuario, fecha) VALUES (?,?,CURDATE())"
        )->execute([$idBarril, $idUsuario]);

        $db->prepare("UPDATE barriles SET estado = 'vacio' WHERE id = ?")
           ->execute([$idBarril]);

        ok(['resultado' => 1, 'mensaje' => 'Barril vaciado correctamente.']);
        break;

    case 'doEntregar':
        $idUsuario  = intval($_REQUEST['idUsuario']  ?? 0);
        $idEnvasado = intval($_REQUEST['idEnvasado'] ?? 0);
        $idBarril   = intval($_REQUEST['idBarril']   ?? 0);
        $idCliente  = intval($_REQUEST['idCliente']  ?? 0);
        if (!$idUsuario || !$idEnvasado || !$idBarril || !$idCliente) {
            error('Faltan datos.');
        }

        $db->prepare(
            "INSERT INTO entregas (id_envasado, id_barril, id_cliente, id_usuario, fecha)
             VALUES (?,?,?,?,CURDATE())"
        )->execute([$idEnvasado, $idBarril, $idCliente, $idUsuario]);

        $db->prepare("UPDATE barriles SET estado = 'entregado' WHERE id = ?")
           ->execute([$idBarril]);

        ok(['resultado' => 1, 'mensaje' => 'Barril entregado correctamente.']);
        break;

    case 'doDevolver':
        $idUsuario = intval($_REQUEST['idUsuario'] ?? 0);
        $idBarril  = intval($_REQUEST['idBarril']  ?? 0);
        if (!$idUsuario || !$idBarril) { error('Faltan datos.'); }

        // Buscar la entrega activa
        $stmt = $db->prepare(
            "SELECT id FROM entregas WHERE id_barril = ? AND estado = 'entregado' ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute([$idBarril]);
        $entrega = $stmt->fetch();
        if (!$entrega) { error('No se encontró entrega activa para ese barril.'); }

        $db->prepare(
            "INSERT INTO devoluciones (id_entrega, id_usuario, fecha) VALUES (?,?,CURDATE())"
        )->execute([$entrega['id'], $idUsuario]);

        $db->prepare("UPDATE entregas SET estado = 'devuelto' WHERE id = ?")
           ->execute([$entrega['id']]);

        $db->prepare("UPDATE barriles SET estado = 'disponible' WHERE id = ?")
           ->execute([$idBarril]);

        ok(['resultado' => 1, 'mensaje' => 'Barril devuelto correctamente.']);
        break;

    // ── ENVASES / LATAS ───────────────────────────────────────
    case 'scan_envase':
        $cod = limpiar($_REQUEST['codEnvase'] ?? '');
        $stmt = $db->prepare(
            "SELECT e.*, te.nombre AS nombreTipoEnvase, tc.nombre AS nombreTipoCerveza
             FROM envases e
             LEFT JOIN tipo_envases te ON te.id = e.id_tipo_envase
             LEFT JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             WHERE e.codigo = ? AND e.activo = 1"
        );
        $stmt->execute([$cod]);
        $envase = $stmt->fetch();
        if (!$envase) { error('Envase no encontrado.', 1); }
        ok([
            'idEnvase'          => $envase['id'],
            'nombreEnvase'      => $envase['nombre'],
            'codEnvase'         => $envase['codigo'],
            'nombreTipoEnvase'  => $envase['nombreTipoEnvase'],
            'nombreTipoCerveza' => $envase['nombreTipoCerveza'],
            'stockActual'       => $envase['stock_actual'],
        ]);
        break;

    case 'doEnvasarEnvase':
        $idUsuario = intval($_REQUEST['idUsuario'] ?? 0);
        $idEnvase  = intval($_REQUEST['idEnvase']  ?? 0);
        $cantidad  = intval($_REQUEST['cantidad']  ?? 0);
        if (!$idUsuario || !$idEnvase || $cantidad <= 0) { error('Faltan datos.'); }

        $db->prepare(
            "INSERT INTO movimientos_envases (id_envase, id_usuario, tipo, cantidad, fecha)
             VALUES (?,?,'ingreso',?,CURDATE())"
        )->execute([$idEnvase, $idUsuario, $cantidad]);

        $db->prepare(
            "UPDATE envases SET stock_actual = stock_actual + ? WHERE id = ?"
        )->execute([$cantidad, $idEnvase]);

        ok(['resultado' => 1, 'mensaje' => 'Movimiento registrado correctamente.']);
        break;

    case 'doEntregarEnvase':
        $idUsuario = intval($_REQUEST['idUsuario'] ?? 0);
        $idEnvase  = intval($_REQUEST['idEnvase']  ?? 0);
        $cantidad  = intval($_REQUEST['cantidad']  ?? 0);
        $idCliente = intval($_REQUEST['idCliente'] ?? 0);
        if (!$idUsuario || !$idEnvase || $cantidad <= 0) { error('Faltan datos.'); }

        // Verificar stock
        $stmt = $db->prepare("SELECT stock_actual FROM envases WHERE id = ?");
        $stmt->execute([$idEnvase]);
        $envase = $stmt->fetch();
        if (!$envase || $envase['stock_actual'] < $cantidad) {
            error('Stock insuficiente.');
        }

        $db->prepare(
            "INSERT INTO movimientos_envases (id_envase, id_usuario, tipo, cantidad, id_cliente, fecha)
             VALUES (?,?,'egreso',?,?,CURDATE())"
        )->execute([$idEnvase, $idUsuario, $cantidad, $idCliente ?: null]);

        $db->prepare(
            "UPDATE envases SET stock_actual = stock_actual - ? WHERE id = ?"
        )->execute([$cantidad, $idEnvase]);

        ok(['resultado' => 1, 'mensaje' => 'Movimiento registrado correctamente.']);
        break;

    // ── REPORTE DE CLIENTE ────────────────────────────────────
    // Devuelve todos los barriles activos de un cliente
    // con estilo, fecha de entrega y días en su poder
    case 'get_reporte_cliente':
        $idCliente = intval($_REQUEST['idCliente'] ?? 0);
        if (!$idCliente) { error('Falta el cliente.'); }

        // Datos del cliente
        $stmtCli = $db->prepare("SELECT * FROM clientes WHERE id = ? AND activo = 1");
        $stmtCli->execute([$idCliente]);
        $cliente = $stmtCli->fetch();
        if (!$cliente) { error('Cliente no encontrado.'); }

        // Barriles actualmente en su poder
        $stmtEnt = $db->prepare(
            "SELECT
                b.nombre        AS nombreBarril,
                b.codigo        AS codBarril,
                b.capacidad_lt,
                tc.nombre       AS estilo,
                e.fecha_envasado,
                e.fecha_vencimiento,
                ent.fecha       AS fechaEntrega,
                DATEDIFF(CURDATE(), ent.fecha) AS diasEnCliente
             FROM entregas ent
             INNER JOIN barriles b    ON b.id  = ent.id_barril
             INNER JOIN envasados e   ON e.id  = ent.id_envasado
             LEFT  JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             WHERE ent.id_cliente = ?
               AND ent.estado = 'entregado'
             ORDER BY ent.fecha ASC"
        );
        $stmtEnt->execute([$idCliente]);
        $barriles = $stmtEnt->fetchAll();

        // Saldo de cuenta corriente
        $stmtSaldo = $db->prepare(
            "SELECT COALESCE(SUM(
                CASE tipo WHEN 'pago' THEN monto ELSE -monto END
             ), 0) AS saldo
             FROM cuenta_corriente WHERE id_cliente = ?"
        );
        $stmtSaldo->execute([$idCliente]);
        $saldo = $stmtSaldo->fetchColumn();

        ok([
            'cliente'  => $cliente,
            'barriles' => $barriles,
            'saldo'    => (float)$saldo,
            'fecha'    => date('d/m/Y'),
            'total'    => count($barriles),
            'maxDias'  => count($barriles) > 0
                ? max(array_column($barriles, 'diasEnCliente'))
                : 0,
        ]);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Acción no reconocida: ' . $accion]);
        break;
}
