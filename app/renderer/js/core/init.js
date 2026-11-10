// Default Initial State matching the current report calculations
const DEFAULT_STATE = {
  reportDate: window.getLocalDateString(),
  cashierActual: 0,
  sales: {
    cash: 0,
    kbank: 0,
    grab: 0,
    lineman: 0,
    krungsri: 0
  },
  purchases: []
};

let state = {};

const SECTION_TABS = ['sales', 'purchases', 'suppliers', 'employees', 'vault', 'banks', 'dashboard', 'closing'];
const SECTION_I18N_KEYS = {
  sales: 'menu_customers',
  purchases: 'menu_purchases',
  suppliers: 'menu_suppliers',
  employees: 'menu_employees',
  vault: 'menu_vault',
  banks: 'tab_btn_banks',
  dashboard: 'menu_dashboard',
  closing: 'tab_btn_closing',
  settings: 'settings_title',
  archive: 'archive_title'
};
const SECTION_ICONS = {
  sales: '💰',
  purchases: '🛒',
  suppliers: '🚚',
  employees: '👥',
  vault: '🏦',
  banks: '🏛️',
  dashboard: '📊',
  closing: '🔒',
  settings: '⚙️',
  archive: '🗄️'
};
const SHORTCUT_KEY_TO_SECTION = {
  F1: 'sales',
  F2: 'purchases',
  F3: 'suppliers',
  F4: 'employees',
  F5: 'vault',
  F6: 'banks',
  F7: 'dashboard',
  F8: 'closing'
};

const urlParams = new URLSearchParams(window.location.search);
const standaloneSection = urlParams.get('standalone') || null;
const standaloneSubTab = urlParams.get('tab') || null;
const standaloneEntityId = urlParams.get('entityId') || null;
const standaloneEntityName = urlParams.get('entityName') || null;
const standaloneVoucherNumber = urlParams.get('voucherNumber') || null;
const standaloneAccountId = urlParams.get('accountId') || null;
const standaloneYearId = urlParams.get('yearId') || null;
const standaloneYearName = urlParams.get('yearName') || null;

window.isStandaloneWindow = Boolean(standaloneSection);
window.standaloneSection = standaloneSection;
window.standaloneSubTab = standaloneSubTab;
window.standaloneEntityId = standaloneEntityId;
window.standaloneEntityName = standaloneEntityName;
window.standaloneVoucherNumber = standaloneVoucherNumber;
window.standaloneAccountId = standaloneAccountId;
if (standaloneYearId && Number(standaloneYearId)) {
  window.currentYearId = Number(standaloneYearId);
}
if (standaloneYearName) {
  window.currentYearName = standaloneYearName;
}

if (standaloneSection) {
  document.documentElement.classList.add('standalone-os-window');
  if (document.body) {
    document.body.classList.add('standalone-os-window');
    document.body.dataset.standalone = standaloneSection;
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.add('standalone-os-window');
      document.body.dataset.standalone = standaloneSection;
    });
  }
}

function getTabButton(name) {
  const buttons = document.querySelectorAll('#main-tabs-nav .tab-btn');
  for (const btn of buttons) {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${name}'`) || onclickAttr.includes(`"${name}"`)) {
      return btn;
    }
  }
  return null;
}

function updateMainTabButtonsOpenState(openKeys = []) {
  const openSet = new Set(Array.isArray(openKeys) ? openKeys : []);
  let visibleOpenCount = 0;
  SECTION_TABS.forEach((tabName) => {
    const btn = getTabButton(tabName);
    if (!btn) return;
    const isOpen = openSet.has(tabName);
    if (isOpen) visibleOpenCount++;
    btn.classList.toggle('has-open-window', isOpen);
    btn.classList.toggle('active', isOpen);
  });

  const toolbar = document.getElementById('open-windows-toolbar');
  if (toolbar) {
    toolbar.style.display = visibleOpenCount > 0 ? 'flex' : 'none';
  }
}

async function closeAllOpenSectionWindows() {
  if (window.api && typeof window.api.closeAllSectionWindows === 'function') {
    const res = await window.api.closeAllSectionWindows();
    updateMainTabButtonsOpenState(res?.openSections || []);
  }
}

async function cascadeOpenSectionWindows() {
  if (window.api && typeof window.api.cascadeSectionWindows === 'function') {
    const res = await window.api.cascadeSectionWindows();
    if (res?.openSections) {
      updateMainTabButtonsOpenState(res.openSections);
    }
  }
}

function ensureStandaloneLuxuryRibbon(section = standaloneSection) {
  if (!window.isStandaloneWindow || !section) return;
  let ribbon = document.getElementById('standalone-luxury-ribbon');
  if (!ribbon) {
    ribbon = document.createElement('div');
    ribbon.id = 'standalone-luxury-ribbon';
    ribbon.className = 'standalone-luxury-ribbon';
    document.body.prepend(ribbon);
  }

  const key = SECTION_I18N_KEYS[section];
  const rawTitle = (key && typeof t === 'function') ? t(key) : section;
  const cleanTitle = String(rawTitle || '').replace(/^[^\p{L}\p{N}]+\s*/u, '');
  const icon = SECTION_ICONS[section] || '✨';
  const companyName = window.appSettings?.companyName || (typeof t === 'function' ? t('default_company_name') : '');
  const yearLabel = window.currentYearName || (window.currentYearId ? String(window.currentYearId) : '');
  const dateStr = typeof window.getLocalDateString === 'function' ? window.getLocalDateString() : '';

  const escapeFn = window.escapeHTML || ((v) => String(v ?? ''));
  const calcTitle = typeof t === 'function' ? t('calc_btn_title') : '';
  const privacyTitle = typeof t === 'function' ? t('privacy_blur_btn_title') : '';
  const searchTitle = typeof t === 'function' ? t('cmd_palette_title') : '';
  const stickyTitle = typeof t === 'function' ? t('sticky_notes_btn_title') : '';
  const audioTitle = typeof t === 'function' ? t('audio_fx_btn_title') : '';
  const lockTitle = typeof t === 'function' ? t('lock_screen_btn_title') : '';
  const shortcutsTitle = typeof t === 'function' ? t('shortcuts_btn_title') : '';
  const audioIcon = window.__luxuryAudioMuted ? '🔇' : '🔊';

  ribbon.innerHTML = `
    <div class="standalone-ribbon-start">
      <span class="standalone-ribbon-icon">${icon}</span>
      <span class="standalone-ribbon-section">${escapeFn(cleanTitle)}</span>
      <span class="standalone-ribbon-sep">•</span>
      <span class="standalone-ribbon-company">${escapeFn(companyName)}</span>
    </div>
    <div class="standalone-ribbon-end">
      <button type="button" class="standalone-ribbon-tool-btn" onclick="openLuxuryCommandPalette()" title="${escapeFn(searchTitle)}">🔍</button>
      <button type="button" class="standalone-ribbon-tool-btn" onclick="toggleVipPrivacyBlur()" title="${escapeFn(privacyTitle)}">👁️</button>
      <button type="button" class="standalone-ribbon-tool-btn gold-tool" onclick="toggleExecutiveCalculator()" title="${escapeFn(calcTitle)}">🧮</button>
      <button type="button" class="standalone-ribbon-tool-btn gold-tool" onclick="toggleRoyalStickyNotes()" title="${escapeFn(stickyTitle)}">📌</button>
      <button type="button" class="standalone-ribbon-tool-btn" id="ribbon-audio-fx-btn" onclick="toggleLuxuryAudioFx()" title="${escapeFn(audioTitle)}">${audioIcon}</button>
      <button type="button" class="standalone-ribbon-tool-btn" onclick="lockAppSession()" title="${escapeFn(lockTitle)}">🔒</button>
      <button type="button" class="standalone-ribbon-tool-btn" onclick="toggleRoyalShortcutsModal()" title="${escapeFn(shortcutsTitle)}">⌨️</button>
      ${yearLabel ? `<span class="standalone-ribbon-badge gold">📅 ${escapeFn(yearLabel)}</span>` : ''}
      ${dateStr ? `<span class="standalone-ribbon-badge">${escapeFn(dateStr)}</span>` : ''}
    </div>
  `;
}

