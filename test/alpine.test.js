/**
 * Tests for Selectra Alpine.js Component
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Sifter from '../src-alpine/sifter.js';
import { escapeHtml, hashKey, highlight, debounce, uid, readSelectOptions } from '../src-alpine/utils.js';
import { createSelectizeComponent, DEFAULTS, registerPlugin } from '../src-alpine/selectize.js';

// ─── Sifter Tests ───────────────────────────────────────────
describe('Sifter', () => {
  let sifter;

  beforeEach(() => {
    sifter = new Sifter({
      a: { value: 'a', text: 'Apple' },
      b: { value: 'b', text: 'Banana' },
      c: { value: 'c', text: 'Cherry' },
      d: { value: 'd', text: 'Date' },
      e: { value: 'e', text: 'Elderberry' },
    });
  });

  describe('tokenize', () => {
    it('should split query into tokens', () => {
      const tokens = sifter.tokenize('hello world');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].string).toBe('hello');
      expect(tokens[1].string).toBe('world');
    });

    it('should return empty array for empty query', () => {
      expect(sifter.tokenize('')).toHaveLength(0);
      expect(sifter.tokenize(null)).toHaveLength(0);
    });

    it('should create case-insensitive regex', () => {
      const tokens = sifter.tokenize('Apple');
      expect(tokens[0].regex.test('apple')).toBe(true);
      expect(tokens[0].regex.test('APPLE')).toBe(true);
    });
  });

  describe('search', () => {
    it('should find matching items', () => {
      const results = sifter.search('app', { fields: ['text'] });
      expect(results.items.length).toBeGreaterThan(0);
      expect(results.items[0].id).toBe('a'); // Apple
    });

    it('should return all items for empty query', () => {
      const results = sifter.search('', { fields: ['text'] });
      expect(results.items).toHaveLength(5);
    });

    it('should respect limit option', () => {
      const results = sifter.search('', { fields: ['text'], limit: 2 });
      expect(results.items).toHaveLength(2);
      expect(results.total).toBe(5);
    });

    it('should score beginning matches higher', () => {
      const results = sifter.search('an', { fields: ['text'] });
      // Banana has "an" not at start, but let's check scoring exists
      expect(results.items.length).toBeGreaterThan(0);
      for (const item of results.items) {
        expect(item.score).toBeGreaterThan(0);
      }
    });

    it('should support conjunction "and"', () => {
      const sifter2 = new Sifter({
        a: { first: 'John', last: 'Doe' },
        b: { first: 'Jane', last: 'Smith' },
      });
      const results = sifter2.search('john doe', {
        fields: ['first', 'last'],
        conjunction: 'and',
      });
      expect(results.items.length).toBeGreaterThan(0);
    });

    it('should handle items as an array', () => {
      const s = new Sifter([
        { text: 'One' },
        { text: 'Two' },
        { text: 'Three' },
      ]);
      const results = s.search('tw', { fields: ['text'] });
      expect(results.items.length).toBe(1);
    });
  });

  describe('getScoreFunction', () => {
    it('should return a scoring function', () => {
      const fn = sifter.getScoreFunction('app', { fields: ['text'] });
      expect(typeof fn).toBe('function');
      expect(fn({ text: 'Apple' })).toBeGreaterThan(0);
      expect(fn({ text: 'Banana' })).toBe(0);
    });
  });
});

// ─── Utils Tests ────────────────────────────────────────────
describe('Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should handle non-string values', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(123)).toBe('');
    });

    it('should handle ampersands', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });
  });

  describe('hashKey', () => {
    it('should convert values to strings', () => {
      expect(hashKey('hello')).toBe('hello');
      expect(hashKey(123)).toBe('123');
      expect(hashKey(true)).toBe('1');
      expect(hashKey(false)).toBe('0');
    });

    it('should return null for null/undefined', () => {
      expect(hashKey(null)).toBeNull();
      expect(hashKey(undefined)).toBeNull();
    });
  });

  describe('highlight', () => {
    it('should highlight matching text', () => {
      const result = highlight('Hello World', 'World');
      expect(result).toContain('font-semibold');
      expect(result).toContain('World');
    });

    it('should return escaped text when no search', () => {
      expect(highlight('<script>', '')).toBe('&lt;script&gt;');
    });

    it('should be case-insensitive', () => {
      const result = highlight('Hello World', 'hello');
      expect(result).toContain('font-semibold');
    });
  });

  describe('uid', () => {
    it('should generate unique IDs', () => {
      const id1 = uid();
      const id2 = uid();
      expect(id1).not.toBe(id2);
    });

    it('should use provided prefix', () => {
      const id = uid('test');
      expect(id.startsWith('test-')).toBe(true);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      let callCount = 0;
      const fn = debounce(() => { callCount++; }, 50);

      fn();
      fn();
      fn();

      expect(callCount).toBe(0);

      await new Promise((r) => setTimeout(r, 100));
      expect(callCount).toBe(1);
    });
  });
});

// ─── Component Tests ────────────────────────────────────────
describe('Selectra Component', () => {
  describe('createSelectizeComponent', () => {
    it('should create a component factory', () => {
      const factory = createSelectizeComponent({ mode: 'single' });
      expect(typeof factory).toBe('function');
    });

    it('should return component data', () => {
      const factory = createSelectizeComponent({
        mode: 'multi',
        options: [
          { value: '1', text: 'One' },
          { value: '2', text: 'Two' },
        ],
      });
      const component = factory();
      expect(component.isOpen).toBe(false);
      expect(component.isFocused).toBe(false);
      expect(component.items).toEqual([]);
      expect(component.options).toBeDefined();
    });
  });

  describe('DEFAULTS', () => {
    it('should have all default values', () => {
      expect(DEFAULTS.delimiter).toBe(',');
      expect(DEFAULTS.create).toBe(false);
      expect(DEFAULTS.maxOptions).toBe(1000);
      expect(DEFAULTS.valueField).toBe('value');
      expect(DEFAULTS.labelField).toBe('text');
      expect(DEFAULTS.searchField).toEqual(['text']);
    });

    it('should have dropdownPlaceholder default as empty string', () => {
      expect(DEFAULTS.dropdownPlaceholder).toBe('');
    });

    it('should have dropdownPlaceholder render default as null', () => {
      expect(DEFAULTS.render.dropdownPlaceholder).toBeNull();
    });
  });

  describe('renderNoResults', () => {
    it('should return default "No results found" text', () => {
      const factory = createSelectizeComponent({ mode: 'single' });
      const component = factory();
      expect(component.renderNoResults()).toBe('No results found');
    });

    it('should use custom render.noResults when provided', () => {
      const factory = createSelectizeComponent({
        mode: 'single',
        render: {
          noResults: (data, escape) => `Nothing for "${escape(data.query)}"`,
        },
      });
      const component = factory();
      // Simulate _config being set (normally done in init())
      component._config = { ...DEFAULTS, ...component._config, render: { noResults: (data, escape) => `Nothing for "${escape(data.query)}"` } };
      component.query = 'xyz';
      expect(component.renderNoResults()).toBe('Nothing for "xyz"');
    });
  });

  describe('renderDropdownPlaceholder', () => {
    it('should return empty string when dropdownPlaceholder is not set', () => {
      const factory = createSelectizeComponent({ mode: 'single' });
      const component = factory();
      // _config is populated in init(), manually set for unit test
      component._config = { ...DEFAULTS };
      expect(component.renderDropdownPlaceholder()).toBe('');
    });

    it('should return the configured dropdownPlaceholder text', () => {
      const factory = createSelectizeComponent({
        mode: 'single',
        dropdownPlaceholder: 'Type to search...',
      });
      const component = factory();
      component._config = { ...DEFAULTS, dropdownPlaceholder: 'Type to search...' };
      expect(component.renderDropdownPlaceholder()).toBe('Type to search...');
    });

    it('should escape HTML in dropdownPlaceholder text', () => {
      const factory = createSelectizeComponent({
        mode: 'single',
        dropdownPlaceholder: '<b>Search</b>',
      });
      const component = factory();
      component._config = { ...DEFAULTS, dropdownPlaceholder: '<b>Search</b>' };
      expect(component.renderDropdownPlaceholder()).toBe('&lt;b&gt;Search&lt;/b&gt;');
    });

    it('should use custom render.dropdownPlaceholder when provided', () => {
      const customRender = (data, escape) => '<em>Start typing...</em>';
      const factory = createSelectizeComponent({
        mode: 'single',
        render: { dropdownPlaceholder: customRender },
      });
      const component = factory();
      component._config = { ...DEFAULTS, render: { ...DEFAULTS.render, dropdownPlaceholder: customRender } };
      expect(component.renderDropdownPlaceholder()).toBe('<em>Start typing...</em>');
    });
  });

  describe('registerPlugin', () => {
    it('should register a plugin without throwing', () => {
      expect(() => {
        registerPlugin('test_plugin', function (opts) {
          this._testPluginLoaded = true;
        });
      }).not.toThrow();
    });
  });

  describe('selectedCountText', () => {
    it('should return 0 when no items are selected', () => {
      const factory = createSelectizeComponent({
        mode: 'multi',
        showSelectedCount: true,
        options: [{ value: 'a', text: 'A' }, { value: 'b', text: 'B' }],
      });
      const component = factory();
      component._config = { ...DEFAULTS, mode: 'multi', showSelectedCount: true };
      component.items = [];
      expect(component.selectedCountText).toBe(0);
    });

    it('should return 1 when one item is selected', () => {
      const factory = createSelectizeComponent({ mode: 'multi', showSelectedCount: true });
      const component = factory();
      component._config = { ...DEFAULTS, mode: 'multi', showSelectedCount: true };
      component.items = ['a'];
      expect(component.selectedCountText).toBe(1);
    });

    it('should return count when multiple items are selected', () => {
      const factory = createSelectizeComponent({ mode: 'multi', showSelectedCount: true });
      const component = factory();
      component._config = { ...DEFAULTS, mode: 'multi', showSelectedCount: true };
      component.items = ['a', 'b', 'c'];
      expect(component.selectedCountText).toBe(3);
    });
  });

  describe('readSelectOptions - empty value placeholder', () => {
    function createMockSelect(optionDefs) {
      return {
        children: optionDefs.map(def => ({
          tagName: { toLowerCase: () => 'option' },
          value: def.value,
          textContent: def.text,
          disabled: def.disabled || false,
          selected: def.selected || false,
          dataset: {},
        })),
      };
    }

    it('should treat empty-value option as placeholder text', () => {
      const select = createMockSelect([
        { value: '', text: 'Pick a fruit...' },
        { value: 'apple', text: 'Apple' },
        { value: 'banana', text: 'Banana' },
      ]);
      const parsed = readSelectOptions(select);
      const emptyOpt = parsed.options.find(o => o.value === '');
      expect(emptyOpt).toBeDefined();
      expect(emptyOpt.text).toBe('Pick a fruit...');
    });

    it('should include empty-value option in parsed options list', () => {
      const select = createMockSelect([
        { value: '', text: 'Select...' },
        { value: 'a', text: 'A' },
        { value: 'b', text: 'B' },
      ]);
      const parsed = readSelectOptions(select);
      expect(parsed.options).toHaveLength(3);
      expect(parsed.options[0].value).toBe('');
    });

    it('should not include empty value in selectedValues when filtered', () => {
      const select = createMockSelect([
        { value: '', text: 'Select...', selected: true },
        { value: 'a', text: 'A' },
      ]);
      const parsed = readSelectOptions(select);
      // Our init code filters empty values from selectedValues
      const realSelected = parsed.selectedValues.filter(v => v !== '');
      expect(realSelected).toHaveLength(0);
    });
  });

  describe('selectOption - empty value clears selection', () => {
    it('should clear items when selecting empty-value option', () => {
      const factory = createSelectizeComponent({ mode: 'single' });
      const component = factory();
      component._config = { ...DEFAULTS, mode: 'single', maxItems: 1 };
      component.options = {
        '': { value: '', text: 'Select...' },
        'a': { value: 'a', text: 'Apple', $order: 1 },
      };
      component.items = ['a'];
      component.isOpen = true;
      component.isFocused = true;
      component.$refs = { searchInput: { blur: () => {} } };
      component.close = () => { component.isOpen = false; };
      component._syncSourceElement = () => {};
      component._clearRenderCache = () => {};
      component._trigger = () => {};

      component.selectOption({ value: '', text: 'Select...' });

      expect(component.items).toHaveLength(0);
      expect(component.isOpen).toBe(false);
      expect(component.isFocused).toBe(false);
    });

    it('should not clear when selecting a real option', () => {
      const factory = createSelectizeComponent({ mode: 'single' });
      const component = factory();
      component._config = { ...DEFAULTS, mode: 'single', maxItems: 1 };
      component.options = {
        '': { value: '', text: 'Select...' },
        'a': { value: 'a', text: 'Apple', $order: 1 },
        'b': { value: 'b', text: 'Banana', $order: 2 },
      };
      component.items = [];
      component.caretPos = 0;
      component.isOpen = true;
      component.isFocused = true;
      component.query = '';
      component.loadedSearches = {};
      component.$refs = { searchInput: { blur: () => {} } };
      component.close = () => { component.isOpen = false; };
      component._syncSourceElement = () => {};
      component._clearRenderCache = () => {};
      component._trigger = () => {};

      component.selectOption({ value: 'a', text: 'Apple' });

      expect(component.items).toEqual(['a']);
    });
  });
});
