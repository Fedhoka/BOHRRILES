-- ============================================================
-- CERVESIA - main.lua
-- Punto de entrada de la aplicación
-- ============================================================

local composer = require("composer")

-- ── Configuración global ────────────────────────────────────
gConfig = {
    -- Cambiá esta URL por la de tu servidor
    servidor   = "http://www.tuservidor.com/barriles/app.php?",
    sistema    = "http://www.tuservidor.com/barriles/",
    apiUrl     = "http://www.tuservidor.com/barriles/api.php?",
}

-- Colores globales (RGB en rango 0-1)
gColor = {
    fondo1    = { 0.95, 0.95, 0.95 },
    fondo1a   = { 0.85, 0.85, 0.85 },
    color1a   = { 0.20, 0.40, 0.75 },   -- Azul  (Consultar)
    color2a   = { 0.13, 0.60, 0.33 },   -- Verde (Envasar)
    color3a   = { 0.80, 0.40, 0.10 },   -- Naranja (Entregar)
    color4a   = { 0.55, 0.18, 0.60 },   -- Violeta (Recibir)
    color5a   = { 0.50, 0.50, 0.50 },   -- Gris
    color6a   = { 1.00, 1.00, 1.00 },   -- Blanco
    rojo1     = { 0.80, 0.10, 0.10 },
    fuente1   = "Helvetica",
    fuente1a  = "Helvetica-Bold",
    fuente2a  = "Helvetica",
}

-- ── Sesión del usuario (se llena en registro/login) ─────────
gRegistro = {
    idUsuario = 0,
    nombre    = "",
    apellido  = "",
    login     = "",
    password  = "",
    email     = "",
    permiso   = "",
    token     = "",
}

-- ── Pantalla de inicio ──────────────────────────────────────
display.setDefault("background", unpack(gColor.fondo1))

composer.gotoScene("scenes.cargando", { effect = "fade", time = 300 })