async function refreshSectionData(name, extra = {}) {
  if (name === 'sales' || name === 'purchases') {
    if (typeof populateAccountDropdowns === 'function') await populateAccountDropdowns();
    if (name === 'sales' && extra?.voucherNumber) {
      const sInput = document.getElementById('input-voucher-search');
      const sBtn = document.getElementById('btn-search-voucher');
      if (sInput && sBtn) {
        sInput.value = String(extra.voucherNumber);
        setTimeout(() => sBtn.click(), 60);
      }
    } else if (name === 'purchases' && extra?.voucherNumber) {
      const pInput = document.getElementById('expenses-voucher-search-input');
      const pBtn = document.getElementById('purchases-voucher-search-btn');
      if (pInput && pBtn) {
        pInput.value = String(extra.voucherNumber);
        setTimeout(() => pBtn.click(), 60);
      }
    }
  } else if (name === 'banks') {
    if (typeof loadBanksData === 'function') await loadBanksData();
    if (typeof populateAccountDropdowns === 'function') await populateAccountDropdowns();
    if (extra?.accountId) {
      const select = document.getElementById('bank-tx-filter-account');
      if (select && Array.from(select.options).some(option => option.value === String(extra.accountId))) {
        select.value = String(extra.accountId);
        if (typeof window.applyBankAccountFilter === 'function') await window.applyBankAccountFilter();
        select.closest('.bank-history-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } else if (name === 'employees') {
    if (typeof loadEmployees === 'function') await loadEmployees();
    if (typeof populateAccountDropdowns === 'function') await populateAccountDropdowns();
    if (extra?.entityId && typeof window.selectEmployeeOption === 'function') {
      const targetEmp = (typeof allEmployees !== 'undefined' && Array.isArray(allEmployees))
        ? allEmployees.find(e => String(e.id) === String(extra.entityId))
        : null;
      const empName = extra.entityName || targetEmp?.name || '';
      await window.selectEmployeeOption(Number(extra.entityId) || extra.entityId, empName);
    }
    if (extra?.voucherNumber) {
      const eInput = document.getElementById('emp-tx-search-input');
      if (eInput && typeof window.handleEmpTxSearch === 'function') {
        eInput.value = String(extra.voucherNumber);
        setTimeout(() => window.handleEmpTxSearch(), 100);
      }
    }
  } else if (name === 'suppliers') {
    if (typeof loadSuppliers === 'function') await loadSuppliers();
    if (typeof populateAccountDropdowns === 'function') await populateAccountDropdowns();
    if (extra?.entityId && typeof window.selectSupplierOption === 'function') {
      const targetSup = (typeof allSuppliers !== 'undefined' && Array.isArray(allSuppliers))
        ? allSuppliers.find(s => String(s.id) === String(extra.entityId))
        : null;
      const supName = extra.entityName || targetSup?.name || '';
      await window.selectSupplierOption(Number(extra.entityId) || extra.entityId, supName);
    }
    if (extra?.voucherNumber && typeof editSupplierTx === 'function') {
      setTimeout(() => editSupplierTx(Number(extra.voucherNumber)), 140);
    }
  } else if (name === 'vault') {
    if (typeof fetchVaultReports === 'function') await fetchVaultReports();
    if (typeof populateAccountDropdowns === 'function') await populateAccountDropdowns();
    if (extra?.voucherNumber) {
      const vInput = document.getElementById('vault-voucher-search-input');
      if (vInput && typeof window.handleVaultVoucherSearch === 'function') {
        vInput.value = String(extra.voucherNumber);
        setTimeout(() => window.handleVaultVoucherSearch(), 80);
      }
    }
  } else if (name === 'closing') {
    if (typeof calculateClosingFigures === 'function') await calculateClosingFigures();
  } else if (name === 'dashboard') {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatObj = (date) => {
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${m}-${d}`;
    };
    const startInput = document.getElementById('dash-start-date');
    const endInput = document.getElementById('dash-end-date');
    if (startInput && !startInput.value) startInput.value = formatObj(firstDay);
    if (endInput && !endInput.value) endInput.value = formatObj(today);
    if (typeof loadDashboardData === 'function') await loadDashboardData();
  }
}

function playStandaloneDepthAnimation(targetEl, isFocusPulse = false) {
  if (!targetEl) return;
  targetEl.classList.remove('standalone-depth-emerge', 'standalone-depth-focus');
  void targetEl.offsetWidth;
  targetEl.classList.add(isFocusPulse ? 'standalone-depth-focus' : 'standalone-depth-emerge');
}

async function activateStandaloneSection(section = standaloneSection, subTab = standaloneSubTab) {
  if (!section) return;

  if (section === 'sales' || section === 'purchases' || section === 'closing') {
    await loadState();
  }
  if (['sales', 'purchases', 'employees', 'suppliers', 'vault', 'banks'].includes(section)) {
    await populateAccountDropdowns();
  }

  const key = SECTION_I18N_KEYS[section];
  if (key && typeof t === 'function') {
    document.title = `${window.appSettings?.companyName || t('default_company_name')} — ${t(key)}`;
  }
  ensureStandaloneLuxuryRibbon(section);

  if (section === 'settings') {
    if (typeof window.renderStandaloneSettings === 'function') {
      await window.renderStandaloneSettings(subTab || 'company', false);
    }
    return;
  }

  if (section === 'archive') {
    if (typeof window.openArchiveModal === 'function') {
      await window.openArchiveModal();
    }
    return;
  }

  document.querySelectorAll('.tab-content').forEach((el) => {
    const isTarget = el.id === `tab-${section}`;
    el.classList.toggle('active', isTarget);
    el.style.display = isTarget ? 'block' : 'none';
    if (isTarget) {
      playStandaloneDepthAnimation(el, false);
    }
  });

  try {
    const savedCalc = JSON.parse(localStorage.getItem('thabit_exec_calc_state') || 'null');
    if (savedCalc && savedCalc.isOpen) {
      mountExecutiveCalculatorWidget(false);
    }
  } catch (_) {}

  try {
    const savedNotes = JSON.parse(localStorage.getItem('thabit_royal_sticky_notes') || 'null');
    if (savedNotes && savedNotes.isOpen) {
      mountRoyalStickyNotesWidget(false);
    }
  } catch (_) {}

  try {
    if (localStorage.getItem('thabit_vip_session_locked') === '1') {
      applyVipSessionLockState(true);
    }
  } catch (_) {}

  mountLuxuryDatePresets();
  mountLuxuryTafqeetAndInlineMath();
  mountLuxuryTableQuickSummaryBars();

  await refreshSectionData(section, {
    entityId: window.standaloneEntityId,
    entityName: window.standaloneEntityName,
    voucherNumber: window.standaloneVoucherNumber,
    accountId: window.standaloneAccountId
  });
}

async function switchTab(name, extra = {}) {
  // Open (or bring to front) the independent OS window for this section via Electron IPC
  if (window.api && typeof window.api.openSectionWindow === 'function') {
    const btn = getTabButton(name);
    if (btn) {
      btn.classList.remove('btn-depth-press');
      void btn.offsetWidth;
      btn.classList.add('btn-depth-press');
    }

    const i18nKey = SECTION_I18N_KEYS[name];
    const sectionTitle = (i18nKey && typeof t === 'function') ? t(i18nKey) : name;
    const companyTitle = window.appSettings?.companyName || (typeof t === 'function' ? t('default_company_name') : '');

    const res = await window.api.openSectionWindow({
      section: name,
      entityId: extra?.entityId ? String(extra.entityId) : '',
      entityName: extra?.entityName ? String(extra.entityName) : '',
      voucherNumber: extra?.voucherNumber ? String(extra.voucherNumber) : '',
      accountId: extra?.accountId ? String(extra.accountId) : '',
      title: companyTitle ? `${companyTitle} — ${sectionTitle}` : sectionTitle,
      user: window.currentUser || null,
      yearId: window.currentYearId || 1,
      yearName: window.currentYearName || ''
    });

    if (res?.openSections) {
      updateMainTabButtonsOpenState(res.openSections);
    }
    return;
  }

  // Fallback / inside standalone window
  document.querySelectorAll('.tab-content').forEach((tEl) => {
    const isTarget = tEl.id === `tab-${name}`;
    tEl.classList.toggle('active', isTarget);
    tEl.style.display = isTarget ? 'block' : 'none';
    if (isTarget) {
      playStandaloneDepthAnimation(tEl, false);
    }
  });
  await refreshSectionData(name, extra);
}

function setupMultiWindowListeners() {
  // In main window, hide inline tab-contents initially so only independent OS windows open on click
  if (!window.isStandaloneWindow) {
    document.querySelectorAll('.tab-content').forEach((el) => {
      el.classList.remove('active');
      el.style.display = 'none';
    });
  }

  if (!window.api) return;

  if (typeof window.api.onOpenSectionsChanged === 'function') {
    window.api.onOpenSectionsChanged((openKeys) => {
      if (!window.isStandaloneWindow) {
        updateMainTabButtonsOpenState(openKeys);
      }
    });
  }

  if (typeof window.api.onAppDataUpdated === 'function') {
    window.api.onAppDataUpdated(async (info) => {
      if (!info) return;
      if (info.type === 'ui-preferences') {
        const nextLang = info.language === 'en' ? 'en' : 'ar';
        const isLightMode = info.isLightMode === true;
        window.appSettings = {
          ...(window.appSettings || {}),
          language: nextLang,
          isLightMode
        };
        try {
          localStorage.setItem('thabit_settings', JSON.stringify(window.appSettings));
        } catch (_) {}

        document.body?.classList.toggle('light-theme', isLightMode);
        document.documentElement.classList.toggle('light-theme', isLightMode);
        document.documentElement.lang = nextLang;
        document.documentElement.dir = nextLang === 'en' ? 'ltr' : 'rtl';
        if (typeof window.setLanguage === 'function') {
          window.setLanguage(nextLang);
        }

        // Update standalone window title in the new language
        if (window.isStandaloneWindow && standaloneSection) {
          const key = SECTION_I18N_KEYS[standaloneSection];
          if (key && typeof t === 'function') {
            document.title = `${window.appSettings?.companyName || t('default_company_name')} — ${t(key)}`;
          }
        }
      } else if (info.type === 'privacy-blur') {
        applyVipPrivacyBlurState(Boolean(info.enabled));
      } else if (info.type === 'calc-sync') {
        applyRemoteCalculatorState(info);
      } else if (info.type === 'sticky-notes-sync') {
        applyRemoteStickyNotesState(info);
      } else if (info.type === 'session-lock') {
        applyVipSessionLockState(Boolean(info.locked));
      } else if (info.type === 'audio-fx-sync') {
        applyLuxuryAudioMuteState(Boolean(info.muted));
      } else if (info.type === 'company-info') {
        try {
          const latest = await window.api.getAppSettings();
          if (latest) {
            window.appSettings = { ...(window.appSettings || {}), ...latest };
            const sysCurrency = window.appSettings.currency || '';
            document.querySelectorAll('.sys-currency').forEach(el => { el.textContent = sysCurrency; });
          }
        } catch (_) {}
      }
    });
  }

  window.addEventListener('languageChanged', () => {
    refreshLuxuryDatePresetsLabels();
    refreshAllTafqeetBadges();
    refreshLuxuryTableSummaryLabels();
    if (!window.isStandaloneWindow) {
      refreshLiquidityTicker();
    }
    if (window.isStandaloneWindow && standaloneSection) {
      const key = SECTION_I18N_KEYS[standaloneSection];
      if (key && typeof t === 'function') {
        document.title = `${window.appSettings?.companyName || t('default_company_name')} — ${t(key)}`;
      }
      ensureStandaloneLuxuryRibbon(standaloneSection);
      if (standaloneSection === 'suppliers') {
        if (typeof loadSupplierTransactions === 'function') loadSupplierTransactions();
      } else if (standaloneSection === 'employees') {
        if (typeof loadEmployeeTransactions === 'function') loadEmployeeTransactions();
      } else if (standaloneSection === 'vault') {
        if (typeof refreshVaultCategorySelect === 'function') refreshVaultCategorySelect();
        if (typeof fetchVaultReports === 'function') fetchVaultReports();
      } else if (standaloneSection === 'banks') {
        if (typeof window.initializeBankReconciliationMonths === 'function') {
          window.initializeBankReconciliationMonths(true);
        }
        if (typeof loadBanksData === 'function') loadBanksData();
      } else if (standaloneSection === 'closing') {
        if (typeof renderPartners === 'function') renderPartners();
        if (typeof calculateClosingFigures === 'function') calculateClosingFigures();
      } else if (standaloneSection === 'dashboard') {
        if (typeof loadDashboardData === 'function') loadDashboardData();
      }
    }
  });

  if (typeof window.api.onSectionWindowReopen === 'function') {
    window.api.onSectionWindowReopen(async (data) => {
      if (!window.isStandaloneWindow) return;
      if (data?.yearId && Number(data.yearId)) {
        window.currentYearId = Number(data.yearId);
      }
      if (data?.yearName) {
        window.currentYearName = data.yearName;
      }
      const section = data?.section || standaloneSection;
      const isFocusPulse = !data?.isFreshOpen;
      if (section === 'settings') {
        if (typeof window.renderStandaloneSettings === 'function') {
          await window.renderStandaloneSettings(data?.tabId || 'company', isFocusPulse);
        }
      } else if (section === 'archive') {
        const content = document.getElementById('archive-modal-content');
        playStandaloneDepthAnimation(content, isFocusPulse);
        if (typeof window.switchArchiveTab === 'function') {
          await window.switchArchiveTab('emp');
        }
      } else {
        const targetEl = document.getElementById(`tab-${section}`);
        playStandaloneDepthAnimation(targetEl, isFocusPulse);
        await refreshSectionData(section, {
          entityId: data?.entityId || '',
          entityName: data?.entityName || '',
          voucherNumber: data?.voucherNumber || '',
          accountId: data?.accountId || ''
        });
      }
    });
  }

  // Throttled focus refresh so rapid window switching has 0ms lag while keeping data fresh
  let lastFocusRefreshAt = Date.now();
  const FOCUS_COOLDOWN_MS = 3500;

  window.addEventListener('focus', async () => {
    try {
      const savedCalc = JSON.parse(localStorage.getItem('thabit_exec_calc_state') || 'null');
      if (savedCalc && typeof savedCalc === 'object') {
        if (typeof savedCalc.expr === 'string') calcExpr = savedCalc.expr;
        if (Array.isArray(savedCalc.history)) calcHistory = savedCalc.history;
        if (savedCalc.isOpen) {
          mountExecutiveCalculatorWidget(false);
        } else {
          document.getElementById('executive-calc-widget')?.remove();
        }
      }
    } catch (_) {}

    try {
      const savedNotes = JSON.parse(localStorage.getItem('thabit_royal_sticky_notes') || 'null');
      if (savedNotes && typeof savedNotes === 'object') {
        if (typeof savedNotes.text === 'string') stickyNotesText = savedNotes.text;
        if (savedNotes.isOpen) {
          mountRoyalStickyNotesWidget(false);
        } else {
          document.getElementById('royal-sticky-notes-widget')?.remove();
        }
      }
    } catch (_) {}

    try {
      applyVipSessionLockState(localStorage.getItem('thabit_vip_session_locked') === '1');
    } catch (_) {}

    const now = Date.now();
    if (now - lastFocusRefreshAt < FOCUS_COOLDOWN_MS) return;
    lastFocusRefreshAt = now;

    if (window.isStandaloneWindow && standaloneSection) {
      if (standaloneSection === 'sales' || standaloneSection === 'purchases') {
        await loadStateForDate(currentSelectedDate);
      }
      refreshSectionData(standaloneSection);
    } else if (!window.isStandaloneWindow && window.currentUser) {
      await loadStateForDate(currentSelectedDate);
      refreshLiquidityTicker();
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new Event('stateChanged'));
      }
    }
  });

  // Track last focused numeric/text input for Executive Calculator "Paste to Field"
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.closest('#executive-calc-widget') && !el.closest('#royal-sticky-notes-widget') && !el.closest('#luxury-cmd-palette-overlay') && !el.closest('#vip-lock-overlay')) {
      window.__lastFocusedAppInput = el;
    }
  });

  setupGlobalKeyboardShortcuts();
}

function setupGlobalKeyboardShortcuts() {
  if (window.__globalShortcutsInitialized) return;
  window.__globalShortcutsInitialized = true;

  // Listen in capture phase (true) so child components or inputs cannot stop propagation
  const handleShortcut = (e) => {
    const rawKey = String(e.key || '');
    const rawCode = String(e.code || '');
    const keyUpper = rawKey.toUpperCase();
    const codeUpper = rawCode.toUpperCase();

    // Determine normalized function key (F1..F12) from key or code
    let funcKey = '';
    if (/^F([1-9]|1[0-2])$/i.test(rawKey)) {
      funcKey = keyUpper;
    } else if (/^F([1-9]|1[0-2])$/i.test(rawCode)) {
      funcKey = codeUpper;
    }
    const digit = /^DIGIT([0-9])$/.exec(codeUpper)?.[1] || (/^[0-9]$/.test(rawKey) ? rawKey : '');
    if (!funcKey && e.ctrlKey && !e.altKey && !e.metaKey && digit) {
      if (e.shiftKey) {
        funcKey = digit === '1' ? 'F11' : digit === '2' ? 'F12' : '';
      } else {
        funcKey = digit === '0' ? 'F10' : `F${digit}`;
      }
    }

    // Ctrl+L or Cmd+L: Lock App Session
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (keyUpper === 'L' || codeUpper === 'KEYL')) {
      const loginModal = document.getElementById('login-modal');
      if (loginModal && loginModal.style.display !== 'none' && getComputedStyle(loginModal).display !== 'none') {
        return;
      }
      e.preventDefault();
      lockAppSession();
      return;
    }

    // Ctrl+K or Cmd+K: Luxury Command Palette
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (keyUpper === 'K' || codeUpper === 'KEYK')) {
      const loginModal = document.getElementById('login-modal');
      if (loginModal && loginModal.style.display !== 'none' && getComputedStyle(loginModal).display !== 'none') {
        return;
      }
      e.preventDefault();
      openLuxuryCommandPalette();
      return;
    }

    // Function keys and their Ctrl+number alternatives share the same actions.
    if (e.altKey || e.metaKey || (e.ctrlKey && !funcKey)) return;
    if (funcKey) {
      const loginModal = document.getElementById('login-modal');
      if (loginModal && loginModal.style.display !== 'none' && getComputedStyle(loginModal).display !== 'none') return;
      const vipOverlay = document.getElementById('vip-lock-overlay');
      if (vipOverlay && vipOverlay.style.display !== 'none') return;
    }

    if (funcKey === 'F9') {
      e.preventDefault();
      toggleVipPrivacyBlur();
      return;
    }
    if (funcKey === 'F10') {
      e.preventDefault();
      toggleExecutiveCalculator();
      return;
    }
    if (funcKey === 'F11') {
      e.preventDefault();
      toggleRoyalStickyNotes();
      return;
    }
    if (funcKey === 'F12') {
      e.preventDefault();
      toggleRoyalShortcutsModal();
      return;
    }

    if (!funcKey) return;

    const targetSection = SHORTCUT_KEY_TO_SECTION[funcKey];
    if (!targetSection) return;

    const loginModal = document.getElementById('login-modal');
    if (loginModal && loginModal.style.display !== 'none' && getComputedStyle(loginModal).display !== 'none') {
      return;
    }
    const vipOverlay = document.getElementById('vip-lock-overlay');
    if (vipOverlay && vipOverlay.style.display !== 'none') {
      return;
    }

    if (!window.isStandaloneWindow) {
      const btn = getTabButton(targetSection);
      if (btn && btn.style.display === 'none') return;
    }

    e.preventDefault();
    switchTab(targetSection);
  };
  window.addEventListener('keydown', handleShortcut, true);
  window.api?.onFunctionShortcut?.((shortcut) => {
    const data = typeof shortcut === 'string' ? { key: shortcut, code: shortcut } : shortcut;
    if (!data) return;
    handleShortcut({
      key: data.key, code: data.code, ctrlKey: Boolean(data.ctrlKey), metaKey: false, altKey: false, shiftKey: Boolean(data.shiftKey),
      preventDefault() {}
    });
  });
}

let cachedPaletteEntities = { yearId: null, at: 0, employees: [], suppliers: [] };

async function getCommandPaletteItems() {
  const tr = typeof t === 'function' ? t : (k) => k;
  const items = [];

  const sectionList = [
    { key: 'sales', icon: '💰', shortcut: 'Ctrl+1', label: tr('menu_customers') },
    { key: 'purchases', icon: '🛒', shortcut: 'Ctrl+2', label: tr('menu_purchases') },
    { key: 'suppliers', icon: '🚚', shortcut: 'Ctrl+3', label: tr('menu_suppliers') },
    { key: 'employees', icon: '👥', shortcut: 'Ctrl+4', label: tr('menu_employees') },
    { key: 'vault', icon: '🏦', shortcut: 'Ctrl+5', label: tr('menu_vault') },
    { key: 'banks', icon: '🏛️', shortcut: 'Ctrl+6', label: tr('tab_btn_banks') },
    { key: 'dashboard', icon: '📊', shortcut: 'Ctrl+7', label: tr('menu_dashboard') },
    { key: 'closing', icon: '🔒', shortcut: 'Ctrl+8', label: tr('tab_btn_closing') }
  ];

  sectionList.forEach((sec) => {
    if (sec.key === 'dashboard' && window.currentUser?.role !== 'manager') return;
    const cleanLabel = String(sec.label || '').replace(/^[^\p{L}\p{N}]+\s*/u, '');
    items.push({
      icon: sec.icon,
      title: cleanLabel,
      category: tr('cmd_cat_section'),
      badge: sec.shortcut,
      run: () => switchTab(sec.key)
    });
  });

  // Quick Actions
  items.push({
    icon: '🗂️',
    title: String(tr('cmd_action_vault_custom')).replace(/^[^\p{L}\p{N}]+\s*/u, ''),
    category: tr('cmd_cat_action'),
    badge: '⚙️',
    run: () => {
      if (typeof window.openSettingsModal === 'function') {
        window.openSettingsModal('vault-custom');
      }
    }
  });

  items.push({
    icon: '🌓',
    title: String(tr('cmd_action_toggle_theme')).replace(/^[^\p{L}\p{N}]+\s*/u, ''),
    category: tr('cmd_cat_action'),
    badge: 'UI',
    run: async () => {
      const nextLight = !(window.appSettings?.isLightMode === true);
      const nextLang = window.appSettings?.language === 'en' ? 'en' : 'ar';
      window.appSettings = { ...(window.appSettings || {}), isLightMode: nextLight };
      document.body?.classList.toggle('light-theme', nextLight);
      document.documentElement.classList.toggle('light-theme', nextLight);
      try {
        localStorage.setItem('thabit_settings', JSON.stringify(window.appSettings));
        await window.api?.saveAppSettings?.(window.appSettings);
        await window.api?.notifyDataChanged?.({ type: 'ui-preferences', language: nextLang, isLightMode: nextLight });
      } catch (_) {}
    }
  });

  items.push({
    icon: '🌐',
    title: String(tr('cmd_action_toggle_lang')).replace(/^[^\p{L}\p{N}]+\s*/u, ''),
    category: tr('cmd_cat_action'),
    badge: 'AR/EN',
    run: async () => {
      const currLang = (typeof window.currentLang === 'function' ? window.currentLang() : window.appSettings?.language) || 'ar';
      const nextLang = currLang === 'en' ? 'ar' : 'en';
      const isLightMode = window.appSettings?.isLightMode === true;
      window.appSettings = { ...(window.appSettings || {}), language: nextLang };
      if (typeof window.setLanguage === 'function') window.setLanguage(nextLang);
      try {
        localStorage.setItem('thabit_settings', JSON.stringify(window.appSettings));
        await window.api?.saveAppSettings?.(window.appSettings);
        await window.api?.notifyDataChanged?.({ type: 'ui-preferences', language: nextLang, isLightMode });
      } catch (_) {}
    }
  });

  items.push({
    icon: '💾',
    title: String(tr('cmd_action_backup')).replace(/^[^\p{L}\p{N}]+\s*/u, ''),
    category: tr('cmd_cat_action'),
    badge: 'DB',
    run: async () => {
      if (window.api?.backupDB) {
        const res = await window.api.backupDB();
        if (res?.success) alert(tr('backup_created_success'));
      }
    }
  });

  if (!window.isStandaloneWindow) {
    items.push({
      icon: '🗂️',
      title: String(tr('cmd_action_cascade')).replace(/^[^\p{L}\p{N}]+\s*/u, ''),
      category: tr('cmd_cat_action'),
      badge: 'WIN',
      run: () => cascadeOpenSectionWindows()
    });
    items.push({
      icon: '✖',
      title: String(tr('cmd_action_close_all')).replace(/^[^\p{L}\p{N}]+\s*/u, ''),
      category: tr('cmd_cat_action'),
      badge: 'WIN',
      run: () => closeAllOpenSectionWindows()
    });
  }

  // Load employees & suppliers (cached for 20s)
  const yearId = window.currentYearId || 1;
  const now = Date.now();
  if (cachedPaletteEntities.yearId !== yearId || now - cachedPaletteEntities.at > 20000) {
    try {
      const [emps, sups] = await Promise.all([
        window.api?.getEmployees ? window.api.getEmployees(yearId) : [],
        window.api?.getSuppliers ? window.api.getSuppliers(yearId) : []
      ]);
      cachedPaletteEntities = {
        yearId,
        at: now,
        employees: Array.isArray(emps) ? emps : [],
        suppliers: Array.isArray(sups) ? sups : []
      };
    } catch (_) {}
  }

  cachedPaletteEntities.employees.forEach((emp) => {
    if (!emp?.name) return;
    items.push({
      icon: '👤',
      title: emp.name,
      category: tr('cmd_cat_employee'),
      badge: emp.job_title || emp.category_name || '',
      run: () => switchTab('employees', { entityId: emp.id, entityName: emp.name })
    });
  });

  cachedPaletteEntities.suppliers.forEach((sup) => {
    if (!sup?.name) return;
    items.push({
      icon: '🏢',
      title: sup.name,
      category: tr('cmd_cat_supplier'),
      badge: sup.phone || '',
      run: () => switchTab('suppliers', { entityId: sup.id, entityName: sup.name })
    });
  });

  return items;
}

function closeLuxuryCommandPalette() {
  const overlay = document.getElementById('luxury-cmd-palette-overlay');
  if (overlay) overlay.remove();
}

async function openLuxuryCommandPalette() {
  const existing = document.getElementById('luxury-cmd-palette-overlay');
  if (existing) {
    existing.remove();
    return;
  }

  const tr = typeof t === 'function' ? t : (k) => k;
  const esc = window.escapeHTML || ((v) => String(v ?? ''));

  const overlay = document.createElement('div');
  overlay.id = 'luxury-cmd-palette-overlay';
  overlay.className = 'luxury-cmd-overlay';
  overlay.innerHTML = `
    <div class="luxury-cmd-modal" role="dialog" aria-modal="true">
      <div class="luxury-cmd-search-bar">
        <span class="luxury-cmd-search-icon">🔍</span>
        <input type="text" id="luxury-cmd-input" class="luxury-cmd-input" placeholder="${esc(tr('cmd_palette_placeholder'))}" autocomplete="off" />
        <kbd class="luxury-cmd-esc-badge">ESC</kbd>
      </div>
      <div class="luxury-cmd-results" id="luxury-cmd-results"></div>
      <div class="luxury-cmd-footer">
        <span>${esc(tr('cmd_palette_hint'))}</span>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLuxuryCommandPalette();
  });

  document.body.appendChild(overlay);
  const input = document.getElementById('luxury-cmd-input');
  const resultsEl = document.getElementById('luxury-cmd-results');

  const allItems = await getCommandPaletteItems();
  let filtered = allItems.slice(0, 14);
  let activeIdx = 0;

  const renderList = () => {
    if (!resultsEl) return;
    if (filtered.length === 0) {
      resultsEl.innerHTML = `<div class="luxury-cmd-empty">${esc(tr('cmd_palette_empty'))}</div>`;
      return;
    }
    resultsEl.innerHTML = filtered.map((item, idx) => `
      <div class="luxury-cmd-item ${idx === activeIdx ? 'active' : ''}" data-idx="${idx}">
        <div class="luxury-cmd-item-main">
          <span class="luxury-cmd-item-icon">${item.icon}</span>
          <span class="luxury-cmd-item-title">${esc(item.title)}</span>
          <span class="luxury-cmd-item-cat">${esc(item.category)}</span>
        </div>
        ${item.badge ? `<span class="luxury-cmd-item-badge" dir="ltr">${esc(item.badge)}</span>` : ''}
      </div>
    `).join('');

    resultsEl.querySelectorAll('.luxury-cmd-item').forEach((rowEl) => {
      rowEl.addEventListener('mouseenter', () => {
        activeIdx = Number(rowEl.dataset.idx) || 0;
        resultsEl.querySelectorAll('.luxury-cmd-item').forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      });
      rowEl.addEventListener('click', () => {
        const chosen = filtered[Number(rowEl.dataset.idx) || 0];
        closeLuxuryCommandPalette();
        if (chosen && typeof chosen.run === 'function') chosen.run();
      });
    });
  };

  renderList();
  setTimeout(() => input?.focus(), 10);

  let notesSearchSeq = 0;

  input?.addEventListener('input', async () => {
    const rawQ = input.value.trim();
    const q = rawQ.toLowerCase();
    const currentSeq = ++notesSearchSeq;

    if (!q) {
      filtered = allItems.slice(0, 14);
      activeIdx = 0;
      renderList();
      return;
    }

    const baseMatches = allItems.filter(it =>
      String(it.title || '').toLowerCase().includes(q) ||
      String(it.category || '').toLowerCase().includes(q) ||
      String(it.badge || '').toLowerCase().includes(q)
    ).slice(0, 14);

    const numMatch = rawQ.replace(/^#/, '').trim();
    if (/^\d+$/.test(numMatch)) {
      const vNo = parseInt(numMatch, 10);
      baseMatches.unshift({
        icon: '⚡',
        title: `${tr('cmd_voucher_lookup_prefix')} #${vNo}`,
        category: tr('cmd_cat_action'),
        badge: `#${vNo}`,
        run: () => lookupUniversalVoucherByNumber(vNo)
      });
    }

    filtered = baseMatches;
    activeIdx = 0;
    renderList();

    // Live search across all voucher notes & descriptions
    if (rawQ.length >= 2 && window.api?.searchVouchersByNotes) {
      try {
        const yearId = window.currentYearId || 1;
        const noteRows = await window.api.searchVouchersByNotes(rawQ, yearId);
        if (currentSeq !== notesSearchSeq) return;
        if (Array.isArray(noteRows) && noteRows.length > 0) {
          const currency = window.appSettings?.currency || '';
          const noteItems = noteRows.map((row) => {
            const amtStr = `${currency}${Number(row.amount || 0).toLocaleString('en-US')}`;
            if (row.type === 'vault') {
              return {
                icon: '📝',
                title: `#${row.voucherNo} — ${row.note}`,
                category: tr('cmd_note_vault_voucher'),
                badge: `${amtStr} • ${row.date || ''}`,
                run: () => switchTab('vault', { voucherNumber: row.voucherNo })
              };
            }
            if (row.type === 'supplier') {
              return {
                icon: '📝',
                title: `#${row.voucherNo} (${row.entityName || ''}) — ${row.note}`,
                category: tr('cmd_note_supplier_voucher'),
                badge: `${amtStr} • ${row.date || ''}`,
                run: () => switchTab('suppliers', { entityId: row.entityId, entityName: row.entityName, voucherNumber: row.voucherNo })
              };
            }
            if (row.type === 'employee') {
              return {
                icon: '📝',
                title: `#${row.voucherNo} (${row.entityName || ''}) — ${row.note}`,
                category: tr('cmd_note_employee_voucher'),
                badge: `${amtStr} • ${row.date || ''}`,
                run: () => switchTab('employees', { entityId: row.entityId, entityName: row.entityName, voucherNumber: row.voucherNo })
              };
            }
            if (row.type === 'purchases') {
              return {
                icon: '🛒',
                title: `#${row.voucherNo} — ${row.note}`,
                category: tr('cmd_note_purchase_voucher'),
                badge: `${amtStr} • ${row.date || ''}`,
                run: () => switchTab('purchases', { voucherNumber: row.voucherNo })
              };
            }
            return {
              icon: '🏛️',
              title: `#${row.voucherNo} (${row.subLabel || ''}) — ${row.note}`,
              category: tr('cmd_note_bank_voucher'),
              badge: `${amtStr} • ${row.date || ''}`,
              run: () => switchTab('banks')
            };
          });

          filtered = [...baseMatches, ...noteItems].slice(0, 22);
          activeIdx = 0;
          renderList();
        }
      } catch (err) {
        console.error('Notes search in command palette failed:', err);
      }
    }
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLuxuryCommandPalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIdx = (activeIdx + 1) % filtered.length;
        renderList();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIdx = (activeIdx - 1 + filtered.length) % filtered.length;
        renderList();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filtered[activeIdx];
      closeLuxuryCommandPalette();
      if (chosen && typeof chosen.run === 'function') chosen.run();
    }
  });
}

setupGlobalKeyboardShortcuts();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupMultiWindowListeners();
    setupGlobalKeyboardShortcuts();
  });
} else {
  setupMultiWindowListeners();
}

