-- ============================================================
-- CERVESIA - Base de datos completa
-- Versión 1.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS cervesia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cervesia;

-- ── USUARIOS ─────────────────────────────────────────────────
CREATE TABLE usuarios (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    apellido     VARCHAR(100) NOT NULL,
    login        VARCHAR(60)  NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,   -- bcrypt hash
    email        VARCHAR(150),
    permiso      ENUM('admin','operario','vendedor') NOT NULL DEFAULT 'operario',
    token        VARCHAR(64),
    activo       TINYINT(1) NOT NULL DEFAULT 1,
    created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── CLIENTES ─────────────────────────────────────────────────
CREATE TABLE clientes (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(150) NOT NULL,
    razon_social VARCHAR(200),
    telefono     VARCHAR(30),
    email        VARCHAR(150),
    direccion    VARCHAR(250),
    ciudad       VARCHAR(100),
    activo       TINYINT(1) NOT NULL DEFAULT 1,
    created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── TIPOS DE CERVEZA ─────────────────────────────────────────
CREATE TABLE tipo_cervezas (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    descripcion  TEXT,
    activo       TINYINT(1) NOT NULL DEFAULT 1
);

-- ── BARRILES ─────────────────────────────────────────────────
CREATE TABLE barriles (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(150) NOT NULL,
    codigo       VARCHAR(50)  NOT NULL UNIQUE,   -- código de barras EAN
    capacidad_lt DECIMAL(6,2) NOT NULL DEFAULT 50,
    estado       ENUM('disponible','envasado','entregado','vacio') NOT NULL DEFAULT 'disponible',
    activo       TINYINT(1) NOT NULL DEFAULT 1,
    created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── ENVASADOS (producción) ────────────────────────────────────
-- Un registro por cada vez que un barril es llenado
CREATE TABLE envasados (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_barril       INT NOT NULL,
    id_tipo_cerveza INT NOT NULL,
    id_usuario      INT NOT NULL,
    fecha_envasado  DATE NOT NULL,
    fecha_vencimiento DATE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barril)       REFERENCES barriles(id),
    FOREIGN KEY (id_tipo_cerveza) REFERENCES tipo_cervezas(id),
    FOREIGN KEY (id_usuario)      REFERENCES usuarios(id)
);

-- ── ENTREGAS ─────────────────────────────────────────────────
-- Entrega de un barril a un cliente
CREATE TABLE entregas (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    id_envasado  INT NOT NULL,
    id_barril    INT NOT NULL,
    id_cliente   INT NOT NULL,
    id_usuario   INT NOT NULL,
    fecha        DATE     NOT NULL,
    precio       DECIMAL(10,2),
    estado       ENUM('entregado','devuelto') NOT NULL DEFAULT 'entregado',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_envasado) REFERENCES envasados(id),
    FOREIGN KEY (id_barril)   REFERENCES barriles(id),
    FOREIGN KEY (id_cliente)  REFERENCES clientes(id),
    FOREIGN KEY (id_usuario)  REFERENCES usuarios(id)
);

-- ── DEVOLUCIONES ─────────────────────────────────────────────
CREATE TABLE devoluciones (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    id_entrega   INT NOT NULL,
    id_usuario   INT NOT NULL,
    fecha        DATE     NOT NULL,
    observacion  TEXT,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_entrega) REFERENCES entregas(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- ── VACIADOS ─────────────────────────────────────────────────
CREATE TABLE vaciados (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    id_barril    INT NOT NULL,
    id_usuario   INT NOT NULL,
    fecha        DATE     NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barril)  REFERENCES barriles(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- ── TIPOS DE ENVASE (latas/botellas) ─────────────────────────
CREATE TABLE tipo_envases (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    capacidad_ml INT,
    activo       TINYINT(1) NOT NULL DEFAULT 1
);

-- ── ENVASES / LATAS ──────────────────────────────────────────
CREATE TABLE envases (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    codigo          VARCHAR(50)  NOT NULL UNIQUE,
    id_tipo_envase  INT NOT NULL,
    id_tipo_cerveza INT,
    stock_actual    INT NOT NULL DEFAULT 0,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tipo_envase)  REFERENCES tipo_envases(id),
    FOREIGN KEY (id_tipo_cerveza) REFERENCES tipo_cervezas(id)
);

-- ── MOVIMIENTOS DE ENVASES ────────────────────────────────────
CREATE TABLE movimientos_envases (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    id_envase    INT NOT NULL,
    id_usuario   INT NOT NULL,
    tipo         ENUM('ingreso','egreso') NOT NULL,
    cantidad     INT NOT NULL,
    id_cliente   INT,
    fecha        DATE NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_envase)  REFERENCES envases(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id)
);

-- ── PEDIDOS ───────────────────────────────────────────────────
CREATE TABLE pedidos (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente   INT NOT NULL,
    id_usuario   INT NOT NULL,
    fecha        DATE NOT NULL,
    estado       ENUM('pendiente','preparando','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
    observacion  TEXT,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

CREATE TABLE pedido_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido       INT NOT NULL,
    id_tipo_cerveza INT NOT NULL,
    cantidad        INT NOT NULL,
    precio_unit     DECIMAL(10,2),
    FOREIGN KEY (id_pedido)       REFERENCES pedidos(id),
    FOREIGN KEY (id_tipo_cerveza) REFERENCES tipo_cervezas(id)
);

-- ── CUENTA CORRIENTE ──────────────────────────────────────────
CREATE TABLE cuenta_corriente (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente   INT NOT NULL,
    concepto     VARCHAR(250) NOT NULL,
    tipo         ENUM('cargo','pago') NOT NULL,
    monto        DECIMAL(10,2) NOT NULL,
    fecha        DATE NOT NULL,
    id_entrega   INT,
    id_pedido    INT,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id),
    FOREIGN KEY (id_entrega) REFERENCES entregas(id),
    FOREIGN KEY (id_pedido)  REFERENCES pedidos(id)
);

-- ── DATOS DE PRUEBA ───────────────────────────────────────────
INSERT INTO usuarios (nombre, apellido, login, password, permiso)
VALUES ('Admin', 'Sistema', 'admin',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
        'admin');

INSERT INTO tipo_cervezas (nombre) VALUES
    ('IPA'),('Stout'),('Amber Ale'),('Lager'),('Wheat Beer');

INSERT INTO tipo_envases (nombre, capacidad_ml) VALUES
    ('Lata 473ml', 473),('Botella 330ml', 330),('Growler 1L', 1000);
