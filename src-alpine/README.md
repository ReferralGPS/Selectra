# Selectra

> A powerful, extensible `<select>` UI control — rebuilt with **Alpine.js** and **Tailwind CSS**.

Selectra is a modern rewrite of [Selectize.js](https://github.com/selectize/selectize.js), designed for tagging, contact lists, country selectors, and autocomplete. It drops the jQuery dependency entirely in favor of Alpine.js reactivity and Tailwind CSS styling.

---

## Why Selectra?

| | Selectize.js (legacy) | **Selectra** |
|---|---|---|
| **UI Framework** | jQuery | Alpine.js |
| **Styling** | LESS / SCSS + Bootstrap themes | Tailwind CSS utilities |
| **Build Tool** | Gulp | Vite |
| **Tests** | Karma + Mocha | Vitest |
| **Bundle (JS)** | ~88 KB min | ~25 KB min |
| **CSS** | Multiple theme files | Single 21 KB utility file |
| **jQuery Required** | Yes | No |

---

## Features

- **Single & Multi Select** — auto-detected from `maxItems` or explicit `mode`
- **Tagging / Create** — create new options on the fly with validation
- **Fuzzy Search** — built-in Sifter engine with diacritics support
- **Remote Loading** — fetch options from API with debounced requests
- **Option Groups** — grouped options with sticky headers
- **Keyboard Navigation** — arrows, enter, escape, tab, backspace, ctrl+A
- **Copy / Paste** — split pasted text into multiple items via delimiter
- **Custom Rendering** — templates for options, items, create prompt, no-results, loading
- **Plugin System** — 9 built-in plugins, easy to create custom ones
- **Accessible** — focus management, label association, keyboard-first
- **RTL Support** — auto-detected from CSS `direction`
- **Tailwind CSS** — fully styled with utilities, trivially customizable
- **Lightweight** — ~25 KB gzipped JS, zero runtime dependencies beyond Alpine.js

---

## Installation

```bash
npm install selectra alpinejs
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/selectra/dist/selectra.iife.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/selectra/dist/selectra.css">
```

---

## Quick Start

### 1. Register the Plugin

```js
import Alpine from 'alpinejs';
import Selectra from 'selectra';
import 'selectra/css';

Alpine.plugin(Selectra);
Alpine.start();
```

### 2. Use in HTML

#### Single Select

```html
<div x-data="selectra({
  mode: 'single',
  placeholder: 'Select a country...',
  options: [
    { value: 'us', text: 'United States' },
    { value: 'ca', text: 'Canada' },
    { value: 'mx', text: 'Mexico' },
  ]
})" class="relative max-w-md">

  <!-- Control -->
  <div @click="focus()"
       :class="{ 'ring-2 ring-blue-500/20 border-blue-500': isFocused }"
       class="relative flex items-center w-full min-h-[42px] px-3 py-1.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">

    <span x-show="items.length && !isFocused" x-text="currentValueText" class="truncate text-gray-900"></span>

    <input x-ref="searchInput" x-model="query"
           @input="onInput()" @focus="focus()" @blur.debounce.150ms="blur()"
           @keydown="onKeyDown($event)"
           :placeholder="placeholderText"
           x-show="isFocused || !items.length"
           class="flex-1 min-w-0 bg-transparent outline-none border-none p-0 text-gray-900 placeholder-gray-400">

    <svg :class="{'rotate-180': isOpen}" class="w-4 h-4 text-gray-400 ml-2 transition-transform"
         fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>

  <!-- Dropdown -->
  <div x-show="isOpen" x-ref="dropdown"
       x-transition class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
    <div class="max-h-60 overflow-y-auto py-1">
      <template x-for="(option, index) in filteredOptions" :key="optionKey(option)">
        <div @click="selectOption(option)" @mouseenter="activeIndex = index"
             :class="{ 'bg-blue-500 text-white': activeIndex === index }"
             class="px-3 py-2 cursor-pointer"
             x-html="renderOption(option)">
        </div>
      </template>
    </div>
  </div>
</div>
```

#### Multi Select with Tags

```html
<div x-data="selectra({
  mode: 'multi',
  placeholder: 'Select languages...',
  create: true,
  options: [
    { value: 'js', text: 'JavaScript' },
    { value: 'py', text: 'Python' },
    { value: 'go', text: 'Go' },
  ]
})" class="relative max-w-md">

  <div @click="focus()"
       :class="{ 'ring-2 ring-blue-500/20 border-blue-500': isFocused }"
       class="relative flex flex-wrap items-center gap-1 w-full min-h-[42px] px-2 py-1.5 bg-white border border-gray-300 rounded-lg cursor-text hover:border-gray-400">

    <template x-for="val in items" :key="val">
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-sm">
        <span x-text="options[val]?.text || val"></span>
        <button @click.stop="removeItem(val)" class="w-4 h-4 rounded-full text-blue-400 hover:text-blue-600">&times;</button>
      </span>
    </template>

    <input x-ref="searchInput" x-model="query"
           @input="onInput()" @focus="focus()" @blur.debounce.150ms="blur()"
           @keydown="onKeyDown($event)" @paste="onPaste($event)"
           :placeholder="items.length ? '' : placeholderText"
           class="flex-1 min-w-[60px] bg-transparent outline-none border-none p-0 text-sm">
  </div>

  <div x-show="isOpen" x-ref="dropdown" x-transition
       class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
    <div class="max-h-60 overflow-y-auto py-1">
      <template x-for="(option, index) in filteredOptions" :key="optionKey(option)">
        <div @click="selectOption(option)" @mouseenter="activeIndex = index"
             :class="{ 'bg-blue-500 text-white': activeIndex === index }"
             class="px-3 py-2 cursor-pointer" x-html="renderOption(option)">
        </div>
      </template>
      <div x-show="canCreate" @click="createItem()"
           class="px-3 py-2 cursor-pointer text-gray-500 border-t border-gray-100"
           x-html="renderOptionCreate()">
      </div>
    </div>
  </div>
</div>
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'single' \| 'multi'` | auto | Selection mode |
| `options` | `Array` | `[]` | Available options |
| `items` | `Array` | `[]` | Pre-selected values |
| `maxItems` | `number \| null` | `null` | Max selectable items |
| `maxOptions` | `number` | `1000` | Max dropdown options |
| `create` | `boolean \| function` | `false` | Allow creating new options |
| `createOnBlur` | `boolean` | `false` | Create item when field loses focus |
| `createFilter` | `RegExp \| function` | `null` | Filter for creatable values |
| `placeholder` | `string` | `''` | Placeholder text |
| `valueField` | `string` | `'value'` | Property for option value |
| `labelField` | `string` | `'text'` | Property for display label |
| `searchField` | `string[]` | `['text']` | Fields to search |
| `searchConjunction` | `'and' \| 'or'` | `'and'` | Multi-term search logic |
| `sortField` | `string \| Array` | `'$order'` | Sort field(s) |
| `highlight` | `boolean` | `true` | Highlight matches |
| `openOnFocus` | `boolean` | `true` | Open dropdown on focus |
| `selectOnTab` | `boolean` | `true` | Tab selects active option |
| `closeAfterSelect` | `boolean` | `false` | Close dropdown after selection |
| `hideSelected` | `boolean \| null` | auto | Hide selected from dropdown |
| `delimiter` | `string` | `','` | Value separator |
| `splitOn` | `RegExp \| string` | `null` | Regex for splitting pasted values |
| `diacritics` | `boolean` | `true` | International character support |
| `normalize` | `boolean` | `true` | NFD normalize search queries |
| `preload` | `boolean \| 'focus'` | `false` | Preload options |
| `load` | `function \| null` | `null` | Remote data loader |
| `loadThrottle` | `number` | `300` | Load debounce delay (ms) |
| `plugins` | `Array` | `[]` | Plugins to activate |

### Custom Rendering

```js
selectra({
  render: {
    option: (data, escape) => `<div class="flex items-center gap-2">
      <img src="${data.avatar}" class="w-6 h-6 rounded-full">
      <span>${escape(data.text)}</span>
    </div>`,
    item: (data, escape) => escape(data.text),
    optionCreate: (data, escape) => `Add "${escape(data.input)}"`,
    noResults: () => 'Nothing found',
    loading: () => 'Searching...',
  }
})
```

### Remote Loading

```js
selectra({
  load: (query, callback) => {
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => callback(data.results))
      .catch(() => callback([]));
  },
  loadThrottle: 300,
})
```

## API Methods

| Method | Description |
|--------|-------------|
| `addOption(data)` | Add one or more options |
| `updateOption(value, data)` | Update an existing option |
| `removeOption(value)` | Remove an option |
| `clearOptions()` | Remove all options (keeps selected) |
| `getOption(value)` | Get option data by value |
| `addItem(value)` | Select an item |
| `removeItem(value)` | Deselect an item |
| `clear()` | Clear all selections |
| `getValue()` | Get current value(s) |
| `setValue(value)` | Set selected value(s) |
| `createItem(input?)` | Create new item from input |
| `open()` | Open dropdown |
| `close()` | Close dropdown |
| `focus()` | Focus the control |
| `blur()` | Remove focus |
| `lock()` / `unlock()` | Temporarily disable input |
| `disable()` / `enable()` | Disable/enable control |
| `setMaxItems(max)` | Update max items limit |

## Events

Events are dispatched as custom DOM events on the wrapper element:

```js
el.addEventListener('selectra:change', (e) => {
  console.log('Value changed:', e.detail);
});
```

| Event | Detail |
|-------|--------|
| `selectra:change` | `[value]` |
| `selectra:itemadd` | `[value, data]` |
| `selectra:itemremove` | `[value]` |
| `selectra:clear` | `[]` |
| `selectra:optionadd` | `[value, data]` |
| `selectra:optionremove` | `[value]` |
| `selectra:dropdownopen` | `[]` |
| `selectra:dropdownclose` | `[]` |
| `selectra:type` | `[query]` |
| `selectra:focus` | `[]` |
| `selectra:blur` | `[]` |
| `selectra:initialize` | `[]` |

## Plugins

### Built-in Plugins

Activate plugins via the `plugins` config option:

```js
selectra({
  plugins: ['remove_button', 'clear_button', { name: 'tag_limit', options: { tagLimit: 3 } }]
})
```

| Plugin | Description |
|--------|-------------|
| `remove_button` | Add × button to each selected tag |
| `clear_button` | Add a clear-all button to the control |
| `restore_on_backspace` | Restore deleted item text to input |
| `dropdown_header` | Add a header to the dropdown |
| `tag_limit` | Limit visible tags with "+N" badge |
| `auto_select_on_type` | Auto-select first match on blur |
| `select_on_focus` | Put current value into search on focus |
| `read_only` | Make component read-only |
| `auto_position` | Smart dropdown positioning (above/below) |

### Custom Plugins

```js
import { registerPlugin } from 'selectra';

registerPlugin('my_plugin', function(options) {
  // `this` is the selectra component instance
  console.log('Plugin initialized with', options);

  // Override methods
  const originalOpen = this.open.bind(this);
  this.open = () => {
    console.log('Opening dropdown');
    originalOpen();
  };
});
```

## Building

```bash
npm install
npm run build    # Build dist/
npm run dev      # Dev server with HMR
npm run test     # Run tests
```

## Migration from jQuery Version

| jQuery Selectize | Selectra |
|-----------------|---------------------|
| `$('select').selectize({...})` | `x-data="selectra({...})"` |
| `instance.addItem(val)` | Direct method call in Alpine scope |
| `$.fn.selectize` plugin | `Alpine.plugin(Selectra)` |
| jQuery events | Custom DOM events |
| LESS/SCSS themes | Tailwind CSS utilities |
| Bootstrap themes | Use Tailwind directly |

## License

Apache-2.0