window.switchTab = switchTab;
window.closeAllOpenSectionWindows = closeAllOpenSectionWindows;
window.cascadeOpenSectionWindows = cascadeOpenSectionWindows;
window.ensureStandaloneLuxuryRibbon = ensureStandaloneLuxuryRibbon;
window.openLuxuryCommandPalette = openLuxuryCommandPalette;
window.closeLuxuryCommandPalette = closeLuxuryCommandPalette;
window.activateStandaloneSection = activateStandaloneSection;
window.playStandaloneDepthAnimation = playStandaloneDepthAnimation;


let currentSelectedDate = window.getLocalDateString();

async function loadState() {
  await loadStateForDate(DEFAULT_STATE.reportDate);
}

async function loadStateForDate(dateStr) {
  currentSelectedDate = dateStr;
  try {
    const cashierSelect = document.getElementById('select-report-cashier');
    const cashierName = cashierSelect ? cashierSelect.value : null;
    state = await window.api.getReportState(dateStr, cashierName, window.currentYearId); state.year_id = window.currentYearId;
  } catch (err) {
    state = {
      reportDate: dateStr, year_id: window.currentYearId,
      cashierName: document.getElementById('select-report-cashier')?.value || '',
      cashierUser: document.getElementById('input-cashier-user')?.value || '',
      cashierActual: 0,
      sales: { cash: 0, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      purchases: []
    };
  }
}

async function saveState() {
  const cashierSelect = document.getElementById('select-report-cashier');
  state.cashierName = cashierSelect ? cashierSelect.value : t('default_cashier_name');
  state.cashierUser = document.getElementById('input-cashier-user').value || t('responsible_employee_default'); state.year_id = window.currentYearId;
  await window.api.saveReportState(state);
}

async function populateAccountDropdowns(preserveSelection = true) {
  try {
    const yearId = window.currentYearId || 1;
    const rawAccounts = await window.api.getBankAccounts(yearId);
    const accounts = Array.isArray(rawAccounts) ? rawAccounts : [];

    // Sort so Cash Vault is always FIRST in the dropdown list
    const sorted = [...accounts].sort((a, b) => {
      const aCash = (a.is_cash_vault === 1 || a.is_cash_vault === true) ? 1 : 0;
      const bCash = (b.is_cash_vault === 1 || b.is_cash_vault === true) ? 1 : 0;
      if (aCash !== bCash) return bCash - aCash;
      return (a.id || 0) - (b.id || 0);
    });

    const cashVault = sorted.find(a => a.is_cash_vault === 1 || a.is_cash_vault === true) || sorted[0] || null;
    const cashVaultId = cashVault ? String(cashVault.id) : 'cash';
    window.defaultCashVaultAccountId = cashVaultId;

    let optionsHtml = '';
    if (sorted.length === 0) {
      const fallbackName = typeof t === 'function' ? t('cash_vault_option') : 'صندوق الكاش - Cash Vault';
      optionsHtml = `<option value="cash">${window.escapeHTML ? window.escapeHTML(fallbackName) : fallbackName}</option>`;
    } else {
      sorted.forEach(acc => {
        const label = acc.bank_name || acc.name || (typeof t === 'function' ? t('cash_vault_option') : 'صندوق الكاش - Cash Vault');
        const safeLabel = window.escapeHTML ? window.escapeHTML(label) : label;
        optionsHtml += `<option value="${acc.id}">${safeLabel}</option>`;
      });
    }

    const dropdowns = document.querySelectorAll('.account-dropdown');
    dropdowns.forEach(dd => {
      const prevValue = dd.value;
      dd.disabled = false;
      dd.innerHTML = optionsHtml;
      const hasPrev = preserveSelection && prevValue && prevValue !== 'cash' && Array.from(dd.options).some(opt => opt.value === String(prevValue));
      dd.value = hasPrev ? String(prevValue) : cashVaultId;
      if (!dd.value && dd.options.length > 0) {
        dd.selectedIndex = 0;
      }
    });

    if (!window.isStandaloneWindow) {
      renderLiquidityTickerFromAccounts(sorted);
    }
  } catch (e) {
    console.error('Failed to populate account dropdowns', e);
  }
}
window.populateAccountDropdowns = populateAccountDropdowns;

// ==========================================
// EXECUTIVE SUITE: PRIVACY BLUR, CALCULATOR, LIQUIDITY TICKER & UNIVERSAL VOUCHER LOOKUP
// ==========================================

function applyVipPrivacyBlurState(enabled) {
  window.__vipPrivacyBlur = Boolean(enabled);
  document.body?.classList.toggle('vip-privacy-blur', window.__vipPrivacyBlur);
  document.documentElement.classList.toggle('vip-privacy-blur', window.__vipPrivacyBlur);
  const iconEl = document.getElementById('privacy-blur-icon');
  if (iconEl) {
    iconEl.textContent = window.__vipPrivacyBlur ? '🙈' : '👁️';
  }
  const btnEl = document.getElementById('btn-privacy-blur');
  if (btnEl) {
    btnEl.classList.toggle('active-privacy-pill', window.__vipPrivacyBlur);
  }
}

async function toggleVipPrivacyBlur() {
  const nextState = !window.__vipPrivacyBlur;
  applyVipPrivacyBlurState(nextState);
  try {
    await window.api?.notifyDataChanged?.({ type: 'privacy-blur', enabled: nextState });
  } catch (_) {}
  const tr = typeof t === 'function' ? t : (k) => k;
  alert(nextState ? tr('privacy_mode_on_toast') : tr('privacy_mode_off_toast'));
}

function getHomeCashAlertThreshold() {
  try {
    const raw = localStorage.getItem('thabit_home_cash_alert_threshold');
    if (raw !== null) {
      const saved = Number(raw);
      if (Number.isFinite(saved) && saved >= 0) return saved;
    }
  } catch (_) {}
  return 1000;
}

function renderHomeAlerts() {
  const container = document.getElementById('home-alerts');
  if (!container) return;
  const tr = typeof t === 'function' ? t : (key) => key;
  const bankData = window.__homeBankSnapshot;
  const salesData = window.__homeSalesSnapshot;
  const alerts = [];
  if (bankData?.hasCashVault && bankData.cashVaultBal < getHomeCashAlertThreshold()) {
    alerts.push({ label: tr('home_alert_low_cash'), action: () => switchTab('vault') });
  }
  (bankData?.banks || []).filter(bank => bank.balance < 0).forEach(bank => {
    alerts.push({ label: tr('home_alert_negative_bank').replace('{name}', bank.name), action: () => switchTab('banks', { accountId: bank.id }) });
  });
  const today = typeof window.getLocalDateString === 'function' ? window.getLocalDateString() : '';
  const hour = new Date().getHours();
  if (salesData?.reportDate === today && hour >= 12 && salesData.targetAmt > 0) {
    const expected = salesData.targetAmt * Math.min(1, hour / 24) * 0.7;
    if (salesData.grossSales < expected) {
      alerts.push({ label: tr('home_alert_sales_pace'), action: () => switchTab('sales') });
    }
  }
  container.replaceChildren();
  container.hidden = alerts.length === 0;
  alerts.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'home-alert';
    button.textContent = `● ${item.label}`;
    button.addEventListener('click', item.action);
    container.appendChild(button);
  });
}
window.renderHomeAlerts = renderHomeAlerts;

