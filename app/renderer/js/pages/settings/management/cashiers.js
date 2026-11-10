import { fetchCashiers, createOrUpdateCashier, removeCashier } from '../api.js';
import { showToast } from '../../../core/notifications.js';
import { showConfirm } from '../../../components/modal.js';
import { createElement, clearElement } from '../../../core/dom.js';

let allCashiers = [];
let editingCashierId = null;
// Cashier Terminals CRUD
export async function loadCashiersList() {
  try {
    const result = await fetchCashiers();
    if (result && result.error) {
      showToast(`${t('cashiers_load_failed')}: ${result.error}`, 'error');
      allCashiers = [];
    } else {
      allCashiers = Array.isArray(result) ? result : [];
    }
    renderCashiersTable();
  } catch (err) {
    console.error(err);
  }
}

function renderCashiersTable() {
  const tbody = document.getElementById('cashiers-tbody');
  if (!tbody) return;
  clearElement(tbody);

  allCashiers.forEach(c => {
    const tr = createElement('tr');
    tr.appendChild(createElement('td', { textContent: c.name }));
    tr.appendChild(createElement('td', { textContent: c.active_user }));

    const tdActions = createElement('td');
    tdActions.style.textAlign = 'center';

    const editBtn = createElement('button', { textContent: '✏️', class: 'btn-edit', style: 'background:none; border:none; cursor:pointer; margin-right:5px;' });
    editBtn.addEventListener('click', () => editCashier(c));

    const deleteBtn = createElement('button', { textContent: '🗑️', class: 'btn-delete', style: 'background:none; border:none; cursor:pointer;' });
    deleteBtn.addEventListener('click', () => handleDeleteCashier(c.id, c.name));

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function editCashier(c) {
  document.getElementById('edit-cashier-id').value = c.id;
  document.getElementById('new-cashier-name').value = c.name;
  document.getElementById('new-cashier-user').value = c.active_user;
  editingCashierId = c.id;

  const saveBtn = document.getElementById('btn-save-cashier');
  const cancelBtn = document.getElementById('btn-cancel-edit-cashier');
  if (saveBtn) saveBtn.textContent = t('save_changes_button');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelEditCashier() {
  document.getElementById('edit-cashier-id').value = '';
  document.getElementById('new-cashier-name').value = '';
  document.getElementById('new-cashier-user').value = '';
  editingCashierId = null;

  const saveBtn = document.getElementById('btn-save-cashier');
  const cancelBtn = document.getElementById('btn-cancel-edit-cashier');
  if (saveBtn) saveBtn.textContent = t('add_save_button');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

async function handleSaveCashier() {
  const name = document.getElementById('new-cashier-name').value.trim();
  const active_user = document.getElementById('new-cashier-user').value.trim();

  if (!name || !active_user) {
    showToast(t('cashier_fields_required'), 'error');
    return;
  }

  try {
    const payload = { name, active_user };
    if (editingCashierId !== null) payload.id = editingCashierId;
    
    await createOrUpdateCashier(payload);
    showToast(t('cashier_save_success'), 'success');
    cancelEditCashier();
    await loadCashiersList();
  } catch (err) {
    showToast(`${t('cashier_save_failed')}: ${err.message}`, 'error');
  }
}

async function handleDeleteCashier(id, name) {
  const confirmed = await showConfirm(t('cashier_delete_title'), `${t('cashier_delete_confirm')} "${name}"?`);
  if (!confirmed) return;

  try {
    const result = await removeCashier(id);
    if (result && result.success === false) {
      throw new Error(result.error || 'تعذر حذف الكاشير');
    }
    if (result && typeof result.changes === 'number' && result.changes === 0) {
      throw new Error('الكاشير غير موجود أو تم حذفه مسبقاً');
    }
    showToast(t('cashier_delete_success'), 'success');
    await loadCashiersList();
  } catch (err) {
    showToast(`${t('cashier_delete_failed')}: ${err.message}`, 'error');
  }
}
export function bindCashierManagement() {
  document.getElementById('btn-save-cashier')?.addEventListener('click', handleSaveCashier);
  document.getElementById('btn-cancel-edit-cashier')?.addEventListener('click', cancelEditCashier);
}
