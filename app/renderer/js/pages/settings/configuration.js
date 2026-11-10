import { saveSettings, triggerBackup, triggerRestore, triggerCloudBackup, fetchCloudBackups, triggerCloudRestore, resetDatabase, updateExistingPartner, createOrUpdateCashier } from './api.js';
import { showToast } from '../../core/notifications.js';
import { showConfirm, showModal } from '../../components/modal.js';
import { applyPreferences, cachePreferences } from '../../core/preferences.js';

let appSettings = {};

export function bindConfigurationEvents() {
  // Wire Theme & Language
    const themeToggle = document.getElementById('setting-theme-toggle');
    if (themeToggle) {
      themeToggle.checked = appSettings.isLightMode === true;
      themeToggle.addEventListener('change', handleThemeToggle);
    }
  
    const langSelect = document.getElementById('setting-language');
    if (langSelect) {
      langSelect.value = typeof window.currentLang === 'function'
        ? window.currentLang()
        : (appSettings.language || 'ar');
      langSelect.addEventListener('change', handleLanguageChange);
    }
  
    // Wire buttons
    document.getElementById('btn-trigger-backup').addEventListener('click', handleBackup);
    document.getElementById('btn-trigger-restore').addEventListener('click', handleRestore);
    document.getElementById('btn-trigger-cloud-backup').addEventListener('click', handleCloudBackup);
    document.getElementById('btn-trigger-cloud-restore').addEventListener('click', handleCloudRestore);
    document.getElementById('btn-cloud-connect').addEventListener('click', handleCloudConnect);
    document.getElementById('btn-cloud-disconnect').addEventListener('click', handleCloudDisconnect);
    document.getElementById('btn-save-commissions').addEventListener('click', handleSaveCommissions);
    document.getElementById('btn-save-company-info').addEventListener('click', handleSaveCompanyInfo);
    document.getElementById('btn-clear-all-data').addEventListener('click', handleClearAllData);
  
    document.getElementById('setting-logo-upload').addEventListener('change', handleLogoUpload);
  
    window.selectBackupPath = async function() {
      try {
        const path = await window.api.selectBackupDirectory();
        if (path) {
          document.getElementById('setting-backup-path').value = path;
        }
      } catch (e) {
        console.error('Failed to select backup path:', e);
      }
    };
  
    window.clearBackupPath = function() {
      const el = document.getElementById('setting-backup-path');
      if (el) el.value = '';
    };
}

export async function loadConfigurations() {
  try {
    appSettings = window.appSettings || {};
    // Load inputs
    document.getElementById('setting-company-name').value = appSettings.companyName || '';
    document.getElementById('setting-tax-number').value = appSettings.taxNumber || '';
    document.getElementById('setting-address').value = appSettings.address || '';
    document.getElementById('setting-phone').value = appSettings.phone || '';
    document.getElementById('setting-salary-accrual-day').value = appSettings.salaryAccrualDay || 28;
    document.getElementById('setting-vat-enabled').checked = appSettings.vatEnabled === true;
    document.getElementById('setting-vat-rate').value = Number.isFinite(Number(appSettings.vatRate))
      ? Number(appSettings.vatRate)
      : 15;
    document.getElementById('setting-grab-commission').value = appSettings.grabCommission || 0;
    document.getElementById('setting-lineman-commission').value = appSettings.linemanCommission || 0;
    document.getElementById('setting-currency').value = appSettings.currency || '';
    document.getElementById('setting-backup-path').value = appSettings.backupPath || '';

    // One-time migration for legacy data in localStorage
    const saved = localStorage.getItem('thabit_settings');
    if (saved) {
      try {
        const parsedLegacy = JSON.parse(saved);
        let changed = false;
        
        if (parsedLegacy.partners && Array.isArray(parsedLegacy.partners)) {
          for (let p of parsedLegacy.partners) {
            await updateExistingPartner({ oldName: p.name, newName: p.name, phone: p.phone || '' }).catch(()=>{});
          }
          delete parsedLegacy.partners;
          changed = true;
        }

        if (parsedLegacy.cashiers && Array.isArray(parsedLegacy.cashiers)) {
          for (let c of parsedLegacy.cashiers) {
            await createOrUpdateCashier({ id: c.id, name: c.name, active_user: c.activeUser || c.active_user || 'admin' }).catch(()=>{});
          }
          delete parsedLegacy.cashiers;
          changed = true;
        }

        if (changed) {
          localStorage.setItem('thabit_settings', JSON.stringify(parsedLegacy));
          if (window.api && window.api.saveAppSettings) {
            await window.api.saveAppSettings(parsedLegacy).catch(()=>{});
          }
        }
      } catch (e) {
        console.error("Migration error from localStorage:", e);
      }
    }

    if (appSettings.logo) {
      const preview = document.getElementById('setting-logo-preview');
      preview.innerHTML = `<img src="${appSettings.logo}" style="width:100%; height:auto;">`;
      preview.style.display = 'block';
    }

    await updateCloudUIStatus();
  } catch (err) {
    console.error('Failed to load configuration:', err);
  }
}

