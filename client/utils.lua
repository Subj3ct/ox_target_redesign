local utils = {}

local GetWorldCoordFromScreenCoord = GetWorldCoordFromScreenCoord
local StartShapeTestLosProbe = StartShapeTestLosProbe
local GetShapeTestResultIncludingMaterial = GetShapeTestResultIncludingMaterial

---@param flag number
---@return boolean hit
---@return number entityHit
---@return vector3 endCoords
---@return vector3 surfaceNormal
---@return number materialHash
function utils.raycastFromCamera(flag)
    local coords, normal = GetWorldCoordFromScreenCoord(0.5, 0.5)
    local destination = coords + normal * 10
    local handle = StartShapeTestLosProbe(coords.x, coords.y, coords.z, destination.x, destination.y, destination.z,
        flag, cache.ped, 4)

    while true do
        Wait(0)
        local retval, hit, endCoords, surfaceNormal, materialHash, entityHit = GetShapeTestResultIncludingMaterial(
        handle)

        if retval ~= 1 then
            ---@diagnostic disable-next-line: return-type-mismatch
            return hit, entityHit, endCoords, surfaceNormal, materialHash
        end
    end
end

function utils.getTexture()
    return lib.requestStreamedTextureDict('shared'), 'emptydot_32'
end

-- SetDrawOrigin is limited to 32 calls per frame. Set as 0 to disable.
local drawZoneSprites = GetConvarInt('ox_target:drawSprite', 24)
local SetDrawOrigin = SetDrawOrigin
local DrawSprite = DrawSprite
local ClearDrawOrigin = ClearDrawOrigin
-- Function to get ox_lib theme color for sprites
local function getOxLibSpriteColor()
    local primaryColor = GetConvar('ox:primaryColor', 'blue')
    local primaryShade = GetConvarInt('ox:primaryShade', 6)
    
    -- Mantine color palette mapping
    local colorMap = {
        blue = {
            [0] = vector(237, 242, 247, 255), [1] = vector(226, 232, 240, 255), [2] = vector(214, 222, 234, 255),
            [3] = vector(190, 201, 219, 255), [4] = vector(165, 175, 194, 255), [5] = vector(141, 149, 167, 255),
            [6] = vector(116, 123, 138, 255), [7] = vector(91, 97, 111, 255), [8] = vector(66, 71, 84, 255), [9] = vector(41, 45, 57, 255)
        },
        red = {
            [0] = vector(255, 245, 245, 255), [1] = vector(255, 227, 227, 255), [2] = vector(255, 201, 201, 255),
            [3] = vector(255, 168, 168, 255), [4] = vector(255, 135, 135, 255), [5] = vector(255, 107, 107, 255),
            [6] = vector(250, 82, 82, 255), [7] = vector(240, 62, 62, 255), [8] = vector(230, 42, 42, 255), [9] = vector(220, 22, 22, 255)
        },
        green = {
            [0] = vector(240, 253, 244, 255), [1] = vector(220, 252, 231, 255), [2] = vector(187, 247, 208, 255),
            [3] = vector(134, 239, 172, 255), [4] = vector(74, 222, 128, 255), [5] = vector(34, 197, 94, 255),
            [6] = vector(22, 163, 74, 255), [7] = vector(21, 128, 61, 255), [8] = vector(20, 93, 48, 255), [9] = vector(19, 58, 35, 255)
        },
        yellow = {
            [0] = vector(255, 253, 231, 255), [1] = vector(255, 251, 213, 255), [2] = vector(255, 243, 178, 255),
            [3] = vector(255, 230, 138, 255), [4] = vector(255, 213, 95, 255), [5] = vector(251, 191, 36, 255),
            [6] = vector(245, 158, 11, 255), [7] = vector(240, 125, 0, 255), [8] = vector(235, 92, 0, 255), [9] = vector(230, 59, 0, 255)
        },
        orange = {
            [0] = vector(255, 248, 240, 255), [1] = vector(255, 237, 213, 255), [2] = vector(255, 218, 185, 255),
            [3] = vector(255, 186, 147, 255), [4] = vector(255, 154, 109, 255), [5] = vector(255, 122, 71, 255),
            [6] = vector(253, 126, 20, 255), [7] = vector(251, 146, 60, 255), [8] = vector(249, 115, 22, 255), [9] = vector(247, 84, 0, 255)
        },
        purple = {
            [0] = vector(248, 240, 252, 255), [1] = vector(243, 232, 250, 255), [2] = vector(233, 213, 247, 255),
            [3] = vector(216, 180, 254, 255), [4] = vector(199, 147, 251, 255), [5] = vector(182, 114, 248, 255),
            [6] = vector(168, 85, 247, 255), [7] = vector(147, 51, 234, 255), [8] = vector(126, 34, 206, 255), [9] = vector(105, 17, 178, 255)
        },
        pink = {
            [0] = vector(253, 242, 248, 255), [1] = vector(252, 231, 243, 255), [2] = vector(251, 207, 232, 255),
            [3] = vector(249, 168, 212, 255), [4] = vector(244, 114, 182, 255), [5] = vector(236, 72, 153, 255),
            [6] = vector(219, 39, 119, 255), [7] = vector(190, 24, 93, 255), [8] = vector(157, 23, 77, 255), [9] = vector(124, 22, 61, 255)
        }
    }
    
    local colorTable = colorMap[primaryColor] or colorMap.blue
    local shade = math.max(0, math.min(9, primaryShade))
    
    return colorTable[shade] or colorTable[6]
