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
const pointer = document.getElementById("pointer");
const pointerLeader = pointer?.querySelector('.pointer-leader');
const diamondSvg = document.getElementById('diamondSvg');
const html = document.documentElement;
const LEADER_PADDING = 10; // pixels to stop short of the base menu edge

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

// Selection state
let selectedIndex = -1;
let optionNodes = [];
let allowSelect = false;
let hasFocus = false;
let currentContainer = optionsWrapper;
let isInSubmenu = false;
let submenuOwnerOption = null;
let lastScrollDir = 0;

function updatePointerVisibility(visible) {
  if (!pointer) return;
  if (visible) {
    pointer.style.opacity = '1';
  } else {
    pointer.style.opacity = '0';
  }
}

function positionPointerAtCenter(animate = false) {
  if (!pointer) return;
  const diamondWidth = diamondSvg?.getBoundingClientRect().width || 18;
  const centerX = window.innerWidth / 2 - diamondWidth / 2;
  const centerY = window.innerHeight / 2 - (pointer.getBoundingClientRect().height / 2);
  pointer.style.left = centerX + 'px';
  pointer.style.top = centerY + 'px';

  const wrapperRect = optionsWrapper.getBoundingClientRect();
  if (pointerLeader) {
    if (!optionNodes.length) {
      pointerLeader.style.width = '0px';
      pointerLeader.style.opacity = '0';
    } else {
      const gap = Math.max(0, wrapperRect.left - (window.innerWidth / 2 + diamondWidth / 2) - LEADER_PADDING);
      pointerLeader.style.opacity = '0.9';
      pointerLeader.style.width = gap + 'px';
    }
  }
}

function setSelectedIndex(newIndex, animate = true) {
  if (!optionNodes.length) return;
  const len = optionNodes.length;
  newIndex = ((newIndex % len) + len) % len;
  const prev = selectedIndex;
  if (selectedIndex === newIndex) return;

  if (selectedIndex >= 0 && optionNodes[selectedIndex]) {
    optionNodes[selectedIndex].classList.remove('selected');
  }

  selectedIndex = newIndex;
  const target = optionNodes[selectedIndex];
  target.classList.add('selected');

  const diamondWidth = diamondSvg?.getBoundingClientRect().width || 18;
  const centerX = window.innerWidth / 2 - diamondWidth / 2;
  const leader = pointer.querySelector('.pointer-leader');
  if (leader) {
    const wrapperRect = optionsWrapper.getBoundingClientRect();
    const gap = Math.max(0, (wrapperRect.left - (window.innerWidth / 2 + diamondWidth / 2) - LEADER_PADDING));
    leader.style.opacity = '0.9';
    leader.style.width = gap + 'px';
  }

  pointer.style.left = centerX + 'px';
  pointer.style.transform = 'none';

  const wrappedForward = prev === len - 1 && newIndex === 0 && lastScrollDir === 1;
  const wrappedBackward = prev === 0 && newIndex === len - 1 && lastScrollDir === -1;
  centerOnSelected(animate, 0.1, wrappedForward || wrappedBackward);
}

function centerOnSelected(animate = true, duration = 0.1, forceAbsolute = false) {
  if (!currentContainer || !optionNodes[selectedIndex]) return;
  const selected = optionNodes[selectedIndex];
  const selectedRect = selected.getBoundingClientRect();
  const containerRect = currentContainer.getBoundingClientRect();
  const pointerCenterY = window.innerHeight / 2;
  const selectedCenterY = selectedRect.top + selectedRect.height / 2;
  const currentY = (() => {
    const m = /translateY\((-?\d+(?:\.\d+)?)px\)/.exec(currentContainer.style.transform || '');
    return m ? parseFloat(m[1]) : 0;
  })();
  let targetY;
  if (forceAbsolute) {
    targetY = currentY + (pointerCenterY - selectedCenterY);
  } else {
    const rowH = selectedRect.height + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--option-spacing')||'8'));
    targetY = currentY + (pointerCenterY - selectedCenterY);
    targetY = Math.max(currentY - rowH, Math.min(currentY + rowH, targetY));
  }
  const delta = Math.round(targetY - currentY);

  if (animate && window.gsap) {
    gsap.to(currentContainer, { y: currentY + delta, duration, ease: 'power2.out', onUpdate() {
      const val = this.targets()[0].style.transform.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
      if (!val) this.targets()[0].style.transform = `translateY(${currentY + delta}px)`;
    }, onComplete() {
      currentContainer.style.transform = `translateY(${currentY + delta}px)`;
    }});
  } else {
    currentContainer.style.transform = `translateY(${currentY + delta}px)`;
  }
}

