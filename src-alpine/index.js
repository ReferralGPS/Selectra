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
 *   // Register the plugin
 *   import Alpine from 'alpinejs';
 *   import Selectra from 'selectra';
 *   Alpine.plugin(Selectra);
 *   Alpine.start();
 *
 *   // In HTML (directive approach):
 *   <div x-data="selectra({ options: [...], create: true })">
 *     <template x-selectra></template>
 *   </div>
 *
 *   // Or initialize on existing <select>:
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
 * Alpine.js plugin installer
 */
function SelectraPlugin(Alpine) {
  // Register the selectra data component
  Alpine.data('selectra', (config = {}) => {
    const componentFactory = createSelectizeComponent(config);
    return componentFactory();
  });

  // Register the x-selectra directive for auto-rendering
  Alpine.directive('selectra', (el, { expression }, { evaluate, cleanup }) => {
    // The directive is mainly a marker — the template is in the component.
    // It can be used with x-data="selectra({...})" for auto-init.
  });
}

SelectraPlugin.version = '1.0.0';

// Named exports
export {
  SelectraPlugin as default,
  createSelectizeComponent,
  registerPlugin,
  getDefaults,
  DEFAULTS,
  Sifter,
  escapeHtml,
  hashKey,
};
