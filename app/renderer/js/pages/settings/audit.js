import { showToast } from '../../core/notifications.js';

let auditLogs = [];

const tableTranslationKeys = {
  daily_reports: 'menu_customers',
  suppliers: 'menu_suppliers',
  supplier_transactions: 'supplier_transactions_label',
  employees: 'menu_employees',
  employee_transactions: 'employee_transactions_label',
  CashGeneralVouchers: 'general_vouchers_label',
  FinancialYears: 'financial_years_label',
  BankAccounts: 'audit_table_bank_accounts',
  BankTransactions: 'audit_table_bank_transactions',
  BankSalesMapping: 'audit_table_bank_mappings',
  expenses: 'audit_table_expenses',
  settings: 'audit_table_settings'
};

const actionTranslationKeys = {
  INSERT: 'audit_action_insert',
  UPDATE: 'audit_action_update',
  DELETE: 'audit_action_delete',
  CANCEL: 'audit_action_cancel',
  CLOSE_YEAR: 'audit_action_close_year',
  REOPEN_YEAR: 'audit_action_reopen_year',
  CLOSE_PERIOD: 'audit_action_close_period',
  REOPEN_PERIOD: 'audit_action_reopen_period',
  RESTORE: 'audit_action_restore',
  PURGE: 'audit_action_purge'
};

function formatAuditDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return window.escapeHTML(String(value));
  return date.toLocaleString('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}

function translatedAction(action) {
  const key = actionTranslationKeys[action];
  return key ? t(key) : action || '—';
}

function translatedTable(tableName) {
  const key = tableTranslationKeys[tableName];
  return key ? t(key) : tableName || '—';
}

function actionClass(action) {
  if (action === 'DELETE' || action === 'PURGE') return 'is-delete';
  if (action === 'INSERT') return 'is-insert';
  if (action === 'RESTORE') return 'is-insert';
  if (action === 'CLOSE_YEAR' || action === 'REOPEN_YEAR') return 'is-critical';
  return 'is-update';
}

function renderAuditLogs() {
  const tbody = document.getElementById('audit-logs-tbody');
  if (!tbody) return;
  const query = document.getElementById('audit-search')?.value.trim().toLocaleLowerCase() || '';
  const action = document.getElementById('audit-action-filter')?.value || '';
  const user = document.getElementById('audit-user-filter')?.value || '';
  const filtered = auditLogs.filter(log => {
    if (action && log.action_type !== action) return false;
    if (user && log.user_name !== user) return false;
    if (!query) return true;
    return `${log.details || ''} ${log.user_name || ''} ${log.table_name || ''} ${log.record_id || ''}`.toLocaleLowerCase().includes(query);
  });

  const count = document.getElementById('audit-count');
  if (count) count.textContent = String(filtered.length);
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="settings-table-message">${window.escapeHTML(t('audit_empty'))}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(log => `
    <tr>
      <td class="audit-date" dir="ltr">${formatAuditDate(log.log_date)}</td>
      <td>${window.escapeHTML(log.user_name || 'System')}</td>
      <td><span class="audit-action-badge ${actionClass(log.action_type)}">${window.escapeHTML(translatedAction(log.action_type))}</span></td>
      <td>${window.escapeHTML(translatedTable(log.table_name))}</td>
      <td class="audit-details">${window.escapeHTML(log.details || '—')}</td>
      <td dir="ltr">${log.record_id == null ? '—' : window.escapeHTML(String(log.record_id))}</td>
    </tr>`).join('');
}

function populateAuditUsers() {
  const select = document.getElementById('audit-user-filter');
  if (!select) return;
  const selected = select.value;
  const users = [...new Set(auditLogs.map(log => log.user_name || 'System'))].sort();
  select.innerHTML = `<option value="">${window.escapeHTML(t('audit_all_users'))}</option>` + users.map(user =>
    `<option value="${window.escapeHTML(user)}">${window.escapeHTML(user)}</option>`
  ).join('');
  if (users.includes(selected)) select.value = selected;
}

export async function loadAuditLogs() {
  const tbody = document.getElementById('audit-logs-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="settings-table-message">${window.escapeHTML(t('audit_loading'))}</td></tr>`;
  try {
    const result = await window.api.getAuditLogs(window.currentYearId || 1);
    auditLogs = Array.isArray(result) ? result : [];
    populateAuditUsers();
    renderAuditLogs();
  } catch (error) {
    auditLogs = [];
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="settings-table-message">${window.escapeHTML(t('audit_load_error'))}</td></tr>`;
    showToast(t('audit_load_error'), 'error');
  }
}

export function bindAuditLog() {
  const refreshButton = document.getElementById('audit-refresh');
  if (!refreshButton || refreshButton.dataset.auditBound === 'true') return;
  document.getElementById('audit-search')?.addEventListener('input', renderAuditLogs);
  document.getElementById('audit-action-filter')?.addEventListener('change', renderAuditLogs);
  document.getElementById('audit-user-filter')?.addEventListener('change', renderAuditLogs);
  refreshButton.addEventListener('click', loadAuditLogs);
  refreshButton.dataset.auditBound = 'true';
}
