-- ============================================================
-- CERVESIA - scenes/envasar.lua
-- Envasar barril  (selección de tipo de cerveza + fechas)
--
-- MEJORA: al guardar correctamente, ofrece "Envasar otro"
-- para volver a escanear sin pasar por el menú.
-- ============================================================

local composer = require("composer")
local widget   = require("widget")
local json     = require("json")
local network  = require("network")

local scene = composer.newScene()

local sceneGroup
local txtError, fldEnvasado, fldVencimiento, tableView
local btnEnvasar
local vIdBarril, vIdTipoCerveza
local arrayTipoCervezas = {}

-- ── Helpers ──────────────────────────────────────────────────
local function mostrarError(msg)
    if txtError then txtError.text = msg end
end

local function doCancelar()
    composer.gotoScene("scenes.menu", { effect = "slideRight", time = 350 })
    composer.removeScene("scenes.envasar")
end

-- ── MEJORA: preguntar si quiere envasar otro ─────────────────
local function preguntarEnvasarOtro()
    native.showAlert(
        "✔ Barril envasado",
        "El barril fue envasado correctamente.\n¿Deseás envasar otro barril?",
        { "Sí, escanear otro", "Volver al menú" },
        function(event)
            if event.action == "clicked" then
                if event.index == 1 then
                    -- Volver a envasar: regresamos al menú y disparamos
                    -- automáticamente el escáner de envasar.
                    composer.gotoScene("scenes.menu", {
                        effect = "slideRight",
                        time   = 300,
                        params = {
                            -- El menú detecta este flag en show() y llama
                            -- la función correspondiente (ver menu.lua)
                            scanearOtro = function()
                                -- Pequeña pausa para que el menú termine de mostrarse
                                timer.performWithDelay(200, function()
                                    -- Re-usamos la función de escanear del menú
                                    -- disparándola como si el usuario hubiera tocado "Envasar"
                                    local menuScene = composer.getScene("scenes.menu")
                                    if menuScene and menuScene.doEnvasar then
                                        menuScene.doEnvasar()
                                    end
                                end)
                            end
                        },
                    })
                else
                    -- Volver al menú normalmente
                    composer.gotoScene("scenes.menu", {
                        effect = "slideRight",
                        time   = 350,
                    })
                end
                composer.removeScene("scenes.envasar")
            end
        end)
end

-- ── Callback de red: guardar envasado ────────────────────────
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

    -- ← MEJORA: en lugar de ir directo al menú, preguntamos
    preguntarEnvasarOtro()
end

-- ── Acción guardar ────────────────────────────────────────────
local function doEnvasar()
    if not vIdTipoCerveza then
        mostrarError("Debe seleccionar un tipo de cerveza.")
        return
    end
    local fechaEnv = fldEnvasado  and fldEnvasado.text  or ""
    local fechaVen = fldVencimiento and fldVencimiento.text or ""

    mostrarError("")

    local url = gConfig.servidor
              .. "accion=doEnvasar"
              .. "&idUsuario="     .. gRegistro.idUsuario
              .. "&idTipoCerveza=" .. vIdTipoCerveza
              .. "&idBarril="      .. vIdBarril
              .. "&fechaEnvasado=" .. fechaEnv
              .. "&fechaVencimiento=" .. fechaVen

    network.request(url, "GET", netEnvasando)
end

-- ── Renderizado de filas de la lista ─────────────────────────
local function onRowRender(event)
    local row  = event.row
    local data = arrayTipoCervezas[row.index]
    if not data then return end

    local lbl = display.newText({
        parent   = row,
        text     = data.nombreTipoCerveza,
        x        = row.contentWidth / 2,
        y        = row.contentHeight / 2,
        width    = row.contentWidth - 10,
        font     = gColor.fuente1,
        fontSize = 15,
        align    = "left",
    })
    lbl:setFillColor(0.1, 0.1, 0.1)
    lbl.anchorX = 0
    lbl.x = 8
end

-- ── Selección de fila ─────────────────────────────────────────
local function onRowTouch(event)
    if event.phase == "tap" then
        local row = event.row
        vIdTipoCerveza = arrayTipoCervezas[row.index].idTipoCerveza
        mostrarError("Seleccionado: " .. arrayTipoCervezas[row.index].nombreTipoCerveza)
        if btnEnvasar then btnEnvasar.isVisible = true end
    end
end

-- ── Callback de red: lista de tipos de cerveza ───────────────
local function netBuscarTipoCervezas(event)
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

    arrayTipoCervezas = {}
    for _, v in pairs(resp.tipocervezas or {}) do
        arrayTipoCervezas[#arrayTipoCervezas + 1] = {
            idTipoCerveza    = v.idTipoCerveza,
            nombreTipoCerveza = v.nombreTipoCerveza,
        }
    end

    if tableView then
        tableView:deleteAllRows()
        for _, v in ipairs(arrayTipoCervezas) do
            tableView:insertRow({
                rowHeight  = 44,
                rowColor   = { default = gColor.fondo1, over = gColor.color2a },
                params     = v,
            })
        end
    end
end

