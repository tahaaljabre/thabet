async function archiveItem(type, id) {
  const confirmed = await window.api.confirmDialog(t('confirm_archive_item'));
  if (confirmed) {
    try {
      const result = await window.api.archiveItem(type, id, true);
      if (result?.success === false) throw new Error(result.error);
      // Reload current tab/lists
      if (type === 'employee') {
        currentEmployeeId = null;
        const panel = document.getElementById('employee-management-panel');
        if (panel) panel.style.display = 'none';
        document.getElementById('select-employee-input').value = '';
        await loadEmployees();
      } else if (type === 'supplier') {
        currentSupplierId = null;
        const panel = document.getElementById('supplier-management-panel');
        if (panel) panel.style.display = 'none';
        document.getElementById('select-supplier-input').value = '';
        await loadSuppliers();
      } else if (type === 'employee_tx') {
        await loadEmployeeTransactions();
      } else if (type === 'supplier_tx') {
        await loadSupplierTransactions();
      }
      alert(t('archive_success'));
    } catch (err) {
      console.error(err);
      alert(t('archive_error'));
    }
  }
}

async function restoreItem(type, id) {
  try {
    const result = await window.api.archiveItem(type, id, false);
    if (result?.success === false) throw new Error(result.error);
    alert(t('restore_success'));
    // Refresh the archive sub-panel view
    const archiveTabByType = { employee: 'emp', supplier: 'sup', employee_tx: 'emptx', supplier_tx: 'suptx' };
    await switchArchiveTab(archiveTabByType[type]);
    // Refresh the main UI dropdowns/tables
    if (type === 'employee') {
      await loadEmployees();
    } else if (type === 'supplier') {
      await loadSuppliers();
    } else if (type === 'employee_tx') {
      await loadEmployeeTransactions();
    } else if (type === 'supplier_tx') {
      await loadSupplierTransactions();
    }
  } catch (err) {
    console.error(err);
    alert(t('restore_error'));
  }
}

if (typeof window !== 'undefined') {
  window.restoreItem = restoreItem;
  window.archiveItem = archiveItem;
}
