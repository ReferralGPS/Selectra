/**
 * Selectra - Alpine.js + Tailwind CSS
 * TypeScript declarations
 */

import type { Alpine } from 'alpinejs';

export interface SelectraOption {
  [key: string]: any;
  value?: string;
  text?: string;
  disabled?: boolean;
  optgroup?: string;
  $order?: number;
}

export interface SelectraOptgroup {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectraRender {
  option?: (data: SelectraOption, escape: (str: string) => string) => string;
  item?: (data: SelectraOption, escape: (str: string) => string) => string;
  optionCreate?: (data: { input: string }, escape: (str: string) => string) => string;
  optgroupHeader?: (data: SelectraOptgroup, escape: (str: string) => string) => string;
  noResults?: (data: { query: string }, escape: (str: string) => string) => string;
  dropdownPlaceholder?: (data: {}, escape: (str: string) => string) => string;
  loading?: (data: { query: string }, escape: (str: string) => string) => string;
}

export interface SelectraConfig {
  delimiter?: string;
  splitOn?: RegExp | string | null;
  persist?: boolean;
  diacritics?: boolean;
  create?: boolean | ((input: string, callback: (data?: SelectraOption) => void) => SelectraOption | void);
  showAddOptionOnCreate?: boolean;
  createOnBlur?: boolean;
  createFilter?: RegExp | string | ((input: string) => boolean) | null;
  highlight?: boolean;
  openOnFocus?: boolean;
  maxOptions?: number;
  maxItems?: number | null;
  hideSelected?: boolean | null;
  selectOnTab?: boolean;
  closeAfterSelect?: boolean;
  loadThrottle?: number | null;
  placeholder?: string;
  dropdownPlaceholder?: string;
  name?: string | null;
  mode?: 'single' | 'multi' | null;
  search?: boolean;
  showArrow?: boolean;
  showSelectedCount?: boolean;
  normalize?: boolean;

  valueField?: string;
  labelField?: string;
  disabledField?: string;
  optgroupField?: string;
  optgroupLabelField?: string;
  optgroupValueField?: string;
  sortField?: string | Array<{ field: string; direction?: 'asc' | 'desc' }>;
  searchField?: string | string[];
  searchConjunction?: 'and' | 'or';
  respectWordBoundaries?: boolean;
  setFirstOptionActive?: boolean;
  preload?: boolean | 'focus';

  options?: (SelectraOption | [string, string | number])[];
  optgroups?: SelectraOptgroup[];
  items?: string[];
  plugins?: Array<string | { name: string; options?: Record<string, any> }>;

  render?: SelectraRender;

  load?: ((query: string, callback: (results: SelectraOption[]) => void) => void) | null;
  score?: ((search: any) => (item: any) => number) | null;

  onChange?: (value: string | string[]) => void;
  onItemAdd?: (value: string, data: SelectraOption) => void;
  onItemRemove?: (value: string) => void;
  onClear?: () => void;
  onOptionAdd?: (value: string, data: SelectraOption) => void;
  onOptionRemove?: (value: string) => void;
  onDropdownOpen?: () => void;
  onDropdownClose?: () => void;
  onType?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onInitialize?: () => void;
}

export interface SelectraInstance {
  // State
  isOpen: boolean;
  isFocused: boolean;
  isDisabled: boolean;
  isLocked: boolean;
  isLoading: boolean;
  isInvalid: boolean;
  query: string;
  activeIndex: number;
  items: string[];
  options: Record<string, SelectraOption>;
  optgroups: Record<string, SelectraOptgroup>;

  // Computed
  readonly isMultiple: boolean;
  readonly isSingle: boolean;
  readonly isFull: boolean;
  readonly hasOptions: boolean;
  readonly canCreate: boolean;
  readonly selectedItems: SelectraOption[];
  readonly filteredOptions: SelectraOption[];
  readonly placeholderText: string;
  readonly selectedCountText: string;
  readonly currentValueText: string;

  // Methods
  init(): void;
  destroy(): void;

  addOption(data: SelectraOption | SelectraOption[], silent?: boolean): void;
  updateOption(value: string, data: SelectraOption): void;
  removeOption(value: string): void;
  clearOptions(): void;
  getOption(value: string): SelectraOption | null;

  addItem(value: string, silent?: boolean): void;
  removeItem(value: string, silent?: boolean): void;
  clear(silent?: boolean): void;
  getValue(): string | string[];
  setValue(value: string | string[], silent?: boolean): void;
  createItem(input?: string | null): void;

  selectOption(option: SelectraOption): void;

  open(): void;
  close(): void;
  toggle(): void;
  focus(): void;
  blur(): void;

  lock(): void;
  unlock(): void;
  disable(): void;
  enable(): void;
  setMaxItems(max: number | null): void;

  addOptionGroup(id: string, data: SelectraOptgroup): void;
  removeOptionGroup(id: string): void;
  getGroupedOptions(): Array<{ id: string | null; label: string | null; options: SelectraOption[] }>;

  renderOption(option: SelectraOption): string;
  renderItem(option: SelectraOption): string;
  renderOptionCreate(): string;
  renderNoResults(): string;
  renderDropdownPlaceholder(): string;

  onKeyDown(e: KeyboardEvent): void;
  onInput(): void;
  onPaste(e: ClipboardEvent): void;

  isSelected(option: SelectraOption): boolean;
  optionKey(option: SelectraOption): string | null;
}

/**
 * Alpine.js plugin for Selectra
 */
declare function SelectraPlugin(Alpine: Alpine): void;

export default SelectraPlugin;

/**
 * Create a selectra component data factory
 */
export function createSelectraComponent(config?: SelectraConfig): () => SelectraInstance;

/**
 * Register a plugin
 */
export function registerPlugin(name: string, fn: (this: SelectraInstance, options?: any) => void): void;

/**
 * Get default configuration
 */
export function getDefaults(): SelectraConfig;

export const DEFAULTS: SelectraConfig;

/**
 * Sifter search engine
 */
export class Sifter {
  constructor(items: Record<string, any> | any[], settings?: { diacritics?: boolean });
  items: Record<string, any> | any[];
  tokenize(query: string, respectWordBoundaries?: boolean): Array<{ string: string; regex: RegExp }>;
  search(query: string, options?: {
    fields?: string | string[];
    sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
    score?: (item: any) => number;
    filter?: boolean;
    limit?: number;
    conjunction?: 'and' | 'or';
    nesting?: boolean;
    respect_word_boundaries?: boolean;
  }): {
    query: string;
    tokens: Array<{ string: string; regex: RegExp }>;
    total: number;
    items: Array<{ score: number; id: string | number }>;
  };
  getScoreFunction(search: any, options?: any): (item: any) => number;
  getSortFunction(search: any, options?: any): ((a: any, b: any) => number) | null;
  prepareSearch(query: string | object, options?: any): any;
}

export function escapeHtml(str: string): string;
export function hashKey(value: any): string | null;
