import { showToast } from '../core/notifications.js';
import * as ipc from '../core/ipc.js';
import { navigateTo } from '../core/router.js';
import { setState } from '../core/state.js';
import { hasPermission, hasRole } from '../core/auth.js';

let activeYearId = null;
let financialYears = [];
let currentUser = null;
let isFirstRun = false;

export async function initializeLogin() {
  const loginButton = document.getElementById('btn-login-action');
  if (loginButton) loginButton.addEventListener('click', performLogin);
  setupLoginKeyboard();
  await checkInitialLogin();
}

async function checkInitialLogin() {
  try {
    let standaloneSession = null;
    if (window.isStandaloneWindow && window.api && typeof window.api.getSessionContext === 'function') {
      standaloneSession = await window.api.getSessionContext();
    }

    // A window without an authenticated session must show the login form
    // instead of guessing a role for the current user.
    if (standaloneSession && standaloneSession.user) {
      const loginModal = document.getElementById('login-modal');
      if (loginModal) loginModal.style.display = 'none';

      const [years, appSettings] = await Promise.all([
        ipc.getFinancialYears(),
        ipc.getAppSettings()
      ]);

      financialYears = years || [];
      window.financialYears = financialYears;

      const user = standaloneSession.user;
      currentUser = user;
      window.currentUser = user;
      setState('currentUser', user);

      activeYearId = standaloneSession.yearId || 1;
      window.currentYearId = activeYearId;
      setState('currentFiscalYear', activeYearId);
      window.currentYearName = standaloneSession.yearName || '';

      if (appSettings) {
        const compEl = document.getElementById('header-company-name');
        const branchEl = document.getElementById('header-branch-name');
        const logoEl = document.getElementById('header-logo-img');
        if (compEl) compEl.textContent = appSettings.companyName || t('default_company_name');
        if (branchEl) branchEl.textContent = appSettings.branchName || '';
        if (logoEl && appSettings.logo) logoEl.src = appSettings.logo;
      }

      const userInfoEl = document.getElementById('current-user-info');
      const usernameEl = document.getElementById('current-username');
      if (userInfoEl) userInfoEl.style.display = 'flex';
      if (usernameEl) usernameEl.textContent = `👤 ${user.username || user.Username || ''}`;

      const unlockVaultBtn = document.getElementById('btn-unlock-vault');
      if (unlockVaultBtn) {
        unlockVaultBtn.style.display = user.role === 'manager' ? 'block' : 'none';
      }

      window.dispatchEvent(new CustomEvent('stateChanged', {
        detail: { currentUser: user, currentFiscalYear: activeYearId }
      }));

      if (typeof window.activateStandaloneSection === 'function') {
        await window.activateStandaloneSection(window.standaloneSection, window.standaloneSubTab);
      }
      return;
    }

    const [years, usersCount] = await Promise.all([
      ipc.getFinancialYears(),
      ipc.checkUsersCount()
    ]);
    financialYears = years || []; window.financialYears = financialYears;
    populateLoginYears(financialYears);

    isFirstRun = Number(usersCount?.count || 0) === 0;
    updateLoginMode();
    
    // We start by showing the login modal
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.style.display = 'flex';
  } catch (err) {
    console.error("Failed to load initial data", err);
  }
}

function updateLoginMode() {
  const title = document.getElementById('login-title');
  const description = document.getElementById('login-desc');
  const button = document.getElementById('btn-login-action');

  if (title) title.textContent = t(isFirstRun ? 'first_run_manager_title' : 'login_title');
  if (description) description.textContent = isFirstRun ? t('first_run_manager_description') : '';
  if (button) button.textContent = t(isFirstRun ? 'create_manager_button' : 'login_button');
}

function populateLoginYears(years) {
  const loginYearSelect = document.getElementById('login-year-select');
  if (!loginYearSelect) return;
  
  loginYearSelect.innerHTML = '';
  
  years.forEach(y => {
    // Handling both cases depending on how DB driver returns columns
    const yName = y.YearName || y.year_name;
    const yId = y.YearID || y.year_id || y.Id || y.id;
    loginYearSelect.innerHTML += `<option value="${yId}">${window.escapeHTML(yName)}</option>`;
  });
  
  if (years && years.length > 0) {
    const defaultYear = years.find(y => y.IsClosed === 0 || y.is_closed === 0) || years[0];
    const defaultYearId = defaultYear.YearID || defaultYear.year_id || defaultYear.Id || defaultYear.id;
    if (loginYearSelect) loginYearSelect.value = defaultYearId;
  }
}

