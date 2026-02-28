/**
 * Selectra Plugins
 *
 * Each plugin is a function that receives options and is called with
 * `this` bound to the selectra component instance. Plugins can modify
 * component behavior by wrapping methods or adding new properties.
 */

import { registerPlugin } from '../selectize.js';

// ─── Remove Button Plugin ───────────────────────────────────
registerPlugin('remove_button', function (options = {}) {
  const {
    label = '&times;',
    title = 'Remove',
    className = '',
  } = options;

  // Store original renderItem
  const originalRenderItem = this._config.render?.item;

  // Override item rendering to include remove button
  if (!this._config.render) this._config.render = {};

  const self = this;
  this._config.render.item = function (data, escape) {
    const labelField = self._config.labelField;
    const valueField = self._config.valueField;
    const text = originalRenderItem
      ? originalRenderItem(data, escape)
      : escape(data[labelField] || '');

    return `<span class="inline-flex items-center">${text}</span>`;
  };

  // The remove button is rendered directly in the template via the
  // showRemoveButton flag
  this._showRemoveButton = true;
  this._removeButtonLabel = label;
  this._removeButtonTitle = title;
  this._removeButtonClass = className;
});

// ─── Clear Button Plugin ────────────────────────────────────
registerPlugin('clear_button', function (options = {}) {
  const {
    title = 'Clear All',
    className = '',
    label = '&times;',
  } = options;

  this._showClearButton = true;
  this._clearButtonTitle = title;
  this._clearButtonLabel = label;
  this._clearButtonClass = className;
});

// ─── Restore on Backspace Plugin ────────────────────────────
registerPlugin('restore_on_backspace', function (options = {}) {
  const textFn = options.text || ((opt) => opt[this._config.labelField] || '');
  const originalOnKeyDown = this.onKeyDown.bind(this);

  this.onKeyDown = (e) => {
    if (e.key === 'Backspace' && !this.query && this.items.length && this.isMultiple) {
      e.preventDefault();
      const lastValue = this.items[this.items.length - 1];
      const lastOption = this.options[lastValue];
      this.removeItem(lastValue);
      if (lastOption) {
        this.query = textFn(lastOption);
        if (this.$refs.searchInput) {
          this.$refs.searchInput.value = this.query;
        }
      }
      return;
    }
    originalOnKeyDown(e);
  };
});

// ─── Dropdown Header Plugin ─────────────────────────────────
registerPlugin('dropdown_header', function (options = {}) {
  const {
    title = '',
    showClose = true,
    headerClass = '',
  } = options;

  this._dropdownHeader = true;
  this._dropdownHeaderTitle = title;
  this._dropdownHeaderShowClose = showClose;
  this._dropdownHeaderClass = headerClass;
});

// ─── Tag Limit Plugin ───────────────────────────────────────
registerPlugin('tag_limit', function (options = {}) {
  const { tagLimit = 3 } = options;

  this._tagLimit = tagLimit;
  this._showAllTags = false;

  // Override selectedItems to respect tag limit
  Object.defineProperty(this, 'visibleItems', {
    get() {
      const all = this.selectedItems;
      if (this.isFocused || this._showAllTags || !this._tagLimit) return all;
      return all.slice(0, this._tagLimit);
    },
  });

  Object.defineProperty(this, 'hiddenItemCount', {
    get() {
      const all = this.selectedItems;
      if (this.isFocused || this._showAllTags || !this._tagLimit) return 0;
      return Math.max(0, all.length - this._tagLimit);
    },
  });
});

// ─── Auto Select on Type Plugin ─────────────────────────────
registerPlugin('auto_select_on_type', function () {
  const originalBlur = this.blur.bind(this);

  this.blur = () => {
    if (this.query.trim() && this.filteredOptions.length) {
      const first = this.filteredOptions[0];
      this.selectOption(first);
    }
    this.query = '';
    originalBlur();
  };
});

// ─── Select on Focus Plugin ─────────────────────────────────
registerPlugin('select_on_focus', function () {
  const originalFocus = this.focus.bind(this);

  this.focus = () => {
    originalFocus();
    if (this.isSingle && this.items.length) {
      const current = this.options[this.items[0]];
      if (current) {
        this.query = current[this._config.labelField] || '';
        if (this.$refs.searchInput) {
          this.$nextTick(() => this.$refs.searchInput.select());
        }
      }
    }
  };
});

// ─── Read-Only Plugin ───────────────────────────────────────
registerPlugin('read_only', function (options = {}) {
  const { readOnly = true } = options;
  this._isReadOnly = readOnly;

  this.readonly = (value) => {
    this._isReadOnly = value !== undefined ? value : !this._isReadOnly;
    if (this._isReadOnly) {
      this.close();
    }
  };

  // Override to prevent modifications in read-only mode
  const originalAddItem = this.addItem.bind(this);
  const originalRemoveItem = this.removeItem.bind(this);
  const originalCreateItem = this.createItem.bind(this);
  const originalClear = this.clear.bind(this);

  this.addItem = (value, silent) => {
    if (this._isReadOnly) return;
    originalAddItem(value, silent);
  };

  this.removeItem = (value, silent) => {
    if (this._isReadOnly) return;
    originalRemoveItem(value, silent);
  };

  this.createItem = (input) => {
    if (this._isReadOnly) return;
    originalCreateItem(input);
  };

  this.clear = (silent) => {
    if (this._isReadOnly) return;
    originalClear(silent);
  };
});

// ─── Auto Position Plugin ───────────────────────────────────
registerPlugin('auto_position', function () {
  this._autoPosition = true;

  const originalOpen = this.open.bind(this);
  this.open = () => {
    originalOpen();
    this.$nextTick(() => {
      const dropdown = this.$refs.dropdown;
      const wrapper = this.$el;
      if (!dropdown || !wrapper) return;

      const wrapperRect = wrapper.getBoundingClientRect();
      const spaceBelow = window.innerHeight - wrapperRect.bottom;
      const spaceAbove = wrapperRect.top;
      const dropdownHeight = dropdown.offsetHeight || 250;

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        this._dropdownPosition = 'top';
      } else {
        this._dropdownPosition = 'bottom';
      }
    });
  };

  this._dropdownPosition = 'bottom';
});

export default {};
