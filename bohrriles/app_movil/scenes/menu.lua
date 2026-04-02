-- ============================================================
-- CERVESIA - scenes/menu.lua
-- Menú principal con escáner QR integrado
-- ============================================================

local composer = require("composer")
local widget   = require("widget")
local json     = require("json")
local network  = require("network")

local scene = composer.newScene()

local sceneGroup, txtError
local qrscanner  -- se carga cuando se usa

-- ── Helpers ──────────────────────────────────────────────────
local function mostrarError(msg)
    if txtError then txtError.text = msg end
end

local function irA(nombreScene, params)
    composer.gotoScene("scenes." .. nombreScene, {
        effect = "slideLeft",
        time   = 350,
        params = params,
    })
    composer.removeScene("scenes.menu")
end

-- ── Escáner genérico ─────────────────────────────────────────
-- accion    : string con la acción a llamar en el servidor
-- topbarTxt : texto que muestra el escáner
-- onSuccess : function(datos) llamada con la respuesta del servidor
local function escanear(accion, topbarTxt, onSuccess)

    -- Callback de red
    local function netCallback(event)
        if event.isError then
            mostrarError("ERROR: Sin conexión a internet.")
            return
        end
        if event.phase ~= "ended" then return end

        print("RESPONSE: " .. event.response)
        local resp = json.decode(event.response)
        if not resp then
            mostrarError("El servidor respondió con error.")
            return
        end
        if tonumber(resp.errno) and tonumber(resp.errno) ~= 0 then
            mostrarError(resp.errdes or "Error del servidor.")
            return
        end
        onSuccess(resp)
    end

    -- Callback del lector QR
    local function qrListener(event)
        if event.message then
            local codBarril = event.message
            local url = gConfig.servidor
                      .. accion .. "&codBarril=" .. codBarril
            network.request(url, "GET", netCallback)
        elseif event.errorCode then
            native.showAlert("Error: " .. (event.errorCode or ""),
                event.errorMessage or "", { "OK" })
        end
    end

    -- En simulador no hay cámara: usar código de prueba
    if system.getInfo("environment") == "simulator" then
        qrListener({ message = "1234567890" })
        return
    end

    -- Abrir escáner real
    if not qrscanner then
        qrscanner = require("plugin.qrscanner")
    end
    qrscanner.show({
        topbar   = topbarTxt,
        symbols  = { "ean8", "ean13" },
        listener = qrListener,
    })
end

-- ── Escáner genérico para ENVASES ────────────────────────────
local function escanearEnvase(accion, topbarTxt, onSuccess)
    local function netCallback(event)
        if event.isError then
            mostrarError("ERROR: Sin conexión a internet.")
            return
        end
        if event.phase ~= "ended" then return end

        local resp = json.decode(event.response)
        if not resp then
            mostrarError("El servidor respondió con error.")
            return
        end
        if tonumber(resp.errno) and tonumber(resp.errno) ~= 0 then
            mostrarError(resp.errdes or "Error del servidor.")
            return
        end
        onSuccess(resp)
    end

    local function qrListener(event)
        if event.message then
            local url = gConfig.servidor
                      .. accion .. "&codEnvase=" .. event.message
            network.request(url, "GET", netCallback)
        elseif event.errorCode then
            native.showAlert("Error: " .. (event.errorCode or ""),
                event.errorMessage or "", { "OK" })
        end
    end

    if system.getInfo("environment") == "simulator" then
        qrListener({ message = "1802202000067" })
        return
    end

    if not qrscanner then
        qrscanner = require("plugin.qrscanner")
    end
    qrscanner.show({
        topbar   = topbarTxt,
        symbols  = { "ean8", "ean13" },
        listener = qrListener,
    })
end

-- ── Funciones de cada botón ──────────────────────────────────

local function doConsultarBarril()
    mostrarError("")
    escanear("accion=scan_barril", "Leer código de barril", function(resp)
        irA("consultabarril", {
            idBarril    = resp.idBarril,
            nombreBarril = resp.nombreBarril,
            codBarril   = resp.codbarril,
        })
    end)
end

local function doEnvasar()
    mostrarError("")
    escanear("accion=scan_barril_envasar", "Leer código de barril - Envasar", function(resp)
        irA("envasar", {
            idBarril    = resp.idBarril,
            nombreBarril = resp.nombreBarril,
            codBarril   = resp.codBarril,
        })
    end)
end

local function doVaciar()
    mostrarError("")
    escanear("accion=scan_barril_vaciar", "Leer código de barril - Vaciar", function(resp)
        irA("vaciar", {
            idBarril         = resp.idBarril,
            nombreBarril     = resp.nombreBarril,
            codBarril        = resp.codBarril,
            nombreTipoCerveza = resp.nombreTipoCerveza,
            fechaEnvasado    = resp.fechaEnvasado,
            fechaVencimiento = resp.fechaVencimiento,
        })
    end)
end

local function doEntregar()
    mostrarError("")
    escanear("accion=scan_barril_entregar", "Leer código de barril - Entregar", function(resp)
        irA("entregar", {
            idBarril         = resp.idBarril,
            nombreBarril     = resp.nombreBarril,
            codBarril        = resp.codBarril,
            idEnvasado       = resp.idEnvasado,
            nombreTipoCerveza = resp.nombreTipoCerveza,
            fechaEnvasado    = resp.fechaEnvasado,
            fechaVencimiento = resp.fechaVencimiento,
        })
    end)
end

