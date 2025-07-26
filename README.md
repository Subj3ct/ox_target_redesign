# ox_target

![](https://img.shields.io/github/downloads/communityox/ox_target/total?logo=github)
![](https://img.shields.io/github/downloads/communityox/ox_target/latest/total?logo=github)
![](https://img.shields.io/github/contributors/communityox/ox_target?logo=github)
![](https://img.shields.io/github/v/release/communityox/ox_target?logo=github) 

## ✨ Enhanced Version

A performant and flexible standalone "third-eye" targeting resource, now featuring **enhanced glassmorphism design**, **smooth animations**, and **advanced features**.

ox_target is the successor to qtarget, which was a mostly-compatible fork of bt-target.
To improve many design flaws, ox_target has been written from scratch and drops support for bt-target/qtarget standards, though partial compatibility is being implemented where possible.

### 🎨 New Enhanced Features

- 🎨 **Modern Glassmorphism Design** - Beautiful glass-like UI with backdrop blur effects
- 🌓 **Dark/Light Theme Support** - Automatic theme detection from ox_lib
- 🎭 **Smooth Animations** - Staggered entrance/exit animations with Material Design easing
- 📱 **Responsive Design** - Optimized for all screen sizes and resolutions
- ♿ **Accessibility Features** - Full keyboard navigation and screen reader support
- ⚡ **Performance Optimized** - Virtual scrolling, debounced updates, and efficient rendering
- 🔧 **Comprehensive Configuration** - Extensive customization options
- 🎯 **Enhanced API** - New features for advanced use cases

### 🚀 Quick Start

```lua
-- Enhanced option example
{
    name = 'example',
    icon = 'fa-solid fa-star',
    label = 'Enhanced Option',
    subtitle = 'With subtitle support',
    priority = true, -- Highlights important options
    animation = 'pulse 2s infinite', -- Custom icon animations
    onSelect = function(data)
        -- Your action here
    end
}
```

### 📖 Enhanced Documentation

For detailed documentation on all enhanced features, see [ENHANCED_FEATURES.md](ENHANCED_FEATURES.md).


## 📚 Documentation

https://coxdocs.dev/ox_target

## 💾 Download

https://github.com/communityox/ox_target/releases/latest/download/ox_target.zip

## ✨ Features

- Improved entity and world collision than its predecessor.
- Improved error handling when running external code.
- Menus for nested target options.
- Partial compatibility for qtarget (the thing qb-target is based on, I made the original idiots).
- Registering options no longer overrides existing options.
- Groups and items checking for supported frameworks.
