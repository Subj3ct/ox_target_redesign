if not lib.checkDependency('ox_lib', '3.30.0', true) then return end

lib.locale()

local utils = require 'client.utils'
local state = require 'client.state'
local options = require 'client.api'.getTargetOptions()
local config = require 'client.config'

require 'client.debug'
require 'client.defaults'
require 'client.compat.qtarget'

local SendNuiMessage = SendNuiMessage
local GetEntityCoords = GetEntityCoords
local GetEntityType = GetEntityType
local HasEntityClearLosToEntity = HasEntityClearLosToEntity
local GetEntityBoneIndexByName = GetEntityBoneIndexByName
local GetEntityBonePosition_2 = GetEntityBonePosition_2
local GetEntityModel = GetEntityModel
local IsDisabledControlJustPressed = IsDisabledControlJustPressed
local DisableControlAction = DisableControlAction
local DisablePlayerFiring = DisablePlayerFiring
local GetModelDimensions = GetModelDimensions
local GetOffsetFromEntityInWorldCoords = GetOffsetFromEntityInWorldCoords
local currentTarget = {}
local currentMenu
local menuChanged
local menuHistory = {}
local nearbyZones

-- Toggle ox_target, instead of holding the hotkey
local toggleHotkey = GetConvarInt('ox_target:toggleHotkey', 0) == 1
local mouseButton = GetConvarInt('ox_target:leftClick', 1) == 1 and 24 or 25
local debug = GetConvarInt('ox_target:debug', 0) == 1
local vec0 = vec3(0, 0, 0)

-- Debug function
local function debugLog(message)
    if debug then
        print('^3[ox_target] ' .. message .. '^0')
    end
end

-- Theme support
local currentTheme = 'dark'

local function getCurrentTheme()
    local success, result = pcall(function()
        if config and config.get and config.get('theme.autoDetect') == false then
            return config.get('theme.default') or 'dark'
        end
        
        local oxLibSettings = exports['ox_lib'].getCurrentSettings and exports['ox_lib'].getCurrentSettings() or nil
        if oxLibSettings and oxLibSettings.darkMode ~= nil then
            debugLog('getCurrentTheme - Got settings from ox_lib: ' .. tostring(oxLibSettings.darkMode))
            return oxLibSettings.darkMode and 'dark' or 'light'
        end
        
        local kvpValue = GetResourceKvpInt('dark_mode')
        local darkMode = kvpValue == 1
        
        debugLog('getCurrentTheme - KVP dark_mode: ' .. tostring(kvpValue))
        debugLog('getCurrentTheme - darkMode from KVP: ' .. tostring(darkMode))
        
        local kvpExists = GetResourceKvpString('dark_mode') ~= nil
        
        if not kvpExists then
            local convarValue = GetConvar('ox:darkMode', '0')
            debugLog('getCurrentTheme - convarValue: ' .. tostring(convarValue))
            
            if convarValue == 'true' or convarValue == '1' or convarValue == 'yes' then
                darkMode = true
            elseif convarValue == 'false' or convarValue == '0' or convarValue == 'no' then
                darkMode = false
            else
                local numValue = tonumber(convarValue)
                darkMode = numValue and numValue ~= 0 or false
            end
            
            debugLog('getCurrentTheme - darkMode from convar: ' .. tostring(darkMode))
        end
        
        local result = darkMode and 'dark' or 'light'
        debugLog('getCurrentTheme - returning: ' .. result)
        return result
    end)
    
    if success then
        return result
    else
        return config and config.get and config.get('theme.default') or 'dark'
    end
end