function persistUiPreferences() {
  window.appSettings = { ...(window.appSettings || {}), ...appSettings };
  cachePreferences(window.appSettings);
  applyPreferences(window.appSettings);
  void saveSettings(window.appSettings)
    .then(() => {
      if (window.api && typeof window.api.notifyDataChanged === 'function') {
        void window.api.notifyDataChanged({
          type: 'ui-preferences',
          language: window.appSettings.language,
          isLightMode: window.appSettings.isLightMode
        });
      }
    })
    .catch(error => {
      console.error('Failed to persist UI preferences:', error);
      showToast(t('settings_persist_failed'), 'error');
    });
  if (window.api && typeof window.api.notifyDataChanged === 'function') {
    void window.api.notifyDataChanged({
      type: 'ui-preferences',
      language: window.appSettings.language,
      isLightMode: window.appSettings.isLightMode
    });
  }
}

function handleThemeToggle(event) {
  appSettings.isLightMode = event.target.checked;
  persistUiPreferences();
}

function handleLanguageChange(event) {
  appSettings.language = event.target.value === 'en' ? 'en' : 'ar';
  persistUiPreferences();
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

async function handleBackup() {
  try {
    const res = await triggerBackup();
    if (res && res.success) {
    showToast(t('local_backup_success'), 'success');
    }
  } catch (err) {
    showToast(`${t('local_backup_failed')}: ${err.message}`, 'error');
  }
}

async function handleRestore() {
  try {
    const res = await triggerRestore();
    if (res && res.success) {
      showToast(t('local_restore_success'), 'success');
    }
  } catch (err) {
    showToast(`${t('local_restore_failed')}: ${err.message}`, 'error');
  }
}

async function updateCloudUIStatus() {
  if (window.api && window.api.getCloudStatus) {
    try {
      const status = await window.api.getCloudStatus();
      const badge = document.getElementById('cloud-status-badge');
      const lastBackupEl = document.getElementById('cloud-last-backup');
      const btnConnect = document.getElementById('btn-cloud-connect');
      const btnDisconnect = document.getElementById('btn-cloud-disconnect');
      const actionsContainer = document.getElementById('cloud-actions-container');
      
      if (status.isConnected) {
      badge.textContent = t('cloud_connected');
        badge.style.background = '#e6f4ea';
        badge.style.color = '#137333';
        btnConnect.style.display = 'none';
        btnDisconnect.style.display = 'block';
        actionsContainer.style.opacity = '1';
        actionsContainer.style.pointerEvents = 'auto';
        
        if (status.lastBackupDate) {
          const dateStr = new Date(status.lastBackupDate).toLocaleString(window.currentLang?.() === 'en' ? 'en-US' : 'ar-SA');
        lastBackupEl.textContent = `${t('cloud_last_backup')}: ${dateStr}`;
          lastBackupEl.style.display = 'block';
        } else {
          lastBackupEl.style.display = 'none';
        }
      } else {
      badge.textContent = t('cloud_disconnected');
        badge.style.background = '#eee';
        badge.style.color = '#666';
        btnConnect.style.display = 'block';
        btnDisconnect.style.display = 'none';
        lastBackupEl.style.display = 'none';
        actionsContainer.style.opacity = '0.5';
        actionsContainer.style.pointerEvents = 'none';
      }
    } catch(e) {}
  }
}

async function handleCloudConnect() {
  const btn = document.getElementById('btn-cloud-connect');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm" style="display:inline-block; width:1rem; height:1rem; border:0.2em solid currentColor; border-right-color:transparent; border-radius:50%; animation:spinner-border .75s linear infinite;"></span> جاري الربط...`;
  btn.disabled = true;
  try {
     const res = await fetchCloudBackups();
     if (res && res.success) {
      showToast(t('cloud_connect_success'), 'success');
       await updateCloudUIStatus();
      } else {
        if (res?.code === 'GOOGLE_DRIVE_AUTH_TIMEOUT') {
          showToast(res.message, 'error');
        } else {
          showToast(`${t('cloud_connect_failed')}: ${res?.message || 'Unknown error'}`, 'error');
        }
      }
  } catch(e) {
     if (e?.code === 'GOOGLE_DRIVE_AUTH_TIMEOUT') {
         showToast(e.message, 'error');
     } else {
    showToast(`${t('cloud_connect_failed')}: ${e.message}`, 'error');
     }
  } finally {
     btn.innerHTML = originalText;
     btn.disabled = false;
  }
}

async function handleCloudDisconnect() {
  const confirmed = await showConfirm(t('cloud_disconnect_title'), t('cloud_disconnect_confirm'));
  if (!confirmed) return;
  if (window.api && window.api.disconnectCloud) {
    await window.api.disconnectCloud();
    showToast(t('cloud_disconnect_success'), 'success');
    await updateCloudUIStatus();
  }
}

async function handleCloudBackup() {
  const btn = document.getElementById('btn-trigger-cloud-backup');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm" style="display:inline-block; width:1rem; height:1rem; border:0.2em solid currentColor; border-right-color:transparent; border-radius:50%; animation:spinner-border .75s linear infinite;"></span> ${t('cloud_backup_uploading')}`;
  btn.disabled = true;

  try {
    const res = await triggerCloudBackup();
    if (res && res.success) {
      showToast(t('cloud_backup_success'), 'success');
      await updateCloudUIStatus();
    } else {
      const errorKey = res?.code === 'GOOGLE_DRIVE_NOT_CONFIGURED'
        ? 'cloud_backup_not_configured'
        : res?.code === 'BACKUP_DATABASE_NOT_FOUND'
          ? 'cloud_backup_database_missing'
          : res?.code === 'GOOGLE_DRIVE_API_FORBIDDEN' || res?.code === 'GOOGLE_DRIVE_AUTH_REQUIRED'
            ? 'cloud_backup_api_forbidden'
          : 'cloud_backup_failed';
      showToast(t(errorKey) + (errorKey === 'cloud_backup_failed' && res?.message ? `: ${res.message}` : ''), 'error');
    }
  } catch (err) {
    showToast(`${t('cloud_backup_failed')}: ${err.message}`, 'error');
  } finally {
    btn.innerHTML = originalText;
    window.applyTranslations?.(btn);
    btn.disabled = false;
  }
}

function chooseCloudBackup(backups) {
  return new Promise(resolve => {
    const content = document.createElement('div');
    const hint = document.createElement('p');
    hint.textContent = t('cloud_restore_select_hint');
    content.appendChild(hint);

    const select = document.createElement('select');
    select.className = 'form-control form-select';
    select.style.width = '100%';
    backups.forEach(backup => {
      const option = document.createElement('option');
      option.value = backup.id;
      const dateValue = backup.modifiedTime || backup.createdTime;
      const date = dateValue ? new Date(dateValue).toLocaleString(window.currentLang?.() === 'en' ? 'en-US' : 'ar-SA') : '—';
      const size = backup.size ? `${(backup.size / 1024 / 1024).toFixed(2)} MB` : '—';
      option.textContent = `${backup.name} — ${date} — ${size}`;
      select.appendChild(option);
    });
    content.appendChild(select);

    showModal(t('cloud_restore_select_title'), content, {
      onConfirm: () => resolve(select.value || null),
      onCancel: () => resolve(null),
      showCancel: true
    });
  });
}

async function handleCloudRestore() {
  const btn = document.getElementById('btn-trigger-cloud-restore');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm" style="display:inline-block; width:1rem; height:1rem; border:0.2em solid currentColor; border-right-color:transparent; border-radius:50%; animation:spinner-border .75s linear infinite;"></span> ${t('cloud_restore_loading')}`;
  btn.disabled = true;

  try {
    const listResult = await fetchCloudBackups();
    if (!listResult?.success) {
      const key = listResult?.code === 'GOOGLE_DRIVE_NOT_CONFIGURED'
        ? 'cloud_backup_not_configured'
        : listResult?.code === 'GOOGLE_DRIVE_API_FORBIDDEN' || listResult?.code === 'GOOGLE_DRIVE_AUTH_REQUIRED'
          ? 'cloud_backup_api_forbidden'
          : 'cloud_restore_list_failed';
      showToast(t(key), 'error');
      return;
    }
    if (!listResult.backups?.length) {
      showToast(t('cloud_restore_empty'), 'error');
      return;
    }

    const fileId = await chooseCloudBackup(listResult.backups);
    if (!fileId) return;
    const confirmed = await showConfirm(t('cloud_restore_confirm_title'), t('cloud_restore_confirm_message'));
    if (!confirmed) return;

    btn.innerHTML = `<span class="spinner-border spinner-border-sm" style="display:inline-block; width:1rem; height:1rem; border:0.2em solid currentColor; border-right-color:transparent; border-radius:50%; animation:spinner-border .75s linear infinite;"></span> ${t('cloud_restore_restoring')}`;
    const restoreResult = await triggerCloudRestore(fileId);
    if (restoreResult?.success) {
      showToast(t('cloud_restore_success'), 'success');
      return;
    }
    const key = restoreResult?.code === 'CLOUD_BACKUP_INVALID_DATABASE'
      ? 'cloud_restore_invalid_database'
      : restoreResult?.code === 'CLOUD_BACKUP_INVALID_FILE' || restoreResult?.code === 'CLOUD_BACKUP_FILE_NOT_FOUND'
        ? 'cloud_restore_invalid_file'
        : 'cloud_restore_failed';
    showToast(t(key), 'error');
  } catch (error) {
    showToast(`${t('cloud_restore_failed')}: ${error.message}`, 'error');
  } finally {
    btn.innerHTML = originalText;
    window.applyTranslations?.(btn);
    btn.disabled = false;
  }
}

async function handleSaveCommissions() {
  appSettings.grabCommission = parseFloat(document.getElementById('setting-grab-commission').value) || 0;
  appSettings.linemanCommission = parseFloat(document.getElementById('setting-lineman-commission').value) || 0;

  try {
    localStorage.setItem('thabit_settings', JSON.stringify(appSettings));
    await saveSettings(appSettings);
    window.appSettings = appSettings;
    showToast(t('commissions_save_success'), 'success');
  } catch (err) {
    showToast(`${t('commissions_save_failed')}: ${err.message}`, 'error');
  }
}

async function handleSaveCompanyInfo() {
  appSettings.companyName = document.getElementById('setting-company-name').value.trim();
  appSettings.taxNumber = document.getElementById('setting-tax-number').value.trim();
  appSettings.address = document.getElementById('setting-address').value.trim();
  appSettings.phone = document.getElementById('setting-phone').value.trim();
  appSettings.currency = document.getElementById('setting-currency').value.trim() || '';
  appSettings.backupPath = document.getElementById('setting-backup-path').value.trim();
  const salaryAccrualDayInput = parseInt(document.getElementById('setting-salary-accrual-day').value, 10);
  appSettings.salaryAccrualDay = Number.isInteger(salaryAccrualDayInput)
    ? Math.min(31, Math.max(1, salaryAccrualDayInput))
    : 28;
  appSettings.vatEnabled = document.getElementById('setting-vat-enabled').checked;
  const vatRateInput = Number(document.getElementById('setting-vat-rate').value);
  appSettings.vatRate = Number.isFinite(vatRateInput)
    ? Math.min(100, Math.max(0, vatRateInput))
    : 15;

  try {
    localStorage.setItem('thabit_settings', JSON.stringify(appSettings));
    await saveSettings(appSettings);
    window.appSettings = appSettings;
    document.querySelectorAll('.sys-currency').forEach(element => {
      element.textContent = appSettings.currency;
    });

    // Apply header text dynamically
    const h1 = document.querySelector('.header-info h1');
    if (h1) h1.innerText = appSettings.companyName;

    const logoImg = document.querySelector('.logo-box img');
    if (logoImg && appSettings.logo) {
      logoImg.src = appSettings.logo;
    }

    if (window.api && typeof window.api.notifyDataChanged === 'function') {
      void window.api.notifyDataChanged({ type: 'company-info' });
    }

    showToast(t('company_info_save_success'), 'success');
  } catch (err) {
    showToast(`${t('company_info_save_failed')}: ${err.message}`, 'error');
  }
}

async function handleClearAllData() {
  const confirmed = await showConfirm(t('clear_data_title'), t('clear_data_confirm'));
  if (!confirmed) return;

  try {
    const res = await resetDatabase();
    if (res && res.success) {
      showToast(t('clear_data_success'), 'success');
      localStorage.removeItem('thabit_settings');
      window.setTimeout(() => window.location.reload(), 250);
    } else {
      throw new Error(res?.error || 'تعذر مسح البيانات');
    }
  } catch (err) {
    showToast(`${t('clear_data_failed')}: ${err.message}`, 'error');
  }
}
