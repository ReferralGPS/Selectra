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
- **Selected Count Mode** — show a count badge instead of tags in multi-select, with checkmarks on selected options
- **Array-Format Options** — pass `[text, value]` tuples directly (e.g. from Rails `pluck`)
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

<!-- Just add x-selectra to a select element: -->
<select x-selectra="{ placeholder: 'Pick...' }">
  <option value="">Pick...</option>
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
</select>
```

---

## Quick Start

### 1. Register the Plugin

```js
import Alpine from 'alpinejs';
import Selectra from 'selectra';

Alpine.plugin(Selectra);
Alpine.start();
```

### 2. Use in HTML

Add `x-selectra` to a native `<select>` element. Selectra enhances it while maintaining HTML semantics and progressive enhancement.

#### Single Select

```html
<select x-selectra="{ placeholder: 'Select a country...' }">
  <option value="">Select a country...</option>
  <option value="us">United States</option>
  <option value="ca">Canada</option>
  <option value="mx">Mexico</option>
</select>
```

#### Multi Select with Tags

```html
<select multiple x-selectra="{ placeholder: 'Select languages...', create: true }">
  <option value="js">JavaScript</option>
  <option value="py">Python</option>
  <option value="go">Go</option>
</select>
```

#### Option Groups

```html
<select x-selectra="{ placeholder: 'Choose...' }">
  <optgroup label="Greek Letters">
    <option value="alpha">Alpha</option>
    <option value="beta">Beta</option>
  </optgroup>
  <optgroup label="Latin Letters">
    <option value="a">A</option>
    <option value="b">B</option>
  </optgroup>
</select>
```

#### Multi Select with Count Badge

Show the number of selected items as a badge instead of individual tags.

```html
<select multiple x-selectra="{ showSelectedCount: true, placeholder: 'Select countries...' }">
  <option value="us">United States</option>
  <option value="ca">Canada</option>
  <option value="mx">Mexico</option>
</select>
```

#### Form Submission

Use native `<select>` directly in forms for standard form submission:

```html
<form method="POST" action="/submit">
  <select name="languages" multiple x-selectra="{ placeholder: 'Select languages...' }">
    <option value="js">JavaScript</option>
    <option value="py">Python</option>
    <option value="go">Go</option>
  </select>
  <button type="submit">Submit</button>
</form>
```

#### Standard Select with Plugins

```html
<select multiple x-selectra="{ placeholder: 'Select languages...', plugins: ['remove_button'] }">
  <option value="js">JavaScript</option>
  <option value="py">Python</option>
  <option value="go">Go</option>
</select>
```

This works great with Rails form helpers:

```erb
<%= f.select :language_ids,
      options_for_select(Language.pluck(:name, :id), f.object.language_ids),
      { include_blank: true },
      { multiple: true, "x-selectra" => "{ placeholder: 'Languages', plugins: ['remove_button'] }" } %>
```

#### Tagging (Create New Options)

```html
<select multiple x-selectra="{ create: true, createOnBlur: true, placeholder: 'Add tags...' }">
  <option value="bug">bug</option>
  <option value="feature">feature</option>
  <option value="enhancement">enhancement</option>
</select>
```

#### Remote Loading

For dynamic options loaded from an API, use an empty `<select>` with a `load` function.
The `<select>` still renders as a native element when JavaScript is disabled.

```html
<script>
  window.fetchOptions = (query, callback) => {
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => callback(data.results))
      .catch(() => callback([]));
  };
</script>

<select x-selectra="{ placeholder: 'Type to search...', load: fetchOptions, loadThrottle: 300 }"></select>
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
| `name` | `string \| null` | `null` | Form field name — auto-creates hidden input when no source element exists |
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
| `showSelectedCount` | `boolean` | `false` | Show count badge instead of tags in multi-select |
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

```html
<script>
  window.loadUsers = (query, callback) => {
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => callback(data.results))
      .catch(() => callback([]));
  };
</script>

<select x-selectra="{ placeholder: 'Type to search...', load: loadUsers, loadThrottle: 300 }"></select>
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
| `$('select').selectize({...})` | `<select x-selectra=\"{...}\">` |
| `instance.addItem(val)` | Direct method call in Alpine scope |
| `$.fn.selectize` plugin | `Alpine.plugin(Selectra)` |
| jQuery events | Custom DOM events |
| LESS/SCSS themes | Tailwind CSS utilities |
| Bootstrap themes | Use Tailwind directly |

## License

Apache-2.0