function openHomeAlertSettings() {
  const tr = typeof t === 'function' ? t : (key) => key;
  const value = window.prompt(tr('home_alert_settings_prompt'), String(getHomeCashAlertThreshold()));
  if (value === null) return;
  const threshold = Number(value);
  if (value.trim() === '' || !Number.isFinite(threshold) || threshold < 0) {
    window.alert(tr('home_alert_invalid_threshold'));
    return;
  }
  try { localStorage.setItem('thabit_home_cash_alert_threshold', String(threshold)); } catch (_) {}
  renderHomeAlerts();
}
window.openHomeAlertSettings = openHomeAlertSettings;

function renderLiquidityTickerFromAccounts(sortedAccounts = []) {
  const bankList = document.getElementById('home-bank-list');
  if (!bankList) return;
  const tr = typeof t === 'function' ? t : (k) => k;
  const currency = window.appSettings?.currency || '';

  let cashVaultBal = 0;
  let banksTotalBal = 0;
  const bankChips = [];

  sortedAccounts.forEach((acc) => {
    const bal = Number(acc.current_balance) || 0;
    const isCash = acc.is_cash_vault === 1 || acc.is_cash_vault === true;
    if (isCash) {
      cashVaultBal += bal;
    } else {
      banksTotalBal += bal;
      bankChips.push({
        id: acc.id,
        name: acc.bank_name || acc.name || '',
        balance: bal
      });
    }
  });

  const netLiquidity = cashVaultBal + banksTotalBal;
  window.__homeBankSnapshot = {
    hasCashVault: sortedAccounts.some(acc => acc.is_cash_vault === 1 || acc.is_cash_vault === true),
    cashVaultBal,
    banks: bankChips
  };
  renderHomeAlerts();
  window.renderHomeActionCenter?.();
  const lastUpdated = document.getElementById('home-last-updated');
  if (lastUpdated) {
    const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date());
    lastUpdated.textContent = tr('home_last_updated').replace('{time}', time);
  }
  const homeCashBalance = document.getElementById('home-cash-balance');
  if (homeCashBalance) homeCashBalance.textContent = `${currency}${cashVaultBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmt = (n) => `${currency}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const setBalance = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      const next = fmt(value);
      if (el.textContent !== next) {
        el.textContent = next;
        el.classList.remove('home-value-updated');
        void el.offsetWidth;
        el.classList.add('home-value-updated');
      }
      el.classList.toggle('negative', value < 0);
    }
  };
  setBalance('home-liquidity-cash', cashVaultBal);
  setBalance('home-liquidity-banks', banksTotalBal);
  setBalance('home-liquidity-total', netLiquidity);

  bankList.replaceChildren();
  if (!bankChips.length) {
    const empty = document.createElement('div');
    empty.className = 'home-bank-empty';
    empty.textContent = tr('home_no_bank_accounts');
    bankList.appendChild(empty);
  }
  bankChips.forEach((bank) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'home-bank-row';
    row.addEventListener('click', () => switchTab('banks', { accountId: bank.id }));
    const name = document.createElement('span');
    name.textContent = bank.name;
    const amount = document.createElement('strong');
    amount.dir = 'ltr';
    amount.textContent = fmt(bank.balance);
    amount.classList.toggle('negative', bank.balance < 0);
    row.append(name, amount);
    bankList.appendChild(row);
  });
}

async function refreshLiquidityTicker() {
  if (window.isStandaloneWindow || !window.api?.getBankAccounts) return;
  const bankList = document.getElementById('home-bank-list');
  if (bankList && !bankList.children.length) bankList.textContent = t('loading');
  bankList?.setAttribute('aria-busy', 'true');
  try {
    const yearId = window.currentYearId || 1;
    const rawAccounts = await window.api.getBankAccounts(yearId);
    const accounts = Array.isArray(rawAccounts) ? rawAccounts : [];
    const sorted = [...accounts].sort((a, b) => {
      const aCash = (a.is_cash_vault === 1 || a.is_cash_vault === true) ? 1 : 0;
      const bCash = (b.is_cash_vault === 1 || b.is_cash_vault === true) ? 1 : 0;
      if (aCash !== bCash) return bCash - aCash;
      return (a.id || 0) - (b.id || 0);
    });
    renderLiquidityTickerFromAccounts(sorted);
  } catch (e) {
    console.error('Failed to refresh liquidity ticker:', e);
    if (bankList) bankList.textContent = t('home_banks_load_error');
  } finally {
    bankList?.removeAttribute('aria-busy');
  }
}

async function lookupUniversalVoucherByNumber(voucherNum) {
  const tr = typeof t === 'function' ? t : (k) => k;
  const yearId = window.currentYearId || 1;
  const vNo = Number(voucherNum);
  if (!Number.isFinite(vNo)) return;

  try {
    const [salesRep, expRep, supTx, empTx] = await Promise.all([
      window.api?.getReportByVoucherNumber ? window.api.getReportByVoucherNumber(vNo, yearId).catch(() => null) : null,
      window.api?.getExpenseReportByVoucherNumber ? window.api.getExpenseReportByVoucherNumber(vNo, yearId).catch(() => null) : null,
      window.api?.getSupplierTransactionByVoucher ? window.api.getSupplierTransactionByVoucher(String(vNo), yearId).catch(() => null) : null,
      window.api?.getEmployeeTransactionById ? window.api.getEmployeeTransactionById(vNo).catch(() => null) : null
    ]);

    if (salesRep && salesRep.reportDate && salesRep.success !== false) {
      alert(`${tr('cmd_voucher_sales_found')} #${vNo} (${salesRep.reportDate})`);
      await switchTab('sales', { voucherNumber: vNo });
      return;
    }
    if (expRep && (expRep.reportDate || expRep.report_date) && expRep.success !== false) {
      const dt = expRep.reportDate || expRep.report_date;
      alert(`${tr('cmd_voucher_expense_found')} #${vNo} (${dt})`);
      await switchTab('purchases', { voucherNumber: vNo });
      return;
    }
    if (supTx && supTx.supplier_id) {
      alert(`${tr('cmd_voucher_supplier_found')} #${vNo}`);
      await switchTab('suppliers', { entityId: supTx.supplier_id });
      return;
    }
    if (empTx && empTx.employee_id && Number(empTx.year_id || yearId) === Number(yearId)) {
      alert(`${tr('cmd_voucher_employee_found')} #${vNo}`);
      await switchTab('employees', { entityId: empTx.employee_id });
      return;
    }

    alert(tr('cmd_voucher_not_found'));
  } catch (err) {
    console.error('Universal voucher lookup error:', err);
  }
}

let calcExpr = '';
let calcHistory = [];
let calcPos = { left: 24, bottom: 24 };

try {
  const initialCalc = JSON.parse(localStorage.getItem('thabit_exec_calc_state') || 'null');
  if (initialCalc && typeof initialCalc === 'object') {
    if (typeof initialCalc.expr === 'string') calcExpr = initialCalc.expr;
    if (Array.isArray(initialCalc.history)) calcHistory = initialCalc.history;
    if (initialCalc.pos && Number.isFinite(initialCalc.pos.left) && Number.isFinite(initialCalc.pos.bottom)) {
      calcPos = initialCalc.pos;
    }
  }
} catch (_) {}

function broadcastCalculatorState(isOpen) {
  const payload = {
    type: 'calc-sync',
    isOpen: Boolean(isOpen),
    expr: calcExpr,
    history: calcHistory.slice(-6),
    pos: calcPos
  };
  try {
    localStorage.setItem('thabit_exec_calc_state', JSON.stringify(payload));
  } catch (_) {}
  try {
    window.api?.notifyDataChanged?.(payload);
  } catch (_) {}
}

function applyRemoteCalculatorState(info) {
  if (!info) return;
  if (typeof info.expr === 'string') calcExpr = info.expr;
  if (Array.isArray(info.history)) calcHistory = info.history;
  if (info.pos && Number.isFinite(info.pos.left) && Number.isFinite(info.pos.bottom)) {
    calcPos = info.pos;
  }
  if (info.isOpen) {
    mountExecutiveCalculatorWidget(false);
  } else {
    document.getElementById('executive-calc-widget')?.remove();
  }
}