function chooseSelected() {
  const target = optionNodes[selectedIndex];
  if (!target) return;
  if (target.submenuData) {
    openSubmenu(target);
  } else {
    fetchNui("select", [
      target.targetType,
      target.targetId,
      target.zoneId
    ]);
  }
}

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
  option.__optionData = data;
  
  option.addEventListener('click', onClick);
  
  if (data.submenu) {
  }
  
  optionsWrapper.appendChild(option);
  
  if (window.gsap) {
    gsap.fromTo(option,
      { opacity: 0, x: 10 },
      { opacity: 1, x: 0, duration: 0.08, ease: 'power1.out' }
    );
  }

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
  
  if (!hasFocus || !allowSelect) return;

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
  const list = document.createElement('div');
  list.className = 'submenu-list';
  list.style.overflow = 'visible';
  
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
    
    list.appendChild(submenuOption);
  });
  
  const optionRect = option.getBoundingClientRect();
  const submenuRect = submenuContainer.getBoundingClientRect();
  
  let left = optionRect.right + 8;
  let top = optionRect.top;
  
  if (left + submenuRect.width > window.innerWidth) {
    left = optionRect.left - submenuRect.width - 8;
  }
  
  top = Math.min(top, window.innerHeight - 40);
  top = Math.max(8, top);
  
  submenuContainer.style.position = 'fixed';
  submenuContainer.style.left = left + 'px';
  submenuContainer.style.top = top + 'px';
  submenuContainer.style.transform = 'scale(0.95) translateY(-10px)';
  submenuContainer.style.opacity = '0';
  
  submenuContainer.appendChild(list);
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
  isInSubmenu = true;
  currentContainer = list;
  submenuOwnerOption = option;
  optionNodes = Array.from(list.querySelectorAll('.submenu-option'));
  selectedIndex = 0;
  optionNodes.forEach(n => n.classList.remove('selected'));
  if (optionNodes[0]) optionNodes[0].classList.add('selected');
  list.style.transform = 'translateY(0px)';
  positionPointerAtCenter(false);
  centerOnSelected(false);
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
      isInSubmenu = false;
      currentContainer = optionsWrapper;
      submenuOwnerOption = null;
      optionNodes = Array.from(optionsWrapper.querySelectorAll('.option-container'));
      selectedIndex = optionNodes.length > 0 ? 0 : -1;
      optionNodes.forEach(n => n.classList.remove('selected'));
      if (optionNodes[0]) optionNodes[0].classList.add('selected');
      positionPointerAtCenter(false);
    }, 200);
  }
}

