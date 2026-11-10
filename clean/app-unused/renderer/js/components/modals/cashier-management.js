// --- CASHIERS MANAGEMENT LOGIC ---
let cashiersList = [];

async function loadCashiersList() {
  try {
    cashiersList = await window.api.getCashiers();
    renderCashiersTable();
    populateCashierDropdowns();
  } catch (err) {
    console.error('Failed to load cashiers:', err);
  }
}

function renderCashiersTable() {
  const tbody = document.getElementById('cashiers-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  cashiersList.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>${c.name}</td>
        <td>${c.active_user}</td>
        <td>
          <button class="btn-action" style="background-color: var(--primary-color); color:white; padding: 2px 8px; margin: 0 2px;" onclick="editCashier(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${c.active_user.replace(/'/g, "\\'")}')">${t('btn_edit') || 'تعديل'}</button>
          <button class="btn-action" style="background-color: var(--red); color:white; padding: 2px 8px; margin: 0 2px;" onclick="deleteCashier(${c.id})">${t('btn_delete') || 'حذف'}</button>
        </td>
      </tr>
    `;
  });
}

function editCashier(id, name, user) {
  document.getElementById('edit-cashier-id').value = id;
  document.getElementById('new-cashier-name').value = name;
  document.getElementById('new-cashier-user').value = user;
  document.getElementById('btn-cancel-edit-cashier').style.display = 'inline-block';
  document.getElementById('btn-save-cashier').innerText = t('btn_save') || 'حفظ';
}

function cancelEditCashier() {
  document.getElementById('edit-cashier-id').value = '';
  document.getElementById('new-cashier-name').value = '';
  document.getElementById('new-cashier-user').value = '';
  document.getElementById('btn-cancel-edit-cashier').style.display = 'none';
  document.getElementById('btn-save-cashier').innerText = t('btn_add') || 'إضافة / حفظ';
}

async function saveCashier() {
  const id = document.getElementById('edit-cashier-id').value;
  const name = document.getElementById('new-cashier-name').value.trim();
  const active_user = document.getElementById('new-cashier-user').value.trim();
  
  if (!name || !active_user) {
    alert('يرجى ملء جميع الحقول المطلوبة');
    return;
  }
  
  try {
    const payload = { name, active_user };
    if (id) payload.id = parseInt(id);
    await window.api.saveCashier(payload);
    cancelEditCashier();
    await loadCashiersList();
  } catch (err) {
    console.error('Failed to save cashier:', err);
    alert('حدث خطأ أثناء حفظ الكاشير');
  }
}

async function deleteCashier(id) {
  const confirmed = await window.api.confirmDialog(t('confirm_delete') || 'هل أنت متأكد من عملية الحذف؟');
  if (!confirmed) return;
  try {
    await window.api.deleteCashier(id);
    await loadCashiersList();
  } catch (err) {
    console.error('Failed to delete cashier:', err);
    alert('حدث خطأ أثناء حذف الكاشير');
  }
}

function populateCashierDropdowns() {
  const select = document.getElementById('select-report-cashier');
  if (!select) return;
  const previousValue = select.value;
  select.innerHTML = '';
  cashiersList.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.innerText = c.name;
    select.appendChild(opt);
  });
  
  if (previousValue && cashiersList.some(c => c.name === previousValue)) {
    select.value = previousValue;
  } else if (cashiersList.length > 0) {
    select.value = cashiersList[0].name;
  }
  
  onCashierSelectChange();
}

function onCashierSelectChange() {
  const select = document.getElementById('select-report-cashier');
  if (!select) return;
  const activeCashierName = select.value;
  const cashierObj = cashiersList.find(c => c.name === activeCashierName);
  if (cashierObj) {
    document.getElementById('input-cashier-user').value = cashierObj.active_user;
  }
  
  loadStateForDate(currentSelectedDate).then(() => {
    if(typeof updateFormInputs === 'function') updateFormInputs();
    if(typeof renderAll === 'function') renderAll();
    if(typeof window.loadCashierReports === 'function') window.loadCashierReports();
  });
}