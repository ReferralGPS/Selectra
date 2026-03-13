/**
 * Selectra - Alpine.js Plugin
 *
 * A powerful, extensible <select> UI control for tagging, contact lists,
 * country selectors, and autocomplete. Built with Alpine.js and Tailwind CSS.
 *
 * @license Apache-2.0
 *
 * Usage:
 *
 *   // 1. Register the plugin
 *   import Alpine from 'alpinejs';
 *   import Selectra from 'selectra';
 *   Alpine.plugin(Selectra);
 *   Alpine.start();
 *
 *   // 2. Use it on a native <select> — that's it!
 *   <select x-selectra="{ placeholder: 'Pick...' }">
 *     <option value="1">One</option>
 *     <option value="2">Two</option>
 *   </select>
 */

import { createSelectizeComponent, registerPlugin, getDefaults, DEFAULTS } from './selectize.js';
import { escapeHtml, hashKey, autoGrow } from './utils.js';
import Sifter from './sifter.js';

// Import Tailwind CSS styles
import './styles/selectra.css';

// Load built-in plugins
import './plugins/index.js';

/**
 * The auto-rendered template injected by the x-selectra directive.
 * Uses .selectra-* CSS classes from selectra.css.
 * Supports single select, multi select (tags), optgroups, create, and remote loading.
 */
const SELECTRA_TEMPLATE = `
<div class="selectra-control" :class="{'is-disabled': isDisabled}">
  <div @click="focus()" class="selectra-input"
       :class="{'is-focused': isFocused, 'is-invalid': isInvalid, 'is-locked': isLocked, 'is-single': isSingle, 'has-items': items.length > 0}">
    <span x-show="_config.showSelectedCount && isMultiple"
          class="selectra-selected-count">
      <span x-text="selectedCountText"></span>
    </span>
    <span x-show="isSingle && items.length && !isFocused"
          x-text="currentValueText"
          class="selectra-single-value"></span>
    <template x-for="val in items" :key="val">
      <span x-show="isMultiple && !_config.showSelectedCount" class="selectra-item">
        <span x-html="options[val] ? renderItem(options[val]) : val"></span>
        <span @click.stop="removeItem(val)" class="selectra-item-remove">&times;</span>
      </span>
    </template>
    <input x-ref="searchInput"
           x-model="query"
           @input="onInput()"
           @focus="focus()"
           @blur.debounce.150ms="blur()"
           @keydown="onKeyDown($event)"
           @paste="onPaste($event)"
           :placeholder="placeholderText"
           x-show="(isSingle || !isFull) && (isMultiple || isFocused || !items.length)"
           :class="{'selectra-search-with-count': _config.showSelectedCount && isMultiple}"
           class="selectra-search">
    <span x-show="isFull && isMultiple" class="selectra-max-badge">Max reached</span>
    <div x-show="isLoading && !isOpen" class="selectra-spinner"></div>
    <svg x-show="isSingle"
         class="selectra-arrow" :class="{'is-open': isOpen}"
         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
    </svg>
  </div>
  <div x-show="isOpen" x-ref="dropdown" x-cloak class="selectra-dropdown"
       x-transition:enter="transition ease-out duration-150"
       x-transition:enter-start="opacity-0 -translate-y-1"
       x-transition:enter-end="opacity-100 translate-y-0"
       x-transition:leave="transition ease-in duration-100"
       x-transition:leave-start="opacity-100 translate-y-0"
       x-transition:leave-end="opacity-0 -translate-y-1">
    <div class="selectra-dropdown-content">
      <template x-for="group in _getGroupedView()" :key="group.key">
        <div>
          <div x-show="group.label" x-text="group.label" class="selectra-optgroup-header"></div>
          <template x-for="(option, idx) in group.options" :key="optionKey(option)">
            <div @click="selectOption(option)"
                 @mouseenter="activeIndex = group.offset + idx"
                 :data-active="activeIndex === group.offset + idx"
                 :class="{'is-active': activeIndex === group.offset + idx, 'is-selected': isSelected(option)}"
                 class="selectra-option">
              <span x-show="_config.showSelectedCount && isMultiple && isSelected(option)" class="selectra-option-tick">&#10003;</span>
              <span x-html="renderOption(option)"></span>
            </div>
          </template>
        </div>
      </template>
      <div x-show="canCreate"
           @click="createItem()"
           @mouseenter="activeIndex = filteredOptions.length"
           :data-active="activeIndex === filteredOptions.length"
           :class="{'is-active': activeIndex === filteredOptions.length}"
           class="selectra-option-create"
           x-html="renderOptionCreate()">
      </div>
      <div x-show="filteredOptions.length === 0 && !isLoading && !canCreate && query.length > 0"
           class="selectra-no-results"
           x-html="renderNoResults()">
      </div>
      <div x-show="filteredOptions.length === 0 && !isLoading && !canCreate && query.length === 0 && _config.dropdownPlaceholder"
           class="selectra-no-results"
           x-html="renderDropdownPlaceholder()">
      </div>
      <div x-show="isLoading" class="selectra-loading">
        <div class="selectra-spinner"></div>
        <span x-html="renderLoading()"></span>
      </div>
    </div>
  </div>
</div>
`.trim();

