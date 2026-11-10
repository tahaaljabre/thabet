function loadAppSettings() {
  const saved = localStorage.getItem('thabit_settings');
  
  // Apply Theme
  if (appSettings.isLightMode) {
    document.body.classList.add('light-theme');
    document.getElementById('setting-theme-toggle').checked = true;
  } else {
    document.body.classList.remove('light-theme');
    document.getElementById('setting-theme-toggle').checked = false;
  }

  // Apply UI Header Text
  const h1 = document.querySelector('.header-info h1');
  const eng = document.querySelector('.header-info .eng');
  if(h1) h1.innerText = appSettings.companyName;
  if(eng) eng.innerText = ''; // Branch name removed
  
  // Apply Logo
  if (appSettings.logo) {
    const logoImg = document.querySelector('.logo-box img');
    if(logoImg) {
      logoImg.src = appSettings.logo;
      logoImg.alt = appSettings.companyName;
    }
    const preview = document.getElementById('setting-logo-preview');
    if(preview) {
      preview.innerHTML = `<img src="${appSettings.logo}" style="width:100%; height:auto;">`;
      preview.style.display = 'block';
    }
  }

  // Populate Inputs
  let elComp = document.getElementById('setting-company-name'); if(elComp) elComp.value = appSettings.companyName;
    const currEl = document.getElementById('setting-currency'); if(currEl) currEl.value = appSettings.currency || (window.appSettings?.currency || '฿');
  const taxEl = document.getElementById('setting-tax-number'); if(taxEl) taxEl.value = appSettings.taxNumber || '';
  let elAddr = document.getElementById('setting-address'); if(elAddr) elAddr.value = appSettings.address;
  let elPhone = document.getElementById('setting-phone'); if(elPhone) elPhone.value = appSettings.phone;
  const salaryDayEl = document.getElementById('setting-salary-accrual-day'); if (salaryDayEl) salaryDayEl.value = appSettings.salaryAccrualDay || 28;
  const grabCommissionEl = document.getElementById('setting-grab-commission'); if(grabCommissionEl) grabCommissionEl.value = appSettings.grabCommission || '';
  const linemanCommissionEl = document.getElementById('setting-lineman-commission'); if(linemanCommissionEl) linemanCommissionEl.value = appSettings.linemanCommission || '';
  const backupPathEl = document.getElementById('setting-backup-path'); if(backupPathEl) backupPathEl.value = appSettings.backupPath || '';
}

window.toggleSettingsDropdown = function(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('settings-dropdown');
  if (dropdown) dropdown.classList.toggle('active');
}

window.addEventListener('click', (e) => {
  const wrapper = document.getElementById('settings-wrapper-div');
  const dropdown = document.getElementById('settings-dropdown');
  if (wrapper && dropdown && !wrapper.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});

window.switchSettingsTab = function(tabName) {
  // Hide all sections
  document.querySelectorAll('.setting-section').forEach(sec => {
    sec.style.display = 'none';
  });
  
  // Show target section
  const target = document.getElementById('setting-section-' + tabName);
  if(target) target.style.display = 'block';

  // Update active class on buttons
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.querySelector(`.settings-tab-btn[onclick="switchSettingsTab('${tabName}')"]`);
  if(activeBtn) activeBtn.classList.add('active');

  // Load necessary data if needed
  if (tabName === 'cashiers') {
    loadCashiersList();
  }
  if (tabName === 'partners') {
    loadSettingsPartners();
  }
  if (tabName === 'audit') {
    loadAuditLogsList();
  }
};

window.openSettingsModal = function(tabName) {
  loadAppSettings();
  const dropdown = document.getElementById('settings-dropdown');
  if(dropdown) dropdown.classList.remove('active');
  
  // Show/Hide manager tabs in settings sidebar
  const isManager = window.currentUser && window.currentUser.role === 'manager';
  const managerTabs = ['settings-tab-users', 'settings-tab-cashiers', 'settings-tab-partners', 'settings-tab-audit'];
  managerTabs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isManager ? 'block' : 'none';
  });

  switchSettingsTab(tabName || 'company');
  
  document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

