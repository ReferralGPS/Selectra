/*! Selectra v1.1.1 | Apache-2.0 License */
const DIACRITICS = {
  a: "[aḀḁĂăÂâǍǎȺⱥȦȧẠạÄäÀàÁáĀāÃãÅåąĄÃąĄ]",
  b: "[b␢βΒB฿𐌁ᛒ]",
  c: "[cĆćĈĉČčĊċC̄c̄ÇçḈḉȻȼƇƈɕᴄＣｃ]",
  d: "[dĎďḊḋḐḑḌḍḒḓḎḏĐđD̦d̦ƉɖƊɗƋƌᵭᶁᶑȡᴅＤｄð]",
  e: "[eÉéÈèÊêḘḙĚěĔĕẼẽḚḛẺẻĖėËëĒēȨȩĘęᶒɆɇȄȅẾếỀềỄễỂểḜḝḖḗḔḕȆȇẸẹỆệⱸᴇＥｅɘǝƏƐε]",
  f: "[fƑƒḞḟ]",
  g: "[gɢ₲ǤǥĜĝĞğĢģƓɠĠġ]",
  h: "[hĤĥĦħḨḩẖẖḤḥḢḣɦʰǶƕ]",
  i: "[iÍíÌìĬĭÎîǏǐÏïḮḯĨĩĮįĪīỈỉȈȉȊȋỊịḬḭƗɨɨ̆ᵻᶖİiIıɪＩｉ]",
  j: "[jȷĴĵɈɉʝɟʲ]",
  k: "[kƘƙꝀꝁḰḱǨǩḲḳḴḵκϰ₭]",
  l: "[lŁłĽľĻļĹĺḶḷḸḹḼḽḺḻĿŀȽƚⱠⱡⱢɫɬᶅɭȴʟＬｌ]",
  n: "[nŃńǸǹŇňÑñṄṅŅņṆṇṊṋṈṉN̈n̈ƝɲȠƞᵰᶇɳȵɴＮｎŊŋ]",
  o: "[oØøÖöÓóÒòÔôǑǒŐőŎŏȮȯỌọƟɵƠơỎỏŌōÕõǪǫȌȍՕօ]",
  p: "[pṔṕṖṗⱣᵽƤƥᵱ]",
  q: "[qꝖꝗʠɊɋꝘꝙq̃]",
  r: "[rŔŕɌɍŘřŖŗṘṙȐȑȒȓṚṛⱤɽ]",
  s: "[sŚśṠṡṢṣꞨꞩŜŝŠšŞşȘșS̈s̈]",
  t: "[tŤťṪṫŢţṬṭƮʈȚțṰṱṮṯƬƭ]",
  u: "[uŬŭɄʉỤụÜüÚúÙùÛûǓǔŰűŬŭƯưỦủŪūŨũŲųȔȕ∪]",
  v: "[vṼṽṾṿƲʋꝞꝟⱱʋ]",
  w: "[wẂẃẀẁŴŵẄẅẆẇẈẉ]",
  x: "[xẌẍẊẋχ]",
  y: "[yÝýỲỳŶŷŸÿỸỹẎẏỴỵɎɏƳƴ]",
  z: "[zŹźẐẑŽžŻżẒẓẔẕƵƶ]"
};
const asciifold = (() => {
  const lookup = {};
  let i18nChars = "";
  for (const k in DIACRITICS) {
    const chunk = DIACRITICS[k].substring(2, DIACRITICS[k].length - 1);
    i18nChars += chunk;
    for (let i = 0; i < chunk.length; i++) {
      lookup[chunk.charAt(i)] = k;
    }
  }
  const regexp = new RegExp("[" + i18nChars + "]", "g");
  return (str) => str.replace(regexp, (ch) => lookup[ch] || "").toLowerCase();
})();
function escapeRegex(str) {
  return (str + "").replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
}
function getAttr(obj, name, nesting) {
  if (!obj || !name) return void 0;
  if (!nesting) return obj[name];
  const names = name.split(".");
  let current = obj;
  while (names.length && current) {
    current = current[names.shift()];
  }
  return current;
}
function cmp(a, b) {
  if (typeof a === "number" && typeof b === "number") {
    return a > b ? 1 : a < b ? -1 : 0;
  }
  a = asciifold(String(a || ""));
  b = asciifold(String(b || ""));
  if (a > b) return 1;
  if (b > a) return -1;
  return 0;
}
class Sifter {
  constructor(items, settings = {}) {
    this.items = items;
    this.settings = { diacritics: true, ...settings };
  }
  tokenize(query, respectWordBoundaries) {
    query = String(query || "").toLowerCase().trim();
    if (!query.length) return [];
    const tokens = [];
    const words = query.split(/\s+/);
    for (const word of words) {
      let regex = escapeRegex(word);
      if (this.settings.diacritics) {
        for (const letter in DIACRITICS) {
          regex = regex.replace(new RegExp(letter, "g"), DIACRITICS[letter]);
        }
      }
      if (respectWordBoundaries) regex = "\\b" + regex;
      tokens.push({ string: word, regex: new RegExp(regex, "i") });
    }
    return tokens;
  }
  getScoreFunction(search, options) {
    search = this.prepareSearch(search, options);
    const { tokens } = search;
    const { fields } = search.options;
    const tokenCount = tokens.length;
    const { nesting } = search.options;
    const scoreValue = (value, token) => {
      if (!value) return 0;
      value = String(value || "");
      const pos = value.search(token.regex);
      if (pos === -1) return 0;
      let score = token.string.length / value.length;
      if (pos === 0) score += 0.5;
      return score;
    };
    const fieldCount = fields.length;
    const scoreObject = fieldCount === 0 ? () => 0 : fieldCount === 1 ? (token, data) => scoreValue(getAttr(data, fields[0], nesting), token) : (token, data) => {
      let sum = 0;
      for (let i = 0; i < fieldCount; i++) {
        sum += scoreValue(getAttr(data, fields[i], nesting), token);
      }
      return sum / fieldCount;
    };
    if (!tokenCount) return () => 0;
    if (tokenCount === 1) return (data) => scoreObject(tokens[0], data);
    if (search.options.conjunction === "and") {
      return (data) => {
        let sum = 0;
        for (let i = 0; i < tokenCount; i++) {
          const score = scoreObject(tokens[i], data);
          if (score <= 0) return 0;
          sum += score;
        }
        return sum / tokenCount;
      };
    }
    return (data) => {
      let sum = 0;
      for (let i = 0; i < tokenCount; i++) {
        sum += scoreObject(tokens[i], data);
      }
      return sum / tokenCount;
    };
  }
  getSortFunction(search, options) {
    search = this.prepareSearch(search, options);
    const sort = !search.query && options.sort_empty || options.sort;
    const getField = (name, result) => {
      if (name === "$score") return result.score;
      return getAttr(this.items[result.id], name, options.nesting);
    };
    const fields = [];
    if (sort) {
      for (const s of sort) {
        if (search.query || s.field !== "$score") {
          fields.push(s);
        }
      }
    }
    if (search.query) {
      let implicitScore = true;
      for (const f of fields) {
        if (f.field === "$score") {
          implicitScore = false;
          break;
        }
      }
      if (implicitScore) fields.unshift({ field: "$score", direction: "desc" });
    } else {
      const idx = fields.findIndex((f) => f.field === "$score");
      if (idx !== -1) fields.splice(idx, 1);
    }
    const multipliers = fields.map((f) => f.direction === "desc" ? -1 : 1);
    const fieldCount = fields.length;
    if (!fieldCount) return null;
    if (fieldCount === 1) {
      const field = fields[0].field;
      const mult = multipliers[0];
      return (a, b) => mult * cmp(getField(field, a), getField(field, b));
    }
    return (a, b) => {
      for (let i = 0; i < fieldCount; i++) {
        const result = multipliers[i] * cmp(getField(fields[i].field, a), getField(fields[i].field, b));
        if (result) return result;
      }
      return 0;
    };
  }
  prepareSearch(query, options) {
    if (typeof query === "object") return query;
    options = { ...options };
    if (options.fields && !Array.isArray(options.fields)) options.fields = [options.fields];
    if (options.sort && !Array.isArray(options.sort)) options.sort = [options.sort];
    if (options.sort_empty && !Array.isArray(options.sort_empty))
      options.sort_empty = [options.sort_empty];
    return {
      options,
      query: String(query || "").toLowerCase(),
      tokens: this.tokenize(query, options.respect_word_boundaries),
      total: 0,
      items: []
    };
  }
  search(query, options) {
    const search = this.prepareSearch(query, options);
    const opts = search.options;
    const q = search.query;
    const fnScore = opts.score || this.getScoreFunction(search);
    const items = this.items;
    if (q.length) {
      const iterate = Array.isArray(items) ? (cb) => items.forEach((item, i) => cb(item, i)) : (cb) => Object.keys(items).forEach((key) => cb(items[key], key));
      iterate((item, id) => {
        const score = fnScore(item);
        if (opts.filter === false || score > 0) {
          search.items.push({ score, id });
        }
      });
    } else {
      const iterate = Array.isArray(items) ? (cb) => items.forEach((item, i) => cb(item, i)) : (cb) => Object.keys(items).forEach((key) => cb(items[key], key));
      iterate((item, id) => {
        search.items.push({ score: 1, id });
      });
    }
    const fnSort = this.getSortFunction(search, opts);
    if (fnSort) search.items.sort(fnSort);
    search.total = search.items.length;
    if (typeof opts.limit === "number") {
      search.items = search.items.slice(0, opts.limit);
    }
    return search;
  }
}
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
let idCounter = 0;
function uid(prefix = "selectize") {
  return `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}
function hashKey(value) {
  if (typeof value === "undefined" || value === null) return null;
  return typeof value === "boolean" ? value ? "1" : "0" : String(value);
}
function highlight(text, search) {
  if (!search || !search.length) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(
    "(" + search.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1") + ")",
    "ig"
  );
  return escaped.replace(regex, '<span class="font-semibold text-inherit">$1</span>');
}
let measureCanvas;
function measureString(str, el) {
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
  }
  const ctx = measureCanvas.getContext("2d");
  if (el) {
    const style = window.getComputedStyle(el);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  }
  return ctx.measureText(str).width;
}
function autoGrow(input, extraWidth = 10) {
  const val = input.value || input.placeholder || "";
  const width = measureString(val, input) + extraWidth;
  input.style.width = Math.max(width, 60) + "px";
}
function isSelectElement(el) {
  return el.tagName && el.tagName.toLowerCase() === "select";
}
function readSelectOptions(selectEl) {
  const options = [];
  const optgroups = [];
  const selectedValues = [];
  const processOption = (optionEl, optgroup = null) => {
    const value = optionEl.value;
    const text = optionEl.textContent.trim();
    const disabled = optionEl.disabled;
    if (!value && !text) return;
    const data = { value, text, disabled };
    if (optionEl.dataset.data) {
      try {
        Object.assign(data, JSON.parse(optionEl.dataset.data));
      } catch (_) {
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
    if (child.tagName.toLowerCase() === "optgroup") {
      const groupId = child.getAttribute("label") || "";
      optgroups.push({
        value: groupId,
        label: groupId,
        disabled: child.disabled
      });
      for (const opt of child.children) {
        processOption(opt, groupId);
      }
    } else if (child.tagName.toLowerCase() === "option") {
      processOption(child);
    }
  }
  return { options, optgroups, selectedValues };
}
function isRtl(el) {
  const style = window.getComputedStyle(el);
  return style.direction === "rtl";
}
const DEFAULTS = {
  delimiter: ",",
  splitOn: null,
  persist: true,
  diacritics: true,
  create: false,
  showAddOptionOnCreate: true,
  createOnBlur: false,
  createFilter: null,
  highlight: true,
  openOnFocus: true,
  maxOptions: 1e3,
  maxItems: null,
  hideSelected: null,
  selectOnTab: true,
  preload: false,
  allowEmptyOption: false,
  closeAfterSelect: false,
  loadThrottle: 300,
  loadingClass: "loading",
  placeholder: "",
  dropdownPlaceholder: "",
  name: null,
  // Form field name — auto-creates hidden input when no source element exists
  mode: null,
  // 'single' | 'multi' — auto-detected
  search: true,
  showArrow: true,
  showSelectedCount: false,
  valueField: "value",
  labelField: "text",
  disabledField: "disabled",
  optgroupField: "optgroup",
  optgroupLabelField: "label",
  optgroupValueField: "value",
  sortField: "$order",
  searchField: ["text"],
  searchConjunction: "and",
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
    loading: null
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
  onInitialize: null
};
const pluginRegistry = {};
function createSelectizeComponent(userConfig = {}) {
  return () => ({
    // ── Reactive state ──────────────────────────────────────
    isOpen: false,
    isFocused: false,
    isDisabled: false,
    isLocked: false,
    isLoading: false,
    isInvalid: false,
    query: "",
    activeIndex: -1,
    caretPos: 0,
    items: [],
    // selected values (strings)
    options: {},
    // { [value]: { value, text, ... } }
    optgroups: {},
    // { [id]: { value, label, ... } }
    userOptions: {},
    // user-created option values
    optionOrder: [],
    // maintains insertion order
    loadedSearches: {},
    lastQuery: "",
    // Internal
    _config: {},
    _sifter: null,
    _sourceEl: null,
    _id: "",
    _rtl: false,
    _plugins: [],
    _renderCache: {},
    // ── Computed properties ─────────────────────────────────
    get config() {
      return this._config;
    },
    get isMultiple() {
      return this._config.mode === "multi";
    },
    get isSingle() {
      return this._config.mode === "single";
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
        if (typeof filter === "function") return filter(this.query);
        if (filter instanceof RegExp) return filter.test(this.query);
        if (typeof filter === "string") return new RegExp(filter).test(this.query);
      }
      const existing = Object.values(this.options).find(
        (o) => {
          var _a;
          return ((_a = o[this._config.labelField]) == null ? void 0 : _a.toLowerCase()) === this.query.toLowerCase();
        }
      );
      return !existing;
    },
    get selectedItems() {
      return this.items.map((val) => this.options[hashKey(val)]).filter(Boolean);
    },
    get filteredOptions() {
      return this._getFilteredOptions();
    },
    get placeholderText() {
      if (this.items.length > 0 && this.isSingle) return "";
      return this._config.placeholder || "";
    },
    get selectedCountText() {
      const count = this.items.length;
      return count;
    },
    get currentValueText() {
      if (!this.isSingle || !this.items.length) return "";
      const opt = this.options[hashKey(this.items[0])];
      return opt ? opt[this._config.labelField] : "";
    },
    // ── Lifecycle ───────────────────────────────────────────
    init() {
      this._id = uid();
      this._config = { ...DEFAULTS, ...userConfig };
      this._sourceEl = this.$el.querySelector("select") || this.$el.querySelector('input[type="text"], input[type="hidden"]');
      if (this._sourceEl && isSelectElement(this._sourceEl)) {
        const parsed = readSelectOptions(this._sourceEl);
        const placeholderOpt = parsed.options.find((o) => o.value === "");
        if (placeholderOpt && !this._config.placeholder) {
          this._config.placeholder = placeholderOpt.text;
        }
        const realSelected = parsed.selectedValues.filter((v) => v !== "");
        const vf = this._config.valueField;
        const lf = this._config.labelField;
        if (vf !== "value" || lf !== "text") {
          for (const opt of parsed.options) {
            if (vf !== "value" && opt[vf] === void 0) {
              opt[vf] = opt.value;
            }
            if (lf !== "text" && opt[lf] === void 0) {
              opt[lf] = opt.text;
            }
          }
        }
        const configOptions = this._config.options || [];
        const allOptions = [...parsed.options, ...configOptions];
        this._registerOptions(allOptions);
        for (const og of parsed.optgroups) {
          this.optgroups[og.value] = og;
        }
        if (realSelected.length) {
          this.items = [...realSelected];
        }
        if (!userConfig.mode) {
          this._config.mode = this._sourceEl.multiple ? "multi" : "single";
        }
        if (this._sourceEl.hasAttribute("required")) this.isInvalid = !this.items.length;
        if (this._sourceEl.disabled) this.isDisabled = true;
        if (this._sourceEl.placeholder) this._config.placeholder = this._sourceEl.placeholder;
        this._sourceEl.style.display = "none";
        this._sourceEl.setAttribute("tabindex", "-1");
        this._rtl = isRtl(this._sourceEl);
      } else {
        const configOptions = this._config.options || [];
        this._registerOptions(configOptions);
        if (this._config.optgroups) {
          for (const og of this._config.optgroups) {
            this.optgroups[og[this._config.optgroupValueField]] = og;
          }
        }
        if (this._config.items) {
          this.items = [...this._config.items];
        }
      }
      if (!this._config.mode) {
        this._config.mode = this._config.maxItems === 1 ? "single" : "multi";
      }
      if (this._config.mode === "single") {
        this._config.maxItems = 1;
      }
      if (this._config.name && !this._sourceEl) {
        if (this._config.mode === "single") {
          const hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = this._config.name;
          hidden.value = this.items[0] || "";
          this.$el.appendChild(hidden);
          this._sourceEl = hidden;
        } else {
          this._hiddenInputContainer = document.createElement("div");
          this._hiddenInputContainer.style.display = "none";
          this.$el.appendChild(this._hiddenInputContainer);
          this._syncHiddenInputs();
        }
        this._createdHiddenInput = true;
      }
      if (this._config.hideSelected === null) {
        this._config.hideSelected = this._config.mode === "multi" && !this._config.showSelectedCount;
      }
      if (this._config.showSelectedCount) {
        this._config.hideSelected = false;
      }
      this._sifter = new Sifter(this.options, { diacritics: this._config.diacritics });
      this._initPlugins();
      if (this._config.load && this._config.loadThrottle) {
        this._debouncedLoad = debounce(this._performLoad.bind(this), this._config.loadThrottle);
      }
      if (this._config.preload) {
        this.$nextTick(() => {
          if (this._config.preload === "focus") ;
          else {
            this._performLoad("");
          }
        });
      }
      this._trigger("onInitialize");
      this._onClickOutside = (e) => {
        if (!this.$el.contains(e.target)) {
          this.close();
          this.blur();
        }
      };
      document.addEventListener("mousedown", this._onClickOutside);
    },
    destroy() {
      document.removeEventListener("mousedown", this._onClickOutside);
      if (this._hiddenInputContainer) {
        this._hiddenInputContainer.remove();
      } else if (this._sourceEl) {
        if (this._createdHiddenInput) {
          this._sourceEl.remove();
        } else {
          this._sourceEl.style.display = "";
          this._sourceEl.removeAttribute("tabindex");
        }
      }
    },
    // ── Plugin System ───────────────────────────────────────
    _initPlugins() {
      const plugins = this._config.plugins || [];
      for (const plugin of plugins) {
        const name = typeof plugin === "string" ? plugin : plugin.name;
        const opts = typeof plugin === "string" ? {} : plugin.options || {};
        if (pluginRegistry[name]) {
          pluginRegistry[name].call(this, opts);
          this._plugins.push(name);
        } else {
          console.warn(`[selectize] Plugin "${name}" not found.`);
        }
      }
    },
    // ── Option Management ───────────────────────────────────
    _normalizeOption(opt) {
      if (Array.isArray(opt) && !Array.isArray(opt[0])) {
        return {
          [this._config.labelField]: opt[0],
          [this._config.valueField]: opt[1]
        };
      }
      return opt;
    },
    _registerOptions(optionsList) {
      for (const opt of optionsList) {
        this.addOption(this._normalizeOption(opt), true);
      }
    },
    addOption(data, silent = false) {
      if (Array.isArray(data)) {
        if (data.length && !Array.isArray(data[0]) && typeof data[0] !== "object") {
          data = this._normalizeOption(data);
        } else {
          for (const item of data) this.addOption(this._normalizeOption(item), silent);
          return;
        }
      }
      const key = hashKey(data[this._config.valueField]);
      if (key === null || this.options[key]) return;
      data.$order = data.$order || ++this._orderCounter || (this._orderCounter = 1);
      this.options[key] = data;
      this.optionOrder.push(key);
      if (this._sifter) this._sifter.items = this.options;
      this._clearRenderCache();
      if (!silent) this._trigger("onOptionAdd", key, data);
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
      this._trigger("onOptionRemove", key);
    },
    clearOptions() {
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
      if (this.isSingle && this.items.length) {
        this.removeItem(this.items[0], true);
      }
      if (this.isFull) return;
      this.items.push(key);
      this.caretPos = this.items.length;
      this._syncSourceElement();
      this._clearRenderCache();
      this.query = "";
      if (this._config.closeAfterSelect || this.isSingle) {
        this.close();
      }
      if (this.isFull) {
        this.close();
      }
      if (!silent) {
        this._trigger("onItemAdd", key, this.options[key]);
        this._trigger("onChange", this.getValue());
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
        this._trigger("onItemRemove", key);
        this._trigger("onChange", this.getValue());
      }
    },
    clear(silent = false) {
      if (!this.items.length) return;
      this.items = [];
      this.caretPos = 0;
      this._syncSourceElement();
      this._clearRenderCache();
      if (!silent) {
        this._trigger("onClear");
        this._trigger("onChange", this.getValue());
      }
    },
    getValue() {
      if (this.isSingle) {
        return this.items.length ? this.items[0] : "";
      }
      return [...this.items];
    },
    setValue(value, silent = false) {
      this.clear(true);
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        if (v !== "" && v !== null && v !== void 0) {
          this.addItem(v, true);
        }
      }
      if (!silent) {
        this._trigger("onChange", this.getValue());
      }
    },
    // ── Create Item ─────────────────────────────────────────
    createItem(input = null) {
      const val = input !== null ? input : this.query;
      if (!val.trim()) return;
      if (!this._config.create) return;
      const createFn = this._config.create;
      let data;
      if (typeof createFn === "function") {
        data = createFn(val, (result) => {
          if (result) {
            this.addOption(result);
            this.addItem(result[this._config.valueField]);
          }
        });
        if (data && typeof data === "object") {
          this.addOption(data);
          this.addItem(data[this._config.valueField]);
        }
      } else {
        data = {};
        data[this._config.valueField] = val;
        data[this._config.labelField] = val;
        this.addOption(data);
        this.addItem(val);
      }
      this.query = "";
      this._clearRenderCache();
    },
    // ── Search ──────────────────────────────────────────────
    _getFilteredOptions() {
      const config = this._config;
      if (!this._sifter) return [];
      const searchFields = Array.isArray(config.searchField) ? config.searchField : [config.searchField];
      let sort;
      if (config.sortField) {
        if (typeof config.sortField === "string") {
          sort = [{ field: config.sortField, direction: "asc" }];
        } else if (Array.isArray(config.sortField)) {
          sort = config.sortField;
        } else {
          sort = [config.sortField];
        }
      } else {
        sort = [{ field: "$order", direction: "asc" }];
      }
      let q = this.query;
      if (config.normalize && q) {
        q = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }
      const searchOptions = {
        fields: searchFields,
        conjunction: config.searchConjunction,
        sort,
        nesting: searchFields.some((f) => f.includes(".")),
        respect_word_boundaries: config.respectWordBoundaries,
        limit: config.maxOptions
      };
      if (config.score) {
        searchOptions.score = config.score;
      }
      const results = this._sifter.search(q, searchOptions);
      let filtered = results.items.map((item) => {
        const opt = this.options[item.id];
        return opt ? { ...opt, _score: item.score } : null;
      }).filter(Boolean);
      if (config.hideSelected) {
        filtered = filtered.filter(
          (opt) => !this.items.includes(hashKey(opt[config.valueField]))
        );
      }
      filtered = filtered.filter((opt) => !opt[config.disabledField]);
      return filtered;
    },
    // ── Dropdown Control ────────────────────────────────────
    open() {
      if (this.isOpen || this.isDisabled || this.isLocked) return;
      this.isOpen = true;
      this.activeIndex = this._config.setFirstOptionActive ? 0 : -1;
      this._trigger("onDropdownOpen");
      this.$nextTick(() => {
        this._scrollToActive();
      });
    },
    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.activeIndex = -1;
      this._trigger("onDropdownClose");
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
      if (this._config.preload === "focus" && !this.loadedSearches[""]) {
        this._performLoad("");
      }
      this._trigger("onFocus");
    },
    blur() {
      if (!this.isFocused) return;
      this.isFocused = false;
      if (this._config.createOnBlur && this.query.trim() && this.canCreate) {
        this.createItem();
      }
      this.close();
      this._trigger("onBlur");
    },
    // ── Keyboard Navigation ─────────────────────────────────
    onKeyDown(e) {
      if (this.isDisabled || this.isLocked) return;
      const opts = this.filteredOptions;
      const canCreateNow = this.canCreate;
      const totalItems = opts.length + (canCreateNow ? 1 : 0);
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!this.isOpen) {
            this.open();
          } else {
            this.activeIndex = Math.min(this.activeIndex + 1, totalItems - 1);
            this._scrollToActive();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (this.isOpen) {
            this.activeIndex = Math.max(this.activeIndex - 1, 0);
            this._scrollToActive();
          }
          break;
        case "Enter":
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
        case "Escape":
          e.preventDefault();
          this.close();
          break;
        case "Tab":
          if (this.isOpen && this._config.selectOnTab && this.activeIndex >= 0) {
            e.preventDefault();
            if (this.activeIndex < opts.length) {
              this.selectOption(opts[this.activeIndex]);
            } else if (canCreateNow) {
              this.createItem();
            }
          }
          break;
        case "Backspace":
          if (!this.query && this.items.length && this.isMultiple) {
            e.preventDefault();
            const lastItem = this.items[this.items.length - 1];
            this.removeItem(lastItem);
          }
          break;
        case "Delete":
          if (!this.query && this.items.length && this.isMultiple) {
            e.preventDefault();
            const lastItem = this.items[this.items.length - 1];
            this.removeItem(lastItem);
          }
          break;
        case "a":
        case "A":
          if ((e.ctrlKey || e.metaKey) && this.isMultiple) {
            e.preventDefault();
          }
          break;
      }
    },
    // ── Input Handling ──────────────────────────────────────
    onInput() {
      this._trigger("onType", this.query);
      if (!this.isOpen) {
        this.open();
      }
      this.activeIndex = this._config.setFirstOptionActive || this.query ? 0 : -1;
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
      if (this.$refs.searchInput && this.isMultiple) {
        autoGrow(this.$refs.searchInput);
      }
    },
    onPaste(e) {
      if (!this.isMultiple) return;
      const paste = (e.clipboardData || window.clipboardData).getData("text");
      if (!paste) return;
      const splitOn = this._config.splitOn || this._config.delimiter;
      if (!splitOn) return;
      e.preventDefault();
      const regex = splitOn instanceof RegExp ? splitOn : new RegExp("[" + splitOn.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "]");
      const parts = paste.split(regex).map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        const match = Object.values(this.options).find(
          (o) => {
            var _a, _b;
            return ((_a = o[this._config.labelField]) == null ? void 0 : _a.toLowerCase()) === part.toLowerCase() || ((_b = o[this._config.valueField]) == null ? void 0 : _b.toLowerCase()) === part.toLowerCase();
          }
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
      if (value === "") {
        this.clear();
        this.close();
        this.isFocused = false;
        if (this.$refs.searchInput) this.$refs.searchInput.blur();
        return;
      }
      if (this._config.showSelectedCount && this.isMultiple && this.isSelected(option)) {
        this.removeItem(value);
        return;
      }
      this.addItem(value);
      this.query = "";
      if (this.isSingle) {
        this.isFocused = false;
        this.loadedSearches = {};
        if (this.$refs.searchInput) {
          this.$refs.searchInput.blur();
        }
      } else if (this.$refs.searchInput) {
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
      var _a;
      const config = this._config;
      const label = option[config.labelField] || "";
      if ((_a = config.render) == null ? void 0 : _a.option) {
        return config.render.option(option, escapeHtml);
      }
      if (config.highlight && this.query) {
        return highlight(label, this.query);
      }
      return escapeHtml(label);
    },
    renderItem(option) {
      var _a;
      if (!option) return "";
      const config = this._config;
      const label = option[config.labelField] || "";
      if ((_a = config.render) == null ? void 0 : _a.item) {
        return config.render.item(option, escapeHtml);
      }
      return escapeHtml(label);
    },
    renderOptionCreate() {
      var _a;
      const config = this._config;
      if ((_a = config.render) == null ? void 0 : _a.optionCreate) {
        return config.render.optionCreate({ input: this.query }, escapeHtml);
      }
      return `Add <span class="font-medium">${escapeHtml(this.query)}</span>...`;
    },
    renderNoResults() {
      var _a;
      const config = this._config;
      if ((_a = config.render) == null ? void 0 : _a.noResults) {
        return config.render.noResults({ query: this.query }, escapeHtml);
      }
      return "No results found";
    },
    renderDropdownPlaceholder() {
      var _a;
      const config = this._config;
      if ((_a = config.render) == null ? void 0 : _a.dropdownPlaceholder) {
        return config.render.dropdownPlaceholder({}, escapeHtml);
      }
      return escapeHtml(config.dropdownPlaceholder || "");
    },
    renderLoading() {
      var _a;
      const config = this._config;
      if ((_a = config.render) == null ? void 0 : _a.loading) {
        return config.render.loading({ query: this.query }, escapeHtml);
      }
      return "Loading...";
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
      for (const [id, items] of Object.entries(groups)) {
        const group = this.optgroups[id];
        result.push({
          id,
          label: group[config.optgroupLabelField] || id,
          options: items
        });
      }
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
          key: g.id || "__ungrouped_" + i,
          label: g.label,
          options: g.options,
          offset
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
    // ── Hidden Input Sync (multi-select with name config) ──
    _syncHiddenInputs() {
      if (!this._hiddenInputContainer) return;
      this._hiddenInputContainer.innerHTML = "";
      for (const val of this.items) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = this._config.name;
        input.value = val;
        this._hiddenInputContainer.appendChild(input);
      }
    },
    // ── Source Element Sync ─────────────────────────────────
    _syncSourceElement() {
      var _a;
      if (this._hiddenInputContainer) {
        this._syncHiddenInputs();
        return;
      }
      if (!this._sourceEl) return;
      if (isSelectElement(this._sourceEl)) {
        for (const opt of this._sourceEl.options) {
          opt.selected = this.items.includes(opt.value);
        }
        for (const val of this.items) {
          const exists = Array.from(this._sourceEl.options).some((o) => o.value === val);
          if (!exists) {
            const optEl = document.createElement("option");
            optEl.value = val;
            optEl.textContent = ((_a = this.options[val]) == null ? void 0 : _a[this._config.labelField]) || val;
            optEl.selected = true;
            this._sourceEl.appendChild(optEl);
          }
        }
        this._sourceEl.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        this._sourceEl.value = this.isSingle ? this.items[0] || "" : this.items.join(this._config.delimiter);
        this._sourceEl.dispatchEvent(new Event("input", { bubbles: true }));
        this._sourceEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    // ── Scroll Management ───────────────────────────────────
    _scrollToActive() {
      this.$nextTick(() => {
        const dropdown = this.$refs.dropdown;
        if (!dropdown) return;
        const active = dropdown.querySelector('[data-active="true"]');
        if (active) {
          active.scrollIntoView({ block: "nearest" });
        }
      });
    },
    // ── Event Triggering ────────────────────────────────────
    _trigger(callbackName, ...args) {
      const cb = this._config[callbackName];
      if (typeof cb === "function") {
        cb.apply(this, args);
      }
      const eventName = callbackName.replace(/^on/, "").toLowerCase();
      this.$el.dispatchEvent(
        new CustomEvent(`selectra:${eventName}`, {
          detail: args,
          bubbles: true
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
    }
  });
}
function registerPlugin(name, fn) {
  pluginRegistry[name] = fn;
}
function getDefaults() {
  return { ...DEFAULTS };
}
registerPlugin("remove_button", function(options = {}) {
  var _a;
  const {
    label = "&times;",
    title = "Remove",
    className = ""
  } = options;
  const originalRenderItem = (_a = this._config.render) == null ? void 0 : _a.item;
  if (!this._config.render) this._config.render = {};
  const self = this;
  this._config.render.item = function(data, escape) {
    const labelField = self._config.labelField;
    self._config.valueField;
    const text = originalRenderItem ? originalRenderItem(data, escape) : escape(data[labelField] || "");
    return `<span class="inline-flex items-center">${text}</span>`;
  };
  this._showRemoveButton = true;
  this._removeButtonLabel = label;
  this._removeButtonTitle = title;
  this._removeButtonClass = className;
});
registerPlugin("clear_button", function(options = {}) {
  const {
    title = "Clear All",
    className = "",
    label = "&times;"
  } = options;
  this._showClearButton = true;
  this._clearButtonTitle = title;
  this._clearButtonLabel = label;
  this._clearButtonClass = className;
});
registerPlugin("restore_on_backspace", function(options = {}) {
  const textFn = options.text || ((opt) => opt[this._config.labelField] || "");
  const originalOnKeyDown = this.onKeyDown.bind(this);
  this.onKeyDown = (e) => {
    if (e.key === "Backspace" && !this.query && this.items.length && this.isMultiple) {
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
registerPlugin("dropdown_header", function(options = {}) {
  const {
    title = "",
    showClose = true,
    headerClass = ""
  } = options;
  this._dropdownHeader = true;
  this._dropdownHeaderTitle = title;
  this._dropdownHeaderShowClose = showClose;
  this._dropdownHeaderClass = headerClass;
});
registerPlugin("tag_limit", function(options = {}) {
  const { tagLimit = 3 } = options;
  this._tagLimit = tagLimit;
  this._showAllTags = false;
  Object.defineProperty(this, "visibleItems", {
    get() {
      const all = this.selectedItems;
      if (this.isFocused || this._showAllTags || !this._tagLimit) return all;
      return all.slice(0, this._tagLimit);
    }
  });
  Object.defineProperty(this, "hiddenItemCount", {
    get() {
      const all = this.selectedItems;
      if (this.isFocused || this._showAllTags || !this._tagLimit) return 0;
      return Math.max(0, all.length - this._tagLimit);
    }
  });
});
registerPlugin("auto_select_on_type", function() {
  const originalBlur = this.blur.bind(this);
  this.blur = () => {
    if (this.query.trim() && this.filteredOptions.length) {
      const first = this.filteredOptions[0];
      this.selectOption(first);
    }
    this.query = "";
    originalBlur();
  };
});
registerPlugin("select_on_focus", function() {
  const originalFocus = this.focus.bind(this);
  this.focus = () => {
    originalFocus();
    if (this.isSingle && this.items.length) {
      const current = this.options[this.items[0]];
      if (current) {
        this.query = current[this._config.labelField] || "";
        if (this.$refs.searchInput) {
          this.$nextTick(() => this.$refs.searchInput.select());
        }
      }
    }
  };
});
registerPlugin("read_only", function(options = {}) {
  const { readOnly = true } = options;
  this._isReadOnly = readOnly;
  this.readonly = (value) => {
    this._isReadOnly = value !== void 0 ? value : !this._isReadOnly;
    if (this._isReadOnly) {
      this.close();
    }
  };
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
registerPlugin("auto_position", function() {
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
        this._dropdownPosition = "top";
      } else {
        this._dropdownPosition = "bottom";
      }
    });
  };
  this._dropdownPosition = "bottom";
});
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
function _wrapSelectElements() {
  document.querySelectorAll("select[x-selectra]").forEach((select) => {
    const configExpr = select.getAttribute("x-selectra") || "{}";
    const wrapper = document.createElement("div");
    if (select.classList.length) {
      wrapper.className = select.className;
    }
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    wrapper.setAttribute("x-data", `selectra(${configExpr})`);
    wrapper.setAttribute("x-selectra", "");
    wrapper.setAttribute("x-cloak", "");
    select.removeAttribute("x-selectra");
    select.removeAttribute("x-data");
    select.removeAttribute("x-cloak");
  });
}
function SelectraPlugin(Alpine) {
  _wrapSelectElements();
  document.addEventListener("alpine:init", _wrapSelectElements);
  Alpine.data("selectra", (config = {}) => {
    const componentFactory = createSelectizeComponent(config);
    return componentFactory();
  });
  Alpine.directive("selectra", (el, { expression }, { evaluate, cleanup }) => {
    if (!el.querySelector(".selectra-control")) {
      el.insertAdjacentHTML("beforeend", SELECTRA_TEMPLATE);
    }
  });
}
SelectraPlugin.version = "1.1.1";
SelectraPlugin.template = SELECTRA_TEMPLATE;
export {
  DEFAULTS,
  SELECTRA_TEMPLATE,
  Sifter,
  createSelectizeComponent,
  SelectraPlugin as default,
  escapeHtml,
  getDefaults,
  hashKey,
  registerPlugin
};
//# sourceMappingURL=selectra.es.js.map
