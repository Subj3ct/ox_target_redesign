const resource = GetParentResourceName();

async function fetchNui(eventName, data) {
  const resp = await fetch(`https://${resource}/${eventName}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(data),
  });

  return await resp.json();
}

const optionsWrapper = document.getElementById("options-wrapper");
const body = document.body;
const eye = document.getElementById("eye");
const html = document.documentElement;

let currentTheme = 'dark';

function initializeTheme() {
  try {
    setTheme('dark');
  } catch (error) {
    console.warn('Theme initialization failed:', error);
    setTheme('dark');
  }
}

function setTheme(theme, themeColor, themeShade) {
  currentTheme = theme;
  html.setAttribute('data-theme', theme);
  
  if (themeColor && themeShade !== undefined) {
    const root = document.documentElement;
    const colorVar = `--${themeColor}-${themeShade}`;
    const hoverShade = Math.min(parseInt(themeShade) + 1, 9);
    const hoverColorVar = `--${themeColor}-${hoverShade}`;
    
    const computedStyle = getComputedStyle(root);
    if (computedStyle.getPropertyValue(colorVar)) {
      root.style.setProperty('--color-primary', `var(${colorVar})`);
      root.style.setProperty('--color-primary-hover', `var(${hoverColorVar})`);
    }
  }
  
  html.style.transition = 'all 0.3s ease';
  
  setTimeout(() => {
    html.style.transition = '';
  }, 300);
}

function addRippleEffect(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple');
  
  button.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

let isAnimatingOut = false;

let activeSubmenu = null;
let submenuHoverState = false;

function createOptions(type, data, id, zoneId, index = 0) {
  if (data.hide) return;
  
  const option = document.createElement("div");
  
  option.addEventListener('mouseenter', () => {
    const existingSubmenu = document.querySelector('.submenu-container');
    if (existingSubmenu) {
      const submenuOwner = document.querySelector('.option-container[data-has-open-submenu="true"]');
      if (!submenuOwner || submenuOwner !== option) {
        closeSubmenu();
      }
    }
    
    gsap.to(option, {
      x: 8,
      scale: 1.03,
      duration: 0.15,
      ease: "power2.out"
    });
  });
  
  option.addEventListener('mouseleave', () => {
    gsap.to(option, {
      x: 0,
      scale: 1,
      duration: 0.15,
      ease: "power2.out"
    });
  });
  
  option.className = "option-container";
  
  option.targetType = type;
  option.targetId = id;
  option.zoneId = zoneId;
  
  const iconElement = createIconElement(data);
  
  const labelElement = createLabelElement(data);
  
  option.appendChild(iconElement);
  option.appendChild(labelElement);
  
  if (data.loading) {
    option.classList.add('loading');
  }
  
  if (data.priority) {
    option.style.order = '-1';
    option.style.borderColor = 'var(--color-primary)';
  }
  
  if (data.submenu) {
    const submenuIndicator = document.createElement("div");
    submenuIndicator.className = "submenu-indicator";
    submenuIndicator.innerHTML = '<i class="fas fa-chevron-right"></i>';
    option.appendChild(submenuIndicator);
    option.classList.add('has-submenu');
  }
  
  option.submenuData = data.submenu;
  
  option.addEventListener('click', onClick);
  
  if (data.submenu) {
  }
  
  optionsWrapper.appendChild(option);
  
  gsap.fromTo(option, 
    { opacity: 0, x: 30, scale: 0.9 },
    { opacity: 1, x: 0, scale: 1, duration: 0.25, delay: 0.05 * index, ease: "power2.out" }
  );
}

function createIconElement(data) {
  const iconContainer = document.createElement("div");
  iconContainer.className = "option-icon";
  
  if (data.icon) {
    const icon = document.createElement("i");
    icon.className = `fa-fw ${data.icon}`;
    
    if (data.iconColor) {
      icon.style.color = data.iconColor;
    }
    
    if (data.iconAnimation) {
      icon.style.animation = data.iconAnimation;
    }
    
    iconContainer.appendChild(icon);
  }
  
  return iconContainer;
}

function createLabelElement(data) {
  const labelContainer = document.createElement("div");
  labelContainer.className = "option-label";
  
  if (data.label) {
    if (data.label.includes('<')) {
      labelContainer.innerHTML = data.label;
    } else {
      labelContainer.textContent = data.label;
    }
  }
  
  if (data.subtitle) {
    const subtitle = document.createElement("div");
    subtitle.className = "option-subtitle";
    subtitle.textContent = data.subtitle;
    labelContainer.appendChild(subtitle);
  }
  
  return labelContainer;
}

function onClick(event) {
  const option = event.currentTarget;
  
  addRippleEffect(event);
  
  option.style.pointerEvents = 'none';
  setTimeout(() => {
    option.style.pointerEvents = '';
  }, 300);
  
  if (option.submenuData) {
    option.setAttribute('data-has-open-submenu', 'true');
    openSubmenu(option);
  } else {
    fetchNui("select", [
      option.targetType,
      option.targetId,
      option.zoneId
    ]);
  }
}

function openSubmenu(option) {
  closeSubmenu();
  
  const submenuContainer = document.createElement("div");
  submenuContainer.className = "submenu-container";
  
  let submenuItems = option.submenuData;
  if (typeof submenuItems === 'function') {
    submenuItems = submenuItems();
  }
  
  submenuItems.forEach((item, index) => {
    const submenuOption = document.createElement("div");
    submenuOption.className = "submenu-option";
    
    if (item.icon) {
      const icon = document.createElement("div");
      icon.className = "submenu-icon";
      icon.innerHTML = `<i class="fa-fw ${item.icon}"></i>`;
      if (item.iconColor) {
        icon.style.color = item.iconColor;
      }
      submenuOption.appendChild(icon);
    }
    
    const label = document.createElement("div");
    label.className = "submenu-label";
    label.textContent = item.label;
    submenuOption.appendChild(label);
    
    submenuOption.addEventListener('click', () => {
      if (item.action && typeof item.action === 'function') {
        item.action();
      } else if (item.onSelect && typeof item.onSelect === 'function') {
        item.onSelect(item);
      } else if (item.event || item.serverEvent || item.command || item.export) {
        fetchNui("submenuSelect", [
          option.targetType,
          option.targetId,
          option.zoneId,
          index
        ]);
      } else {
        fetchNui("submenuSelect", [
          option.targetType,
          option.targetId,
          option.zoneId,
          index
        ]);
      }
      closeSubmenu();
    });
    
    submenuContainer.appendChild(submenuOption);
  });
  
  const optionRect = option.getBoundingClientRect();
  const submenuRect = submenuContainer.getBoundingClientRect();
  
  let left = optionRect.right + 8;
  let top = optionRect.top;
  
  if (left + submenuRect.width > window.innerWidth) {
    left = optionRect.left - submenuRect.width - 8;
  }
  
  if (top + submenuRect.height > window.innerHeight) {
    top = window.innerHeight - submenuRect.height - 8;
  }
  
  submenuContainer.style.position = 'fixed';
  submenuContainer.style.left = left + 'px';
  submenuContainer.style.top = top + 'px';
  submenuContainer.style.transform = 'scale(0.95) translateY(-10px)';
  submenuContainer.style.opacity = '0';
  
  document.body.appendChild(submenuContainer);
  
  requestAnimationFrame(() => {
    submenuContainer.style.transition = 'all 0.2s ease';
    submenuContainer.style.transform = 'scale(1) translateY(0)';
    submenuContainer.style.opacity = '1';
  });
  
  submenuContainer.addEventListener('mouseenter', () => {
    gsap.to(option, {
      x: 8,
      scale: 1.03,
      duration: 0.15,
      ease: "power2.out"
    });
  });
  
  submenuContainer.addEventListener('mouseleave', (event) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && relatedTarget.closest('.option-container')) {
      return;
    }
    
    setTimeout(() => {
      closeSubmenu();
    }, 100);
  });
  
}

function closeSubmenu() {
  const existingSubmenu = document.querySelector('.submenu-container');
  if (existingSubmenu) {
    const submenuOwner = document.querySelector('.option-container[data-has-open-submenu="true"]');
    if (submenuOwner) {
      submenuOwner.removeAttribute('data-has-open-submenu');
    }
    
    existingSubmenu.style.transition = 'all 0.2s ease';
    existingSubmenu.style.transform = 'scale(0.95) translateY(-10px)';
    existingSubmenu.style.opacity = '0';
    
    setTimeout(() => {
      existingSubmenu.remove();
      activeSubmenu = null;
      submenuHoverState = false;
    }, 200);
  }
}

window.addEventListener("message", (event) => {
  try {
    const { event: eventType, state, options, zones, theme } = event.data;
    
    switch (eventType) {
    case "visible": {
      if (state) {
        body.style.visibility = "visible";
        body.style.opacity = "1";
        isAnimatingOut = false;
      } else {
        const options = optionsWrapper.querySelectorAll('.option-container');
        if (options.length > 0) {
          options.forEach((option) => {
            option.style.animation = 'fadeOut 200ms ease-out';
          });
          
          setTimeout(() => {
            body.style.visibility = "hidden";
            body.style.opacity = "0";
            optionsWrapper.innerHTML = "";
          }, 200);
        } else {
          body.style.visibility = "hidden";
          body.style.opacity = "0";
          optionsWrapper.innerHTML = "";
        }
      }
      return eye.classList.remove("eye-hover");
    }

    case "leftTarget": {
      eye.classList.remove("eye-hover");
      
      closeSubmenu();
      
      const options = optionsWrapper.querySelectorAll('.option-container');
      if (options && options.length > 0) {
        gsap.to(options, {
          x: 0,
          scale: 1,
          duration: 0.1,
          ease: "power2.out"
        });
      }
      
      if (options && options.length > 0) {
        gsap.to(options, {
          opacity: 0,
          x: -30,
          scale: 0.8,
          duration: 0.25,
          stagger: 0.03,
          ease: "power2.in",
          onComplete: () => {
            optionsWrapper.innerHTML = "";
          }
        });
      } else {
        optionsWrapper.innerHTML = "";
      }
      return;
    }

    case "setTarget": {
      eye.classList.add("eye-hover");
      
      optionsWrapper.innerHTML = "";

      if (options) {
        for (const type in options) {
          options[type].forEach((data, id) => {
            createOptions(type, data, id + 1, undefined, id);
          });
        }
      }

      if (zones) {
        for (let i = 0; i < zones.length; i++) {
          zones[i].forEach((data, id) => {
            createOptions("zones", data, id + 1, i + 1, id);
          });
        }
      }
    }

    case "setTheme": {
      if (theme) {
        setTheme(theme, event.data.themeColor, event.data.themeShade);
      }
      break;
    }
  }
} catch (error) {
  console.error('ox_target: Error processing message:', error, event.data);
}
});

const rippleCSS = `
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple 0.6s linear;
    pointer-events: none;
  }
  
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  /* Removed slideOutRight animation to prevent glitchy behavior */
  
  /* Removed fadeOut animation to prevent glitchy behavior */
`;

const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', initializeTheme);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    // Send escape event to game
    fetch('https://ox_target/escape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({})
    });
  }
});