function toggleTheme() {
  const isChecked = document.getElementById('setting-theme-toggle').checked;
  appSettings.isLightMode = isChecked;
  if (isChecked) {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    appSettings.logo = e.target.result;
    const preview = document.getElementById('setting-logo-preview');
    preview.innerHTML = `<img src="${appSettings.logo}" style="width:100%; height:auto;">`;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function saveSettings() {
  appSettings.companyName = document.getElementById('setting-company-name').value || '';
  const currElSave = document.getElementById('setting-currency'); appSettings.currency = currElSave ? (currElSave.value || (window.appSettings?.currency || '฿')) : (window.appSettings?.currency || '฿');
  const taxEl = document.getElementById('setting-tax-number'); appSettings.taxNumber = taxEl ? taxEl.value : '';
  appSettings.address = document.getElementById('setting-address').value || '';
  appSettings.phone = document.getElementById('setting-phone').value || '';
  const salaryDayElSave = document.getElementById('setting-salary-accrual-day');
  const salaryDayVal = salaryDayElSave ? parseInt(salaryDayElSave.value, 10) : 28;
  appSettings.salaryAccrualDay = Number.isInteger(salaryDayVal) ? Math.min(31, Math.max(1, salaryDayVal)) : 28;
  
  const grabEl = document.getElementById('setting-grab-commission');
  if (grabEl) appSettings.grabCommission = parseFloat(grabEl.value) || 0;
  const linemanEl = document.getElementById('setting-lineman-commission');
  if (linemanEl) appSettings.linemanCommission = parseFloat(linemanEl.value) || 0;
  
  const backupPathEl = document.getElementById('setting-backup-path');
  if (backupPathEl) appSettings.backupPath = backupPathEl.value || '';

  localStorage.setItem('thabit_settings', JSON.stringify(appSettings));
  window.appSettings = appSettings;
  window.api.saveAppSettings(appSettings).catch(e => console.error(e));

  loadAppSettings();
  closeSettingsModal();
  alert('تم حفظ الإعدادات بنجاح! ✔️');
}

window.selectBackupPath = async function() {
  try {
    const path = await window.api.selectBackupDirectory();
    if (path) {
      document.getElementById('setting-backup-path').value = path;
    }
  } catch (e) {
    console.error('Failed to select backup path:', e);
    alert('حدث خطأ أثناء تحديد المجلد');
  }
}

window.clearBackupPath = function() {
  const el = document.getElementById('setting-backup-path');
  if (el) el.value = '';
}

async function loadAuditLogsList() {
  const tbody = document.getElementById('audit-logs-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted);">يرجى الانتظار، جاري تحميل السجلات...</td></tr>';
  try {
    const activeYearId = window.currentYearId || 1;
    const logs = await window.api.getAuditLogs(activeYearId);
    
    tbody.innerHTML = logs.map(l => {
      let actionText = l.action_type;
      if (l.action_type === 'INSERT') { actionText = 'إضافة'; }
      else if (l.action_type === 'UPDATE') { actionText = 'تعديل'; }
      else if (l.action_type === 'DELETE') { actionText = 'حذف'; }
      else if (l.action_type === 'CLOSE_YEAR') { actionText = 'إغلاق السنة'; }
      else if (l.action_type === 'REOPEN_YEAR') { actionText = 'إعادة فتح'; }

      let tableTranslated = l.table_name;
      if (l.table_name === 'suppliers') tableTranslated = 'الموردين';
      else if (l.table_name === 'supplier_transactions') tableTranslated = 'حركات الموردين';
      else if (l.table_name === 'employees') tableTranslated = 'الموظفين';
      else if (l.table_name === 'employee_transactions') tableTranslated = 'حركات الموظفين';
      else if (l.table_name === 'daily_reports') tableTranslated = 'تقارير المبيعات';
      else if (l.table_name === 'CashGeneralVouchers') tableTranslated = 'سندات الصرف';

      return `
        <tr>
          <td>${l.log_date}</td>
          <td><span class="status-badge" style="background:transparent; border:none; margin:0; padding:0; font-weight:bold; color:var(--${l.action_type === 'DELETE' ? 'red' : l.action_type === 'INSERT' ? 'green2' : 'lahmi2'})">${actionText}</span></td>
          <td>${tableTranslated}</td>
          <td style="text-align:right; max-width: 250px; word-wrap: break-word;">${l.details || ''}</td>
          <td>${l.user_name}</td>
        </tr>
      `;
    }).join('');
    
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted);">لا توجد سجلات عمليات في هذه السنة المالية</td></tr>';
    }
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--red);">فشل تحميل السجلات</td></tr>';
  }
}

