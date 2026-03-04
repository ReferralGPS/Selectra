/**
 * Selectra Alpine.js Component
 *
 * A powerful, extensible select/tagging component built with Alpine.js and Tailwind CSS.
 * Drop-in replacement for selectize.js without jQuery dependency.
 */

import Sifter from './sifter.js';
import {
  escapeHtml,
  debounce,
  uid,
  hashKey,
  highlight,
  autoGrow,
  readSelectOptions,
  isSelectElement,
  isRtl,
} from './utils.js';

/** Default configuration */
const DEFAULTS = {
  delimiter: ',',
  splitOn: null,
  persist: true,
  diacritics: true,
  create: false,
  showAddOptionOnCreate: true,
  createOnBlur: false,
  createFilter: null,
  highlight: true,
  openOnFocus: true,
  maxOptions: 1000,
  maxItems: null,
  hideSelected: null,
  selectOnTab: true,
  preload: false,
  allowEmptyOption: false,
  closeAfterSelect: false,
  loadThrottle: 300,
  loadingClass: 'loading',
  placeholder: '',
  dropdownPlaceholder: '',
  mode: null, // 'single' | 'multi' — auto-detected
  search: true,
  showArrow: true,
  showSelectedCount: false,
  valueField: 'value',
  labelField: 'text',
  disabledField: 'disabled',
  optgroupField: 'optgroup',
  optgroupLabelField: 'label',
  optgroupValueField: 'value',
  sortField: '$order',
  searchField: ['text'],
  searchConjunction: 'and',
  respectWordBoundaries: false,
  normalize: true,
  plugins: [],

  // Render functions — return HTML strings
  render: {
    option: null,
    item: null,
    optionCreate: null,
    optgroupHeader: null,
    noResults: null,
    dropdownPlaceholder: null,
    loading: null,
  },

  // Callbacks
  load: null,
  score: null,
  onChange: null,
  onItemAdd: null,
  onItemRemove: null,
  onClear: null,
  onOptionAdd: null,
  onOptionRemove: null,
  onDropdownOpen: null,
  onDropdownClose: null,
  onType: null,
  onFocus: null,
  onBlur: null,
  onInitialize: null,
};

/** Registered plugins */
const pluginRegistry = {};

/**
 * Create the selectize Alpine.js component
 */
