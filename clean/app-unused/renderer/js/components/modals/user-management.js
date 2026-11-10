async function loadUsersList() {
  const res = await window.api.getUsers();
  if (res.success) {
    window.globalUsersMap = {};
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = res.users.map(u => {
      window.globalUsersMap[u.id] = u;
      return `
      <tr>
        <td>${window.escapeHTML(u.username)}</td>
        <td>${u.role === 'manager' ? 'مدير' : 'كاشير'}</td>
        <td style="text-align:center;">
           <button class="btn-secondary" onclick="editUser(${u.id})" style="padding: 2px 10px; margin:0;">تعديل</button>
           ${u.role !== 'manager' ? `<button class="btn-cancel" onclick="removeUser(${u.id})" style="padding: 2px 10px; margin:0;">حذف</button>` : ''}
        </td>
      </tr>
    `}).join('');
  }
}

function editUser(id) {
  const u = window.globalUsersMap[id];
  if (!u) return;
  document.getElementById('edit-user-id').value = u.id;
  document.getElementById('new-user-name').value = u.username;
  document.getElementById('new-user-pass').value = '';
  document.getElementById('btn-save-user').textContent = 'حفظ التعديلات';
  document.getElementById('btn-cancel-edit-user').style.display = 'inline-block';
  
  let perms = u.permissions || {};
  if (typeof perms === 'string') {
    try { perms = JSON.parse(perms); } catch(e) { perms = {}; }
  }
  
  document.getElementById('perm-sales').checked = perms.sales !== false;
  document.getElementById('perm-employees').checked = perms.employees !== false;
  document.getElementById('perm-suppliers').checked = perms.suppliers !== false;
  document.getElementById('perm-reports').checked = perms.reports !== false;
  document.getElementById('perm-vault').checked = !!perms.vault;
}

function cancelEditUser() {
  document.getElementById('edit-user-id').value = '';
  document.getElementById('new-user-name').value = '';
  document.getElementById('new-user-pass').value = '';
  document.getElementById('btn-save-user').textContent = 'إضافة / حفظ';
  document.getElementById('btn-cancel-edit-user').style.display = 'none';
  
  document.getElementById('perm-sales').checked = true;
  document.getElementById('perm-employees').checked = true;
  document.getElementById('perm-suppliers').checked = true;
  document.getElementById('perm-reports').checked = true;
  document.getElementById('perm-vault').checked = false;
}

async function saveUser() {
  const id = document.getElementById('edit-user-id').value;
  const u = document.getElementById('new-user-name').value.trim();
  const p = document.getElementById('new-user-pass').value.trim();
  
  const pSales = document.getElementById('perm-sales').checked;
  const pEmployees = document.getElementById('perm-employees').checked;
  const pSuppliers = document.getElementById('perm-suppliers').checked;
  const pReports = document.getElementById('perm-reports').checked;
  const pVault = document.getElementById('perm-vault').checked;
  
  const perms = {
    sales: pSales,
    employees: pEmployees,
    suppliers: pSuppliers,
    reports: pReports,
    vault: pVault
  };

  if (!u) return alert('أدخل اسم المستخدم');
  
  if (id) {
    const res = await window.api.updateUser(id, u, p, perms);
    if (res.success) {
      alert('تم التعديل بنجاح');
      cancelEditUser();
      loadUsersList();
    } else {
      alert(res.error);
    }
  } else {
    if (!p) return alert('أدخل كلمة المرور');
    const res = await window.api.createUser(u, p, 'cashier', perms);
    if (res.success) {
      alert('تمت الإضافة بنجاح');
      cancelEditUser();
      loadUsersList();
    } else {
      alert(res.error);
    }
  }
}

async function removeUser(id) {
  if (confirm('هل أنت متأكد من حذف المستخدم؟')) {
    await window.api.deleteUser(id);
    loadUsersList();
  }
}

async function clearAllDataPrompt() {
  if (confirm('هل أنت متأكد من مسح جميع التقارير والمبيعات والمصروفات بالكامل؟ لا يمكن التراجع!')) {
    const res = await window.api.clearAllData();
    if (res.success) {
      localStorage.removeItem('hadramout_reports_history');
      localStorage.removeItem('thabit_settings');
      alert('تم مسح البيانات بنجاح. سيتم إعادة تشغيل الواجهة.');
      window.location.reload();
    }
  }
}

async function unlockVaultPeriodUI() {
  if (!currentUser || currentUser.role !== 'manager') return;
  const start = document.getElementById('vault-start-date').value;
  const end = document.getElementById('vault-end-date').value;
  if (!start || !end) return alert('يرجى تحديد فترة');
  if (confirm('هل أنت متأكد من فتح الإقفال لهذه الفترة لتعديل الحركات؟')) {
    const res = await window.api.unlockVaultPeriod(start, end, window.currentYearId);
    if (res.success) {
       alert('تم إلغاء الإقفال بنجاح. يمكنك الآن تعديل الحركات في هذه الفترة.');
       await fetchVaultReports(); // refresh the view
       // reload current state to unlock inputs
       await loadStateForDate(currentSelectedDate);
       updateFormInputs();
       renderAll();
    } else {
       alert('خطأ: ' + res.error);
    }
  }
}