function evaluateSafeMathExpression(expr) {
  const sanitized = String(expr || '').replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/.%() ]/g, '').trim();
  if (!sanitized) return 0;
  try {
    // Safe recursive-descent / Shunting-Yard evaluator (no eval / no new Function)
    const tokens = sanitized.match(/(\d+\.?\d*|\.\d+|[+\-*/%()])/g);
    if (!tokens || tokens.length === 0) return 0;

    const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };
    const values = [];
    const ops = [];

    const applyOp = () => {
      const op = ops.pop();
      const b = values.pop() ?? 0;
      const a = values.pop() ?? 0;
      if (op === '+') values.push(a + b);
      else if (op === '-') values.push(a - b);
      else if (op === '*') values.push(a * b);
      else if (op === '/') values.push(b === 0 ? 0 : a / b);
      else if (op === '%') values.push(b === 0 ? 0 : a % b);
    };

    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i];
      if (/^\d|\./.test(tk)) {
        values.push(parseFloat(tk));
      } else if (tk === '(') {
        ops.push(tk);
      } else if (tk === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') applyOp();
        if (ops.length && ops[ops.length - 1] === '(') ops.pop();
      } else if (prec[tk]) {
        // Handle unary minus at start or after '(' or operator
        if (tk === '-' && (i === 0 || tokens[i - 1] === '(' || prec[tokens[i - 1]])) {
          values.push(0);
        }
        while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[tk]) {
          applyOp();
        }
        ops.push(tk);
      }
    }

    while (ops.length) {
      if (ops[ops.length - 1] === '(') { ops.pop(); continue; }
      applyOp();
    }

    const res = Number(values.pop() ?? 0);
    return Number.isFinite(res) ? Math.round(res * 10000) / 10000 : 0;
  } catch (_) {
    return null;
  }
}

function toggleExecutiveCalculator() {
  const existing = document.getElementById('executive-calc-widget');
  if (existing) {
    existing.remove();
    broadcastCalculatorState(false);
    return;
  }
  mountExecutiveCalculatorWidget(true);
}

function mountExecutiveCalculatorWidget(shouldBroadcast = false) {
  let widget = document.getElementById('executive-calc-widget');
  const tr = typeof t === 'function' ? t : (k) => k;
  const esc = window.escapeHTML || ((v) => String(v ?? ''));

  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'executive-calc-widget';
    widget.className = 'executive-calc-widget no-print';
    widget.style.left = `${Math.max(8, Math.min(window.innerWidth - 300, calcPos.left || 24))}px`;
    widget.style.bottom = `${Math.max(8, Math.min(window.innerHeight - 360, calcPos.bottom || 24))}px`;
    widget.innerHTML = `
      <div class="exec-calc-header" id="exec-calc-drag-handle" style="cursor: move;">
        <span class="exec-calc-title">⠿ ${esc(tr('calc_title'))}</span>
        <button type="button" class="exec-calc-close" onclick="toggleExecutiveCalculator()">×</button>
      </div>
      <div class="exec-calc-tape" id="exec-calc-tape" dir="ltr"></div>
      <div class="exec-calc-screen" dir="ltr">
        <div class="exec-calc-expr" id="exec-calc-expr">0</div>
        <div class="exec-calc-result" id="exec-calc-result">= 0</div>
      </div>
      <div class="exec-calc-toolbar">
        <button type="button" class="exec-calc-tool-btn" id="btn-calc-copy">${esc(tr('calc_copy_btn'))}</button>
        <button type="button" class="exec-calc-tool-btn gold" id="btn-calc-paste">${esc(tr('calc_paste_btn'))}</button>
      </div>
      <div class="exec-calc-grid" dir="ltr">
        <button type="button" data-k="C" class="calc-k danger">${esc(tr('calc_clear_btn'))}</button>
        <button type="button" data-k="(" class="calc-k op">(</button>
        <button type="button" data-k=")" class="calc-k op">)</button>
        <button type="button" data-k="÷" class="calc-k op">÷</button>
        <button type="button" data-k="7" class="calc-k">7</button>
        <button type="button" data-k="8" class="calc-k">8</button>
        <button type="button" data-k="9" class="calc-k">9</button>
        <button type="button" data-k="×" class="calc-k op">×</button>
        <button type="button" data-k="4" class="calc-k">4</button>
        <button type="button" data-k="5" class="calc-k">5</button>
        <button type="button" data-k="6" class="calc-k">6</button>
        <button type="button" data-k="-" class="calc-k op">−</button>
        <button type="button" data-k="1" class="calc-k">1</button>
        <button type="button" data-k="2" class="calc-k">2</button>
        <button type="button" data-k="3" class="calc-k">3</button>
        <button type="button" data-k="+" class="calc-k op">+</button>
        <button type="button" data-k="0" class="calc-k">0</button>
        <button type="button" data-k="00" class="calc-k">00</button>
        <button type="button" data-k="." class="calc-k">.</button>
        <button type="button" data-k="=" class="calc-k eq">=</button>
      </div>
    `;

    document.body.appendChild(widget);

    // Enable smooth drag-and-drop by the header
    const dragHandle = document.getElementById('exec-calc-drag-handle');
    if (dragHandle) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startLeft = 24;
      let startBottom = 24;

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const nextLeft = Math.max(8, Math.min(window.innerWidth - widget.offsetWidth - 8, startLeft + dx));
        const nextBottom = Math.max(8, Math.min(window.innerHeight - widget.offsetHeight - 8, startBottom - dy));
        calcPos = { left: nextLeft, bottom: nextBottom };
        widget.style.left = `${nextLeft}px`;
        widget.style.bottom = `${nextBottom}px`;
      };

      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        broadcastCalculatorState(true);
      };

      dragHandle.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        startLeft = rect.left;
        startBottom = window.innerHeight - rect.bottom;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    widget.querySelectorAll('.calc-k').forEach((btn) => {
      btn.addEventListener('click', () => {
        playLuxurySound('tick');
        const k = btn.dataset.k;
        if (k === 'C') {
          calcExpr = '';
        } else if (k === '=') {
          const val = evaluateSafeMathExpression(calcExpr);
          if (val !== null && calcExpr) {
            calcHistory.push(`${calcExpr} = ${val.toLocaleString('en-US')}`);
            calcExpr = String(val);
          }
        } else {
          calcExpr += k;
        }
        syncExecutiveCalculatorScreen();
        broadcastCalculatorState(true);
      });
    });

    document.getElementById('btn-calc-copy')?.addEventListener('click', () => {
      const val = evaluateSafeMathExpression(calcExpr) ?? 0;
      navigator.clipboard?.writeText(String(val)).catch(() => {});
      alert(tr('calc_copied_toast'));
    });

    document.getElementById('btn-calc-paste')?.addEventListener('click', () => {
      const val = evaluateSafeMathExpression(calcExpr) ?? 0;
      const targetInput = window.__lastFocusedAppInput;
      if (targetInput && document.body.contains(targetInput) && !targetInput.disabled && !targetInput.readOnly) {
        targetInput.value = String(val);
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        targetInput.focus();
        alert(tr('calc_pasted_toast'));
      } else {
        navigator.clipboard?.writeText(String(val)).catch(() => {});
        alert(tr('calc_copied_toast'));
      }
    });
  }

  syncExecutiveCalculatorScreen();
  if (shouldBroadcast) {
    broadcastCalculatorState(true);
  }
}

function syncExecutiveCalculatorScreen() {
  const esc = window.escapeHTML || ((v) => String(v ?? ''));
  const exprEl = document.getElementById('exec-calc-expr');
  const resEl = document.getElementById('exec-calc-result');
  const tapeEl = document.getElementById('exec-calc-tape');
  if (exprEl) exprEl.textContent = calcExpr || '0';
  const val = evaluateSafeMathExpression(calcExpr);
  if (resEl) {
    resEl.textContent = val !== null ? `= ${val.toLocaleString('en-US')}` : '...';
  }
  if (tapeEl) {
    tapeEl.innerHTML = calcHistory.slice(-4).map(h => `<div class="tape-row">${esc(h)}</div>`).join('');
  }
}

window.toggleVipPrivacyBlur = toggleVipPrivacyBlur;
window.toggleExecutiveCalculator = toggleExecutiveCalculator;
window.refreshLiquidityTicker = refreshLiquidityTicker;
window.lookupUniversalVoucherByNumber = lookupUniversalVoucherByNumber;

// ==========================================
// ROYAL INTELLIGENCE SUITE (PACK 4):
// 1) SUBTLE WEB AUDIO FX
// 2) FLOATING ROYAL STICKY NOTES & REMINDERS (F11)
// 3) ONE-CLICK DATE RANGE PRESETS BAR
// 4) VIP QUICK SESSION LOCK SCREEN (Ctrl+L)
// ==========================================

let luxuryAudioCtx = null;
try {
  window.__luxuryAudioMuted = localStorage.getItem('thabit_luxury_audio_muted') === '1';
} catch (_) {
  window.__luxuryAudioMuted = false;
}

function applyLuxuryAudioMuteState(muted) {
  window.__luxuryAudioMuted = Boolean(muted);
  try {
    localStorage.setItem('thabit_luxury_audio_muted', window.__luxuryAudioMuted ? '1' : '0');
  } catch (_) {}
  const iconEl = document.getElementById('audio-fx-icon');
  if (iconEl) iconEl.textContent = window.__luxuryAudioMuted ? '🔇' : '🔊';
  const ribbonBtn = document.getElementById('ribbon-audio-fx-btn');
  if (ribbonBtn) ribbonBtn.textContent = window.__luxuryAudioMuted ? '🔇' : '🔊';
}

function playLuxurySound(kind = 'tick') {
  if (window.__luxuryAudioMuted) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!luxuryAudioCtx) luxuryAudioCtx = new AudioCtx();
    if (luxuryAudioCtx.state === 'suspended') {
      luxuryAudioCtx.resume().catch(() => {});
    }
    const now = luxuryAudioCtx.currentTime;
    const osc = luxuryAudioCtx.createOscillator();
    const gain = luxuryAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(luxuryAudioCtx.destination);

    if (kind === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.035);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (kind === 'lock') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.14);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // Soft royal chime for notifications / saves
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.065); // A5
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.23);
    }
  } catch (_) {}
}

async function toggleLuxuryAudioFx() {
  const nextMuted = !window.__luxuryAudioMuted;
  applyLuxuryAudioMuteState(nextMuted);
  try {
    await window.api?.notifyDataChanged?.({ type: 'audio-fx-sync', muted: nextMuted });
  } catch (_) {}
  const tr = typeof t === 'function' ? t : (k) => k;
  alert(nextMuted ? tr('audio_fx_off_toast') : tr('audio_fx_on_toast'));
}

// 2. Floating Royal Sticky Notes & Reminders (F11) with Structured Cards & Realtime Cloud Mobile Sync
let stickyNotesList = [];
let stickyNotesText = '';
let stickyNotesPos = { right: 24, bottom: 24 };
let stickyNotesActiveTab = 'all';
let stickyNotesFontSize = 13;
let stickyNotesSearchQuery = '';
const FIREBASE_RTDB_NOTES_URL = 'https://thabit-2d72c-default-rtdb.firebaseio.com/notes';
let cloudNotesDebounceTimer = null;
let isSyncingToCloud = false;

function formatStickyTimeLabel(ts) {
  const d = ts ? new Date(ts) : new Date();
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ar-SA') + ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function syncLegacyStickyTextFromList() {
  stickyNotesText = stickyNotesList.map(item => item.text).join('\n');
}

function getPhonePairingPin() {
  let pin = localStorage.getItem('thabit_mobile_notes_pin');
  if (!pin) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    pin = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    try {
      localStorage.setItem('thabit_mobile_notes_pin', pin);
    } catch (_) {}
  }
  return pin;
}

try {
  const savedNotes = JSON.parse(localStorage.getItem('thabit_royal_sticky_notes') || 'null');
  if (savedNotes && typeof savedNotes === 'object') {
    if (Array.isArray(savedNotes.items)) {
      stickyNotesList = savedNotes.items;
    } else if (typeof savedNotes.text === 'string' && savedNotes.text.trim()) {
      stickyNotesList = savedNotes.text.split('\n').map(s => s.trim()).filter(Boolean).map((line, idx) => ({
        id: 'note_' + Date.now() + '_' + idx,
        text: line,
        category: 'general',
        createdAt: formatStickyTimeLabel(),
        done: false
      }));
    }
    syncLegacyStickyTextFromList();
    if (savedNotes.pos && Number.isFinite(savedNotes.pos.right) && Number.isFinite(savedNotes.pos.bottom)) {
      stickyNotesPos = savedNotes.pos;
    }
  }
} catch (_) {}