export function createSelectizeComponent(userConfig = {}) {
  return () => ({
    // ── Reactive state ──────────────────────────────────────
    isOpen: false,
    isFocused: false,
    isDisabled: false,
    isLocked: false,
    isLoading: false,
    isInvalid: false,

    query: '',
    activeIndex: -1,
    caretPos: 0,

    items: [],             // selected values (strings)
    options: {},           // { [value]: { value, text, ... } }
    optgroups: {},         // { [id]: { value, label, ... } }
    userOptions: {},       // user-created option values
    optionOrder: [],       // maintains insertion order

    loadedSearches: {},
    lastQuery: '',

    // Internal
    _config: {},
    _sifter: null,
    _sourceEl: null,
    _id: '',
    _rtl: false,
    _plugins: [],
    _renderCache: {},

    // ── Computed properties ─────────────────────────────────
    get config() {
      return this._config;
    },

    get isMultiple() {
      return this._config.mode === 'multi';
    },

    get isSingle() {
      return this._config.mode === 'single';
    },

    get isFull() {
      return this._config.maxItems !== null && this.items.length >= this._config.maxItems;
    },

    get hasOptions() {
      return Object.keys(this.options).length > 0;
    },

    get canCreate() {
      if (!this._config.create) return false;
      if (!this.query.trim()) return false;
      if (this.isFull) return false;
      if (this._config.createFilter) {
        const filter = this._config.createFilter;
        if (typeof filter === 'function') return filter(this.query);
        if (filter instanceof RegExp) return filter.test(this.query);
        if (typeof filter === 'string') return new RegExp(filter).test(this.query);
      }
      // Check if already exists
      const existing = Object.values(this.options).find(
        (o) => o[this._config.labelField]?.toLowerCase() === this.query.toLowerCase()
      );
      return !existing;
    },

    get selectedItems() {
      return this.items
        .map((val) => this.options[hashKey(val)])
        .filter(Boolean);
    },

    get filteredOptions() {
      return this._getFilteredOptions();
    },

    get placeholderText() {
      if (this.items.length > 0 && this.isSingle) return '';
      return this._config.placeholder || '';
    },

    get selectedCountText() {
      const count = this.items.length;
      if (count === 0) return '';
      return count === 1 ? 1: count;
    },

    get currentValueText() {
      if (!this.isSingle || !this.items.length) return '';
      const opt = this.options[hashKey(this.items[0])];
      return opt ? opt[this._config.labelField] : '';
    },

    // ── Lifecycle ───────────────────────────────────────────
    init() {
      this._id = uid();
      this._config = { ...DEFAULTS, ...userConfig };

      // Detect source element
      this._sourceEl = this.$el.querySelector('select, input[type="text"], input[type="hidden"]');

      // Read options from <select> if present
      if (this._sourceEl && isSelectElement(this._sourceEl)) {
        const parsed = readSelectOptions(this._sourceEl);

        // Merge parsed options with config options
        const configOptions = this._config.options || [];
        const allOptions = [...parsed.options, ...configOptions];
        this._registerOptions(allOptions);

        // Register optgroups
        for (const og of parsed.optgroups) {
          this.optgroups[og.value] = og;
        }

        // Set initial value
        if (parsed.selectedValues.length) {
          this.items = [...parsed.selectedValues];
        }

        // Detect mode from select element
        if (!userConfig.mode) {
          this._config.mode = this._sourceEl.multiple ? 'multi' : 'single';
        }

        // Read attributes
        if (this._sourceEl.hasAttribute('required')) this.isInvalid = !this.items.length;
        if (this._sourceEl.disabled) this.isDisabled = true;
        if (this._sourceEl.placeholder) this._config.placeholder = this._sourceEl.placeholder;

        // Hide source element
        this._sourceEl.style.display = 'none';
        this._sourceEl.setAttribute('tabindex', '-1');

        // RTL detection
        this._rtl = isRtl(this._sourceEl);
      } else {
        // Config-only mode
        const configOptions = this._config.options || [];
        this._registerOptions(configOptions);

        // Register optgroups from config
        if (this._config.optgroups) {
          for (const og of this._config.optgroups) {
            this.optgroups[og[this._config.optgroupValueField]] = og;
          }
        }

        // Set initial items
        if (this._config.items) {
          this.items = [...this._config.items];
        }
      }

      // Mode detection
      if (!this._config.mode) {
        this._config.mode = this._config.maxItems === 1 ? 'single' : 'multi';
      }

      // Set maxItems=1 for single mode
      if (this._config.mode === 'single') {
        this._config.maxItems = 1;
      }

      // Default hideSelected
      if (this._config.hideSelected === null) {
        this._config.hideSelected = this._config.mode === 'multi' && !this._config.showSelectedCount;
      }

      // When showSelectedCount is enabled, never hide selected from dropdown
      if (this._config.showSelectedCount) {
        this._config.hideSelected = false;
      }

      // Initialize search engine
      this._sifter = new Sifter(this.options, { diacritics: this._config.diacritics });

      // Initialize plugins
      this._initPlugins();

      // Set up the load function debouncing
      if (this._config.load && this._config.loadThrottle) {
        this._debouncedLoad = debounce(this._performLoad.bind(this), this._config.loadThrottle);
      }

      // Preload if configured
      if (this._config.preload) {
        this.$nextTick(() => {
          if (this._config.preload === 'focus') {
            // Will load on focus
          } else {
            this._performLoad('');
          }
        });
      }

      // Trigger onInitialize
      this._trigger('onInitialize');

      // Watch for outside clicks
      this._onClickOutside = (e) => {
        if (!this.$el.contains(e.target)) {
          this.close();
          this.blur();
        }
      };
      document.addEventListener('mousedown', this._onClickOutside);
    },

    destroy() {
      document.removeEventListener('mousedown', this._onClickOutside);
      if (this._sourceEl) {
        this._sourceEl.style.display = '';
        this._sourceEl.removeAttribute('tabindex');
      }
    },

    // ── Plugin System ───────────────────────────────────────
    _initPlugins() {
      const plugins = this._config.plugins || [];
      for (const plugin of plugins) {
        const name = typeof plugin === 'string' ? plugin : plugin.name;
        const opts = typeof plugin === 'string' ? {} : (plugin.options || {});
        if (pluginRegistry[name]) {
          pluginRegistry[name].call(this, opts);
          this._plugins.push(name);
        } else {
          console.warn(`[selectize] Plugin "${name}" not found.`);
        }
      }
    },

    // ── Option Management ───────────────────────────────────
    _registerOptions(optionsList) {
      for (const opt of optionsList) {
        this.addOption(opt, true);
      }
    },

    addOption(data, silent = false) {
      if (Array.isArray(data)) {
        for (const item of data) this.addOption(item, silent);
        return;
      }
      const key = hashKey(data[this._config.valueField]);
      if (key === null || this.options[key]) return;

      data.$order = data.$order || ++this._orderCounter || (this._orderCounter = 1);
      this.options[key] = data;
      this.optionOrder.push(key);

      // Update sifter
      if (this._sifter) this._sifter.items = this.options;
      this._clearRenderCache();
      if (!silent) this._trigger('onOptionAdd', key, data);
    },

    updateOption(value, data) {
      const key = hashKey(value);
      if (!key || !this.options[key]) return;

      const newKey = hashKey(data[this._config.valueField]);
      data.$order = this.options[key].$order;
      this.options[newKey] = data;

      if (key !== newKey) {
        delete this.options[key];
        const idx = this.optionOrder.indexOf(key);
        if (idx !== -1) this.optionOrder[idx] = newKey;

        // Update items
        const itemIdx = this.items.indexOf(key);
        if (itemIdx !== -1) this.items[itemIdx] = newKey;
      }

      if (this._sifter) this._sifter.items = this.options;
      this._clearRenderCache();
    },

    removeOption(value) {
      const key = hashKey(value);
      if (!key) return;
      delete this.options[key];
      delete this.userOptions[key];
      const idx = this.optionOrder.indexOf(key);
      if (idx !== -1) this.optionOrder.splice(idx, 1);

      this.items = this.items.filter((v) => v !== key);
      if (this._sifter) this._sifter.items = this.options;
      this._clearRenderCache();
      this._trigger('onOptionRemove', key);
    },

    clearOptions() {
      // Keep selected items' options
      const keep = {};
      for (const val of this.items) {
        if (this.options[val]) keep[val] = this.options[val];
      }
      this.options = keep;
      this.optionOrder = Object.keys(keep);
      this.userOptions = {};
      if (this._sifter) this._sifter.items = this.options;
      this._clearRenderCache();
    },

    getOption(value) {
      return this.options[hashKey(value)] || null;
    },

    // ── Item (Selection) Management ─────────────────────────
    addItem(value, silent = false) {
      const key = hashKey(value);
      if (!key || !this.options[key]) return;
      if (this.items.includes(key)) return;

      // For single select, replace the current item instead of blocking
      if (this.isSingle && this.items.length) {
        this.removeItem(this.items[0], true);
      }

      // For multi select, respect the maxItems limit
      if (this.isFull) return;

      this.items.push(key);
      this.caretPos = this.items.length;

      this._syncSourceElement();
      this._clearRenderCache();
      this.query = '';

      if (this._config.closeAfterSelect || this.isSingle) {
        this.close();
      }

      if (this.isFull) {
        this.close();
      }

      if (!silent) {
        this._trigger('onItemAdd', key, this.options[key]);
        this._trigger('onChange', this.getValue());
      }
    },

    removeItem(value, silent = false) {
      const key = hashKey(value);
      const idx = this.items.indexOf(key);
      if (idx === -1) return;

      this.items.splice(idx, 1);
      if (this.caretPos > this.items.length) {
        this.caretPos = this.items.length;
      }

      this._syncSourceElement();
      this._clearRenderCache();

      if (!silent) {
        this._trigger('onItemRemove', key);
        this._trigger('onChange', this.getValue());
      }
    },

    clear(silent = false) {
      if (!this.items.length) return;
      this.items = [];
      this.caretPos = 0;
      this._syncSourceElement();
      this._clearRenderCache();

      if (!silent) {
        this._trigger('onClear');
        this._trigger('onChange', this.getValue());
      }
    },

    getValue() {
      if (this.isSingle) {
        return this.items.length ? this.items[0] : '';
      }
      return [...this.items];
    },

    setValue(value, silent = false) {
      this.clear(true);
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        if (v !== '' && v !== null && v !== undefined) {
          this.addItem(v, true);
        }
      }
      if (!silent) {
        this._trigger('onChange', this.getValue());
      }
    },

    // ── Create Item ─────────────────────────────────────────
    createItem(input = null) {
      const val = input !== null ? input : this.query;
      if (!val.trim()) return;
      if (!this._config.create) return;

      const createFn = this._config.create;
      let data;

      if (typeof createFn === 'function') {
        data = createFn(val, (result) => {
          if (result) {
            this.addOption(result);
            this.addItem(result[this._config.valueField]);
          }
        });
        // If create returns data synchronously, use it
        if (data && typeof data === 'object') {
          this.addOption(data);
          this.addItem(data[this._config.valueField]);
        }
      } else {
        // Default creation: use input as both value and label
        data = {};
        data[this._config.valueField] = val;
        data[this._config.labelField] = val;
        this.addOption(data);
        this.addItem(val);
      }

      this.query = '';
      this._clearRenderCache();
    },

    // ── Search ──────────────────────────────────────────────
    _getFilteredOptions() {
      const config = this._config;
      if (!this._sifter) return [];

      // Prepare search fields
      const searchFields = Array.isArray(config.searchField)
        ? config.searchField
        : [config.searchField];

      // Prepare sort
      let sort;
      if (config.sortField) {
        if (typeof config.sortField === 'string') {
          sort = [{ field: config.sortField, direction: 'asc' }];
        } else if (Array.isArray(config.sortField)) {
          sort = config.sortField;
        } else {
          sort = [config.sortField];
        }
      } else {
        sort = [{ field: '$order', direction: 'asc' }];
      }

      let q = this.query;
      if (config.normalize && q) {
        q = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      }

      const searchOptions = {
        fields: searchFields,
        conjunction: config.searchConjunction,
        sort,
        nesting: searchFields.some((f) => f.includes('.')),
        respect_word_boundaries: config.respectWordBoundaries,
        limit: config.maxOptions,
      };

      if (config.score) {
        searchOptions.score = config.score;
      }

      const results = this._sifter.search(q, searchOptions);

      let filtered = results.items
        .map((item) => {
          const opt = this.options[item.id];
          return opt ? { ...opt, _score: item.score } : null;
        })
        .filter(Boolean);

      // Hide selected
      if (config.hideSelected) {
        filtered = filtered.filter(
          (opt) => !this.items.includes(hashKey(opt[config.valueField]))
        );
      }

      // Filter disabled
      filtered = filtered.filter((opt) => !opt[config.disabledField]);

      return filtered;
    },

    // ── Dropdown Control ────────────────────────────────────
    open() {
      if (this.isOpen || this.isDisabled || this.isLocked) return;
      this.isOpen = true;
      this.activeIndex = this._config.setFirstOptionActive ? 0 : -1;
      this._trigger('onDropdownOpen');

      this.$nextTick(() => {
        this._scrollToActive();
      });
    },

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.activeIndex = -1;
      this._trigger('onDropdownClose');
    },

    toggle() {
      this.isOpen ? this.close() : this.open();
    },

    // ── Focus / Blur ────────────────────────────────────────
    focus() {
      if (this.isDisabled) return;
      this.isFocused = true;

      const input = this.$refs.searchInput;
      if (input) {
        this.$nextTick(() => input.focus());
      }

      if (this._config.openOnFocus) {
        this.open();
      }

      if (this._config.preload === 'focus' && !this.loadedSearches['']) {
        this._performLoad('');
      }

      this._trigger('onFocus');
    },

    blur() {
      if (!this.isFocused) return;
      this.isFocused = false;

      if (this._config.createOnBlur && this.query.trim() && this.canCreate) {
        this.createItem();
      }

      this.close();
      this._trigger('onBlur');
    },

    // ── Keyboard Navigation ─────────────────────────────────
    onKeyDown(e) {
      if (this.isDisabled || this.isLocked) return;

      const opts = this.filteredOptions;
      const canCreateNow = this.canCreate;
      const totalItems = opts.length + (canCreateNow ? 1 : 0);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!this.isOpen) {
            this.open();
          } else {
            this.activeIndex = Math.min(this.activeIndex + 1, totalItems - 1);
            this._scrollToActive();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (this.isOpen) {
            this.activeIndex = Math.max(this.activeIndex - 1, 0);
            this._scrollToActive();
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (this.isOpen && this.activeIndex >= 0) {
            if (this.activeIndex < opts.length) {
              this.selectOption(opts[this.activeIndex]);
            } else if (canCreateNow) {
              this.createItem();
            }
          } else if (!this.isOpen) {
            this.open();
          }
          break;

        case 'Escape':
          e.preventDefault();
          this.close();
          break;

        case 'Tab':
          if (this.isOpen && this._config.selectOnTab && this.activeIndex >= 0) {
            e.preventDefault();
            if (this.activeIndex < opts.length) {
              this.selectOption(opts[this.activeIndex]);
            } else if (canCreateNow) {
              this.createItem();
            }
          }
          break;

        case 'Backspace':
          if (!this.query && this.items.length && this.isMultiple) {
            e.preventDefault();
            const lastItem = this.items[this.items.length - 1];
            this.removeItem(lastItem);
          }
          break;

        case 'Delete':
          if (!this.query && this.items.length && this.isMultiple) {
            e.preventDefault();
            const lastItem = this.items[this.items.length - 1];
            this.removeItem(lastItem);
          }
          break;

        case 'a':
        case 'A':
          if ((e.ctrlKey || e.metaKey) && this.isMultiple) {
            e.preventDefault();
            // Select all - no-op in terms of selection, could be used for copy
          }
          break;
      }
    },

    // ── Input Handling ──────────────────────────────────────
    onInput() {
      this._trigger('onType', this.query);

      if (!this.isOpen) {
        this.open();
      }

      // Active first option
      this.activeIndex = this._config.setFirstOptionActive || this.query ? 0 : -1;

      // Remote load
      if (this._config.load && this.query) {
        const q = this.query;
        if (!this.loadedSearches[q]) {
          if (this._debouncedLoad) {
            this._debouncedLoad(q);
          } else {
            this._performLoad(q);
          }
        }
      }

      // Auto-grow input
      if (this.$refs.searchInput && this.isMultiple) {
        autoGrow(this.$refs.searchInput);
      }
    },

    onPaste(e) {
      if (!this.isMultiple) return;
      const paste = (e.clipboardData || window.clipboardData).getData('text');
      if (!paste) return;

      const splitOn = this._config.splitOn || this._config.delimiter;
      if (!splitOn) return;

      e.preventDefault();
      const regex = splitOn instanceof RegExp ? splitOn : new RegExp('[' + splitOn.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + ']');
      const parts = paste.split(regex).map((s) => s.trim()).filter(Boolean);

      for (const part of parts) {
        // Try to find matching option
        const match = Object.values(this.options).find(
          (o) => o[this._config.labelField]?.toLowerCase() === part.toLowerCase() ||
                 o[this._config.valueField]?.toLowerCase() === part.toLowerCase()
        );
        if (match) {
          this.addItem(match[this._config.valueField]);
        } else if (this._config.create) {
          this.createItem(part);
        }
      }
    },

    // ── Option Selection ────────────────────────────────────
    selectOption(option) {
      if (!option) return;
      if (option[this._config.disabledField]) return;

      const value = option[this._config.valueField];

      // In showSelectedCount mode, toggle selection on click
      if (this._config.showSelectedCount && this.isMultiple && this.isSelected(option)) {
        this.removeItem(value);
        return;
      }

      this.addItem(value);
      this.query = '';

      if (this.isSingle) {
        // In single mode, blur so isFocused becomes false and the
        // selected value text is displayed instead of the search input.
        // addItem() already called close(), so we must NOT refocus
        // (that would trigger openOnFocus and reopen the dropdown).
        this.isFocused = false;
        // Clear the search cache so the user can re-search when they
        // reopen the dropdown to change the selection.
        this.loadedSearches = {};
        if (this.$refs.searchInput) {
          this.$refs.searchInput.blur();
        }
      } else if (this.$refs.searchInput) {
        // In multi mode, keep focus so the user can continue selecting.
        this.$refs.searchInput.focus();
        autoGrow(this.$refs.searchInput);
      }
    },

    // ── Remote Loading ──────────────────────────────────────
    _performLoad(query) {
      if (!this._config.load) return;
      if (this.loadedSearches[query]) return;

      this.isLoading = true;
      this.loadedSearches[query] = true;

      this._config.load(query, (results) => {
        this.isLoading = false;
        if (results && Array.isArray(results)) {
          for (const item of results) {
            this.addOption(item, true);
          }
          this._clearRenderCache();
        }
      });
    },

    // ── Rendering Helpers ───────────────────────────────────
    renderOption(option) {
      const config = this._config;
      const label = option[config.labelField] || '';

      if (config.render?.option) {
        return config.render.option(option, escapeHtml);
      }

      if (config.highlight && this.query) {
        return highlight(label, this.query);
      }

      return escapeHtml(label);
    },

    renderItem(option) {
      if (!option) return '';
      const config = this._config;
      const label = option[config.labelField] || '';

      if (config.render?.item) {
        return config.render.item(option, escapeHtml);
      }

      return escapeHtml(label);
    },

    renderOptionCreate() {
      const config = this._config;
      if (config.render?.optionCreate) {
        return config.render.optionCreate({ input: this.query }, escapeHtml);
      }
      return `Add <span class="font-medium">${escapeHtml(this.query)}</span>...`;
    },

    renderNoResults() {
      const config = this._config;
      if (config.render?.noResults) {
        return config.render.noResults({ query: this.query }, escapeHtml);
      }
      return 'No results found';
    },

    renderDropdownPlaceholder() {
      const config = this._config;
      if (config.render?.dropdownPlaceholder) {
        return config.render.dropdownPlaceholder({}, escapeHtml);
      }
      return escapeHtml(config.dropdownPlaceholder || '');
    },

    renderLoading() {
      const config = this._config;
      if (config.render?.loading) {
        return config.render.loading({ query: this.query }, escapeHtml);
      }
      return 'Loading...';
    },

    // ── Optgroup Support ────────────────────────────────────
    addOptionGroup(id, data) {
      this.optgroups[id] = data;
      this._clearRenderCache();
    },

    removeOptionGroup(id) {
      delete this.optgroups[id];
      this._clearRenderCache();
    },

    getGroupedOptions() {
      const options = this.filteredOptions;
      const config = this._config;
      const groups = {};
      const ungrouped = [];

      for (const opt of options) {
        const groupId = opt[config.optgroupField];
        if (groupId && this.optgroups[groupId]) {
          if (!groups[groupId]) groups[groupId] = [];
          groups[groupId].push(opt);
        } else {
          ungrouped.push(opt);
        }
      }

      const result = [];
      // Add grouped options
      for (const [id, items] of Object.entries(groups)) {
        const group = this.optgroups[id];
        result.push({
          id,
          label: group[config.optgroupLabelField] || id,
          options: items,
        });
      }
      // Add ungrouped
      if (ungrouped.length) {
        result.push({ id: null, label: null, options: ungrouped });
      }

      return result;
    },

    /**
     * Get grouped options with precomputed offsets for template binding.
     * Works for both grouped and flat option lists.
     */
    _getGroupedView() {
      const groups = this.getGroupedOptions();
      let offset = 0;
      return groups.map((g, i) => {
        const view = {
          key: g.id || '__ungrouped_' + i,
          label: g.label,
          options: g.options,
          offset,
        };
        offset += g.options.length;
        return view;
      });
    },

    get hasOptgroups() {
      return Object.keys(this.optgroups).length > 0;
    },

    // ── State Control ───────────────────────────────────────
    lock() {
      this.isLocked = true;
      this.close();
    },

    unlock() {
      this.isLocked = false;
    },

    disable() {
      this.isDisabled = true;
      this.close();
    },

    enable() {
      this.isDisabled = false;
    },

    setMaxItems(max) {
      this._config.maxItems = max;
      if (this.isFull) this.close();
    },

    // ── Source Element Sync ─────────────────────────────────
    _syncSourceElement() {
      if (!this._sourceEl) return;

      if (isSelectElement(this._sourceEl)) {
        // Update selected options in the native select
        for (const opt of this._sourceEl.options) {
          opt.selected = this.items.includes(opt.value);
        }

        // Add any missing options (user-created)
        for (const val of this.items) {
          const exists = Array.from(this._sourceEl.options).some((o) => o.value === val);
          if (!exists) {
            const optEl = document.createElement('option');
            optEl.value = val;
            optEl.textContent = this.options[val]?.[this._config.labelField] || val;
            optEl.selected = true;
            this._sourceEl.appendChild(optEl);
          }
        }

        // Dispatch native change event
        this._sourceEl.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Input element
        this._sourceEl.value = this.isSingle
          ? (this.items[0] || '')
          : this.items.join(this._config.delimiter);
        this._sourceEl.dispatchEvent(new Event('input', { bubbles: true }));
        this._sourceEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },

    // ── Scroll Management ───────────────────────────────────
    _scrollToActive() {
      this.$nextTick(() => {
        const dropdown = this.$refs.dropdown;
        if (!dropdown) return;
        const active = dropdown.querySelector('[data-active="true"]');
        if (active) {
          active.scrollIntoView({ block: 'nearest' });
        }
      });
    },

    // ── Event Triggering ────────────────────────────────────
    _trigger(callbackName, ...args) {
      const cb = this._config[callbackName];
      if (typeof cb === 'function') {
        cb.apply(this, args);
      }
      // Also dispatch a custom DOM event
      const eventName = callbackName.replace(/^on/, '').toLowerCase();
      this.$el.dispatchEvent(
        new CustomEvent(`selectra:${eventName}`, {
          detail: args,
          bubbles: true,
        })
      );
    },

    // ── Cache ───────────────────────────────────────────────
    _clearRenderCache() {
      this._renderCache = {};
    },

    // ── Helper: Check if an option is selected ──────────────
    isSelected(option) {
      return this.items.includes(hashKey(option[this._config.valueField]));
    },

    // ── Helper: Option key for x-for ────────────────────────
    optionKey(option) {
      return hashKey(option[this._config.valueField]);
    },
  });
}

/**
 * Register a plugin globally
 */
export function registerPlugin(name, fn) {
  pluginRegistry[name] = fn;
}

/**
 * Get the default configuration
 */
export function getDefaults() {
  return { ...DEFAULTS };
}

export { DEFAULTS, escapeHtml, hashKey };
