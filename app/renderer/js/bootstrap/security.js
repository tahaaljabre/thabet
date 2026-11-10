import { sanitizeTemplate, sanitizeHTML } from '../core/dom.js';

/**
 * DOM hardening.
 *
 * DOMPurify is loaded as a plain script by index.html, before the page modules.
 *
 * We deliberately do NOT replace Element.prototype.innerHTML /
 * insertAdjacentHTML with a sanitizing version:
 *
 * - the app writes table-row fragments (`tbody.innerHTML = '<tr>…'`), and a
 *   sanitizer parses strings outside their table context and drops the tags;
 * - the templates rely on inline handlers, so a sanitizer must be tuned for
 *   them anyway, which makes the "global" protection weaker than it looks.
 *
 * Template injection goes through `sanitizeTemplate` (see core/dom.js and
 * core/router.js). Use `sanitizeHTML` for small, non-table fragments.
 */
export function installDomSecurity() {
  if (!window.DOMPurify) {
    console.warn('DOMPurify is not loaded; template sanitization is disabled.');
    return;
  }

  // Expose the safe helpers to the legacy (non-module) page scripts.
  window.sanitizeHTML = sanitizeHTML;
  window.sanitizeTemplate = sanitizeTemplate;
}
