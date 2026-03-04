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
 *   // 2. Use it — that's it!
 *   <div x-data="selectra({ options: [...], placeholder: 'Pick...' })" x-selectra></div>
 *
 *   // Or with a native <select> for progressive enhancement:
 *   <div x-data="selectra()" x-selectra>
 *     <select>
 *       <option value="1">One</option>
 *       <option value="2">Two</option>
 *     </select>
 *   </div>
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
    <span x-show="isSingle && items.length && !isFocused"
          x-text="currentValueText"
          class="selectra-single-value"></span>
    <template x-for="val in items" :key="val">
      <span x-show="isMultiple" class="selectra-item">
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
                 :class="{'is-active': activeIndex === group.offset + idx}"
                 class="selectra-option"
                 x-html="renderOption(option)">
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
 * Alpine.js plugin installer
 */
function SelectraPlugin(Alpine) {
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