async function triggerBackup() {
  try {
    const res = await window.api.backupDB();
    if(res.success) {
      alert('تم حفظ النسخة الاحتياطية بنجاح في:\n' + res.filePath);
    } else if(!res.canceled) {
      alert('فشل حفظ النسخة: ' + res.error);
    }
  } catch(e) { alert('خطأ: ' + e); }
}

async function triggerRestore() {
  try {
    const res = await window.api.restoreDB();
    if (res.success) {
      alert('تم استعادة النسخة الاحتياطية بنجاح. سيتم إعادة تشغيل البرنامج.');
      window.location.reload();
    } else if (!res.canceled) {
      alert('فشل في استعادة النسخة: ' + res.error);
    }
  } catch (e) {
    alert('خطأ: ' + e);
  }
}
// --- i18n Language Setup ---
function changeLanguage(lang) {
  appSettings.language = lang;
  localStorage.setItem('thabit_settings', JSON.stringify(appSettings));
  window.setLanguage(lang);
  document.getElementById('setting-language').value = lang;
  
  // Re-render dynamic grids so that t() evaluates with the new language
  if (typeof renderBankAccountsGrid === 'function') renderBankAccountsGrid();
  if (typeof populateBankDropdowns === 'function') populateBankDropdowns();
  if (typeof renderBankTransactionsTable === 'function') renderBankTransactionsTable();
  if (typeof loadUsersList === 'function') loadUsersList();
  if (typeof renderClosingReports === 'function') renderClosingReports();
}
async function loadSettingsPartners() {
  const partners = await window.api.getSettingsPartners();
  const tbody = document.getElementById('settings-partners-tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  partners.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.phone || '-'}</td>
      <td>
        <button class="btn-primary" onclick="editSettingsPartner('${p.id}', '${p.name}', '${p.phone || ''}')" style="padding:4px 8px; font-size:11px; margin:0;">تعديل</button>
        <button class="btn-secondary" onclick="deleteSettingsPartner('${p.name}')" style="padding:4px 8px; font-size:11px; margin:0; background:var(--red); color:white; border:none;">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editSettingsPartner(id, name, phone) {
  document.getElementById('edit-partner-id').value = id === 'null' ? '' : id;
  document.getElementById('edit-partner-oldname').value = name;
  document.getElementById('new-settings-partner-name').value = name;
  document.getElementById('new-settings-partner-phone').value = phone;
  document.getElementById('btn-save-settings-partner').textContent = 'تحديث';
  document.getElementById('btn-cancel-edit-partner').style.display = 'inline-block';
}

function cancelEditSettingsPartner() {
  document.getElementById('edit-partner-id').value = '';
  document.getElementById('edit-partner-oldname').value = '';
  document.getElementById('new-settings-partner-name').value = '';
  document.getElementById('new-settings-partner-phone').value = '';
  document.getElementById('btn-save-settings-partner').textContent = 'إضافة / حفظ';
  document.getElementById('btn-cancel-edit-partner').style.display = 'none';
}

async function saveSettingsPartner() {
  const oldName = document.getElementById('edit-partner-oldname').value;
  const newName = document.getElementById('new-settings-partner-name').value.trim();
  const phone = document.getElementById('new-settings-partner-phone').value.trim();
  if (!newName) return alert('يرجى إدخال اسم الشريك');

  let res;
    try {
      res = await window.api.updatePartner({ oldName, newName, phone });
    } catch(e) {
      return alert('خطأ في الاتصال بالخلفية: ' + e.message + '\nيرجى إغلاق البرنامج بالكامل وفتحه من جديد.');
    }
  if (res.success) {
    cancelEditSettingsPartner();
    loadSettingsPartners();
    
    // Also refresh the dropdown in vouchers if it's visible
    const group = document.getElementById('voucher-partner-group');
    if (group && group.style.display !== 'none') {
        toggleVoucherPartnerField();
    }
  } else {
    alert('حدث خطأ: ' + res.error);
  }
}

async function deleteSettingsPartner(name) {
  if (confirm('هل أنت متأكد من حذف هذا الشريك؟ لن يتم حذف عملياته السابقة، بل سيتم إزالته من القائمة فقط.')) {
    const res = await window.api.deletePartner(name);
    if (res.success) loadSettingsPartners();
    else alert('حدث خطأ: ' + res.error);
  }
}