async function pullCloudNotes() {
  try {
    const pin = getPhonePairingPin();
    const res = await fetch(`${FIREBASE_RTDB_NOTES_URL}/${encodeURIComponent(pin)}.json`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;

    let incomingItems = null;
    if (Array.isArray(data.items)) {
      incomingItems = data.items;
    } else if (typeof data.text === 'string' && data.text.trim()) {
      incomingItems = data.text.split('\n').map(s => s.trim()).filter(Boolean).map((line, idx) => ({
        id: 'cloud_' + idx,
        text: line,
        category: 'general',
        createdAt: formatStickyTimeLabel(data.updatedAt),
        done: false
      }));
    } else if (data.text === '' && (!data.items || data.items.length === 0)) {
      incomingItems = [];
    }

    if (incomingItems && JSON.stringify(incomingItems) !== JSON.stringify(stickyNotesList)) {
      stickyNotesList = incomingItems;
      syncLegacyStickyTextFromList();
      renderStickyNoteCardsList();
      broadcastStickyNotesState(Boolean(document.getElementById('royal-sticky-notes-widget')), false);
      const statusEl = document.getElementById('royal-sticky-status');
      if (statusEl && typeof t === 'function') {
        statusEl.textContent = t('sticky_phone_sync_ready');
      }
    }
  } catch (_) {}
}

async function pushCloudNotes() {
  if (isSyncingToCloud) return;
  isSyncingToCloud = true;
  const statusEl = document.getElementById('royal-sticky-status');
  if (statusEl && typeof t === 'function') statusEl.textContent = t('sticky_phone_sync_saving');
  try {
    const pin = getPhonePairingPin();
    syncLegacyStickyTextFromList();
    await fetch(`${FIREBASE_RTDB_NOTES_URL}/${encodeURIComponent(pin)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: stickyNotesList,
        text: stickyNotesText || '',
        updatedAt: Date.now(),
        source: 'desktop'
      })
    });
    if (statusEl && typeof t === 'function') statusEl.textContent = t('sticky_notes_saved');
  } catch (_) {
    if (statusEl && typeof t === 'function') statusEl.textContent = t('sticky_notes_saved');
  } finally {
    isSyncingToCloud = false;
  }
}

// Cloud sync poller every 3.5 seconds
setInterval(pullCloudNotes, 3500);

function broadcastStickyNotesState(isOpen, syncToCloud = true) {
  syncLegacyStickyTextFromList();
  const payload = {
    type: 'sticky-notes-sync',
    isOpen: Boolean(isOpen),
    items: stickyNotesList,
    text: stickyNotesText,
    pos: stickyNotesPos
  };
  try {
    localStorage.setItem('thabit_royal_sticky_notes', JSON.stringify(payload));
  } catch (_) {}
  try {
    window.api?.notifyDataChanged?.(payload);
  } catch (_) {}

  if (syncToCloud) {
    clearTimeout(cloudNotesDebounceTimer);
    cloudNotesDebounceTimer = setTimeout(() => {
      pushCloudNotes();
    }, 500);
  }
}

function applyRemoteStickyNotesState(info) {
  if (!info) return;
  if (Array.isArray(info.items)) {
    stickyNotesList = info.items;
    syncLegacyStickyTextFromList();
  } else if (typeof info.text === 'string') {
    stickyNotesText = info.text;
  }
  if (info.pos && Number.isFinite(info.pos.right) && Number.isFinite(info.pos.bottom)) {
    stickyNotesPos = info.pos;
  }
  if (info.isOpen) {
    mountRoyalStickyNotesWidget(false);
    renderStickyNoteCardsList();
  } else {
    document.getElementById('royal-sticky-notes-widget')?.remove();
  }
}

function toggleRoyalStickyNotes() {
  playLuxurySound('tick');
  const existing = document.getElementById('royal-sticky-notes-widget');
  if (existing) {
    existing.remove();
    broadcastStickyNotesState(false, false);
    return;
  }
  mountRoyalStickyNotesWidget(true);
}

function showPhoneNotesPairingModal() {
  playLuxurySound('tick');
  const tr = typeof t === 'function' ? t : (k) => k;
  const esc = window.escapeHTML || ((v) => String(v ?? ''));
  const pin = getPhonePairingPin();

  const existing = document.getElementById('phone-notes-modal-overlay');
  if (existing) existing.remove();

  const currentFullUrl = 'https://magnificent-custard-a45c99.netlify.app/?pin=' + encodeURIComponent(pin);

  const overlay = document.createElement('div');
  overlay.id = 'phone-notes-modal-overlay';
  overlay.className = 'luxury-cmd-overlay no-print';
  overlay.style.zIndex = '999999';
  overlay.innerHTML = `
    <div class="quick-peek-drawer phone-qr-card" style="max-width: 440px; padding: 0;">
      <div class="quick-peek-header">
        <span class="quick-peek-title">${esc(tr('sticky_phone_modal_title'))}</span>
        <button type="button" class="exec-calc-close" id="btn-close-phone-notes">×</button>
      </div>
      <div class="quick-peek-body" style="text-align: center; gap: 14px; padding: 18px 24px;">
        <p style="font-size: 13px; color: var(--muted); line-height: 1.6;">${esc(tr('sticky_phone_scan_hint'))}</p>
        <div id="phone-notes-qrcode-target" class="phone-qr-box"></div>
        <div>
          <span style="font-size: 11.5px; color: var(--muted); display: block;">${esc(tr('sticky_phone_pin_label'))}</span>
          <span class="phone-pin-pill">${esc(pin)}</span>
        </div>
        <div id="phone-notes-url-box" style="background: rgba(0,0,0,0.25); border-radius: 8px; padding: 8px 10px; font-size: 11px; color: var(--muted); word-break: break-all; margin-top: 4px;" dir="ltr">
          ${esc(currentFullUrl)}
        </div>
        <p style="font-size: 12px; color: var(--muted); margin-top: 4px;">${esc(tr('sticky_phone_connected_desc'))}</p>
      </div>
      <div class="quick-peek-footer" style="justify-content: space-between;">
        <button type="button" class="btn-outline" id="btn-copy-phone-url">${esc(tr('sticky_phone_copy_btn'))}</button>
        <button type="button" class="btn-submit" id="btn-done-phone-notes">${esc(tr('quick_peek_close_btn'))}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const renderQr = (urlText) => {
    const qrTarget = document.getElementById('phone-notes-qrcode-target');
    if (!qrTarget) return;
    qrTarget.innerHTML = '';
    if (typeof QRCode === 'function') {
      try {
        new QRCode(qrTarget, {
          text: urlText,
          width: 180,
          height: 180,
          colorDark: '#2a1010',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (_) {}
    }
  };

  renderQr(currentFullUrl);

  const closeFn = () => overlay.remove();
  document.getElementById('btn-close-phone-notes')?.addEventListener('click', closeFn);
  document.getElementById('btn-done-phone-notes')?.addEventListener('click', closeFn);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeFn();
  });

  document.getElementById('btn-copy-phone-url')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(currentFullUrl).then(() => {
      alert(tr('sticky_phone_copied_toast'));
    }).catch(() => {});
  });
}

function getStickyCategoryBadgeLabel(cat) {
  const tr = typeof t === 'function' ? t : (k) => k;
  if (cat === 'tasks') return tr('sticky_tab_tasks');
  if (cat === 'purchases') return tr('sticky_tab_purchases');
  return tr('sticky_tab_general');
}

function renderStickyNoteCardsList() {
  const container = document.getElementById('sticky-cards-list');
  if (!container) return;
  const tr = typeof t === 'function' ? t : (k) => k;
  const esc = window.escapeHTML || ((v) => String(v ?? ''));

  const q = stickyNotesSearchQuery.toLowerCase().trim();
  const filtered = stickyNotesList.filter(item => {
    if (stickyNotesActiveTab !== 'all' && item.category !== stickyNotesActiveTab) return false;
    if (q && !String(item.text || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const countEl = document.getElementById('sticky-char-count');
  if (countEl) {
    countEl.textContent = filtered.length + ' ' + tr('sticky_count_cards_label');
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="sticky-empty-state">${esc(tr('sticky_notes_empty_list'))}</div>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="sticky-note-card ${item.done ? 'is-done' : ''}" data-cat="${esc(item.category || 'general')}" data-id="${esc(item.id)}">
      <div class="sticky-note-card-top">
        <div class="sticky-note-card-text" style="font-size: ${stickyNotesFontSize}px;">${esc(item.text)}</div>
        <div class="sticky-note-card-actions">
          <button type="button" class="sticky-card-action-btn done-btn" data-id="${esc(item.id)}" title="${esc(tr('sticky_note_done_title'))}">${item.done ? '↩️' : '✓'}</button>
          <button type="button" class="sticky-card-action-btn del" data-id="${esc(item.id)}" title="${esc(tr('sticky_note_delete_title'))}">🗑️</button>
        </div>
      </div>
      <div class="sticky-note-card-meta">
        <span class="sticky-note-cat-badge">${esc(getStickyCategoryBadgeLabel(item.category))}</span>
        <span dir="ltr">${esc(item.createdAt || '')}</span>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.done-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const target = stickyNotesList.find(n => String(n.id) === String(id));
      if (target) {
        target.done = !target.done;
        playLuxurySound('tick');
        renderStickyNoteCardsList();
        broadcastStickyNotesState(true, true);
      }
    });
  });

  container.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      stickyNotesList = stickyNotesList.filter(n => String(n.id) !== String(id));
      playLuxurySound('tick');
      renderStickyNoteCardsList();
      broadcastStickyNotesState(true, true);
    });
  });
}

function addNewStickyNoteCard() {
  const inp = document.getElementById('sticky-new-note-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;

  const newCat = stickyNotesActiveTab === 'all' ? 'general' : stickyNotesActiveTab;
  stickyNotesList.unshift({
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    text,
    category: newCat,
    createdAt: formatStickyTimeLabel(),
    done: false
  });
  inp.value = '';
  playLuxurySound('chime');
  renderStickyNoteCardsList();
  broadcastStickyNotesState(true, true);
}

function mountRoyalStickyNotesWidget(shouldBroadcast = false) {
  let widget = document.getElementById('royal-sticky-notes-widget');
  const tr = typeof t === 'function' ? t : (k) => k;
  const esc = window.escapeHTML || ((v) => String(v ?? ''));

  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'royal-sticky-notes-widget';
    widget.className = 'royal-sticky-widget no-print';
    widget.style.right = `${Math.max(8, Math.min(window.innerWidth - 410, stickyNotesPos.right || 24))}px`;
    widget.style.bottom = `${Math.max(8, Math.min(window.innerHeight - 420, stickyNotesPos.bottom || 24))}px`;
    widget.innerHTML = `
      <div class="royal-sticky-header" id="royal-sticky-drag-handle" style="cursor: move;">
        <span class="royal-sticky-title">⠿ ${esc(tr('sticky_notes_title'))}</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" class="royal-sticky-phone-btn" id="btn-phone-notes-sync" onclick="showPhoneNotesPairingModal()" title="${esc(tr('sticky_phone_sync_btn'))}">${esc(tr('sticky_phone_sync_btn'))}</button>
          <button type="button" class="royal-sticky-close" onclick="toggleRoyalStickyNotes()">×</button>
        </div>
      </div>
      <div class="royal-sticky-tools">
        <button type="button" class="sticky-tab-pill ${stickyNotesActiveTab === 'all' ? 'active' : ''}" data-cat="all">${esc(tr('sticky_tab_all'))}</button>
        <button type="button" class="sticky-tab-pill ${stickyNotesActiveTab === 'tasks' ? 'active' : ''}" data-cat="tasks">${esc(tr('sticky_tab_tasks'))}</button>
        <button type="button" class="sticky-tab-pill ${stickyNotesActiveTab === 'purchases' ? 'active' : ''}" data-cat="purchases">${esc(tr('sticky_tab_purchases'))}</button>
        <button type="button" class="sticky-tab-pill ${stickyNotesActiveTab === 'general' ? 'active' : ''}" data-cat="general">${esc(tr('sticky_tab_general'))}</button>
        <div style="margin-right: auto; display: flex; align-items: center; gap: 4px;">
          <button type="button" class="sticky-btn-tool" id="btn-sticky-font-inc" title="${esc(tr('sticky_btn_font_inc'))}">${esc(tr('sticky_btn_font_inc'))}</button>
          <button type="button" class="sticky-btn-tool" id="btn-sticky-font-dec" title="${esc(tr('sticky_btn_font_dec'))}">${esc(tr('sticky_btn_font_dec'))}</button>
        </div>
      </div>
      <div class="royal-sticky-body">
        <div class="sticky-add-row">
          <input type="text" id="sticky-new-note-input" class="sticky-add-input" placeholder="${esc(tr('sticky_add_note_placeholder'))}" />
          <button type="button" id="btn-add-sticky-card" class="sticky-add-btn">${esc(tr('sticky_add_note_btn'))}</button>
        </div>
        <input type="text" id="sticky-notes-search" class="sticky-search-input" placeholder="${esc(tr('sticky_notes_search_placeholder'))}" />
        <div id="sticky-cards-list" class="sticky-cards-container"></div>
      </div>
      <div class="royal-sticky-footer">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="royal-sticky-status" id="royal-sticky-status">${esc(tr('sticky_notes_saved'))}</span>
          <span id="sticky-char-count" style="font-size: 10.5px; color: var(--muted); font-weight: 700;">0 ${esc(tr('sticky_count_cards_label'))}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" class="sticky-btn-tool" id="btn-sticky-export" title="${esc(tr('sticky_export_btn'))}">${esc(tr('sticky_export_btn'))}</button>
          <button type="button" class="royal-sticky-clear-btn" id="btn-clear-sticky-notes">${esc(tr('sticky_notes_clear'))}</button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);

    renderStickyNoteCardsList();

    document.getElementById('btn-add-sticky-card')?.addEventListener('click', addNewStickyNoteCard);
    document.getElementById('sticky-new-note-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addNewStickyNoteCard();
      }
    });

    // Font size controls
    document.getElementById('btn-sticky-font-inc')?.addEventListener('click', () => {
      stickyNotesFontSize = Math.min(18, stickyNotesFontSize + 1);
      renderStickyNoteCardsList();
    });
    document.getElementById('btn-sticky-font-dec')?.addEventListener('click', () => {
      stickyNotesFontSize = Math.max(11, stickyNotesFontSize - 1);
      renderStickyNoteCardsList();
    });

    // Export text
    document.getElementById('btn-sticky-export')?.addEventListener('click', () => {
      const exportContent = stickyNotesList.map((n, i) => `${i + 1}. [${getStickyCategoryBadgeLabel(n.category)}] ${n.text} (${n.createdAt || ''})`).join('\n');
      const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'thabit_notes_' + (new Date().toISOString().slice(0, 10)) + '.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    // Category filter pills
    widget.querySelectorAll('.sticky-tab-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        widget.querySelectorAll('.sticky-tab-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        stickyNotesActiveTab = btn.dataset.cat;
        renderStickyNoteCardsList();
      });
    });

    // Search filter
    document.getElementById('sticky-notes-search')?.addEventListener('input', (e) => {
      stickyNotesSearchQuery = e.target.value || '';
      renderStickyNoteCardsList();
    });

    const dragHandle = document.getElementById('royal-sticky-drag-handle');
    if (dragHandle) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startRight = 24;
      let startBottom = 24;

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const nextRight = Math.max(8, Math.min(window.innerWidth - widget.offsetWidth - 8, startRight - dx));
        const nextBottom = Math.max(8, Math.min(window.innerHeight - widget.offsetHeight - 8, startBottom - dy));
        stickyNotesPos = { right: nextRight, bottom: nextBottom };
        widget.style.right = `${nextRight}px`;
        widget.style.bottom = `${nextBottom}px`;
      };

      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        broadcastStickyNotesState(true, false);
      };

      dragHandle.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        startRight = window.innerWidth - rect.right;
        startBottom = window.innerHeight - rect.bottom;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    document.getElementById('btn-clear-sticky-notes')?.addEventListener('click', () => {
      stickyNotesList = [];
      syncLegacyStickyTextFromList();
      renderStickyNoteCardsList();
      broadcastStickyNotesState(true, true);
    });
  } else {
    renderStickyNoteCardsList();
  }

  if (shouldBroadcast) {
    broadcastStickyNotesState(true, false);
  }
}


// 3. One-Click Date Presets Bar
const DATE_PRESET_PAIRS = [
  { fromId: 'vault-start-date', toId: 'vault-end-date', triggerFn: () => { if (typeof fetchVaultReports === 'function') fetchVaultReports(); } },
  { fromId: 'vault-vouchers-from', toId: 'vault-vouchers-to', triggerFn: () => { if (typeof applyVaultVoucherPeriod === 'function') applyVaultVoucherPeriod(); } },
  { fromId: 'sales-print-from', toId: 'sales-print-to', triggerFn: null },
  { fromId: 'expenses-print-from', toId: 'expenses-print-to', triggerFn: null },
  { fromId: 'sup-print-from', toId: 'sup-print-to', triggerFn: null },
  { fromId: 'emp-print-from', toId: 'emp-print-to', triggerFn: null },
  { fromId: 'dash-start-date', toId: 'dash-end-date', triggerFn: () => { if (typeof loadDashboardData === 'function') loadDashboardData(); } }
];

function computePresetDateRange(presetKey) {
  const now = new Date();
  const fmt = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  if (presetKey === 'today') {
    const s = fmt(now);
    return { from: s, to: s };
  }
  if (presetKey === 'yesterday') {
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const s = fmt(y);
    return { from: s, to: s };
  }
  if (presetKey === 'this_week') {
    const day = now.getDay(); // 0 Sun .. 6 Sat
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    return { from: fmt(start), to: fmt(now) };
  }
  if (presetKey === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start), to: fmt(now) };
  }
  if (presetKey === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(start), to: fmt(end) };
  }
  const s = fmt(now);
  return { from: s, to: s };
}

function mountLuxuryDatePresets() {
  const tr = typeof t === 'function' ? t : (k) => k;
  const presets = [
    { key: 'today', i18nKey: 'preset_today' },
    { key: 'yesterday', i18nKey: 'preset_yesterday' },
    { key: 'this_week', i18nKey: 'preset_this_week' },
    { key: 'this_month', i18nKey: 'preset_this_month' },
    { key: 'last_month', i18nKey: 'preset_last_month' }
  ];

  DATE_PRESET_PAIRS.forEach((pair) => {
    const fromEl = document.getElementById(pair.fromId);
    const toEl = document.getElementById(pair.toId);
    if (!fromEl || !toEl) return;

    const container = fromEl.closest('.vault-period-grid, .vault-vouchers-actions, .sales-history-filters, .purchases-history-filters, .supplier-statement-filters, .employee-statement-filters, .dashboard-filters');
    if (!container || container.dataset.presetsMounted === '1') return;
    container.dataset.presetsMounted = '1';

    const bar = document.createElement('div');
    bar.className = 'luxury-date-presets no-print';
    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-preset-pill';
      btn.dataset.presetKey = p.key;
      btn.dataset.i18nKey = p.i18nKey;
      btn.textContent = `⚡ ${tr(p.i18nKey)}`;
      btn.addEventListener('click', () => {
        playLuxurySound('tick');
        const range = computePresetDateRange(p.key);
        fromEl.value = range.from;
        toEl.value = range.to;
        fromEl.dispatchEvent(new Event('input', { bubbles: true }));
        fromEl.dispatchEvent(new Event('change', { bubbles: true }));
        toEl.dispatchEvent(new Event('input', { bubbles: true }));
        toEl.dispatchEvent(new Event('change', { bubbles: true }));
        bar.querySelectorAll('.date-preset-pill').forEach(b => b.classList.toggle('active', b === btn));
        if (typeof pair.triggerFn === 'function') {
          pair.triggerFn();
        }
      });
      bar.appendChild(btn);
    });

    container.parentElement?.insertBefore(bar, container);
  });
}

function refreshLuxuryDatePresetsLabels() {
  const tr = typeof t === 'function' ? t : (k) => k;
  document.querySelectorAll('.date-preset-pill').forEach((btn) => {
    const i18nKey = btn.dataset.i18nKey;
    if (i18nKey) {
      btn.textContent = `⚡ ${tr(i18nKey)}`;
    }
  });
}

// 4. VIP Quick Session Lock Screen (Ctrl+L)
function applyVipSessionLockState(locked) {
  const isLocked = Boolean(locked);
  try {
    localStorage.setItem('thabit_vip_session_locked', isLocked ? '1' : '0');
  } catch (_) {}

  const existing = document.getElementById('vip-lock-overlay');
  if (!isLocked) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return;

  const tr = typeof t === 'function' ? t : (k) => k;
  const esc = window.escapeHTML || ((v) => String(v ?? ''));
  const uname = window.currentUser?.username || window.currentUser?.Username || 'Admin';
  const companyName = window.appSettings?.companyName || tr('default_company_name');

  const overlay = document.createElement('div');
  overlay.id = 'vip-lock-overlay';
  overlay.className = 'vip-lock-overlay no-print';
  overlay.innerHTML = `
    <div class="vip-lock-card">
      <div class="vip-lock-crest">👑</div>
      <div class="vip-lock-company">${esc(companyName)}</div>
      <h2 class="vip-lock-title">${esc(tr('lock_screen_title'))}</h2>
      <p class="vip-lock-sub">${esc(tr('lock_screen_subtitle'))}</p>
      <div class="vip-lock-user-pill">👤 ${esc(uname)}</div>
      <div class="vip-lock-form">
        <input type="password" id="vip-lock-pass-input" class="form-control vip-lock-input" placeholder="${esc(tr('lock_screen_pass_placeholder'))}" autocomplete="off" />
        <div class="vip-lock-error" id="vip-lock-error"></div>
        <button type="button" id="vip-lock-unlock-btn" class="btn-submit vip-lock-btn">${esc(tr('lock_screen_unlock_btn'))}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const passInput = document.getElementById('vip-lock-pass-input');
  const errEl = document.getElementById('vip-lock-error');
  const unlockBtn = document.getElementById('vip-lock-unlock-btn');

  const attemptUnlock = async () => {
    const pass = (passInput?.value || '').trim();
    if (!pass) return;
    try {
      const res = await window.api?.loginUser?.(uname, pass);
      if (res && res.success) {
        applyVipSessionLockState(false);
        try {
          await window.api?.notifyDataChanged?.({ type: 'session-lock', locked: false });
        } catch (_) {}
        alert(tr('lock_screen_unlocked_toast'));
      } else {
        if (errEl) errEl.textContent = tr('lock_screen_wrong_pass');
        if (passInput) {
          passInput.value = '';
          passInput.focus();
        }
      }
    } catch (_) {
      if (errEl) errEl.textContent = tr('lock_screen_wrong_pass');
    }
  };

  unlockBtn?.addEventListener('click', attemptUnlock);
  passInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      attemptUnlock();
    }
  });
  setTimeout(() => passInput?.focus(), 30);
}

