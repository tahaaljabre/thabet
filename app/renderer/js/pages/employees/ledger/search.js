let currentEmpFocusedIndex = -1;

window.handleEmpTxSearch = async function() {
  const voucherText = document.getElementById('emp-tx-search-input').value.trim();
  if (!voucherText) return;
  const voucherNumber = parseInt(voucherText, 10);
  if (isNaN(voucherNumber)) return;

  try {
    const tx = await window.api.getEmployeeTransactionById(voucherNumber);
    if (!tx) {
    alert(t('voucher_missing'));
      return;
    }
    if (tx.year_id !== window.currentYearId) {
    alert(t('voucher_different_year'));
      return;
    }

    if (typeof currentEmployeeId !== 'undefined' && currentEmployeeId !== tx.employee_id) {
      const emp = (typeof allEmployees !== 'undefined' ? allEmployees : []).find(item => item.id == tx.employee_id);
      if (emp && typeof window.selectEmployeeOption === 'function') {
        window.selectEmployeeOption(emp.id, emp.name);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    if (typeof editEmployeeTx === 'function') editEmployeeTx(tx.id);
  } catch (error) {
    console.error('Error searching employee transaction:', error);
  }
};