function rotateOptions(direction) {
  if (!currentContainer) return;
  const nodes = Array.from(currentContainer.children);
  if (nodes.length <= 1) return;

  const first = nodes[0];
  const rowHeight = first.getBoundingClientRect().height;
  const styles = getComputedStyle(document.documentElement);
  const gap = parseInt(styles.getPropertyValue('--option-spacing') || '8');
  const shift = rowHeight + gap;

  const startRects = nodes.map(n => n.getBoundingClientRect());

  if (direction === 'down') {
    currentContainer.appendChild(first);
  } else {
    const last = nodes[nodes.length - 1];
    currentContainer.insertBefore(last, currentContainer.firstChild);
  }

  const endRects = Array.from(currentContainer.children).map(n => n.getBoundingClientRect());
  Array.from(currentContainer.children).forEach((node, i) => {
    const dy = startRects[i].top - endRects[i].top;
    if (dy) {
      node.style.transform = `translateY(${dy}px)`;
      node.style.willChange = 'transform';
      node.style.transition = 'transform 160ms cubic-bezier(0.4, 0, 0.2, 1)';
      requestAnimationFrame(() => {
        node.style.transform = '';
      });
      node.addEventListener('transitionend', () => {
        node.style.transition = '';
        node.style.willChange = '';
      }, { once: true });
    }
  });

  optionNodes = Array.from(currentContainer.children);
  optionNodes.forEach(n => n.classList.remove('selected'));
  if (optionNodes[0]) optionNodes[0].classList.add('selected');

  centerOnSelected(false);
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
        updatePointerVisibility(true);
        optionsWrapper.style.transform = 'translateY(0px)';
        positionPointerAtCenter(false);
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
            optionNodes = [];
            selectedIndex = -1;
            optionsWrapper.style.transform = 'translateY(0px)';
            document.querySelectorAll('.submenu-list').forEach(el => el.style.transform = 'translateY(0px)');
            updatePointerVisibility(false);
          }, 200);
        } else {
          body.style.visibility = "hidden";
          body.style.opacity = "0";
          optionsWrapper.innerHTML = "";
          optionNodes = [];
          selectedIndex = -1;
          optionsWrapper.style.transform = 'translateY(0px)';
          document.querySelectorAll('.submenu-list').forEach(el => el.style.transform = 'translateY(0px)');
          updatePointerVisibility(false);
        }
      }
      return;
    }

    case "leftTarget": {
      
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

      optionNodes = [];
      selectedIndex = -1;
      optionsWrapper.style.transform = 'translateY(0px)';
      updatePointerVisibility(true);
      positionPointerAtCenter(false);
      return;
    }

    case "setTarget": {
      optionsWrapper.style.transform = 'translateY(0px)';
      currentContainer = optionsWrapper;
      selectedIndex = -1;
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

      optionNodes = Array.from(document.querySelectorAll('.option-container'));
      const defaultIdx = optionNodes.findIndex(n => {
        const d = n.__optionData;
        return d && d.default === true && !d.hide;
      });
      const firstIdx = optionNodes.findIndex(n => !n.__optionData?.hide);
      const initialIdx = defaultIdx !== -1 ? defaultIdx : (firstIdx !== -1 ? firstIdx : 0);
      if (optionNodes.length > 0) {
        updatePointerVisibility(true);
        setSelectedIndex(initialIdx, false);
        optionsWrapper.style.transform = 'translateY(0px)';
        positionPointerAtCenter(false);
        centerOnSelected(false);
      } else {
        updatePointerVisibility(true);
        positionPointerAtCenter(false);
      }
    }

    case "focus": {
      hasFocus = !!event.data.state;
      allowSelect = false;
      break;
    }

    case "armClick": {
      allowSelect = hasFocus && optionNodes.length > 0;
      break;
    }

    case "selectCurrent": {
      if (optionNodes.length > 0) {
        if (!isInSubmenu) {
          allowSelect = true;
          chooseSelected();
          allowSelect = false;
        } else {
          const first = optionNodes[0];
          if (first) first.click();
        }
      }
      break;
    }

    case "scroll": {
      allowSelect = false;
      if (!optionNodes.length) {
        positionPointerAtCenter(true);
        break;
      }
      const dirName = event.data?.dir === 'up' ? 'up' : 'down';
      const delta = dirName === 'up' ? -1 : 1;
      lastScrollDir = delta;
      setSelectedIndex(selectedIndex + delta, true);
      break;
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
  
  
`;

const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', initializeTheme);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    fetch('https://ox_target/escape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({})
    });
  }
});


