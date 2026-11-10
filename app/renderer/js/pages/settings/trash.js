import { showToast } from '../../core/notifications.js';

let trashItems = [];
const entityKeys = {
  BankAccounts: 'audit_table_bank_accounts', BankTransactions: 'audit_table_bank_transactions',
  suppliers: 'menu_suppliers', supplier_transactions: 'supplier_transactions_label',
  employees: 'menu_employees', employee_transactions: 'employee_transactions_label',
  CashGeneralVouchers: 'general_vouchers_label',
  daily_reports: 'sales_vouchers_label',
  expenses: 'purchase_vouchers_label'
};

function formatDate(value) {
  const date = new Date(String(value || '').replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
}

function renderTrash() {
  const tbody = document.getElementById('trash-items-tbody');
  if (!tbody) return;
  const query = document.getElementById('trash-search')?.value.trim().toLocaleLowerCase() || '';
  const items = trashItems.filter(item => `${item.display_name || ''} ${item.entity_type || ''} ${item.deleted_by || ''}`.toLocaleLowerCase().includes(query));
  const count = document.getElementById('trash-count');
  if (count) count.textContent = String(items.length);
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="settings-table-message">${window.escapeHTML(t('trash_empty'))}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(item => `<tr>
    <td><strong>${window.escapeHTML(item.display_name || `#${item.record_id}`)}</strong><small class="trash-record-id">#${window.escapeHTML(String(item.record_id || '—'))}</small></td>
    <td>${window.escapeHTML(entityKeys[item.entity_type] ? t(entityKeys[item.entity_type]) : item.entity_type)}</td>
    <td dir="ltr">${formatDate(item.deleted_at)}</td><td>${window.escapeHTML(item.deleted_by || 'System')}</td>
    <td class="trash-actions"><button class="btn-secondary trash-restore" data-id="${item.id}">${window.escapeHTML(t('trash_restore'))}</button><button class="btn-danger trash-purge" data-id="${item.id}">${window.escapeHTML(t('trash_delete_forever'))}</button></td>
  </tr>`).join('');
}

export async function loadTrashItems() {
  try {
    const result = await window.api.getTrashItems(window.currentYearId || 1);
    trashItems = Array.isArray(result) ? result : [];
    renderTrash();
  } catch (error) {
    showToast(t('trash_load_error'), 'error');
  }
}

export function bindTrash() {
  const refresh = document.getElementById('trash-refresh');
  if (!refresh || refresh.dataset.bound === 'true') return;
  document.getElementById('trash-search')?.addEventListener('input', renderTrash);
  refresh.addEventListener('click', loadTrashItems);
  document.getElementById('trash-items-tbody')?.addEventListener('click', async event => {
    const restore = event.target.closest('.trash-restore');
    const purge = event.target.closest('.trash-purge');
    if (!restore && !purge) return;
    const id = Number((restore || purge).dataset.id);
    if (purge && !await window.api.confirmDialog(t('trash_confirm_delete'))) return;
    try {
      const result = restore ? await window.api.restoreTrashItem(id) : await window.api.permanentlyDeleteTrashItem(id);
      if (result?.success === false) throw new Error(result.error);
      showToast(t(restore ? 'trash_restored' : 'trash_deleted_forever_success'), 'success');
      await loadTrashItems();
    } catch (error) { showToast(error.message || t('operation_failed'), 'error'); }
  });
  refresh.dataset.bound = 'true';
}