local function getOxLibThemeColor()
    local success, result = pcall(function()
        if config and config.get and config.get('theme.useOxLibColors') == false then
            debugLog('useOxLibColors disabled, using fallback')
            return {
                color = config.get('theme.fallbackColor') or 'blue',
                shade = config.get('theme.fallbackShade') or '5'
            }
        end
        
        local convarColor = GetConvar('ox:primaryColor', 'red')
        local convarShade = GetConvarInt('ox:primaryShade', 8)
        
        debugLog('ox:primaryColor = ' .. tostring(convarColor))
        debugLog('ox:primaryShade = ' .. tostring(convarShade))
        
        return {
            color = convarColor,
            shade = tostring(convarShade)
        }
    end)
    
    if success then
        debugLog('getOxLibThemeColor success: ' .. tostring(result.color) .. '-' .. tostring(result.shade))
        return result
    else
        debugLog('getOxLibThemeColor failed, using fallback')
        return {
            color = config and config.get and config.get('theme.fallbackColor') or 'blue',
            shade = config and config.get and config.get('theme.fallbackShade') or '5'
        }
    end
end

local function sendThemeToNUI()
    debugLog('sendThemeToNUI: Starting function')
    local success, theme = pcall(getCurrentTheme)
    local success2, themeColor = pcall(getOxLibThemeColor)
    
    debugLog('sendThemeToNUI - theme success: ' .. tostring(success) .. ', theme: ' .. tostring(theme))
    debugLog('sendThemeToNUI - color success: ' .. tostring(success2) .. ', color: ' .. tostring(themeColor and themeColor.color) .. ', shade: ' .. tostring(themeColor and themeColor.shade))
    debugLog('sendThemeToNUI - useOxLibColors: ' .. tostring(config and config.get and config.get('theme.useOxLibColors')))
    debugLog('sendThemeToNUI - currentTheme: ' .. tostring(currentTheme))
    
    if success and theme and (theme ~= currentTheme or success2) then
        debugLog('sendThemeToNUI: Condition met, creating message')
        currentTheme = theme
        
        local message = {
            event = 'setTheme',
            theme = theme
        }
        
        debugLog('Checking theme color condition:')
        debugLog('  success2: ' .. tostring(success2))
        debugLog('  themeColor: ' .. tostring(themeColor ~= nil))
        debugLog('  config: ' .. tostring(config ~= nil))
        debugLog('  config.get: ' .. tostring(config and config.get ~= nil))
        debugLog('  useOxLibColors: ' .. tostring(config and config.get and config.get('theme.useOxLibColors')))
        
        if success2 and themeColor and config and config.get and config.get('theme.useOxLibColors') then
            message.themeColor = themeColor.color
            message.themeShade = themeColor.shade
            debugLog('Sending theme color: ' .. themeColor.color .. '-' .. themeColor.shade)
        else
            debugLog('NOT sending theme color - condition not met')
        end
        
        debugLog('Sending NUI message: ' .. json.encode(message))
        SendNuiMessage(json.encode(message))
        debugLog('sendThemeToNUI: Message sent')
    else
        debugLog('sendThemeToNUI: Condition not met, not sending message')
        debugLog('sendThemeToNUI: success=' .. tostring(success) .. ', theme=' .. tostring(theme) .. ', theme~=currentTheme=' .. tostring(theme ~= currentTheme) .. ', success2=' .. tostring(success2))
    end
end

local function sendNuiMessage(event, data)
    local success, message = pcall(function()
        local msg = {
            event = event
        }
        
        if data then
            for k, v in pairs(data) do
                msg[k] = v
            end
        end
        
        return json.encode(msg)
    end)
    
    if success then
        SendNuiMessage(message)
    else
        SendNuiMessage(json.encode({ event = event }))
    end
end

