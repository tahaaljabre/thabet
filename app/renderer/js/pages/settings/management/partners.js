import { fetchPartners, updateExistingPartner, removePartner } from '../api.js';
import { showToast } from '../../../core/notifications.js';
import { showConfirm } from '../../../components/modal.js';
import { createElement, clearElement } from '../../../core/dom.js';

let allPartners = [];
let editingPartnerId = null;
// Partners CRUD
export async function loadPartnersList() {
  const tbody = document.getElementById('settings-partners-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" class="settings-table-message">جاري تحميل الشركاء...</td></tr>';

  try {
    const result = await fetchPartners();
    if (result && result.success === false) {
      throw new Error(result.error || 'تعذر جلب الشركاء');
    }

    // Support both the current array response and wrapped responses from older builds.
    const partners = Array.isArray(result)
      ? result
      : Array.isArray(result?.partners)
        ? result.partners
        : Array.isArray(result?.data)
          ? result.data
          : [];

    allPartners = partners.filter(p => p && p.name).sort((a, b) =>
      String(a.name).localeCompare(String(b.name), 'ar')
    );
    renderPartnersTable();
  } catch (err) {
    console.error(err);
    allPartners = [];
    renderPartnersTable(err.message || 'تعذر تحميل الشركاء');
    showToast(`${t('partners_load_failed')}: ${err.message || t('unknown_error')}`, 'error');
  }
}

function renderPartnersTable(errorMessage = '') {
  const tbody = document.getElementById('settings-partners-tbody');
  if (!tbody) return;
  clearElement(tbody);

  const count = document.getElementById('partners-count');
  if (count) count.textContent = String(allPartners.length);

  if (errorMessage || allPartners.length === 0) {
    const tr = createElement('tr');
    const td = createElement('td', {
      textContent: errorMessage || 'لا يوجد شركاء مسجلون حتى الآن',
      class: errorMessage ? 'settings-table-message is-error' : 'settings-table-message',
      colspan: '3'
    });
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  allPartners.forEach(p => {
    const tr = createElement('tr');
    tr.appendChild(createElement('td', { textContent: p.name }));
    tr.appendChild(createElement('td', { textContent: p.phone || '-' }));

    const tdActions = createElement('td');
    tdActions.style.textAlign = 'center';

    const editBtn = createElement('button', { textContent: '✏️', class: 'btn-edit', style: 'background:none; border:none; cursor:pointer; margin-right:5px;' });
    editBtn.addEventListener('click', () => editPartner(p));

    const deleteBtn = createElement('button', { textContent: '🗑️', class: 'btn-delete', style: 'background:none; border:none; cursor:pointer;' });
    deleteBtn.addEventListener('click', () => handleDeletePartner(p.id, p.name));

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function editPartner(p) {
  document.getElementById('edit-partner-id').value = p.name; // Store old name here since dashboard uses name
  document.getElementById('settings-new-partner-name').value = p.name;
  document.getElementById('settings-new-partner-phone').value = p.phone || '';
  editingPartnerId = p.id;

  const saveBtn = document.getElementById('btn-save-settings-partner');
  const cancelBtn = document.getElementById('btn-cancel-edit-partner');
  if (saveBtn) saveBtn.textContent = t('save_changes_button');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelEditPartner() {
  document.getElementById('edit-partner-id').value = '';
  document.getElementById('settings-new-partner-name').value = '';
  document.getElementById('settings-new-partner-phone').value = '';
  editingPartnerId = null;

  const saveBtn = document.getElementById('btn-save-settings-partner');
  const cancelBtn = document.getElementById('btn-cancel-edit-partner');
  if (saveBtn) saveBtn.textContent = t('add_save_button');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

async function handleSavePartner() {
  const oldName = document.getElementById('edit-partner-id').value; // Using id field as oldName since we update by name in dashboard handlers
  const newName = document.getElementById('settings-new-partner-name').value.trim();
  const phone = document.getElementById('settings-new-partner-phone').value.trim();

  if (!newName) {
    showToast(t('partner_name_required'), 'error');
    return;
  }

  try {
    const result = await updateExistingPartner({ oldName, newName, phone });
    if (result && result.success === false) {
      throw new Error(result.error || 'تعذر حفظ الشريك');
    }
    showToast(t('partner_save_success'), 'success');
    cancelEditPartner();
    await loadPartnersList();
  } catch (err) {
    showToast(`${t('save_failed')}: ${err.message}`, 'error');
  }
}

async function handleDeletePartner(id, name) {
  const confirmed = await showConfirm(t('partner_delete_title'), `${t('partner_delete_confirm_prefix')} "${name}" ${t('partner_delete_confirm_suffix')}`);
  if (!confirmed) return;

  try {
    const result = await removePartner(name);
    if (result && result.success === false) {
      throw new Error(result.error || 'تعذر حذف الشريك');
    }
    showToast(t('partner_delete_success'), 'success');
    await loadPartnersList();
  } catch (err) {
    showToast(`${t('partner_delete_failed')}: ${err.message}`, 'error');
  }
}
export function bindPartnerManagement() {
  document.getElementById('btn-save-settings-partner')?.addEventListener('click', handleSavePartner);
  document.getElementById('btn-cancel-edit-partner')?.addEventListener('click', cancelEditPartner);
}
