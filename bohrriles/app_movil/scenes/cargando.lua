-- ============================================================
-- CERVESIA - scenes/cargando.lua
-- Pantalla de carga y login
-- ============================================================

local composer = require("composer")
local widget   = require("widget")
local json     = require("json")
local network  = require("network")

local scene = composer.newScene()

local sceneGroup
local fldLogin, fldPassword, txtError, spinImage, spinTimer

-- ── Helpers ─────────────────────────────────────────────────
local function mostrarError(msg)
    if txtError then txtError.text = msg end
end

local function detenerSpin()
    if spinTimer then timer.cancel(spinTimer); spinTimer = nil end
    if spinImage then spinImage.isVisible = false end
end

-- ── Callback de red: login ───────────────────────────────────
local function netLogin(event)
    detenerSpin()
    if event.isError then
        mostrarError("ERROR: No se detecta conexión a internet.")
        return
    end
    if event.phase ~= "ended" then return end

    local resp = json.decode(event.response)
    if not resp then
        mostrarError("El servidor respondió con error.")
        return
    end
    if tonumber(resp.resultado) ~= 1 then
        mostrarError(resp.mensaje or "Login incorrecto.")
        return
    end

    -- Guardar datos de sesión
    gRegistro.idUsuario = resp.idUsuario
    gRegistro.nombre    = resp.nombre
    gRegistro.apellido  = resp.apellido
    gRegistro.permiso   = resp.permiso
    gRegistro.token     = resp.token

    composer.gotoScene("scenes.menu", { effect = "slideLeft", time = 400 })
    composer.removeScene("scenes.cargando")
end

-- ── Acción login ─────────────────────────────────────────────
local function doLogin()
    local login = fldLogin and fldLogin.text or ""
    local pass  = fldPassword and fldPassword.text or ""

    if login == "" or pass == "" then
        mostrarError("Ingresá usuario y contraseña.")
        return
    end

    -- Mostrar spinner
    if spinImage then spinImage.isVisible = true end

    local url = gConfig.servidor
              .. "accion=login&login=" .. login
              .. "&password=" .. pass

    network.request(url, "GET", netLogin)
end

-- ── Creación de escena ────────────────────────────────────────
function scene:create(event)
    sceneGroup = self.view

    -- Fondo
    local bg = display.newRect(sceneGroup,
        display.contentCenterX, display.contentCenterY,
        display.contentWidth, display.contentHeight)
    bg:setFillColor(unpack(gColor.fondo1))

    -- Logo
    local logo = display.newImage(sceneGroup, "assets/logo.png")
    logo.x = display.contentCenterX
    logo.y = display.contentCenterY - 120
    logo:scale(0.5, 0.5)

    -- Campo usuario
    fldLogin = native.newTextField(
        display.contentCenterX, display.contentCenterY - 30,
        display.contentWidth * 0.8, 44)
    fldLogin.placeholder  = "Usuario"
    fldLogin.inputType    = "default"
    sceneGroup:insert(fldLogin)

    -- Campo contraseña
    fldPassword = native.newTextField(
        display.contentCenterX, display.contentCenterY + 25,
        display.contentWidth * 0.8, 44)
    fldPassword.placeholder = "Contraseña"
    fldPassword.inputType   = "password"
    sceneGroup:insert(fldPassword)

    -- Mensaje de error
    txtError = display.newText({
        parent   = sceneGroup,
        text     = "",
        x        = display.contentCenterX,
        y        = display.contentCenterY + 75,
        width    = display.contentWidth * 0.85,
        font     = gColor.fuente1,
        fontSize = 13,
        align    = "center",
    })
    txtError:setFillColor(unpack(gColor.rojo1))

    -- Botón ingresar
    local btnIngresar = widget.newButton({
        x       = display.contentCenterX,
        y       = display.contentCenterY + 120,
        width   = display.contentWidth * 0.8,
        height  = 48,
        label   = "Ingresar",
        shape   = "roundedRect",
        cornerRadius = 8,
        fontSize = 16,
        fillColor = { default = gColor.color2a, over = gColor.color1a },
        labelColor = { default = gColor.color6a, over = gColor.color6a },
        onRelease = doLogin,
    })
    sceneGroup:insert(btnIngresar)

    -- Spinner (imagen de carga)
    spinImage = display.newImage(sceneGroup, "assets/Icon-mdpi.png")
    spinImage.x = display.contentCenterX
    spinImage.y = display.contentCenterY + 120
    spinImage.isVisible = false
end

function scene:show(event)
    if event.phase == "did" then
        -- Auto-spin al mostrar
        if spinImage then
            spinTimer = timer.performWithDelay(16, function()
                spinImage.rotation = (spinImage.rotation + 10) % 360
            end, 0)
        end
    end
end

function scene:hide(event)
    if event.phase == "will" then
        detenerSpin()
        if fldLogin    then fldLogin:removeSelf();    fldLogin    = nil end
        if fldPassword then fldPassword:removeSelf(); fldPassword = nil end
    end
end

function scene:destroy() end

scene:addEventListener("create",  scene)
scene:addEventListener("show",    scene)
scene:addEventListener("hide",    scene)
scene:addEventListener("destroy", scene)

return scene
