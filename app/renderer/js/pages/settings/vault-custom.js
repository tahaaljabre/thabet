import { showToast } from '../../core/notifications.js';

const BUILTIN_CATEGORIES = [
  { key: 'Zakat', i18nKey: 'cat_zakat' },
  { key: 'Profit Distribution', i18nKey: 'cat_profit_distribution' },
  { key: 'Partner Withdrawal', i18nKey: 'cat_partner_withdrawal' },
  { key: 'General Expense', i18nKey: 'cat_general_expense' },
  { key: 'Other', i18nKey: 'cat_other' }
];

let customCategories = [];
let cachedVouchers = [];

function normalizeCustomCategories(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  raw.forEach(item => {
    const name = typeof item === 'string' ? item.trim() : String(item?.name || '').trim();
    if (!name) return;
    const lower = name.toLocaleLowerCase('ar');
    if (seen.has(lower)) return;
    seen.add(lower);
    result.push(name);
  });
  return result;
}

function getCategoryDisplayName(key) {
  const builtin = BUILTIN_CATEGORIES.find(b => b.key === key);
  if (builtin) return window.t(builtin.i18nKey);
  return key;
}

function getPeriodBounds() {
  const fromEl = document.getElementById('vault-cat-report-from');
  const toEl = document.getElementById('vault-cat-report-to');
  const from = fromEl?.value || '';
  const to = toEl?.value || '';
  return { from, to };
}

function getFilteredVouchers() {
  const { from, to } = getPeriodBounds();
  return cachedVouchers.filter(v => {
    if (!v.voucher_date) return false;
    if (from && v.voucher_date < from) return false;
    if (to && v.voucher_date > to) return false;
    return true;
  });
}

function buildCategoriesStats() {
  const filtered = getFilteredVouchers();
  const builtinKeys = new Set(BUILTIN_CATEGORIES.map(b => b.key));
  const customSet = new Set(customCategories);

  // Also include any custom category that has historical vouchers
  cachedVouchers.forEach(v => {
    const cat = String(v.category || '').trim();
    if (cat && !builtinKeys.has(cat) && !customSet.has(cat)) {
      customSet.add(cat);
    }
  });

  const rows = [];

  // 1. Custom categories at the top
  Array.from(customSet).forEach(catName => {
    const matching = filtered.filter(v => String(v.category || '').trim() === catName);
    const total = matching.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
    rows.push({
      key: catName,
      label: catName,
      isCustom: customCategories.includes(catName),
      count: matching.length,
      total,
      vouchers: matching
    });
  });

  // 2. Built-in categories below
  BUILTIN_CATEGORIES.forEach(b => {
    const matching = filtered.filter(v => String(v.category || '').trim() === b.key);
    const total = matching.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
    rows.push({
      key: b.key,
      label: getCategoryDisplayName(b.key),
      isCustom: false,
      count: matching.length,
      total,
      vouchers: matching
    });
  });

  return rows;
}

