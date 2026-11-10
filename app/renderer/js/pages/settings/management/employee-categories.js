import { fetchEmployeeCategories, createOrUpdateEmployeeCategory, removeEmployeeCategory } from '../api.js';
import { showToast } from '../../../core/notifications.js';
import { showConfirm } from '../../../components/modal.js';
import { createElement, clearElement } from '../../../core/dom.js';

let allCategories = [];
let editingCategoryId = null;

export async function loadEmployeeCategoriesList() {
  const tbody = document.getElementById('settings-employee-categories-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="settings-table-message">${t('loading_employee_categories')}</td></tr>`;

  try {
    const result = await fetchEmployeeCategories();
    allCategories = Array.isArray(result) ? result : [];
    renderCategoriesTable();
  } catch (err) {
    console.error(err);
    allCategories = [];
    renderCategoriesTable(err.message || t('employee_categories_load_failed'));
    showToast(`${t('employee_categories_load_failed')}: ${err.message || t('unknown_error')}`, 'error');
  }
}

function renderCategoriesTable(errorMessage = '') {
  const tbody = document.getElementById('settings-employee-categories-tbody');
  if (!tbody) return;
  clearElement(tbody);

  const count = document.getElementById('employee-categories-count');
  if (count) count.textContent = String(allCategories.length);

  if (errorMessage || allCategories.length === 0) {
    const tr = createElement('tr');
    const td = createElement('td', {
      textContent: errorMessage || t('no_employee_categories_registered'),
      class: errorMessage ? 'settings-table-message is-error' : 'settings-table-message',
      colspan: '3'
    });
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  allCategories.forEach(cat => {
    const tr = createElement('tr');
    tr.appendChild(createElement('td', { textContent: cat.name }));
    tr.appendChild(createElement('td', { textContent: String(cat.employee_count ?? 0) }));

    const tdActions = createElement('td');
    tdActions.style.textAlign = 'center';

    const editBtn = createElement('button', {
      textContent: '✏️',
      class: 'btn-edit',
      title: t('edit_title'),
      style: 'background:none; border:none; cursor:pointer; margin-right:5px;'
    });
    editBtn.addEventListener('click', () => editCategory(cat));

    const deleteBtn = createElement('button', {
      textContent: '🗑️',
      class: 'btn-delete',
      title: t('delete_title'),
      style: 'background:none; border:none; cursor:pointer;'
    });
    deleteBtn.addEventListener('click', () => handleDeleteCategory(cat.id, cat.name));

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function editCategory(cat) {
  document.getElementById('edit-employee-category-id').value = cat.id;
  document.getElementById('settings-new-employee-category-name').value = cat.name;
  editingCategoryId = cat.id;

  const saveBtn = document.getElementById('btn-save-employee-category');
  const cancelBtn = document.getElementById('btn-cancel-edit-employee-category');
  if (saveBtn) saveBtn.textContent = t('save_changes_button');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelEditCategory() {
  document.getElementById('edit-employee-category-id').value = '';
  document.getElementById('settings-new-employee-category-name').value = '';
  editingCategoryId = null;

  const saveBtn = document.getElementById('btn-save-employee-category');
  const cancelBtn = document.getElementById('btn-cancel-edit-employee-category');
  if (saveBtn) saveBtn.textContent = t('add_save_button');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

async function handleSaveCategory() {
  const nameInput = document.getElementById('settings-new-employee-category-name');
  const name = nameInput ? nameInput.value.trim() : '';

  if (!name) {
    showToast(t('employee_category_name_required'), 'error');
    return;
  }

  try {
    const payload = { name };
    if (editingCategoryId !== null) payload.id = editingCategoryId;
    await createOrUpdateEmployeeCategory(payload);
    showToast(t('employee_category_save_success'), 'success');
    cancelEditCategory();
    await loadEmployeeCategoriesList();
    if (typeof window.loadEmployees === 'function') await window.loadEmployees();
  } catch (err) {
    showToast(`${t('save_failed')}: ${err.message}`, 'error');
  }
}

async function handleDeleteCategory(id, name) {
  const confirmed = await showConfirm(
    t('employee_category_delete_title'),
    `${t('employee_category_delete_confirm_prefix')} "${name}" ${t('employee_category_delete_confirm_suffix')}`
  );
  if (!confirmed) return;

  try {
    await removeEmployeeCategory(id);
    showToast(t('employee_category_delete_success'), 'success');
    if (editingCategoryId === id) cancelEditCategory();
    await loadEmployeeCategoriesList();
    if (typeof window.loadEmployees === 'function') await window.loadEmployees();
  } catch (err) {
    showToast(`${t('delete_failed')}: ${err.message}`, 'error');
  }
}

export function bindEmployeeCategoriesManagement() {
  document.getElementById('btn-save-employee-category')?.addEventListener('click', handleSaveCategory);
  document.getElementById('btn-cancel-edit-employee-category')?.addEventListener('click', cancelEditCategory);
}

