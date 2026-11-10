import { navigateTo } from './core/router.js';
import { initializeExportSystem } from './export/index.js';
import { installDomSecurity } from './bootstrap/security.js';
import { setupSettingsMenu } from './bootstrap/settings-menu.js';
import { initializeLogin } from './bootstrap/login.js';
import { applyPreferences, cachePreferences, getCachedPreferences } from './core/preferences.js';

// Apply the cached UI choice immediately, before waiting for database access.
applyPreferences(getCachedPreferences());

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn[data-page]');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');

      const page = e.currentTarget.getAttribute('data-page');
      if (page) navigateTo(page);
    });
  });
}

// Initialize Application

async function loadGlobalSettings() {
  try {
    const settings = await window.api.getAppSettings();
    // The database is authoritative. A stale renderer cache must not restore
    // old language/theme choices after a full data reset.
    window.appSettings = {
      ...(settings || {}),
      language: settings?.language === 'en' ? 'en' : 'ar',
      isLightMode: settings?.isLightMode === true
    };
    cachePreferences(window.appSettings);
    applyPreferences(window.appSettings);
    const sysCurrency = window.appSettings.currency || '';
    document.querySelectorAll('.sys-currency').forEach(el => el.textContent = sysCurrency);
  } catch (err) {
    console.error('Failed to load appSettings for currency:', err);
  }
}

async function initApp() {
  installDomSecurity();
  initializeExportSystem();
  setupTabs();
  setupSettingsMenu();
  window.navigateTo = navigateTo;

  const dateBadge = document.getElementById('report-date-display');
  if (dateBadge) {
    dateBadge.innerText = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  await loadGlobalSettings();
  await initializeLogin();
}

initApp();