-- ── Creación de escena ────────────────────────────────────────
function scene:create(event)
    sceneGroup = self.view
    local params = event.params or {}
    vIdBarril    = params.idBarril or 0

    -- Fondo
    local bg = display.newRect(sceneGroup,
        display.contentCenterX, display.contentCenterY,
        display.contentWidth, display.contentHeight)
    bg:setFillColor(unpack(gColor.fondo1))

    -- Título
    local titulo = display.newText({
        parent   = sceneGroup,
        text     = "Envasar barril",
        x        = display.contentCenterX,
        y        = 30,
        font     = gColor.fuente1a,
        fontSize = 18,
    })
    titulo:setFillColor(0.1, 0.1, 0.1)

    -- Info del barril
    local txtBarril = display.newText({
        parent   = sceneGroup,
        text     = "Barril: " .. (params.nombreBarril or ""),
        x        = display.contentCenterX,
        y        = 60,
        width    = display.contentWidth - 20,
        font     = gColor.fuente1,
        fontSize = 14,
        align    = "center",
    })
    txtBarril:setFillColor(0.2, 0.2, 0.2)

    local txtCod = display.newText({
        parent   = sceneGroup,
        text     = "Código: " .. (params.codBarril or ""),
        x        = display.contentCenterX,
        y        = 80,
        font     = gColor.fuente1,
        fontSize = 12,
    })
    txtCod:setFillColor(0.5, 0.5, 0.5)

    -- Separador
    local linea = display.newRect(sceneGroup,
        display.contentCenterX, 95,
        display.contentWidth - 20, 1)
    linea:setFillColor(0.7, 0.7, 0.7)

    -- Lista de tipos de cerveza
    local listHeight = display.contentHeight - 310
    tableView = widget.newTableView({
        x               = display.contentCenterX,
        y               = 105 + listHeight / 2,
        width           = display.contentWidth,
        height          = listHeight,
        onRowRender     = onRowRender,
        onRowTouch      = onRowTouch,
        backgroundColor = gColor.fondo1,
    })
    sceneGroup:insert(tableView)

    -- Campos de fechas
    local baseY = display.contentHeight - 175

    local lblEnv = display.newText({
        parent = sceneGroup, text = "Fecha de envasado",
        x = display.contentCenterX, y = baseY,
        font = gColor.fuente1, fontSize = 13,
    })
    lblEnv:setFillColor(0.2, 0.2, 0.2)

    fldEnvasado = native.newTextField(
        display.contentCenterX, baseY + 25,
        display.contentWidth * 0.7, 38)
    fldEnvasado.inputType = "default"
    local hoy = os.date("%d/%m/%Y")
    fldEnvasado.text = hoy
    sceneGroup:insert(fldEnvasado)

    local lblVen = display.newText({
        parent = sceneGroup, text = "Fecha de vencimiento",
        x = display.contentCenterX, y = baseY + 60,
        font = gColor.fuente1, fontSize = 13,
    })
    lblVen:setFillColor(0.2, 0.2, 0.2)

    fldVencimiento = native.newTextField(
        display.contentCenterX, baseY + 85,
        display.contentWidth * 0.7, 38)
    fldVencimiento.inputType = "default"
    sceneGroup:insert(fldVencimiento)

    -- Error
    txtError = display.newText({
        parent = sceneGroup, text = "Seleccioná un tipo de cerveza.",
        x = display.contentCenterX, y = baseY + 120,
        width = display.contentWidth - 20,
        font = gColor.fuente1, fontSize = 12, align = "center",
    })
    txtError:setFillColor(unpack(gColor.rojo1))

    -- Botones
    local btnCancelar = widget.newButton({
        x = display.contentWidth * 0.28, y = display.contentHeight - 30,
        width = display.contentWidth * 0.42, height = 44,
        label = "Cancelar", shape = "roundedRect", cornerRadius = 7,
        fontSize = 15,
        fillColor  = { default = gColor.color5a, over = gColor.rojo1 },
        labelColor = { default = gColor.color6a, over = gColor.color6a },
        onRelease  = doCancelar,
    })
    sceneGroup:insert(btnCancelar)

    btnEnvasar = widget.newButton({
        x = display.contentWidth * 0.73, y = display.contentHeight - 30,
        width = display.contentWidth * 0.42, height = 44,
        label = "Guardar", shape = "roundedRect", cornerRadius = 7,
        fontSize = 15,
        fillColor  = { default = gColor.color2a, over = gColor.color1a },
        labelColor = { default = gColor.color6a, over = gColor.color6a },
        onRelease  = doEnvasar,
    })
    btnEnvasar.isVisible = false   -- se muestra al seleccionar cerveza
    sceneGroup:insert(btnEnvasar)
end

function scene:show(event)
    if event.phase == "did" then
        vIdTipoCerveza = nil

        -- Pedir lista de tipos de cerveza al servidor
        local url = gConfig.servidor .. "accion=get_lista_tipocervezas"
        network.request(url, "GET", netBuscarTipoCervezas)
    end
end

function scene:hide(event)
    if event.phase == "will" then
        if fldEnvasado    then fldEnvasado:removeSelf();    fldEnvasado    = nil end
        if fldVencimiento then fldVencimiento:removeSelf(); fldVencimiento = nil end
    end
end

function scene:destroy()
    arrayTipoCervezas = {}
end

scene:addEventListener("create",  scene)
scene:addEventListener("show",    scene)
scene:addEventListener("hide",    scene)
scene:addEventListener("destroy", scene)

return scene