/**
 * Auto-wrap any <select x-selectra> in a <div> so Alpine can render the
 * custom UI as sibling content. Safe to call multiple times — already-wrapped
 * selects are skipped because x-selectra is removed after wrapping.
 */
function _wrapSelectElements() {
  document.querySelectorAll('select[x-selectra]').forEach((select) => {
    const configExpr = select.getAttribute('x-selectra') || '{}';
    const wrapper = document.createElement('div');

    // Copy class to wrapper for styling (e.g. max-w-md, form-control)
    if (select.classList.length) {
      wrapper.className = select.className;
    }

    // Insert wrapper where the select is, then move select inside
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    // Set up Alpine directives on the wrapper
    wrapper.setAttribute('x-data', `selectra(${configExpr})`);
    wrapper.setAttribute('x-selectra', '');
    wrapper.setAttribute('x-cloak', '');

    // Remove from the select so it doesn't get processed twice
    select.removeAttribute('x-selectra');
    select.removeAttribute('x-data');
    select.removeAttribute('x-cloak');
  });
}

/**
 * Alpine.js plugin installer
 */
function SelectraPlugin(Alpine) {
  // Wrap <select x-selectra> elements synchronously during plugin registration.
  // Alpine.plugin() is always called before Alpine.start(), so this is
  // guaranteed to run before Alpine walks the DOM tree.
  _wrapSelectElements();

  // Also listen for alpine:init as a safety net for late-parsed DOM
  // (e.g. Turbo frames, deferred scripts). No-op if already wrapped.
  document.addEventListener('alpine:init', _wrapSelectElements);

  // Register the selectra data component
  Alpine.data('selectra', (config = {}) => {
    const componentFactory = createSelectizeComponent(config);
    return componentFactory();
  });

  // Register the x-selectra directive for auto-rendering.
  // When Alpine encounters x-selectra on an element, it injects the full
  // component template. This runs after x-data (which creates the reactive
  // scope) but before Alpine walks children, so all injected Alpine
  // directives (x-for, x-model, etc.) are processed automatically.
  Alpine.directive('selectra', (el, { expression }, { evaluate, cleanup }) => {
    if (!el.querySelector('.selectra-control')) {
      el.insertAdjacentHTML('beforeend', SELECTRA_TEMPLATE);
    }
  });
}

SelectraPlugin.version = __PKG_VERSION__;
SelectraPlugin.template = SELECTRA_TEMPLATE;

// Named exports
export {
  SelectraPlugin as default,
  SELECTRA_TEMPLATE,
  createSelectizeComponent,
  registerPlugin,
  getDefaults,
  DEFAULTS,
  Sifter,
  escapeHtml,
  hashKey,
};
