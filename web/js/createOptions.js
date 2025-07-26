import { fetchNui } from "./fetchNui.js";

const optionsWrapper = document.getElementById("options-wrapper");

function createOptionElement(type, data, id, zoneId) {
  const option = document.createElement("div");
  
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
  
  return option;
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
  
  option.style.pointerEvents = "none";
  
  option.style.transform = "translateX(8px) scale(0.98)";
  
  if (option.classList.contains('has-submenu')) {
    openSubmenu(option);
  } else {
    fetchNui("select", [option.targetType, option.targetId, option.zoneId]);
  }
  
  setTimeout(() => {
    option.style.pointerEvents = "auto";
    option.style.transform = "";
  }, 150);
}

function addRippleEffect(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  
  const rect = button.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height) * 0.6;
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple');
  
  button.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 400);
}

function openSubmenu(option) {
  closeSubmenu();
  
  const submenuData = option.submenuData;
  
  const submenu = document.createElement("div");
  submenu.className = "submenu-container";
  
  submenuData.forEach((item, index) => {
    const submenuOption = document.createElement("div");
    submenuOption.className = "submenu-option";
    submenuOption.innerHTML = `
      <div class="submenu-icon"><i class="${item.icon || 'fas fa-circle'}"></i></div>
      <div class="submenu-label">${item.label}</div>
    `;
    
    submenuOption.addEventListener("click", () => {
      fetchNui("submenuSelect", [option.targetType, option.targetId, option.zoneId, index]);
      closeSubmenu();
    });
    
    submenu.appendChild(submenuOption);
  });
  
  const optionRect = option.getBoundingClientRect();
  
  let left = optionRect.right + 8;
  let top = optionRect.top;
  
  submenu.style.position = 'fixed';
  submenu.style.left = left + 'px';
  submenu.style.top = top + 'px';
  submenu.style.transform = 'scale(0.95) translateY(-10px)';
  submenu.style.opacity = '0';
  
  document.body.appendChild(submenu);
  
  const submenuRect = submenu.getBoundingClientRect();
  
  if (left + submenuRect.width > window.innerWidth) {
    left = optionRect.left - submenuRect.width - 8;
  }
  
  if (top + submenuRect.height > window.innerHeight) {
    top = window.innerHeight - submenuRect.height - 8;
  }
  
  submenu.style.left = left + 'px';
  submenu.style.top = top + 'px';
  
  setTimeout(() => {
    submenu.style.transform = 'scale(1) translateY(0)';
    submenu.style.opacity = '1';
  }, 10);
  
  const clickOutsideHandler = (e) => {
    if (!submenu.contains(e.target) && !option.contains(e.target)) {
      closeSubmenu();
      document.removeEventListener('click', clickOutsideHandler);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', clickOutsideHandler);
  }, 100);
}

function closeSubmenu() {
  const submenu = document.querySelector(".submenu-container");
  if (submenu) {
    submenu.style.transform = "scale(0.95) translateY(-10px)";
    submenu.style.opacity = "0";
    setTimeout(() => {
      submenu.remove();
    }, 200);
  }
}

export function createOptions(type, data, id, zoneId) {
  if (data.hide) return;

  const option = createOptionElement(type, data, id, zoneId);
  
  option.addEventListener("click", onClick);
  
  if (data.submenu) {
    option.submenuData = data.submenu;
  }
  
  optionsWrapper.appendChild(option);
  
  setTimeout(() => {
    option.style.animation = 'slideInRight 250ms cubic-bezier(0.4, 0, 0.2, 1)';
  }, 10);
  
  return option;
}

export function removeOptions() {
  const options = optionsWrapper.querySelectorAll('.option-container');
  
  options.forEach((option, index) => {
    setTimeout(() => {
      option.style.animation = 'slideOutRight 200ms cubic-bezier(0.4, 0, 0.2, 1)';
      setTimeout(() => {
        if (option.parentNode) {
          option.remove();
        }
      }, 200);
    }, index * 50);
  });
}

export function updateOption(option, updates) {
  if (updates.loading !== undefined) {
    option.classList.toggle('loading', updates.loading);
  }
  
  if (updates.label) {
    const label = option.querySelector('.option-label');
    if (label) {
      label.textContent = updates.label;
    }
  }
  
  if (updates.icon) {
    const icon = option.querySelector('.option-icon i');
    if (icon) {
      icon.className = `fa-fw ${updates.icon}`;
    }
  }
}