function renderVaultCustomTable() {
  const tbody = document.getElementById('vault-custom-cats-tbody');
  if (!tbody) return;

  const currency = window.appSettings?.currency || '';
  const rows = buildCategoriesStats();

  tbody.innerHTML = rows.map((row, idx) => {
    const badgeStyle = row.isCustom
      ? 'background: rgba(16, 185, 129, 0.14); color: var(--green2); border: 1px solid rgba(16, 185, 129, 0.3);'
      : 'background: rgba(148, 163, 184, 0.14); color: var(--muted); border: 1px solid var(--border-color);';
    const typeLabel = window.t(row.isCustom ? 'vault_custom_type_custom' : 'vault_custom_type_default');

    return `
      <tr data-cat-index="${idx}">
        <td style="font-weight: 800; color: var(--text-color);">${window.escapeHTML(row.label)}</td>
        <td>
          <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; ${badgeStyle}">
            ${window.escapeHTML(typeLabel)}
          </span>
        </td>
        <td style="text-align: center; font-weight: 700;">${row.count}</td>
        <td style="font-weight: 800; color: ${row.total > 0 ? 'var(--red)' : 'var(--muted)'};" dir="ltr">
          ${currency}${row.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td>
          <div style="display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn-secondary btn-print-vault-cat" data-cat-key="${window.escapeHTML(row.key)}" style="padding: 4px 10px; font-size: 11px;">
              ${window.t('vault_custom_print_btn')}
            </button>
            ${row.isCustom ? `
              <button type="button" class="btn-danger btn-delete-vault-cat" data-cat-key="${window.escapeHTML(row.key)}" style="padding: 4px 8px; font-size: 11px;">
                🗑️ ${window.t('delete_button')}
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function persistCustomCategories(nextCategories, toastKey) {
  const settings = await window.api.getAppSettings();
  settings.vaultCustomCategories = nextCategories;
  await window.api.saveAppSettings(settings);
  window.appSettings = settings;
  customCategories = [...nextCategories];
  window.dispatchEvent(new CustomEvent('vaultCategoriesChanged', { detail: customCategories }));
  if (typeof window.refreshVaultCategorySelect === 'function') {
    window.refreshVaultCategorySelect();
  }
  if (window.api && typeof window.api.notifyDataChanged === 'function') {
    void window.api.notifyDataChanged({ type: 'vault-categories', vaultCustomCategories: customCategories });
  }
  if (toastKey) {
    showToast(window.t(toastKey), 'success');
  }
  renderVaultCustomTable();
}

async function handleAddVaultCategory() {
  const input = document.getElementById('vault-custom-cat-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    showToast(window.t('vault_custom_name_required'), 'warning');
    input.focus();
    return;
  }

  const lower = name.toLocaleLowerCase('ar');
  const existsInCustom = customCategories.some(c => c.toLocaleLowerCase('ar') === lower);
  const existsInBuiltin = BUILTIN_CATEGORIES.some(
    b => b.key.toLowerCase() === lower || getCategoryDisplayName(b.key).toLocaleLowerCase('ar') === lower
  );
  if (existsInCustom || existsInBuiltin) {
    showToast(window.t('vault_custom_exists_warning'), 'warning');
    return;
  }

  const next = [name, ...customCategories];
  await persistCustomCategories(next, 'vault_custom_saved_toast');
  input.value = '';
  input.focus();
}

async function printSingleCategoryReport(catKey) {
  const rows = buildCategoriesStats();
  const target = rows.find(r => r.key === catKey);
  if (!target) return;

  const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
  const reportDir = isEn ? 'ltr' : 'rtl';
  const currency = window.appSettings?.currency || '';
  const fmt = val => `${currency}${(Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const { from, to } = getPeriodBounds();
  const periodLabel = (from || to)
    ? `${window.t('period_from')} ${from || '—'} ${window.t('period_to')} ${to || '—'}`
    : (window.currentYearName || 'كامل السنة المالية');

  const vouchers = [...target.vouchers].sort((a, b) => String(a.voucher_date).localeCompare(String(b.voucher_date)));

  const tbodyHtml = vouchers.length > 0
    ? vouchers.map((v, i) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">#${v.id}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;" dir="ltr">${v.voucher_date}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">${window.escapeHTML(v.description || '-')}${v.partner_name ? ` (${window.escapeHTML(v.partner_name)})` : ''}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${window.escapeHTML(v.created_by || '-')}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #b91c1c;" dir="ltr">${fmt(v.amount)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="6" style="padding: 18px; text-align: center; color: #64748b; border: 1px solid #cbd5e1;">${window.t('vault_custom_no_vouchers_for_cat')}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'ar'}" dir="${reportDir}">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 10px; direction: ${reportDir}; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
    th { background: #7A1A22; color: #fff; padding: 10px 8px; border: 1px solid #7A1A22; }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7A1A22; padding-bottom: 12px; margin-bottom: 16px;">
    <div>
      <div style="font-size: 22px; font-weight: 900; color: #7A1A22;">${window.escapeHTML(window.appSettings?.companyName || window.t('company_default_name'))}</div>
      <div style="font-size: 13px; color: #475569; margin-top: 4px;">
        ${window.appSettings?.address ? `${window.t('address')}: ${window.escapeHTML(window.appSettings.address)}` : ''}
        ${window.appSettings?.phone ? ` | ${window.t('phone')}: ${window.escapeHTML(window.appSettings.phone)}` : ''}
      </div>
      ${window.appSettings?.taxNumber ? `<div style="font-size: 13px; font-weight: bold; margin-top: 3px;">${window.t('tax_number')}: ${window.escapeHTML(window.appSettings.taxNumber)}</div>` : ''}
    </div>
    <div>
      ${window.appSettings?.logo ? `<img src="${window.appSettings.logo}" style="max-height: 65px;">` : ''}
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 18px;">
    <div style="display: inline-block; background: #fdf5e6; border: 2px solid #7A1A22; color: #7A1A22; padding: 6px 24px; border-radius: 8px; font-size: 18px; font-weight: 900;">
      ${window.t('vault_custom_report_doc_title')}: ${window.escapeHTML(target.label)}
    </div>
    <div style="font-size: 13px; color: #475569; margin-top: 8px; font-weight: bold;">${window.escapeHTML(periodLabel)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 45px;">#</th>
        <th style="width: 90px;">${window.t('voucher_number')}</th>
        <th style="width: 110px;">${window.t('col_date')}</th>
        <th>${window.t('th_desc')}</th>
        <th style="width: 110px;">${window.t('created_by_column')}</th>
        <th style="width: 130px;">${window.t('amount')}</th>
      </tr>
    </thead>
    <tbody>
      ${tbodyHtml}
    </tbody>
  </table>

  <div style="margin-top: 20px; padding: 14px 18px; background: #fff3e0; border: 2px solid #7A1A22; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 15px; font-weight: bold;">
    <div>${window.t('vault_custom_vouchers_count_label')}: <span>${target.count}</span></div>
    <div style="color: #b91c1c; font-size: 17px;">${window.t('vault_custom_cat_grand_total')}: <span dir="ltr">${fmt(target.total)}</span></div>
  </div>

  <div style="margin-top: 40px; display: flex; justify-content: space-around; text-align: center; font-size: 15px; font-weight: bold;">
    <div>
      <p>${window.t('accountant_sig')}</p>
      <p style="margin-top: 36px;">_______________________</p>
    </div>
    <div>
      <p>${window.t('sig_manager')}</p>
      <p style="margin-top: 36px;">_______________________</p>
    </div>
  </div>
</body>
</html>`;

  await window.api.printHtmlToPDF(html, 'A4');
}

async function printAllVaultCategoriesSummary() {
  const rows = buildCategoriesStats();
  const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
  const reportDir = isEn ? 'ltr' : 'rtl';
  const currency = window.appSettings?.currency || '';
  const fmt = val => `${currency}${(Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const { from, to } = getPeriodBounds();
  const periodLabel = (from || to)
    ? `${window.t('period_from')} ${from || '—'} ${window.t('period_to')} ${to || '—'}`
    : (window.currentYearName || 'كامل السنة المالية');

  const grandCount = rows.reduce((s, r) => s + r.count, 0);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${window.escapeHTML(r.label)}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${window.escapeHTML(window.t(r.isCustom ? 'vault_custom_type_custom' : 'vault_custom_type_default'))}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${r.count}</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; color: #b91c1c;" dir="ltr">${fmt(r.total)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'ar'}" dir="${reportDir}">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 10px; direction: ${reportDir}; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
    th { background: #7A1A22; color: #fff; padding: 10px 8px; border: 1px solid #7A1A22; }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7A1A22; padding-bottom: 12px; margin-bottom: 16px;">
    <div>
      <div style="font-size: 22px; font-weight: 900; color: #7A1A22;">${window.escapeHTML(window.appSettings?.companyName || window.t('company_default_name'))}</div>
      <div style="font-size: 13px; color: #475569; margin-top: 4px;">
        ${window.appSettings?.address ? `${window.t('address')}: ${window.escapeHTML(window.appSettings.address)}` : ''}
        ${window.appSettings?.phone ? ` | ${window.t('phone')}: ${window.escapeHTML(window.appSettings.phone)}` : ''}
      </div>
    </div>
    <div>
      ${window.appSettings?.logo ? `<img src="${window.appSettings.logo}" style="max-height: 65px;">` : ''}
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 18px;">
    <div style="display: inline-block; background: #fdf5e6; border: 2px solid #7A1A22; color: #7A1A22; padding: 6px 24px; border-radius: 8px; font-size: 18px; font-weight: 900;">
      ${window.t('vault_custom_reports_title')}
    </div>
    <div style="font-size: 13px; color: #475569; margin-top: 8px; font-weight: bold;">${window.escapeHTML(periodLabel)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 45px;">#</th>
        <th>${window.t('vault_custom_col_name')}</th>
        <th style="width: 130px;">${window.t('vault_custom_col_type')}</th>
        <th style="width: 110px;">${window.t('vault_custom_col_count')}</th>
        <th style="width: 150px;">${window.t('vault_custom_col_total')}</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div style="margin-top: 20px; padding: 14px 18px; background: #fff3e0; border: 2px solid #7A1A22; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 15px; font-weight: bold;">
    <div>${window.t('vault_custom_vouchers_count_label')}: <span>${grandCount}</span></div>
    <div style="color: #b91c1c; font-size: 17px;">${window.t('vault_custom_col_total')}: <span dir="ltr">${fmt(grandTotal)}</span></div>
  </div>
</body>
</html>`;

  await window.api.printHtmlToPDF(html, 'A4');
}

export async function loadVaultCustomCategories() {
  const settings = await window.api.getAppSettings();
  customCategories = normalizeCustomCategories(settings?.vaultCustomCategories);
  window.appSettings = { ...(window.appSettings || {}), ...settings, vaultCustomCategories: customCategories };
  if (typeof window.refreshVaultCategorySelect === 'function') {
    window.refreshVaultCategorySelect();
  }

  const activeYearId = window.currentYearId || 1;
  try {
    cachedVouchers = await window.api.getGeneralVouchers(activeYearId);
  } catch (e) {
    cachedVouchers = [];
  }
  renderVaultCustomTable();
}

export function bindVaultCustomCategories() {
  const addBtn = document.getElementById('btn-add-vault-custom-cat');
  const input = document.getElementById('vault-custom-cat-input');
  const refreshBtn = document.getElementById('btn-refresh-vault-cat-reports');
  const printAllBtn = document.getElementById('btn-print-all-vault-cats');
  const tbody = document.getElementById('vault-custom-cats-tbody');

  if (!addBtn || !tbody || tbody.dataset.bound === 'true') return;
  tbody.dataset.bound = 'true';

  addBtn.addEventListener('click', () => { void handleAddVaultCategory(); });
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleAddVaultCategory();
    }
  });

  refreshBtn?.addEventListener('click', () => { void loadVaultCustomCategories(); });
  printAllBtn?.addEventListener('click', () => { void printAllVaultCategoriesSummary(); });

  tbody.addEventListener('click', async e => {
    const printBtn = e.target.closest('.btn-print-vault-cat');
    if (printBtn) {
      const catKey = printBtn.getAttribute('data-cat-key');
      if (catKey) await printSingleCategoryReport(catKey);
      return;
    }

    const delBtn = e.target.closest('.btn-delete-vault-cat');
    if (delBtn) {
      const catKey = delBtn.getAttribute('data-cat-key');
      if (!catKey) return;
      if (!(await window.api.confirmDialog(window.t('vault_custom_delete_confirm')))) return;
      const next = customCategories.filter(c => c !== catKey);
      await persistCustomCategories(next, 'vault_custom_deleted_toast');
    }
  });
}