-- Handle submenu selections
RegisterNUICallback('submenuSelect', function(data, cb)
    
    local targetType, targetId, zoneId, submenuIndex = table.unpack(data)
    
    local originalOption = nil
    if targetType == "zones" then
        if nearbyZones and nearbyZones[zoneId] then
            if nearbyZones[zoneId].options then
                originalOption = nearbyZones[zoneId].options[targetId] or nearbyZones[zoneId].options[targetId - 1]
                if nearbyZones[zoneId].options[targetId] then
                elseif nearbyZones[zoneId].options[targetId - 1] then
                end
            else
            end
        end
    else
        originalOption = currentTarget[targetType][targetId]
    end
    
    if originalOption then
        
        if originalOption.submenu then
            
            if originalOption.submenu[submenuIndex + 1] then
                local submenuItem = originalOption.submenu[submenuIndex + 1]
                
                if submenuItem.onSelect then
                    submenuItem.onSelect(submenuItem)
                elseif submenuItem.action then
                    submenuItem.action()
                elseif submenuItem.event then
                    if submenuItem.args then
                        TriggerEvent(submenuItem.event, submenuItem.args)
                    else
                        TriggerEvent(submenuItem.event)
                    end
                elseif submenuItem.serverEvent then
                    if submenuItem.args then
                        TriggerServerEvent(submenuItem.serverEvent, submenuItem.args)
                    else
                        TriggerServerEvent(submenuItem.serverEvent)
                    end
                elseif submenuItem.command then
                    ExecuteCommand(submenuItem.command)
                elseif submenuItem.export then
                    if submenuItem.exportArgs then
                        exports[submenuItem.export](table.unpack(submenuItem.exportArgs))
                    elseif submenuItem.args then
                        exports[submenuItem.export](submenuItem.args)
                    else
                        exports[submenuItem.export]()
                    end
                else
                end
            else
            end
        else
        end
    else
    end
    
    cb('ok')
end)

RegisterNetEvent('ox_lib:refreshConfig')
AddEventHandler('ox_lib:refreshConfig', function()
    sendThemeToNUI()
end)

RegisterNetEvent('ox_lib:settingsChanged')
AddEventHandler('ox_lib:settingsChanged', function(data)
    debugLog('ox_lib settings changed: ' .. json.encode(data))
    if data and data.darkMode ~= nil then
        debugLog('Dark mode changed to: ' .. tostring(data.darkMode))
        sendThemeToNUI()
    end
end)

RegisterNUICallback('requestTheme', function(data, cb)
    debugLog('NUI requested theme')
    sendThemeToNUI()
    cb({})
end)

---@param option OxTargetOption
---@param distance number
---@param endCoords vector3
---@param entityHit? number
---@param entityType? number
---@param entityModel? number | false
local function shouldHide(option, distance, endCoords, entityHit, entityType, entityModel)
    if option.menuName ~= currentMenu then
        return true
    end

    if distance > (option.distance or 7) then
        return true
    end

    if option.groups and not utils.hasPlayerGotGroup(option.groups) then
        return true
    end

    if option.items and not utils.hasPlayerGotItems(option.items, option.anyItem) then
        return true
    end

    local bone = entityModel and option.bones or nil

    if bone then
        ---@cast entityHit number
        ---@cast entityType number
        ---@cast entityModel number

        local _type = type(bone)

        if _type == 'string' then
            local boneId = GetEntityBoneIndexByName(entityHit, bone)

            if boneId ~= -1 and #(endCoords - GetEntityBonePosition_2(entityHit, boneId)) <= 2 then
                bone = boneId
            else
                return true
            end
        elseif _type == 'table' then
            local closestBone, boneDistance

            for j = 1, #bone do
                local boneId = GetEntityBoneIndexByName(entityHit, bone[j])

                if boneId ~= -1 then
                    local dist = #(endCoords - GetEntityBonePosition_2(entityHit, boneId))

                    if dist <= (boneDistance or 1) then
                        closestBone = boneId
                        boneDistance = dist
                    end
                end
            end

            if closestBone then
                bone = closestBone
            else
                return true
            end
        end
    end

    local offset = entityModel and option.offset or nil

    if offset then
        ---@cast entityHit number
        ---@cast entityType number
        ---@cast entityModel number

        if not option.absoluteOffset then
            local min, max = GetModelDimensions(entityModel)
            offset = (max - min) * offset + min
        end

        offset = GetOffsetFromEntityInWorldCoords(entityHit, offset.x, offset.y, offset.z)

        if #(endCoords - offset) > (option.offsetSize or 1) then
            return true
        end
    end

    if option.canInteract then
        local success, resp = pcall(option.canInteract, entityHit, distance, endCoords, option.name, bone)
        return not success or not resp
    end
