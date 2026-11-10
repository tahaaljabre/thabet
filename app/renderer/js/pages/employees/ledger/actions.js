async function saveEmployeeTx() {
  if (!currentEmployeeId) {
    alert(t('select_employee_first'));
    return;
  }

  if (typeof window.calculateEmployeeSalaryAmounts === 'function') {
    await window.calculateEmployeeSalaryAmounts();
  }

  const accountValue = document.getElementById('emp-tx-account').value;
  const tx = {
    id: currentEditEmpTxId,
    employee_id: currentEmployeeId,
    tx_date: document.getElementById('emp-tx-date').value,
    amount: parseFloat(document.getElementById('emp-tx-amount').value) || 0,
    attendance_days: parseFloat(document.getElementById('emp-tx-attendance').value) || 0,
    absence_days: parseFloat(document.getElementById('emp-tx-absence').value) || 0,
    deductions: parseFloat(document.getElementById('emp-tx-deductions').value) || 0,
    allowances: parseFloat(document.getElementById('emp-tx-allowances').value) || 0,
    notes: document.getElementById('emp-tx-notes').value,
    account_id: accountValue === 'cash' ? null : accountValue,
    year_id: window.currentYearId
  };

  if (!tx.tx_date) {
    alert(t('transaction_date_required'));
    return;
  }
  if ([tx.amount, tx.attendance_days, tx.absence_days, tx.deductions, tx.allowances].some(value => value < 0)) {
    alert(t('negative_values_forbidden'));
    return;
  }

  await window.api.saveEmployeeTransaction(tx);
  currentEditEmpTxId = null;
  document.getElementById('emp-tx-notes').value = '';
  if (typeof window.resetAccountDropdownToCashVault === 'function') {
    window.resetAccountDropdownToCashVault('emp-tx-account');
  }
  await loadEmployeeTransactions();
}

async function deleteEmployeeTx(id) {
  const confirmed = await window.api.confirmDialog((typeof window.currentLang === 'function' && window.currentLang() === 'en') ? 'Are you sure you want to delete this transaction?' : 'هل أنت متأكد من حذف هذه الحركة؟');
  if (!confirmed) return;

  try {
    await window.api.deleteEmployeeTransaction(id);
    await loadEmployeeTransactions();
  } catch (err) {
    console.error(err);
    alert(t('transaction_delete_error'));
  }
}

function editEmployeeTx(id) {
  const tx = currentEmployeeTxs.find(item => item.id === id);
  if (!tx) return;
  currentEditEmpTxId = id;
  document.getElementById('emp-tx-date').value = tx.tx_date;
  document.getElementById('emp-tx-amount').value = tx.amount;
  document.getElementById('emp-tx-attendance').value = tx.attendance_days;
  document.getElementById('emp-tx-absence').value = tx.absence_days;
  document.getElementById('emp-tx-deductions').value = tx.deductions;
  document.getElementById('emp-tx-allowances').value = tx.allowances;
  document.getElementById('emp-tx-notes').value = tx.notes || '';
  const accSelect = document.getElementById('emp-tx-account');
  if (accSelect && accSelect.options.length > 0) {
    const txAcc = tx.account_id ? String(tx.account_id) : '';
    const hasOpt = txAcc && Array.from(accSelect.options).some(opt => opt.value === txAcc);
    if (hasOpt) {
      accSelect.value = txAcc;
    } else if (typeof window.resetAccountDropdownToCashVault === 'function') {
      window.resetAccountDropdownToCashVault(accSelect);
    } else {
      accSelect.selectedIndex = 0;
    }
  }
}