async function lockAppSession() {
  playLuxurySound('lock');
  applyVipSessionLockState(true);
  try {
    await window.api?.notifyDataChanged?.({ type: 'session-lock', locked: true });
  } catch (_) {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyLuxuryAudioMuteState(window.__luxuryAudioMuted);
    mountLuxuryDatePresets();
    mountLuxuryTafqeetAndInlineMath();
    mountLuxuryTableQuickSummaryBars();
  });
} else {
  applyLuxuryAudioMuteState(window.__luxuryAudioMuted);
  mountLuxuryDatePresets();
  mountLuxuryTafqeetAndInlineMath();
  mountLuxuryTableQuickSummaryBars();
}

// ==========================================
// ROYAL COMMAND & PRESTIGE PACK (PACK 5):
// 1) LIVE GOLD TAFQEET (ARABIC & ENGLISH AMOUNT-IN-WORDS) + INLINE MATH IN AMOUNT FIELDS
// 2) LIVE TABLE QUICK FILTER & INSTANT SUMMARY BAR
// 3) ROYAL KEYBOARD SHORTCUTS MODAL (F12)
// 4) ONE-CLICK HEADER VAULT PULSE BACKUP
// ==========================================

function numberToArabicWords(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return '';
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const convertUnder1000 = (v) => {
    const parts = [];
    const h = Math.floor(v / 100);
    const rem = v % 100;
    if (h > 0) parts.push(hundreds[h]);
    if (rem > 0) {
      if (rem < 20) {
        parts.push(ones[rem]);
      } else {
        const u = rem % 10;
        const tVal = Math.floor(rem / 10);
        if (u > 0) {
          parts.push(`${ones[u]} و${tens[tVal]}`);
        } else {
          parts.push(tens[tVal]);
        }
      }
    }
    return parts.join(' و');
  };

  const chunks = [];
  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (millions > 0) {
    if (millions === 1) chunks.push('مليون');
    else if (millions === 2) chunks.push('مليونان');
    else if (millions >= 3 && millions <= 10) chunks.push(`${convertUnder1000(millions)} ملايين`);
    else chunks.push(`${convertUnder1000(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) chunks.push('ألف');
    else if (thousands === 2) chunks.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) chunks.push(`${convertUnder1000(thousands)} آلاف`);
    else chunks.push(`${convertUnder1000(thousands)} ألف`);
  }

  if (remainder > 0) {
    chunks.push(convertUnder1000(remainder));
  }

  return chunks.join(' و');
}

function numberToEnglishWords(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return '';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const under1000 = (v) => {
    const parts = [];
    const h = Math.floor(v / 100);
    const rem = v % 100;
    if (h > 0) parts.push(`${ones[h]} Hundred`);
    if (rem > 0) {
      if (rem < 20) parts.push(ones[rem]);
      else {
        const tVal = Math.floor(rem / 10);
        const u = rem % 10;
        parts.push(u > 0 ? `${tens[tVal]}-${ones[u]}` : tens[tVal]);
      }
    }
    return parts.join(' ');
  };

  const parts = [];
  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (millions > 0) parts.push(`${under1000(millions)} Million`);
  if (thousands > 0) parts.push(`${under1000(thousands)} Thousand`);
  if (remainder > 0) parts.push(under1000(remainder));

  return parts.join(', ');
}

function formatLuxuryTafqeet(rawVal) {
  const num = Number(rawVal);
  if (!Number.isFinite(num) || Math.abs(num) < 0.01 || Math.abs(num) >= 1000000000) return '';
  const tr = typeof t === 'function' ? t : (k) => k;
  const lang = (typeof window.currentLang === 'function' ? window.currentLang() : window.appSettings?.language) || 'ar';
  const currency = window.appSettings?.currency || '';
  const absVal = Math.abs(num);
  const intPart = Math.floor(absVal);
  const cents = Math.round((absVal - intPart) * 100);

  if (lang === 'en') {
    const mainWords = intPart > 0 ? numberToEnglishWords(intPart) : 'Zero';
    const fracStr = cents > 0 ? ` ${tr('tafqeet_and_fractional')} ${cents}/100` : '';
    return `📜 ${mainWords}${fracStr} ${currency} ${tr('tafqeet_only_suffix')}`.trim();
  }

  const mainWords = intPart > 0 ? numberToArabicWords(intPart) : 'صفر';
  const fracStr = cents > 0 ? ` ${tr('tafqeet_and_fractional')} ${cents}/100` : '';
  return `📜 ${mainWords}${fracStr} ${currency} ${tr('tafqeet_only_suffix')}`.trim();
}

const TAFQEET_INPUT_IDS = [
  'voucher-amount',
  'expense-amount',
  'sup-tx-amount',
  'emp-tx-amount',
  'bank-tx-amount',
  'input-cashier-actual',
  'input-sales-cash'
];

function updateSingleTafqeetBadge(inputEl) {
  if (!inputEl) return;
  let badge = inputEl.parentElement?.querySelector('.luxury-tafqeet-pill');
  if (!badge && inputEl.parentElement) {
    badge = document.createElement('div');
    badge.className = 'luxury-tafqeet-pill no-print';
    inputEl.parentElement.appendChild(badge);
  }
  if (!badge) return;

  const raw = String(inputEl.value || '').trim();
  const evaluated = /[+\-*/]/.test(raw) ? evaluateSafeMathExpression(raw) : parseFloat(raw);
  const words = formatLuxuryTafqeet(evaluated);
  if (words) {
    badge.textContent = words;
    badge.style.display = 'block';
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
  }
}

function refreshAllTafqeetBadges() {
  TAFQEET_INPUT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) updateSingleTafqeetBadge(el);
  });
}

function mountLuxuryTafqeetAndInlineMath() {
  TAFQEET_INPUT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.luxuryTafqeetBound === '1') return;
    el.dataset.luxuryTafqeetBound = '1';

    // Allow typing inline math expressions like 1500+350 by switching to text with decimal inputmode
    if (el.type === 'number') {
      el.type = 'text';
      el.setAttribute('inputmode', 'decimal');
      el.setAttribute('dir', 'ltr');
    }

    const resolveInlineMathIfNeeded = () => {
      const raw = String(el.value || '').trim();
      if (raw && /[+\-*/]/.test(raw.slice(1))) {
        const result = evaluateSafeMathExpression(raw);
        if (result !== null && Number.isFinite(result)) {
          el.value = String(result);
          el.classList.remove('inline-math-flash');
          void el.offsetWidth;
          el.classList.add('inline-math-flash');
          playLuxurySound('tick');
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      updateSingleTafqeetBadge(el);
    };

    el.addEventListener('input', () => updateSingleTafqeetBadge(el));
    el.addEventListener('blur', resolveInlineMathIfNeeded);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && /[+\-*/]/.test(String(el.value || '').slice(1))) {
        e.preventDefault();
        resolveInlineMathIfNeeded();
      }
    });

    updateSingleTafqeetBadge(el);
  });
}

// 2. Live Table Summary & Quick Filter Bar
const LUXURY_TABLE_CONFIGS = [
  { tbodyId: 'general-vouchers-tbody', amountColIdx: 4 },
  { tbodyId: 'sup-tx-tbody', amountColIdx: 3 },
  { tbodyId: 'emp-tx-tbody', amountColIdx: 2 },
  { tbodyId: 'expenses-tx-tbody', amountColIdx: 4 },
  { tbodyId: 'bank-tx-tbody', amountColIdx: 6 }
];

function computeTableVisibleSummary(tbody, amountColIdx) {
  if (!tbody) return { count: 0, total: 0 };
  let count = 0;
  let total = 0;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  rows.forEach((tr) => {
    if (tr.style.display === 'none') return;
    const cells = tr.querySelectorAll('td');
    if (cells.length <= 1) return; // empty state row
    count++;
    const amtCell = cells[amountColIdx];
    if (amtCell) {
      const cleaned = String(amtCell.textContent || '').replace(/[^0-9.-]/g, '');
      const val = parseFloat(cleaned);
      if (Number.isFinite(val)) total += val;
    }
  });
  return { count, total };
}

function mountLuxuryTableQuickSummaryBars() {
  const tr = typeof t === 'function' ? t : (k) => k;

  LUXURY_TABLE_CONFIGS.forEach((cfg) => {
    const tbody = document.getElementById(cfg.tbodyId);
    if (!tbody) return;
    const tableContainer = tbody.closest('.table-container');
    if (!tableContainer || tableContainer.dataset.luxurySummaryMounted === '1') return;
    tableContainer.dataset.luxurySummaryMounted = '1';

    const bar = document.createElement('div');
    bar.className = 'luxury-table-live-bar no-print';
    bar.dataset.tbodyId = cfg.tbodyId;
    bar.dataset.amountColIdx = String(cfg.amountColIdx);
    bar.innerHTML = `
      <div class="luxury-table-filter-wrap">
        <input type="text" class="form-control luxury-table-quick-input" placeholder="${tr('table_quick_filter_placeholder')}" autocomplete="off" />
      </div>
      <div class="luxury-table-stats-wrap">
        <span class="luxury-stat-pill">
          <span class="stat-lbl" data-i18n-role="rows-lbl">${tr('table_summary_rows')}</span>
          <strong class="stat-val rows-count" dir="ltr">0</strong>
        </span>
        <span class="luxury-stat-pill gold">
          <span class="stat-lbl" data-i18n-role="total-lbl">${tr('table_summary_total')}</span>
          <strong class="stat-val total-sum" dir="ltr">0.00</strong>
        </span>
      </div>
    `;

    tableContainer.parentElement?.insertBefore(bar, tableContainer);

    const filterInput = bar.querySelector('.luxury-table-quick-input');
    const countEl = bar.querySelector('.rows-count');
    const sumEl = bar.querySelector('.total-sum');

    const recalculate = () => {
      const q = String(filterInput?.value || '').trim().toLowerCase();
      Array.from(tbody.querySelectorAll('tr')).forEach((row) => {
        if (row.querySelectorAll('td').length <= 1) return;
        if (!q) {
          row.style.display = '';
          row.classList.remove('luxury-row-matched');
        } else {
          const text = String(row.textContent || '').toLowerCase();
          const matched = text.includes(q);
          row.style.display = matched ? '' : 'none';
          row.classList.toggle('luxury-row-matched', matched);
        }
      });

      injectQuickPeekButtonsInTable(tbody);

      const stats = computeTableVisibleSummary(tbody, cfg.amountColIdx);
      const currency = window.appSettings?.currency || '';
      if (countEl) countEl.textContent = String(stats.count);
      if (sumEl) {
        sumEl.textContent = `${currency}${stats.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    };

    filterInput?.addEventListener('input', recalculate);

    const observer = new MutationObserver(() => {
      recalculate();
    });
    observer.observe(tbody, { childList: true });
    recalculate();
  });
}

