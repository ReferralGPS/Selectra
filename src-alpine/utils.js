/**
 * Utility functions for Selectize Alpine.js
 */

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Debounce a function call
 */
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Generate a unique ID
 */
let idCounter = 0;
export function uid(prefix = 'selectize') {
  return `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Hash a value to a string key
 */
export function hashKey(value) {
  if (typeof value === 'undefined' || value === null) return null;
  return typeof value === 'boolean'
    ? value ? '1' : '0'
    : String(value);
}

/**
 * Highlight matching text in a string
 */
export function highlight(text, search) {
  if (!search || !search.length) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(
    '(' + search.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1') + ')',
    'ig'
  );
  return escaped.replace(regex, '<span class="font-semibold text-inherit">$1</span>');
}

/**
 * Measure the width of a string in pixels
 */
let measureCanvas;
export function measureString(str, el) {
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
  }
  const ctx = measureCanvas.getContext('2d');
  if (el) {
    const style = window.getComputedStyle(el);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  }
  return ctx.measureText(str).width;
}

/**
 * Auto-grow an input element to fit its content
 */
export function autoGrow(input, extraWidth = 10) {
  const val = input.value || input.placeholder || '';
  const width = measureString(val, input) + extraWidth;
  input.style.width = Math.max(width, 60) + 'px';
}

/**
 * Deep merge objects (simple version)
 */
export function deepMerge(target, ...sources) {
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

/**
 * Determine if the given element is a <select> tag
 */
export function isSelectElement(el) {
  return el.tagName && el.tagName.toLowerCase() === 'select';
}

/**
 * Determine if the given element is an <input> tag
 */
export function isInputElement(el) {
  return el.tagName && el.tagName.toLowerCase() === 'input';
}

/**
 * Read options from a native <select> element
 */
export function readSelectOptions(selectEl) {
  const options = [];
  const optgroups = [];
  const selectedValues = [];

  const processOption = (optionEl, optgroup = null) => {
    const value = optionEl.value;
    const text = optionEl.textContent.trim();
    const disabled = optionEl.disabled;

    if (!value && !text) return;

    const data = { value, text, disabled };

    // Read data-* attributes
    if (optionEl.dataset.data) {
      try {
        Object.assign(data, JSON.parse(optionEl.dataset.data));
      } catch (_) {
        // ignore
      }
    }

    if (optgroup !== null) {
      data.optgroup = optgroup;
    }

    if (optionEl.selected) {
      selectedValues.push(value);
    }

    options.push(data);
  };

  for (const child of selectEl.children) {
    if (child.tagName.toLowerCase() === 'optgroup') {
      const groupId = child.getAttribute('label') || '';
      optgroups.push({
        value: groupId,
        label: groupId,
        disabled: child.disabled,
      });
      for (const opt of child.children) {
        processOption(opt, groupId);
      }
    } else if (child.tagName.toLowerCase() === 'option') {
      processOption(child);
    }
  }

  return { options, optgroups, selectedValues };
}

/**
 * Check if element is RTL
 */
export function isRtl(el) {
  const style = window.getComputedStyle(el);
  return style.direction === 'rtl';
}