async function performLogin() {
  const usernameInput = document.getElementById('login-username').value.trim();
  const passwordInput = document.getElementById('login-password').value.trim();
  const selectedYearId = parseInt(document.getElementById('login-year-select').value);
  
  if (!usernameInput || !passwordInput) {
    return showToast(t('login_fields_required'), 'error');
  }
  
  try {
    if (isFirstRun) {
      const createResult = await ipc.createUser(usernameInput, passwordInput, 'manager', {
        sales: true,
        employees: true,
        suppliers: true,
        reports: true,
        vault: true
      });

      if (!createResult || createResult.success === false) {
        return showToast(createResult?.error || t('manager_create_failed'), 'error');
      }

      isFirstRun = false;
      updateLoginMode();
      showToast(t('manager_create_success'), 'success');
    }

    const res = await ipc.loginUser(usernameInput, passwordInput);
    
    if (res && res.success && res.user) {
      const user = res.user;
      currentUser = user;
      window.currentUser = user; // Expose to modules
      setState('currentUser', user);
      
      activeYearId = selectedYearId;
      window.currentYearId = activeYearId; // Global mapping for modules
      // Keep the shared store in sync as newer page modules read the active
      // financial year from it instead of the window global.
      setState('currentFiscalYear', activeYearId);
      window.dispatchEvent(new CustomEvent('stateChanged', {
        detail: { currentUser: user, currentFiscalYear: activeYearId }
      }));
      
      const yr = financialYears.find(y => (y.YearID || y.year_id || y.Id || y.id) == activeYearId);
      window.currentYearName = yr ? (yr.YearName || yr.year_name) : '';

      if (window.api && typeof window.api.setSessionContext === 'function') {
        await window.api.setSessionContext({
          user,
          yearId: activeYearId,
          yearName: window.currentYearName
        });
      }
      
      const appSettings = await ipc.getAppSettings();
      document.getElementById('header-company-name').textContent = appSettings.companyName || t('default_company_name');
      document.getElementById('header-branch-name').textContent = appSettings.branchName || '';
      
      if (appSettings.logo) {
        document.getElementById('header-logo-img').src = appSettings.logo;
      }
      
      document.getElementById('login-modal').style.display = 'none';
      document.getElementById('current-user-info').style.display = 'flex';
      if (typeof window.updateRoyalHeaderGreeting === 'function') {
        window.updateRoyalHeaderGreeting();
      } else {
        document.getElementById('current-username').textContent = `👤 ${user.username || user.Username || ''}`;
      }
      document.getElementById('main-tabs-nav').style.display = '';
      
      // Apply RBAC to Main Tabs
      const tabs = document.querySelectorAll('.tab-btn');
      tabs.forEach(tab => {
        const perm = tab.getAttribute('data-permission');
        const role = tab.getAttribute('data-role');
        
        if (role && !hasRole(role)) {
          tab.style.display = 'none';
        } else if (perm && !hasPermission(perm)) {
          tab.style.display = 'none';
        } else {
          tab.style.display = '';
        }
      });

      // Apply RBAC to Settings Dropdown Items
      const dropdownItems = document.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        const role = item.getAttribute('data-role');
        if (role && !hasRole(role)) {
          item.style.display = 'none';
        } else {
          item.style.display = 'block'; // Or original display value
        }
      });

      // Manager-only links use stable IDs rather than the newer dropdown-item
      // class. Keep them in sync after login and after restoring a database.
      const managerOnlyIds = [
        'menu-users',
        'menu-cashiers',
        'menu-partners',
        'menu-clear',
        'tab-btn-dashboard',
        'btn-unlock-vault'
      ];
      managerOnlyIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        element.style.display = user.role === 'manager'
          ? (id === 'btn-unlock-vault' ? 'block' : 'flex')
          : 'none';
      });
      
      showToast(t('login_success'), 'success');
      if (typeof window.populateAccountDropdowns === 'function') {
        window.populateAccountDropdowns();
      }
      
    } else {
      showToast(res?.error || t('login_invalid'), 'error');
    }
  } catch (error) {
    showToast(t('login_error'), 'error');
    console.error(error);
  }
}

function setupLoginKeyboard() {
  const loginUser = document.getElementById('login-username');
  const loginPass = document.getElementById('login-password');
  const loginBtn = document.getElementById('btn-login-action');
  
  if (loginUser && loginPass && loginBtn) {
    loginUser.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        loginPass.focus();
      }
    });
  
    loginPass.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        loginBtn.click();
      }
    });
  }
}