function refreshLuxuryTableSummaryLabels() {
  const tr = typeof t === 'function' ? t : (k) => k;
  document.querySelectorAll('.luxury-table-live-bar').forEach((bar) => {
    const inp = bar.querySelector('.luxury-table-quick-input');
    if (inp) inp.placeholder = tr('table_quick_filter_placeholder');
    const rLbl = bar.querySelector('[data-i18n-role="rows-lbl"]');
    if (rLbl) rLbl.textContent = tr('table_summary_rows');
    const tLbl = bar.querySelector('[data-i18n-role="total-lbl"]');
    if (tLbl) tLbl.textContent = tr('table_summary_total');
  });
}

// 3. Royal Keyboard Shortcuts Modal (F12)
function toggleRoyalShortcutsModal() {
  playLuxurySound('tick');
  const existing = document.getElementById('royal-shortcuts-overlay');
  if (existing) {
    existing.remove();
    return;
  }

  const tr = typeof t === 'function' ? t : (k) => k;
  const esc = window.escapeHTML || ((v) => String(v ?? ''));

  const shortcuts = [
    { key: 'Ctrl + K', desc: tr('shortcut_desc_ctrl_k'), run: () => openLuxuryCommandPalette() },
    { key: 'Ctrl + L', desc: tr('shortcut_desc_ctrl_l'), run: () => lockAppSession() },
    { key: 'Ctrl + 1', desc: tr('shortcut_desc_f1'), run: () => switchTab('sales') },
    { key: 'Ctrl + 2', desc: tr('shortcut_desc_f2'), run: () => switchTab('purchases') },
    { key: 'Ctrl + 3', desc: tr('shortcut_desc_f3'), run: () => switchTab('suppliers') },
    { key: 'Ctrl + 4', desc: tr('shortcut_desc_f4'), run: () => switchTab('employees') },
    { key: 'Ctrl + 5', desc: tr('shortcut_desc_f5'), run: () => switchTab('vault') },
    { key: 'Ctrl + 6', desc: tr('shortcut_desc_f6'), run: () => switchTab('banks') },
    { key: 'Ctrl + 7', desc: tr('shortcut_desc_f7'), run: () => switchTab('dashboard') },
    { key: 'Ctrl + 8', desc: tr('shortcut_desc_f8'), run: () => switchTab('closing') },
    { key: 'Ctrl + 9', desc: tr('shortcut_desc_f9'), run: () => toggleVipPrivacyBlur() },
    { key: 'Ctrl + 0', desc: tr('shortcut_desc_f10'), run: () => toggleExecutiveCalculator() },
    { key: 'Ctrl + Shift + 1', desc: tr('shortcut_desc_f11'), run: () => toggleRoyalStickyNotes() },
    { key: 'Ctrl + Shift + 2', desc: tr('shortcut_desc_f12'), run: () => {} }
  ];

  const overlay = document.createElement('div');
  overlay.id = 'royal-shortcuts-overlay';
  overlay.className = 'luxury-cmd-overlay no-print';
  overlay.innerHTML = `
    <div class="royal-shortcuts-modal" role="dialog" aria-modal="true">
      <div class="royal-shortcuts-header">
        <div>
          <h3 class="royal-shortcuts-title">${esc(tr('shortcuts_modal_title'))}</h3>
          <p class="royal-shortcuts-sub">${esc(tr('shortcuts_modal_sub'))}</p>
        </div>
        <button type="button" class="exec-calc-close" onclick="toggleRoyalShortcutsModal()">×</button>
      </div>
      <div class="royal-shortcuts-grid">
        ${shortcuts.map((s, idx) => `
          <div class="royal-shortcut-card" data-idx="${idx}">
            <kbd class="royal-kbd" dir="ltr">${esc(s.key)}</kbd>
            <span class="royal-shortcut-desc">${esc(s.desc)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.royal-shortcut-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = Number(card.dataset.idx) || 0;
      const item = shortcuts[idx];
      overlay.remove();
      if (item && typeof item.run === 'function') item.run();
    });
  });
}

// 4. Instant One-Click Header Vault Backup Pulse
async function triggerInstantLuxuryBackup() {
  playLuxurySound('tick');
  const tr = typeof t === 'function' ? t : (k) => k;
  try {
    if (window.api?.backupDB) {
      const res = await window.api.backupDB();
      if (res?.success) {
        alert(tr('backup_created_success'));
      }
    }
  } catch (e) {
    console.error('Instant backup failed:', e);
  }
}

// ==========================================
// ROYAL ANALYTICS & MASTER CONTROL SUITE (PACK 6):
// 1) HOVER / ONE-CLICK QUICK PEEK VOUCHER DRAWER + INSTANT PRINT
// 2) DAILY SALES TARGET & PACE GAUGE MODAL
// ==========================================

function injectQuickPeekButtonsInTable(tbody) {
  if (!tbody) return;
  const tr = typeof t === 'function' ? t : (k) => k;
  const table = tbody.closest('table');
  const headers = Array.from(table?.querySelectorAll('thead th') || []).map(th => String(th.textContent || '').trim());

  Array.from(tbody.querySelectorAll('tr')).forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length <= 2) return;
    const lastCell = cells[cells.length - 1];
    if (!lastCell || lastCell.querySelector('.quick-peek-voucher-btn')) return;

    const peekBtn = document.createElement('button');
    peekBtn.type = 'button';
    peekBtn.className = 'btn-secondary quick-peek-voucher-btn no-print';
    peekBtn.title = tr('quick_peek_btn_title');
    peekBtn.textContent = '👁️';
    peekBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openQuickPeekVoucherDrawer(row, headers);
    });

    const wrapper = lastCell.querySelector('div') || lastCell;
    wrapper.prepend(peekBtn);
  });
}

function openQuickPeekVoucherDrawer(rowEl, headers = []) {
  playLuxurySound('tick');
  document.getElementById('quick-peek-voucher-overlay')?.remove();

  const tr = typeof t === 'function' ? t : (k) => k;
  const esc = window.escapeHTML || ((v) => String(v ?? ''));
  const cells = Array.from(rowEl.querySelectorAll('td'));

  const pairs = [];
  for (let i = 0; i < cells.length - 1; i++) {
    const label = headers[i] || `#${i + 1}`;
    const value = String(cells[i]?.textContent || '').trim() || '—';
    pairs.push({ label, value });
  }

  // Find if the row has an existing print button to trigger 1-click print
  const lastCell = cells[cells.length - 1];
  const existingPrintBtn = lastCell ? Array.from(lastCell.querySelectorAll('button')).find(b =>
    b.classList.contains('print-report-btn') ||
    (b.getAttribute('onclick') || '').toLowerCase().includes('print') ||
    String(b.textContent || '').includes('🖨️')
  ) : null;

  const overlay = document.createElement('div');
  overlay.id = 'quick-peek-voucher-overlay';
  overlay.className = 'luxury-cmd-overlay no-print';
  overlay.innerHTML = `
    <div class="quick-peek-drawer" role="dialog" aria-modal="true">
      <div class="quick-peek-header">
        <span class="quick-peek-title">${esc(tr('quick_peek_modal_title'))}</span>
        <button type="button" class="exec-calc-close" id="btn-close-quick-peek">×</button>
      </div>
      <div class="quick-peek-body">
        ${pairs.map(p => `
          <div class="quick-peek-row">
            <span class="quick-peek-key">${esc(p.label)}</span>
            <strong class="quick-peek-val">${esc(p.value)}</strong>
          </div>
        `).join('')}
      </div>
      <div class="quick-peek-footer">
        ${existingPrintBtn ? `<button type="button" class="btn-submit" id="btn-trigger-quick-print">${esc(tr('quick_peek_print_btn'))}</button>` : ''}
        <button type="button" class="btn-secondary" id="btn-dismiss-quick-peek">${esc(tr('quick_peek_close_btn'))}</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
  document.getElementById('btn-close-quick-peek')?.addEventListener('click', () => overlay.remove());
  document.getElementById('btn-dismiss-quick-peek')?.addEventListener('click', () => overlay.remove());
  document.getElementById('btn-trigger-quick-print')?.addEventListener('click', () => {
    overlay.remove();
    existingPrintBtn?.click();
  });
}

function openDailySalesTargetPrompt() {
  playLuxurySound('tick');
  document.getElementById('daily-target-modal-overlay')?.remove();

  const tr = typeof t === 'function' ? t : (k) => k;
  const esc = window.escapeHTML || ((v) => String(v ?? ''));
  let currentTarget = 15000;
  try {
    const saved = parseFloat(localStorage.getItem('thabit_daily_sales_target') || '15000');
    if (Number.isFinite(saved) && saved > 0) currentTarget = saved;
  } catch (_) {}

  const overlay = document.createElement('div');
  overlay.id = 'daily-target-modal-overlay';
  overlay.className = 'luxury-cmd-overlay no-print';
  overlay.innerHTML = `
    <div class="quick-peek-drawer" style="max-width: 380px;" role="dialog" aria-modal="true">
      <div class="quick-peek-header">
        <span class="quick-peek-title">${esc(tr('daily_target_modal_title'))}</span>
        <button type="button" class="exec-calc-close" id="btn-close-target-modal">×</button>
      </div>
      <div class="quick-peek-body" style="padding: 18px;">
        <input type="text" inputmode="decimal" dir="ltr" id="daily-target-input" class="form-control" value="${currentTarget}" style="font-size: 18px; font-weight: 900; text-align: center;" />
      </div>
      <div class="quick-peek-footer">
        <button type="button" class="btn-submit" id="btn-save-daily-target">${esc(tr('daily_target_save_btn'))}</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);

  const inp = document.getElementById('daily-target-input');
  setTimeout(() => { inp?.focus(); inp?.select(); }, 20);

  const saveTarget = () => {
    const raw = String(inp?.value || '').trim();
    const val = /[+\-*/]/.test(raw) ? evaluateSafeMathExpression(raw) : parseFloat(raw);
    if (Number.isFinite(val) && val > 0) {
      try {
        localStorage.setItem('thabit_daily_sales_target', String(val));
      } catch (_) {}
      overlay.remove();
      if (typeof window.updateFormInputs === 'function') window.updateFormInputs();
      alert(tr('daily_target_saved_toast'));
    }
  };

  document.getElementById('btn-close-target-modal')?.addEventListener('click', () => overlay.remove());
  document.getElementById('btn-save-daily-target')?.addEventListener('click', saveTarget);
  inp?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTarget();
    }
  });
}

window.playLuxurySound = playLuxurySound;
window.toggleLuxuryAudioFx = toggleLuxuryAudioFx;
window.toggleRoyalStickyNotes = toggleRoyalStickyNotes;
window.showPhoneNotesPairingModal = showPhoneNotesPairingModal;
window.lockAppSession = lockAppSession;
window.mountLuxuryDatePresets = mountLuxuryDatePresets;
window.toggleRoyalShortcutsModal = toggleRoyalShortcutsModal;
window.triggerInstantLuxuryBackup = triggerInstantLuxuryBackup;
window.mountLuxuryTafqeetAndInlineMath = mountLuxuryTafqeetAndInlineMath;
window.mountLuxuryTableQuickSummaryBars = mountLuxuryTableQuickSummaryBars;
window.openDailySalesTargetPrompt = openDailySalesTargetPrompt;
window.openQuickPeekVoucherDrawer = openQuickPeekVoucherDrawer;

window.resetAccountDropdownToCashVault = function(selectElOrId) {
  const dd = typeof selectElOrId === 'string' ? document.getElementById(selectElOrId) : selectElOrId;
  if (!dd || !dd.options || dd.options.length === 0) return;
  const targetVal = window.defaultCashVaultAccountId || dd.options[0].value;
  const exists = Array.from(dd.options).some(opt => opt.value === String(targetVal));
  dd.value = exists ? String(targetVal) : dd.options[0].value;
};
