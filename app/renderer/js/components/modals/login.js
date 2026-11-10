let vaultData = null;

async function checkLoginState() {
  if (new URLSearchParams(window.location.search).get('standalone')) return;
  try {
    const years = await window.api.getFinancialYears();
    window.financialYears = years;
    const loginYearSelect = document.getElementById('login-year-select');
    if (loginYearSelect) {
      loginYearSelect.innerHTML = years.map(y => `<option value="${y.YearID}">${window.escapeHTML(y.YearName)}${y.IsClosed ? ' (مغلقة 🔒)' : ''}</option>`).join('');
      if (years.length > 0) {
        const openYears = years.filter(y => !y.IsClosed);
        const activeYear = openYears.length > 0 ? openYears[openYears.length - 1] : years[years.length - 1];
        loginYearSelect.value = activeYear.YearID;
      }
    }
  } catch (err) {
    console.error('Failed to load years for login:', err);
  }

  const countRes = await window.api.checkUsersCount();
  if (countRes.count === 0) {
    document.getElementById('login-title').innerText = t('first_run_manager_title');
    document.getElementById('login-desc').innerText = t('first_run_manager_description');
    document.getElementById('btn-login-action').innerText = t('create_manager_button');
    document.getElementById('btn-login-action').onclick = async () => {
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value.trim();
      if (!u || !p) return alert(t('login_fields_required'));
      const res = await window.api.createUser(u, p, 'manager', {sales:true, vault:true});
      if (res.success) {
        alert(t('manager_create_login_prompt'));
        window.location.reload();
      } else {
        alert(`${t('error')}: ${res.error}`);
      }
    };
  }
}

async function performLogin() {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value.trim();
  if (!u || !p) return alert(t('login_fields_required'));

  const selectedYearId = parseInt(document.getElementById('login-year-select').value);
  window.currentYearId = selectedYearId;
  const activeYearObj = (window.financialYears || []).find(y => y.YearID === selectedYearId);
  window.currentYearName = activeYearObj ? activeYearObj.YearName : '';

  const res = await window.api.loginUser(u, p);
  if (res.success) {
    currentUser = res.user;
    document.getElementById('login-modal').style.display = 'none';
    
    // Fill header year select list (only active years plus current year if closed)
    const selectHeader = document.getElementById('header-year-select');
    if (selectHeader) {
      const displayedYears = (window.financialYears || []).filter(y => !y.IsClosed || y.YearID === window.currentYearId);
      selectHeader.innerHTML = displayedYears.map(y => `<option value="${y.YearID}">${window.escapeHTML(y.YearName)}${y.IsClosed ? ' (مغلقة 🔒)' : ''}</option>`).join('');
      selectHeader.value = window.currentYearId;
    }

    document.getElementById('current-username').innerText = `👤 ${currentUser.username}${currentUser.role === 'manager' ? ` (${t('manager_role')})` : ''}`;
    document.getElementById('current-user-info').style.display = 'flex';
    
    // Direct load of current active year data
    await loadState();
    if (typeof loadEmployees === 'function') loadEmployees();
    if (typeof loadSuppliers === 'function') loadSuppliers();
    if (typeof fetchVaultReports === 'function') fetchVaultReports();
    if (typeof loadDashboardData === 'function') loadDashboardData();
    if (typeof loadBanksData === 'function') loadBanksData();
  if (typeof populateAccountDropdowns === 'function') populateAccountDropdowns();
    if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('stateChanged'));
    
    if (currentUser.role === 'manager') {
       document.getElementById('settings-wrapper-div').style.display = 'inline-block';
       document.getElementById('menu-users').style.display = 'flex';
       document.getElementById('menu-cashiers').style.display = 'flex';
         const mp = document.getElementById('menu-partners'); if(mp) mp.style.display = 'flex';
       document.getElementById('tab-btn-dashboard').style.display = 'flex';
       document.getElementById('menu-clear').style.display = 'flex';
       document.getElementById('btn-unlock-vault').style.display = 'block';
       if (typeof loadUsersList === 'function') loadUsersList();
    } else {
       document.getElementById('settings-wrapper-div').style.display = 'inline-block';
       document.getElementById('menu-users').style.display = 'none';
       document.getElementById('menu-cashiers').style.display = 'none';
         const mp2 = document.getElementById('menu-partners'); if(mp2) mp2.style.display = 'none';
       document.getElementById('tab-btn-dashboard').style.display = 'none';
       document.getElementById('menu-clear').style.display = 'none';
       document.getElementById('btn-unlock-vault').style.display = 'none';
    }
    
    // Disable elements based on perms
    const salesTab = document.querySelector("button[onclick*='sales']");
    if (currentUser.permissions.sales === false && currentUser.role !== 'manager') {
       if(salesTab) salesTab.style.display = 'none';
       document.getElementById('btn-save-income').style.display = 'none';
       document.getElementById('btn-add-expense').style.display = 'none';
    } else {
       if(salesTab) salesTab.style.display = 'inline-block';
       document.getElementById('btn-save-income').style.display = 'block';
       document.getElementById('btn-add-expense').style.display = 'block';
    }
    
    const employeesTab = document.querySelector("button[onclick*='employees']");
    if (currentUser.permissions.employees === false && currentUser.role !== 'manager') {
       if(employeesTab) employeesTab.style.display = 'none';
    } else {
       if(employeesTab) employeesTab.style.display = 'inline-block';
    }

    const suppliersTab = document.querySelector("button[onclick*='suppliers']");
    if (currentUser.permissions.suppliers === false && currentUser.role !== 'manager') {
       if(suppliersTab) suppliersTab.style.display = 'none';
    } else {
       if(suppliersTab) suppliersTab.style.display = 'inline-block';
    }

    const reportsTab = document.querySelector("button[onclick*='summary']");
    if (currentUser.permissions.reports === false && currentUser.role !== 'manager') {
       if(reportsTab) reportsTab.style.display = 'none';
    } else {
       if(reportsTab) reportsTab.style.display = 'inline-block';
    }

    const vaultTab = document.querySelector("button[onclick*='vault']");
    if (!currentUser.permissions.vault && currentUser.role !== 'manager') {
       if(vaultTab) vaultTab.style.display = 'none';
       document.getElementById('btn-close-vault').style.display = 'none';
    } else {
       if(vaultTab) vaultTab.style.display = 'inline-block';
       document.getElementById('btn-close-vault').style.display = 'block';
    }
    
    await loadState();
    if(typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('stateChanged'));
  } else {
    alert(res.error);
  }
}

async function logoutUser() {
  try {
    if (window.api && typeof window.api.logoutUser === 'function') {
      await window.api.logoutUser();
    }
  } finally {
    currentUser = null;
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('current-user-info').style.display = 'none';
    document.getElementById('settings-wrapper-div').style.display = 'none';
    const dropdown = document.getElementById('settings-dropdown');
    if(dropdown) dropdown.classList.remove('active');
  }
}

window.globalUsersMap = {};

document.addEventListener('DOMContentLoaded', checkLoginState);
if (document.readyState === 'complete' || document.readyState === 'interactive') checkLoginState();
