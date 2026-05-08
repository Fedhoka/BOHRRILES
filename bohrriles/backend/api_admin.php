<?php
// ============================================================
// CERVESIA - api_admin.php
// API para el panel web de administración
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'config.php';
require_once 'helpers.php';

// Verificar token de sesión web en cada llamada
function checkToken() {
    global $db;
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? $_REQUEST['token'] ?? '';
    if (!$token) { error('No autorizado.'); }
    $stmt = $db->prepare("SELECT * FROM usuarios WHERE token = ? AND activo = 1");
    $stmt->execute([$token]);
    $u = $stmt->fetch();
    if (!$u) { error('Sesión inválida.'); }
    return $u;
}

$accion = $_REQUEST['accion'] ?? '';

switch ($accion) {

    // ── Auth ──────────────────────────────────────────────────
    case 'login':
        require_once 'app.php'; // reutiliza el login de la app
        break;

    // ── Dashboard stats ───────────────────────────────────────
    case 'get_stats':
        checkToken();

        $stats = [];

        $stmt = $db->query("SELECT estado, COUNT(*) AS total FROM barriles WHERE activo=1 GROUP BY estado");
        foreach ($stmt->fetchAll() as $row) {
            $stats['barriles'][$row['estado']] = (int)$row['total'];
        }

        $stmt = $db->query(
            "SELECT COUNT(*) AS total FROM envasados WHERE DATE(created_at) = CURDATE()"
        );
        $stats['envasados_hoy'] = (int)$stmt->fetchColumn();

        $stmt = $db->query(
            "SELECT COUNT(*) AS total FROM envasados e
             WHERE e.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)"
        );
        $stats['vencen_semana'] = (int)$stmt->fetchColumn();

        ok($stats);
        break;

    // ── Barriles ──────────────────────────────────────────────
    case 'get_barriles':
        checkToken();
        $stmt = $db->query(
            "SELECT b.*,
                    tc.nombre AS estilo,
                    e.fecha_envasado,
                    e.fecha_vencimiento
             FROM barriles b
             LEFT JOIN envasados e ON e.id_barril = b.id
                 AND e.id = (SELECT MAX(id) FROM envasados WHERE id_barril = b.id)
             LEFT JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             WHERE b.activo = 1
             ORDER BY b.nombre"
        );
        ok(['barriles' => $stmt->fetchAll()]);
        break;

    case 'crear_barril':
        checkToken();
        $nombre    = limpiar($_POST['nombre']    ?? '');
        $codigo    = limpiar($_POST['codigo']    ?? '');
        $capacidad = floatval($_POST['capacidad'] ?? 0);
        if (!$nombre || !$codigo) { error('Faltan datos.'); }

        $stmt = $db->prepare(
            "INSERT INTO barriles (nombre, codigo, capacidad_lt) VALUES (?,?,?)"
        );
        $stmt->execute([$nombre, $codigo, $capacidad]);
        ok(['id' => $db->lastInsertId(), 'mensaje' => 'Barril creado.']);
        break;

    // ── Clientes ──────────────────────────────────────────────
    case 'get_clientes':
        checkToken();
        $stmt = $db->query(
            "SELECT c.*,
                    COUNT(DISTINCT ent.id) AS barriles_activos,
                    COALESCE(SUM(cc.monto * CASE cc.tipo WHEN 'cargo' THEN -1 ELSE 1 END), 0) AS saldo
             FROM clientes c
             LEFT JOIN entregas ent ON ent.id_cliente = c.id AND ent.estado = 'entregado'
             LEFT JOIN cuenta_corriente cc ON cc.id_cliente = c.id
             WHERE c.activo = 1
             GROUP BY c.id
             ORDER BY c.nombre"
        );
        ok(['clientes' => $stmt->fetchAll()]);
        break;

    case 'crear_cliente':
        checkToken();
        $nombre = limpiar($_POST['nombre'] ?? '');
        if (!$nombre) { error('El nombre es obligatorio.'); }
        $stmt = $db->prepare(
            "INSERT INTO clientes (nombre, razon_social, telefono, email, direccion)
             VALUES (?,?,?,?,?)"
        );
        $stmt->execute([
            $nombre,
            limpiar($_POST['razon_social'] ?? ''),
            limpiar($_POST['telefono']     ?? ''),
            limpiar($_POST['email']        ?? ''),
            limpiar($_POST['direccion']    ?? ''),
        ]);
        ok(['id' => $db->lastInsertId(), 'mensaje' => 'Cliente creado.']);
        break;

    // ── Entregas ──────────────────────────────────────────────
    case 'get_entregas':
        checkToken();
        $stmt = $db->query(
            "SELECT ent.*,
                    b.nombre AS barril,
                    b.codigo AS cod_barril,
                    c.nombre AS cliente,
                    tc.nombre AS estilo,
                    e.fecha_envasado,
                    e.fecha_vencimiento,
                    DATEDIFF(COALESCE(dev.fecha, CURDATE()), ent.fecha) AS dias_en_cliente
             FROM entregas ent
             INNER JOIN barriles b    ON b.id  = ent.id_barril
             INNER JOIN clientes c    ON c.id  = ent.id_cliente
             INNER JOIN envasados e   ON e.id  = ent.id_envasado
             LEFT JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             LEFT JOIN devoluciones dev ON dev.id_entrega = ent.id
             ORDER BY ent.fecha DESC"
        );
        ok(['entregas' => $stmt->fetchAll()]);
        break;

    // ── Pedidos ───────────────────────────────────────────────
    case 'get_pedidos':
        checkToken();
        $stmt = $db->query(
            "SELECT p.*, c.nombre AS cliente,
                    COUNT(pi.id) AS cant_items
             FROM pedidos p
             INNER JOIN clientes c ON c.id = p.id_cliente
             LEFT JOIN pedido_items pi ON pi.id_pedido = p.id
             GROUP BY p.id
             ORDER BY p.fecha DESC"
        );
        ok(['pedidos' => $stmt->fetchAll()]);
        break;

    case 'crear_pedido':
        checkToken();
        $idCliente = intval($_POST['id_cliente'] ?? 0);
        $obs       = limpiar($_POST['observacion'] ?? '');
        if (!$idCliente) { error('Falta el cliente.'); }
        $u = checkToken();
        $db->prepare(
            "INSERT INTO pedidos (id_cliente, id_usuario, fecha, observacion) VALUES (?,?,CURDATE(),?)"
        )->execute([$idCliente, $u['id'], $obs]);
        ok(['id' => $db->lastInsertId()]);
        break;

    // ── Cuenta corriente ──────────────────────────────────────
    case 'get_cuenta_cliente':
        checkToken();
        $idCliente = intval($_REQUEST['idCliente'] ?? 0);
        if (!$idCliente) { error('Falta el cliente.'); }

        $stmt = $db->prepare(
            "SELECT * FROM cuenta_corriente WHERE id_cliente = ? ORDER BY fecha DESC, id DESC"
        );
        $stmt->execute([$idCliente]);
        $movs = $stmt->fetchAll();

        $saldo = array_sum(array_map(
            fn($m) => $m['tipo'] === 'cargo' ? -$m['monto'] : $m['monto'],
            $movs
        ));

        ok(['movimientos' => $movs, 'saldo' => $saldo]);
        break;

    case 'registrar_pago':
        checkToken();
        $idCliente = intval($_POST['id_cliente'] ?? 0);
        $monto     = floatval($_POST['monto']    ?? 0);
        $concepto  = limpiar($_POST['concepto']  ?? 'Pago');
        if (!$idCliente || $monto <= 0) { error('Datos inválidos.'); }

        $db->prepare(
            "INSERT INTO cuenta_corriente (id_cliente, concepto, tipo, monto, fecha)
             VALUES (?,'Pago: '||?,'pago',?,CURDATE())"
        )->execute([$idCliente, $concepto, $monto]);

        ok(['mensaje' => 'Pago registrado.']);
        break;

    // ── Estadísticas ──────────────────────────────────────────
    case 'get_estadisticas':
        checkToken();

        // Envasados por mes últimos 6 meses
        $stmt = $db->query(
            "SELECT DATE_FORMAT(fecha_envasado,'%Y-%m') AS mes, COUNT(*) AS total
             FROM envasados
             WHERE fecha_envasado >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY mes ORDER BY mes"
        );
        $porMes = $stmt->fetchAll();

        // Top clientes por entregas
        $stmt = $db->query(
            "SELECT c.nombre, COUNT(ent.id) AS total
             FROM entregas ent INNER JOIN clientes c ON c.id = ent.id_cliente
             GROUP BY c.id ORDER BY total DESC LIMIT 5"
        );
        $topClientes = $stmt->fetchAll();

        // Top estilos
        $stmt = $db->query(
            "SELECT tc.nombre, COUNT(e.id) AS total
             FROM envasados e INNER JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             GROUP BY tc.id ORDER BY total DESC LIMIT 5"
        );
        $topEstilos = $stmt->fetchAll();

        // Próximos vencimientos
        $stmt = $db->query(
            "SELECT c.nombre AS cliente, b.nombre AS barril, tc.nombre AS estilo,
                    e.fecha_envasado, e.fecha_vencimiento,
                    DATEDIFF(e.fecha_vencimiento, CURDATE()) AS dias_restantes
             FROM entregas ent
             INNER JOIN barriles b ON b.id = ent.id_barril
             INNER JOIN clientes c ON c.id = ent.id_cliente
             INNER JOIN envasados e ON e.id = ent.id_envasado
             LEFT JOIN tipo_cervezas tc ON tc.id = e.id_tipo_cerveza
             WHERE ent.estado = 'entregado'
               AND e.fecha_vencimiento IS NOT NULL
             ORDER BY dias_restantes ASC LIMIT 10"
        );
        $vencimientos = $stmt->fetchAll();

        ok(compact('porMes', 'topClientes', 'topEstilos', 'vencimientos'));
        break;

    // ── Usuarios ──────────────────────────────────────────────
    case 'get_usuarios':
        checkToken();
        $stmt = $db->query(
            "SELECT id, nombre, apellido, login, email, permiso, activo, created_at
             FROM usuarios ORDER BY nombre"
        );
        ok(['usuarios' => $stmt->fetchAll()]);
        break;

    case 'crear_usuario':
        $u = checkToken();
        if ($u['permiso'] !== 'admin') { error('Sin permisos.'); }
        $nombre    = limpiar($_POST['nombre']   ?? '');
        $apellido  = limpiar($_POST['apellido'] ?? '');
        $login     = limpiar($_POST['login']    ?? '');
        $password  = $_POST['password'] ?? '';
        $permiso   = limpiar($_POST['permiso']  ?? 'operario');
        if (!$nombre || !$login || !$password) { error('Faltan datos.'); }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $db->prepare(
            "INSERT INTO usuarios (nombre, apellido, login, password, permiso) VALUES (?,?,?,?,?)"
        )->execute([$nombre, $apellido, $login, $hash, $permiso]);

        ok(['id' => $db->lastInsertId()]);
        break;

    // ── Estilos de cerveza ────────────────────────────────────
    case 'get_estilos':
        checkToken();
        $stmt = $db->query("SELECT * FROM tipo_cervezas WHERE activo=1 ORDER BY nombre");
        ok(['estilos' => $stmt->fetchAll()]);
        break;

    case 'crear_estilo':
        checkToken();
        $nombre = limpiar($_POST['nombre'] ?? '');
        if (!$nombre) { error('El nombre es obligatorio.'); }
        $db->prepare(
            "INSERT INTO tipo_cervezas (nombre, descripcion) VALUES (?,?)"
        )->execute([$nombre, limpiar($_POST['descripcion'] ?? '')]);
        ok(['id' => $db->lastInsertId()]);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Acción no reconocida.']);
}
