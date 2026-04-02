-- ============================================================
-- CERVESIA - scenes/vaciar.lua
-- Vaciar barril
-- ============================================================

local composer = require("composer")
local widget   = require("widget")
local json     = require("json")
local network  = require("network")

local scene = composer.newScene()
local sceneGroup, txtError, vIdBarril

local function mostrarError(msg) if txtError then txtError.text = msg end end

local function doCancelar()
    composer.gotoScene("scenes.menu", { effect = "slideRight", time = 350 })
    composer.removeScene("scenes.vaciar")
end

local function netVaciando(event)
    if event.isError then mostrarError("ERROR: Sin conexión."); return end
    if event.phase ~= "ended" then return end
    local resp = json.decode(event.response)
    if not resp then mostrarError("Error del servidor."); return end
    if tonumber(resp.resultado) ~= 1 then
        mostrarError(resp.mensaje or "Error al vaciar."); return
    end
    native.showAlert("✔ Barril vaciado",
        "El barril fue vaciado correctamente.",
        { "OK" },
        function() doCancelar() end)
end

local function doVaciar()
    mostrarError("")
    local url = gConfig.servidor
              .. "accion=doVaciar"
              .. "&idUsuario=" .. gRegistro.idUsuario
              .. "&idBarril="  .. vIdBarril
    network.request(url, "GET", netVaciando)
end

function scene:create(event)
    sceneGroup = self.view
    local params = event.params or {}
    vIdBarril = params.idBarril or 0

    local bg = display.newRect(sceneGroup,
        display.contentCenterX, display.contentCenterY,
        display.contentWidth, display.contentHeight)
    bg:setFillColor(unpack(gColor.fondo1))

    local titulo = display.newText({
        parent = sceneGroup, text = "Vaciar barril",
        x = display.contentCenterX, y = 30,
        font = gColor.fuente1a, fontSize = 18,
    })
    titulo:setFillColor(0.1, 0.1, 0.1)

    local infos = {
        { "Barril: ",       params.nombreBarril      or "" },
        { "Código: ",       params.codBarril         or "" },
        { "Tipo cerveza: ", params.nombreTipoCerveza or "" },
        { "Envasado: ",     params.fechaEnvasado     or "" },
        { "Vencimiento: ",  params.fechaVencimiento  or "" },
    }
    local y = 65
    for _, v in ipairs(infos) do
        local t = display.newText({ parent = sceneGroup,
            text = v[1] .. v[2], x = 10, y = y,
            width = display.contentWidth - 20,
            font = gColor.fuente1, fontSize = 13, align = "left" })
        t:setFillColor(0.2, 0.2, 0.2); t.anchorX = 0
        y = y + 22
    end

    txtError = display.newText({ parent = sceneGroup, text = "",
        x = display.contentCenterX, y = y + 20,
        width = display.contentWidth - 20,
        font = gColor.fuente1, fontSize = 12, align = "center" })
    txtError:setFillColor(unpack(gColor.rojo1))

    local btnCancelar = widget.newButton({
        x = display.contentWidth * 0.28, y = display.contentHeight - 35,
        width = display.contentWidth * 0.42, height = 50,
        label = "Cancelar", shape = "roundedRect", cornerRadius = 7,
        fontSize = 15,
        fillColor = { default = gColor.color5a, over = gColor.rojo1 },
        labelColor = { default = gColor.color6a, over = gColor.color6a },
        onRelease = doCancelar,
    })
    sceneGroup:insert(btnCancelar)

    local btnVaciar = widget.newButton({
        x = display.contentWidth * 0.73, y = display.contentHeight - 35,
        width = display.contentWidth * 0.42, height = 50,
        label = "Vaciar barril", shape = "roundedRect", cornerRadius = 7,
        fontSize = 15,
        fillColor = { default = gColor.color2a, over = gColor.color1a },
        labelColor = { default = gColor.color6a, over = gColor.color6a },
        onRelease = doVaciar,
    })
    sceneGroup:insert(btnVaciar)
end

function scene:show(event)  end
function scene:hide(event)  end
function scene:destroy()    end

scene:addEventListener("create",  scene)
scene:addEventListener("show",    scene)
scene:addEventListener("hide",    scene)
scene:addEventListener("destroy", scene)

return scene
