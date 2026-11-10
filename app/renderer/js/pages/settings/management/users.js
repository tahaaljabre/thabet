import { fetchUsers, createNewUser, updateExistingUser, removeUser } from '../api.js';
import { showToast } from '../../../core/notifications.js';
import { showConfirm } from '../../../components/modal.js';
import { createElement, clearElement } from '../../../core/dom.js';

let allUsers = [];
let editingUserId = null;
// User List CRUD
export async function loadUsersList() {
  try {
    const result = await fetchUsers();
    if (result && result.error) {
      console.warn('Could not load users:', result.error);
      allUsers = [];
    } else if (result && result.users && Array.isArray(result.users)) {
      allUsers = result.users;
    } else {
      allUsers = Array.isArray(result) ? result : [];
    }
    renderUsersTable();
  } catch (err) {
    console.error(err);
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  clearElement(tbody);

  allUsers.forEach(user => {
    const tr = createElement('tr');
    tr.appendChild(createElement('td', { textContent: user.username }));
    tr.appendChild(createElement('td', { textContent: user.role === 'manager' ? 'مدير النظام' : 'كاشير / مدخل بيانات' }));

    const tdActions = createElement('td');
    tdActions.style.textAlign = 'center';

    const editBtn = createElement('button', { textContent: '✏️', class: 'btn-edit', style: 'background:none; border:none; cursor:pointer; margin-right:5px;' });
    editBtn.addEventListener('click', () => editUser(user));

    const deleteBtn = createElement('button', { textContent: '🗑️', class: 'btn-delete', style: 'background:none; border:none; cursor:pointer;' });
    deleteBtn.addEventListener('click', () => handleDeleteUser(user.id, user.username));

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function editUser(user) {
  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('new-user-name').value = user.username;
  document.getElementById('new-user-pass').value = '';
  document.getElementById('new-user-role').value = user.role;
  document.getElementById('new-user-role').disabled = true; // Role cannot be changed during edit

  const perms = user.permissions || {};
  document.getElementById('perm-sales').checked = perms.sales !== false;
  document.getElementById('perm-employees').checked = perms.employees !== false;
  document.getElementById('perm-suppliers').checked = perms.suppliers !== false;
  document.getElementById('perm-reports').checked = perms.reports !== false;
  document.getElementById('perm-vault').checked = perms.vault === true;

  editingUserId = user.id;
  
  const saveBtn = document.getElementById('btn-save-user');
  const cancelBtn = document.getElementById('btn-cancel-edit-user');
  if (saveBtn) saveBtn.textContent = t('save_changes_button');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelEditUser() {
  document.getElementById('edit-user-id').value = '';
  document.getElementById('new-user-name').value = '';
  document.getElementById('new-user-pass').value = '';
  document.getElementById('new-user-role').value = 'cashier';
  document.getElementById('new-user-role').disabled = false;
  
  document.getElementById('perm-sales').checked = true;
  document.getElementById('perm-employees').checked = true;
  document.getElementById('perm-suppliers').checked = true;
  document.getElementById('perm-reports').checked = true;
  document.getElementById('perm-vault').checked = false;

  editingUserId = null;

  const saveBtn = document.getElementById('btn-save-user');
  const cancelBtn = document.getElementById('btn-cancel-edit-user');
  if (saveBtn) saveBtn.textContent = t('add_save_button');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

async function handleSaveUser() {
  const username = document.getElementById('new-user-name').value.trim();
  const password = document.getElementById('new-user-pass').value.trim();
  const role = document.getElementById('new-user-role').value;
  
  const permissions = {
    sales: document.getElementById('perm-sales').checked,
    employees: document.getElementById('perm-employees').checked,
    suppliers: document.getElementById('perm-suppliers').checked,
    reports: document.getElementById('perm-reports').checked,
    vault: document.getElementById('perm-vault').checked
  };

  if (!username) {
    showToast(t('username_required'), 'error');
    return;
  }

  try {
    if (editingUserId !== null) {
      await updateExistingUser(editingUserId, username, password || null, permissions);
      showToast(t('user_update_success'), 'success');
    } else {
      if (!password) {
      showToast(t('new_user_password_required'), 'error');
        return;
      }
      await createNewUser(username, password, role, permissions);
      showToast(t('user_add_success'), 'success');
    }
    cancelEditUser();
    await loadUsersList();
  } catch (err) {
    showToast(`${t('user_save_failed')}: ${err.message}`, 'error');
  }
}

async function handleDeleteUser(id, username) {
  const confirmed = await showConfirm(t('user_delete_title'), `${t('user_delete_confirm')} "${username}"?`);
  if (!confirmed) return;

  try {
    await removeUser(id);
    showToast(t('user_delete_success'), 'success');
    await loadUsersList();
  } catch (err) {
    showToast(`${t('user_delete_failed')}: ${err.message}`, 'error');
  }
}
export function bindUserManagement() {
  document.getElementById('btn-save-user')?.addEventListener('click', handleSaveUser);
  document.getElementById('btn-cancel-edit-user')?.addEventListener('click', cancelEditUser);
}