end

local colour = vector(155, 155, 155, 175)
local hover = getOxLibSpriteColor()
local currentZones = {}
local previousZones = {}
local drawZones = {}
local drawN = 0
local width = 0.02
local height = width * GetAspectRatio(false)

if drawZoneSprites == 0 then drawZoneSprites = -1 end

---@param coords vector3
---@return CZone[], boolean
function utils.getNearbyZones(coords)
    if not Zones then return currentZones, false end

    local n = 0
    local nearbyZones = lib.zones.getNearbyZones()
    drawN = 0
    previousZones, currentZones = currentZones, table.wipe(previousZones)

    for i = 1, #nearbyZones do
        local zone = nearbyZones[i]
        local contains = zone:contains(coords)

        if contains then
            n += 1
            currentZones[n] = zone
        end

        if drawN <= drawZoneSprites and zone.drawSprite ~= false and (contains or (zone.distance or 7) < 7) then
            drawN += 1
            drawZones[drawN] = zone
            zone.colour = contains and hover or nil
        end
    end

    local previousN = #previousZones

    if n ~= previousN then
        return currentZones, true
    end

    if n > 0 then
        for i = 1, n do
            local zoneA = currentZones[i]
            local found = false

            for j = 1, previousN do
                local zoneB = previousZones[j]

                if zoneA == zoneB then
                    found = true
                    break
                end
            end

            if not found then
                return currentZones, true
            end
        end
    end

    return currentZones, false
end

function utils.drawZoneSprites(dict, texture)
    if drawN == 0 then return end

    for i = 1, drawN do
        local zone = drawZones[i]
        local spriteColour = zone.colour or colour

        if zone.drawSprite ~= false then
            SetDrawOrigin(zone.coords.x, zone.coords.y, zone.coords.z)
            DrawSprite(dict, texture, 0, 0, width, height, 0, spriteColour.r, spriteColour.g, spriteColour.b,
                spriteColour.a)
        end
    end

    ClearDrawOrigin()
end

function utils.hasExport(export)
    local resource, exportName = string.strsplit('.', export)

    return pcall(function()
        return exports[resource][exportName]
    end)
end

local playerItems = {}

function utils.getItems()
    return playerItems
end

---@param filter string | string[] | table<string, number>
---@param hasAny boolean?
---@return boolean
function utils.hasPlayerGotItems(filter, hasAny)
    if not playerItems then return true end

    local _type = type(filter)

    if _type == 'string' then
        return (playerItems[filter] or 0) > 0
    elseif _type == 'table' then
        local tabletype = table.type(filter)

        if tabletype == 'hash' then
            for name, amount in pairs(filter) do
                local hasItem = (playerItems[name] or 0) >= amount

                if hasAny then
                    if hasItem then return true end
                elseif not hasItem then
                    return false
                end
            end
        elseif tabletype == 'array' then
            for i = 1, #filter do
                local hasItem = (playerItems[filter[i]] or 0) > 0

                if hasAny then
                    if hasItem then return true end
                elseif not hasItem then
                    return false
                end
            end
        end
    end

    return not hasAny
end

---stub
---@param filter string | string[] | table<string, number>
---@return boolean
function utils.hasPlayerGotGroup(filter)
    return true
end

SetTimeout(0, function()
    if utils.hasExport('ox_inventory.Items') then
        setmetatable(playerItems, {
            __index = function(self, index)
                self[index] = exports.ox_inventory:Search('count', index) or 0
                return self[index]
            end
        })

        AddEventHandler('ox_inventory:itemCount', function(name, count)
            playerItems[name] = count
        end)
    end

    if utils.hasExport('ox_core.GetPlayer') then
        require 'client.framework.ox'
    elseif utils.hasExport('es_extended.getSharedObject') then
        require 'client.framework.esx'
    elseif utils.hasExport('qbx_core.HasGroup') then
        require 'client.framework.qbx'
    elseif utils.hasExport('ND_Core.getPlayer') then
        require 'client.framework.nd'
    end
end)

function utils.warn(msg)
    local trace = Citizen.InvokeNative(`FORMAT_STACK_TRACE` & 0xFFFFFFFF, nil, 0, Citizen.ResultAsString())
    local _, _, src = string.strsplit('\n', trace, 4)

    warn(('%s ^0%s\n'):format(msg, src:gsub(".-%(", '(')))
end

return utils
