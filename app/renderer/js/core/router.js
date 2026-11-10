/**
 * Page router.
 * Loads a page module, renders its template, and cleans up the previous page.
 */

import { setState } from './state.js';
import { hasPermission, hasRole } from './auth.js';
import { showToast } from './notifications.js';
import { isolatePageIds, sanitizeTemplate } from './dom.js';

const contentEl = () => document.getElementById('content');
let currentPageModule = null;

export async function navigateTo(pageName, params = {}) {
  const container = contentEl();
  if (!container) {
    // console.warn('Router: #content element not found'); // Downgraded from error as it might be expected in some layouts
    return;
  }

  // 1. Check Permissions
  const pagePermissions = {
    'sales': 'sales',
    'expenses': 'sales',
    'suppliers': 'suppliers',
    'employees': 'employees',
    'vault': 'vault',
    'banks': 'vault',
    'dashboard': 'reports'
  };

  const requiredRole = {
    'closing': 'manager',
    'settings': 'manager'
  };

  if (requiredRole[pageName] && !hasRole(requiredRole[pageName])) {
      showToast(t('admin_page_required'), 'error');
    return;
  }

  if (pagePermissions[pageName] && !hasPermission(pagePermissions[pageName])) {
      showToast(t('page_access_denied'), 'error');
    return;
  }

  // 2. Cleanup previous page
  if (currentPageModule && currentPageModule.cleanup) {
    try { currentPageModule.cleanup(); } catch (e) { console.error(e); }
  }
  currentPageModule = null;
  container.innerHTML = ''; // acceptable here because we are swapping the container itself

  // 2. Import page module (dynamic import)
  try {
    const module = await import(`../pages/${pageName}/index.js`);
    currentPageModule = module;
    setState('currentPage', pageName);

    // 3. Render template (if the module exports a getTemplate or template string)
    if (module.getTemplate) {
      container.innerHTML = sanitizeTemplate(module.getTemplate());
    } else if (module.render) {
      module.render(container);
    }

    // Keep dynamically rendered controls/tables separate from the hidden
    // legacy markup that is still present in the application shell.
    isolatePageIds(container);

    // 4. Initialize page
    if (module.init) {
      await module.init(params);
    }
    if (typeof window.applyTranslations === 'function') {
      window.applyTranslations(container);
    }
  } catch (err) {
    console.error(`Router failed to load page "${pageName}":`, err);
    const message = document.createElement('p');
    message.style.cssText = 'padding:20px;color:#ef4444';
    message.textContent = `Failed to load page: ${pageName}`;
    container.replaceChildren(message);
  }
}

export function getCurrentPageModule() {
  return currentPageModule;
}
