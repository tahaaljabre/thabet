function openSupplierModal() {
  document.getElementById('sup-id').value = '';
  document.getElementById('sup-name').value = '';
  document.getElementById('sup-phone').value = '';
  document.getElementById('sup-address').value = '';
  document.getElementById('supplier-modal-title').setAttribute('data-i18n', 'add_supplier_title');
  document.getElementById('supplier-modal-title').innerText = window.t('add_supplier_title');
  document.getElementById('modal-supplier').style.display = 'flex';
}

function closeSupplierModal() {
  document.getElementById('modal-supplier').style.display = 'none';
}

async function saveSupplier() {
  const id = document.getElementById('sup-id').value;
  const name = document.getElementById('sup-name').value;
  const phone = document.getElementById('sup-phone').value;
  const address = document.getElementById('sup-address').value;
  
  if(!name) return alert(window.t('supplier_name_required'));
  
  await window.api.saveSupplier({ id, name, phone, address });
  closeSupplierModal();
  await loadSuppliers();
  if(id && currentSupplierId == id) {
    onSupplierSelect();
  }
}

function editCurrentSupplier() {
  if(!currentSupplierId) return;
  const sup = allSuppliers.find(s => s.id == currentSupplierId);
  if(!sup) return;
  
  document.getElementById('sup-id').value = sup.id;
  document.getElementById('sup-name').value = sup.name;
  document.getElementById('sup-phone').value = sup.phone || '';
  document.getElementById('sup-address').value = sup.address || '';
  document.getElementById('supplier-modal-title').setAttribute('data-i18n', 'edit_supplier_title');
  document.getElementById('supplier-modal-title').innerText = window.t('edit_supplier_title');
  document.getElementById('modal-supplier').style.display = 'flex';
}

async function deleteCurrentSupplier() {
  if(!currentSupplierId) return;
  const sup = allSuppliers.find(s => s.id == currentSupplierId);
  const confirmed = await window.api.confirmDialog(`${window.t('confirm_delete')} "${sup.name}"?`);
  if(confirmed) {
    try {
      await window.api.deleteSupplier(currentSupplierId);
      currentSupplierId = null;
      document.getElementById('supplier-management-panel').style.display = 'none';
      await loadSuppliers();
    } catch (e) {
      console.error(e);
      alert(window.t('delete_error'));
    }
  }
}
