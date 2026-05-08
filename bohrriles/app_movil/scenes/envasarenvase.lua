-- ============================================================
-- CERVESIA - scenes/envasarenvase.lua
-- Ingresar latas / envases
--
-- MEJORA: al guardar, ofrece "Escanear otro envase"
-- sin tener que volver al menú.
-- ============================================================

local composer = require("composer")
local widget   = require("widget")
local json     = require("json")
local network  = require("network")

local scene = composer.newScene()

local sceneGroup
local txtError, fldCantidad, btnGuardar
local vIdEnvase

-- ── Helpers ──────────────────────────────────────────────────
local function mostrarError(msg)
    if txtError then txtError.text = msg end
end

local function doCancelar()
    composer.gotoScene("scenes.menu", { effect = "slideRight", time = 350 })
    composer.removeScene("scenes.envasarenvase")
end

-- ── MEJORA: preguntar si quiere ingresar otro ─────────────────
local function preguntarEscanearOtro()
    native.showAlert(
        "✔ Movimiento registrado",
        "El movimiento fue registrado correctamente.\n¿Deseás escanear otro envase?",
        { "Sí, escanear otro", "Volver al menú" },
        function(event)
            if event.action == "clicked" then
                if event.index == 1 then
                    -- Volver al menú y disparar automáticamente "Ingresar latas"
                    composer.gotoScene("scenes.menu", {
                        effect = "slideRight",
                        time   = 300,
                        params = {
                            scanearOtro = function()
                                timer.performWithDelay(200, function()
                                    local menuScene = composer.getScene("scenes.menu")
                                    if menuScene and menuScene.doIngresarLatas then
                                        menuScene.doIngresarLatas()
                                    end
                                end)
                            end
                        },
                    })
                else
                    composer.gotoScene("scenes.menu", { effect = "slideRight", time = 350 })
                end
                composer.removeScene("scenes.envasarenvase")
            end
        end)
end

-- ── Callback de red: guardar ─────────────────────────────────
local function netEnvasando(event)
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
    if tonumber(resp.resultado) ~= 1 then
        mostrarError(resp.mensaje or "Error al guardar.")
        return
    end

    -- ← MEJORA: preguntar en lugar de ir directo al menú
    preguntarEscanearOtro()
end

-- ── Acción guardar ────────────────────────────────────────────
local function doGuardar()
    local cantStr = fldCantidad and fldCantidad.text or ""
    if cantStr == "" or tonumber(cantStr) == nil then
        mostrarError("Debe completar la cantidad.")
        return
    end

    mostrarError("")

    local url = gConfig.servidor
              .. "accion=doEnvasarEnvase"
              .. "&idUsuario=" .. gRegistro.idUsuario
              .. "&idEnvase="  .. vIdEnvase
              .. "&cantidad="  .. cantStr

    network.request(url, "GET", netEnvasando)
end

-- ── Creación de escena ────────────────────────────────────────
function scene:create(event)
    sceneGroup = self.view
    local params = event.params or {}
    vIdEnvase = params.idEnvase or 0

    -- Fondo
    local bg = display.newRect(sceneGroup,
        display.contentCenterX, display.contentCenterY,
        display.contentWidth, display.contentHeight)
    bg:setFillColor(unpack(gColor.fondo1))

    -- Título
    local titulo = display.newText({
        parent = sceneGroup, text = "Ingresar latas",
        x = display.contentCenterX, y = 30,
        font = gColor.fuente1a, fontSize = 18,
    })
    titulo:setFillColor(0.1, 0.1, 0.1)

    -- Info envase
    local infos = {
        { label = "Envase: ",      value = params.nombreEnvase     or "" },
        { label = "Código: ",      value = params.codEnvase        or "" },
        { label = "Tipo envase: ", value = params.nombreTipoEnvase or "" },
        { label = "Cerveza: ",     value = params.nombreTipoCerveza or "" },
        { label = "Stock actual: ",value = tostring(params.stockActual or 0) },
    }
    local y = 65
    for _, info in ipairs(infos) do
        local txt = display.newText({
            parent = sceneGroup,
            text   = info.label .. info.value,
            x = display.contentCenterX, y = y,
            width = display.contentWidth - 20,
            font = gColor.fuente1, fontSize = 13, align = "left",
        })
        txt:setFillColor(0.2, 0.2, 0.2)
        txt.anchorX = 0; txt.x = 10
        y = y + 22
    end

    -- Separador
    local linea = display.newRect(sceneGroup,
        display.contentCenterX, y + 5,
        display.contentWidth - 20, 1)
    linea:setFillColor(0.7, 0.7, 0.7)

    -- Campo cantidad
    local lblCant = display.newText({
        parent = sceneGroup, text = "Cantidad",
        x = display.contentCenterX, y = y + 30,
        font = gColor.fuente1, fontSize = 14,
    })
    lblCant:setFillColor(0.2, 0.2, 0.2)

    fldCantidad = native.newTextField(
        display.contentCenterX, y + 65,
        display.contentWidth * 0.5, 44)
    fldCantidad.inputType = "number"
    sceneGroup:insert(fldCantidad)

    -- Error
    txtError = display.newText({
        parent = sceneGroup, text = "",
        x = display.contentCenterX, y = y + 110,
        width = display.contentWidth - 20,
        font = gColor.fuente1, fontSize = 12, align = "center",
    })
    txtError:setFillColor(unpack(gColor.rojo1))

    -- Botones
    local btnCancelar = widget.newButton({
        x = display.contentWidth * 0.28, y = display.contentHeight - 35,
        width = display.contentWidth * 0.42, height = 50,
        label = "Cancelar", shape = "roundedRect", cornerRadius = 7,
        fontSize = 15,
        fillColor  = { default = gColor.color5a, over = gColor.rojo1 },
        labelColor = { default = gColor.color6a, over = gColor.color6a },
        onRelease  = doCancelar,
    })
    sceneGroup:insert(btnCancelar)

    btnGuardar = widget.newButton({
        x = display.contentWidth * 0.73, y = display.contentHeight - 35,
        width = display.contentWidth * 0.42, height = 50,
        label = "Guardar", shape = "roundedRect", cornerRadius = 7,
        fontSize = 15,
        fillColor  = { default = gColor.color2a, over = gColor.color1a },
        labelColor = { default = gColor.color6a, over = gColor.color6a },
        onRelease  = doGuardar,
    })
    sceneGroup:insert(btnGuardar)
end

function scene:show(event)  end

function scene:hide(event)
    if event.phase == "will" then
        if fldCantidad then fldCantidad:removeSelf(); fldCantidad = nil end
    end
end

function scene:destroy() end

scene:addEventListener("create",  scene)
scene:addEventListener("show",    scene)
scene:addEventListener("hide",    scene)
scene:addEventListener("destroy", scene)

return scene
