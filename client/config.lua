local config = {
    theme = {
        default = 'dark', -- 'dark' or 'light'
        autoDetect = true, -- Automatically detect theme from ox_lib (requires subj3ct ox_lib redesign)
        useOxLibColors = true, -- Use ox_lib theme colors (color/shade)
        fallbackColor = 'blue', -- Fallback color if ox_lib color not found
        fallbackShade = '5', -- Fallback shade if ox_lib shade not found 
    },
    
    debug = {
        enabled = GetConvarInt('ox_target:debug', 0) == 1,
        logLevel = 'info', -- 'debug', 'info', 'warn', 'error'
    },
}

-- Function to get configuration value
function config.get(key)
    local keys = {}
    for k in key:gmatch('[^%.]+') do
        table.insert(keys, k)
    end
    
    local value = config
    for _, k in ipairs(keys) do
        if value and type(value) == 'table' then
            value = value[k]
        else
            return nil
        end
    end
    
    return value
end

-- Function to set configuration value
function config.set(key, value)
    local keys = {}
    for k in key:gmatch('[^%.]+') do
        table.insert(keys, k)
    end
    
    local current = config
    for i = 1, #keys - 1 do
        local k = keys[i]
        if not current[k] or type(current[k]) ~= 'table' then
            current[k] = {}
        end
        current = current[k]
    end
    
    current[keys[#keys]] = value
end

-- Function to merge configuration with user overrides
function config.merge(userConfig)
    if type(userConfig) == 'table' then
        for key, value in pairs(userConfig) do
            config.set(key, value)
        end
    end
end

-- Export configuration
return config 