end

local function startTargeting()
    if state.isDisabled() or state.isActive() or IsNuiFocused() or IsPauseMenuActive() then return end

    sendNuiMessage('leftTarget')
    options:wipe()
    
    state.setActive(true)

    local flag = 511
    local hit, entityHit, endCoords, distance, lastEntity, entityType, entityModel, hasTarget, zonesChanged
    local zones = {}
    
    hasTarget = false
    currentMenu = nil
    menuChanged = false

    CreateThread(function()
        local dict, texture = utils.getTexture()
        local lastCoords

        while state.isActive() do
            lastCoords = endCoords == vec0 and lastCoords or endCoords or vec0

            if debug then
                DrawMarker(28, lastCoords.x, lastCoords.y, lastCoords.z, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.2,
                    0.2,
                    ---@diagnostic disable-next-line: param-type-mismatch
                    255, 42, 24, 100, false, false, 0, true, false, false, false)
            end

            utils.drawZoneSprites(dict, texture)
            DisablePlayerFiring(cache.playerId, true)
            DisableControlAction(0, 25, true)
            DisableControlAction(0, 140, true)
            DisableControlAction(0, 141, true)
            DisableControlAction(0, 142, true)

            if state.isNuiFocused() then
                DisableControlAction(0, 1, true)
                DisableControlAction(0, 2, true)

                if not hasTarget or options and IsDisabledControlJustPressed(0, 25) then
                    state.setNuiFocus(false, false)
                end
            elseif hasTarget and IsDisabledControlJustPressed(0, mouseButton) then
                state.setNuiFocus(true, true)
            end

            Wait(0)
        end

        SetStreamedTextureDictAsNoLongerNeeded(dict)
    end)

    while state.isActive() do
        if not state.isNuiFocused() and lib.progressActive() then
            state.setActive(false)
            break
        end

        local playerCoords = GetEntityCoords(cache.ped)
        hit, entityHit, endCoords = lib.raycast.fromCamera(flag, 4, 20)
        distance = #(playerCoords - endCoords)

        if entityHit ~= 0 and entityHit ~= lastEntity then
            local success, result = pcall(GetEntityType, entityHit)
            entityType = success and result or 0
        end

        if entityType == 0 then
            local _flag = flag == 511 and 26 or 511
            local _hit, _entityHit, _endCoords = lib.raycast.fromCamera(_flag, 4, 20)
            local _distance = #(playerCoords - _endCoords)

            if _distance < distance then
                flag, hit, entityHit, endCoords, distance = _flag, _hit, _entityHit, _endCoords, _distance

                if entityHit ~= 0 then
                    local success, result = pcall(GetEntityType, entityHit)
                    entityType = success and result or 0
                end
            end
        end

        nearbyZones, zonesChanged = utils.getNearbyZones(endCoords)

        local entityChanged = entityHit ~= lastEntity
        local newOptions = (zonesChanged or entityChanged or menuChanged) and true

        if entityHit > 0 and entityChanged then
            currentMenu = nil

            if flag ~= 511 then
                entityHit = HasEntityClearLosToEntity(entityHit, cache.ped, 7) and entityHit or 0
            end

            if lastEntity ~= entityHit and debug then
                if lastEntity then
                    SetEntityDrawOutline(lastEntity, false)
                end

                if entityType ~= 1 then
                    SetEntityDrawOutline(entityHit, true)
                end
            end

            if entityHit > 0 then
                local success, result = pcall(GetEntityModel, entityHit)
                entityModel = success and result
            end
        end

        if hasTarget and (zonesChanged or entityChanged and hasTarget > 1) then
            sendNuiMessage('leftTarget')

            if entityChanged then 
                options:wipe() 
                debugLog('Wiped options due to entity change')
            end

            if debug and lastEntity > 0 then SetEntityDrawOutline(lastEntity, false) end

            hasTarget = false
        end
        
        if hasTarget and entityHit == 0 and totalOptions == 0 then
            hasTarget = false
            sendNuiMessage('leftTarget')
            debugLog('No valid targets, resetting target state')
        end

        if newOptions and entityModel and entityHit > 0 then
            debugLog('Setting options for entity: ' .. entityHit .. ' type: ' .. entityType .. ' model: ' .. entityModel)
            options:set(entityHit, entityType, entityModel)
        end

        lastEntity = entityHit
        currentTarget.entity = entityHit
        currentTarget.coords = endCoords
        currentTarget.distance = distance
        local hidden = 0
        local totalOptions = 0

        for k, v in pairs(options) do
            local optionCount = #v
            local dist = k == '__global' and 0 or distance
            totalOptions += optionCount
            debugLog('Processing ' .. optionCount .. ' options for key: ' .. tostring(k))

            for i = 1, optionCount do
                local option = v[i]
                local hide = shouldHide(option, dist, endCoords, entityHit, entityType, entityModel)

                if option.hide ~= hide then
                    option.hide = hide
                    newOptions = true
                end

                if hide then hidden += 1 end
            end
        end

        if zonesChanged then table.wipe(zones) end

        for i = 1, #nearbyZones do
            local zoneOptions = nearbyZones[i].options
            local optionCount = #zoneOptions
            totalOptions += optionCount
            zones[i] = zoneOptions

            for j = 1, optionCount do
                local option = zoneOptions[j]
                local hide = shouldHide(option, distance, endCoords, entityHit)

                if option.hide ~= hide then
                    option.hide = hide
                    newOptions = true
                end

                if hide then hidden += 1 end
            end
        end

        if newOptions then
            local visibleOptions = totalOptions - hidden
            
            if hasTarget == 1 and visibleOptions > 1 then
                hasTarget = true
            end

            if hasTarget and visibleOptions == 0 then
                hasTarget = false
                sendNuiMessage('leftTarget')
                debugLog('No visible options, sending leftTarget')
            elseif visibleOptions > 0 and (menuChanged or hasTarget ~= 1) then
                hasTarget = options.size

                if currentMenu and options.__global[1]?.name ~= 'builtin:goback' then
                    table.insert(options.__global, 1,
                        {
                            icon = 'fa-solid fa-circle-chevron-left',
                            label = locale('go_back'),
                            name = 'builtin:goback',
                            menuName = currentMenu,
                            openMenu = 'home'
                        })
                end

                sendThemeToNUI()
                
                debugLog('Sending options to NUI: ' .. visibleOptions .. ' visible options')
                sendNuiMessage('setTarget', {
                    options = options,
                    zones = zones,
                })
            end

            menuChanged = false
        end

        if toggleHotkey and IsPauseMenuActive() then
            state.setActive(false)
        end

        if hasTarget and (totalOptions == 0 or hidden == totalOptions) then
            hasTarget = false
            sendNuiMessage('leftTarget')
            debugLog('No valid options, clearing target')
        end
        
        if hasTarget and entityHit == 0 and (#nearbyZones == 0 or not nearbyZones) then
            hasTarget = false
            sendNuiMessage('leftTarget')
            debugLog('No entity and no zones, clearing target')
        end

        if not hasTarget or hasTarget == 1 then
            flag = flag == 511 and 26 or 511
        end

        Wait(hit and 50 or 100)
    end

    if lastEntity and debug then
        SetEntityDrawOutline(lastEntity, false)
    end

    hasTarget = false
    currentMenu = nil
    menuChanged = false
    
    state.setNuiFocus(false)
    sendNuiMessage('visible', { state = false })
    sendNuiMessage('leftTarget')
    table.wipe(currentTarget)
    options:wipe()

    if nearbyZones then table.wipe(nearbyZones) end
end

do
    ---@type KeybindProps
    local keybind = {
        name = 'ox_target',
        defaultKey = GetConvar('ox_target:defaultHotkey', 'LMENU'),
        defaultMapper = 'keyboard',
        description = locale('toggle_targeting'),
    }

    if toggleHotkey then
        function keybind:onPressed()
            if state.isActive() then
                return state.setActive(false)
            end

            return startTargeting()
        end
    else
        keybind.onPressed = startTargeting

        function keybind:onReleased()
            state.setActive(false)
        end
    end

    lib.addKeybind(keybind)
end

---@generic T
---@param option T
---@param server? boolean
---@return T
local function getResponse(option, server)
    local response = table.clone(option)
    response.entity = currentTarget.entity
    response.zone = currentTarget.zone
    response.coords = currentTarget.coords
    response.distance = currentTarget.distance

    if server then
        response.entity = response.entity ~= 0 and NetworkGetEntityIsNetworked(response.entity) and
            NetworkGetNetworkIdFromEntity(response.entity) or 0
    end

    response.icon = nil
    response.groups = nil
    response.items = nil
    response.canInteract = nil
    response.onSelect = nil
    response.export = nil
    response.event = nil
    response.serverEvent = nil
    response.command = nil

    return response
end

RegisterNUICallback('select', function(data, cb)
    cb(1)

    local zone = data[3] and nearbyZones[data[3]]

    ---@type OxTargetOption?
    local option = zone and zone.options[data[2]] or options[data[1]][data[2]]

    if option then
        if option.openMenu then
            local menuDepth = #menuHistory

            if option.name == 'builtin:goback' then
                option.menuName = option.openMenu
                option.openMenu = menuHistory[menuDepth]

                if menuDepth > 0 then
                    menuHistory[menuDepth] = nil
                end
            else
                menuHistory[menuDepth + 1] = currentMenu
            end

            menuChanged = true
            currentMenu = option.openMenu ~= 'home' and option.openMenu or nil

            options:wipe()
        else
            state.setNuiFocus(false)
        end

        currentTarget.zone = zone?.id

        if option.onSelect then
            option.onSelect(option.qtarget and currentTarget.entity or getResponse(option))
        elseif option.export then
            exports[option.resource or zone.resource][option.export](nil, getResponse(option))
        elseif option.event then
            TriggerEvent(option.event, getResponse(option))
        elseif option.serverEvent then
            TriggerServerEvent(option.serverEvent, getResponse(option, true))
        elseif option.command then
            ExecuteCommand(option.command)
        end

        if option.menuName == 'home' then return end
    end

    if not option?.openMenu and IsNuiFocused() then
        state.setActive(false)
    end
end)

-- Initialize theme on resource start
CreateThread(function()
    Wait(1000) 
    debugLog('ox_target: Resource started, sending initial theme')
    debugLog('ox_target: About to call sendThemeToNUI()')
    sendThemeToNUI()
    debugLog('ox_target: sendThemeToNUI() called')
end)

-- Example submenu
--[[
exports.ox_target:addBoxZone({
    coords = vec3(321.29, 565.17, 154.75),
    size = vec3(2, 2, 3),
    rotation = 45,
    options = {
        {
            name = 'test_actions',
            icon = 'fas fa-cog',
            label = 'Test Actions',
            submenu = {
                {
                    icon = 'fas fa-key',
                    label = 'Lock Vehicle',
                    command = 'time 15'
                },
                {
                    icon = 'fas fa-unlock',
                    label = 'Unlock Vehicle',
                    event = 'test:unlockVehicle'
                },
                {
                    icon = 'fas fa-trash',
                    label = 'Delete Vehicle',
                    event = 'test:deleteVehicle'
                },
                {
                    icon = 'fas fa-star',
                    label = 'Custom Action',
                    onSelect = function(item)
                        print('Selected:', item.label)
                    end
                },
                {
                    icon = 'fas fa-server',
                    label = 'Server Event',
                    serverEvent = 'test:serverAction',
                    args = { data = 'test' }
                }
            }
        }
    }
})
--]]