local function doDevolver()
    mostrarError("")
    escanear("accion=scan_barril_devolver", "Leer código de barril - Devolver", function(resp)
        irA("devolver", {
            idBarril         = resp.idBarril,
            nombreBarril     = resp.nombreBarril,
            codBarril        = resp.codBarril,
            idEnvasado       = resp.idEnvasado,
            nombreTipoCerveza = resp.nombreTipoCerveza,
            fechaEnvasado    = resp.fechaEnvasado,
            fechaVencimiento = resp.fechaVencimiento,
            nombreComercio   = resp.nombreComercio,
            fechaEntrega     = resp.fechaEntrega,
            cantidadDias     = resp.cantidadDias,
        })
    end)
end

local function doConsultarEnvase()
    mostrarError("")
    escanearEnvase("accion=scan_envase", "Leer código de envase", function(resp)
        irA("consultaenvase", {
            idEnvase    = resp.idEnvase,
            nombreEnvase = resp.nombreEnvase,
            codEnvase   = resp.codEnvase,
        })
    end)
end

local function doIngresarLatas()
    mostrarError("")
    escanearEnvase("accion=scan_envase", "Leer código de envase - Ingresar", function(resp)
        irA("envasarenvase", {
            idEnvase         = resp.idEnvase,
            nombreEnvase     = resp.nombreEnvase,
            codEnvase        = resp.codEnvase,
            nombreTipoEnvase = resp.nombreTipoEnvase,
            nombreTipoCerveza = resp.nombreTipoCerveza,
            stockActual      = resp.stockActual,
        })
    end)
end

local function doEntregarLatas()
    mostrarError("")
    escanearEnvase("accion=scan_envase", "Leer código de envase - Entregar", function(resp)
        irA("entregarenvase", {
            idEnvase         = resp.idEnvase,
            nombreEnvase     = resp.nombreEnvase,
            codEnvase        = resp.codEnvase,
            nombreTipoEnvase = resp.nombreTipoEnvase,
            nombreTipoCerveza = resp.nombreTipoCerveza,
            stockActual      = resp.stockActual,
        })
    end)
end

local function doSalir()
    native.showAlert("Cerrar App",
        "¿Está seguro que desea cerrar la App?\nEsta acción cerrará su sesión de usuario.",
        { "Cancelar", "Salir" },
        function(event)
            if event.action == "clicked" and event.index == 2 then
                gRegistro = {}
                composer.gotoScene("scenes.cargando", { effect = "fade", time = 300 })
                composer.removeScene("scenes.menu")
            end
        end)
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
    logo.y = 55
    logo:scale(0.35, 0.35)

    -- Mensaje de error / estado
    txtError = display.newText({
        parent   = sceneGroup,
        text     = "Bienvenido, " .. (gRegistro.nombre or "") .. ".",
        x        = display.contentCenterX,
        y        = 100,
        width    = display.contentWidth - 20,
        font     = gColor.fuente1,
        fontSize = 13,
        align    = "center",
    })
    txtError:setFillColor(0.3, 0.3, 0.3)

    -- ── Definición de botones ─────────────────────────────────
    local botones = {
        { label = "Consultar barril",  color = gColor.color1a, action = doConsultarBarril },
        { label = "Envasar",           color = gColor.color2a, action = doEnvasar         },
        { label = "Vaciar",            color = gColor.color2a, action = doVaciar          },
        { label = "Entregar",          color = gColor.color3a, action = doEntregar        },
        { label = "Recibir / Devolver",color = gColor.color4a, action = doDevolver        },
        { label = "Consultar lata",    color = gColor.color1a, action = doConsultarEnvase },
        { label = "Ingresar latas",    color = gColor.color2a, action = doIngresarLatas   },
        { label = "Entregar latas",    color = gColor.color3a, action = doEntregarLatas   },
    }

    local btnW  = (display.contentWidth - 30) / 2
    local btnH  = 50
    local startY = 135
    local gap   = 8

    for i, b in ipairs(botones) do
        local col = ((i - 1) % 2)       -- 0 = izquierda, 1 = derecha
        local row = math.floor((i - 1) / 2)
        local x = 10 + btnW * col + col * 10 + btnW / 2
        local y = startY + row * (btnH + gap) + btnH / 2

        local btn = widget.newButton({
            x            = x,
            y            = y,
            width        = btnW,
            height       = btnH,
            label        = b.label,
            shape        = "roundedRect",
            cornerRadius = 7,
            fontSize     = 13,
            fillColor    = { default = b.color, over = gColor.color5a },
            labelColor   = { default = gColor.color6a, over = gColor.color6a },
            onRelease    = b.action,
        })
        sceneGroup:insert(btn)
    end

    -- Botón salir
    local btnSalir = widget.newButton({
        x         = display.contentCenterX,
        y         = startY + 4 * (btnH + gap) + btnH / 2 + 15,
        width     = display.contentWidth - 20,
        height    = btnH,
        label     = "Cerrar sesión",
        shape     = "roundedRect",
        cornerRadius = 7,
        fontSize  = 14,
        fillColor = { default = gColor.color5a, over = gColor.rojo1 },
        labelColor = { default = gColor.color6a, over = gColor.color6a },
        onRelease = doSalir,
    })
    sceneGroup:insert(btnSalir)
end

function scene:show(event)
    if event.phase == "did" then
        -- Si volvemos al menú con un "escanear otro" pendiente, lanzarlo
        local params = event.params or {}
        if params.scanearOtro then
            params.scanearOtro()
        end
        txtError.text = "Bienvenido, " .. (gRegistro.nombre or "") .. "."
    end
end

function scene:hide(event) end
function scene:destroy()   end

scene:addEventListener("create",  scene)
scene:addEventListener("show",    scene)
scene:addEventListener("hide",    scene)
scene:addEventListener("destroy", scene)

return scene
