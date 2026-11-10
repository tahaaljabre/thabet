async function loadSupplierTransactions() {
  if(!currentSupplierId) return;
  currentSupplierTxs = await window.api.getSupplierTransactions(currentSupplierId, window.currentYearId);
  const tbody = document.getElementById('sup-tx-tbody');
  tbody.innerHTML = '';
  
  const activeTxs = currentSupplierTxs.filter(tx => !tx.is_archived);
  activeTxs.forEach((tx, index) => {
    let tr = document.createElement('tr');
    
    let typeText = tx.tx_type === 'له' ? window.t('tx_type_credit') : (tx.tx_type === 'خصم' ? window.t('discount_settlement_type') : window.t('tx_type_debit'));
    let colorClass = tx.tx_type === 'له' ? 'text-red' : (tx.tx_type === 'خصم' ? 'text-blue' : 'text-green');
    
    tr.innerHTML = `
      <td style="font-weight:bold;">#${tx.id}</td>
      <td style="white-space:nowrap;">${formatDateString(tx.tx_date)}</td>
      <td class="${colorClass}">${typeText}</td>
      <td style="font-weight:bold;">${window.appSettings?.currency || ''}${parseFloat(tx.amount).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
      <td>${tx.notes || '-'}</td>
      <td class="no-print">
        <button class="btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="printSupplierVoucher(${tx.id})">🖨️ ${window.t('print_button')}</button> 
        <button class="btn-primary" style="padding:4px 8px; font-size:11px;" onclick="editSupplierTx(${tx.id})">${window.t('edit_button')}</button>
        <button class="btn-primary" style="padding:4px 8px; font-size:11px; background-color: var(--kabd);" onclick="window.archiveItem('supplier_tx', ${tx.id})">${window.t('archive_button')}</button>
        <button class="btn-danger" style="padding:4px 8px; font-size:11px;" onclick="deleteSupplierTx(${tx.id})">🗑️ ${window.t('delete_button')}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function saveSupplierTx() {
  if(!currentSupplierId) {
    alert(window.t('select_supplier_first'));
    return;
  }
  const date = document.getElementById('sup-tx-date').value;
  const amount = parseFloat(document.getElementById('sup-tx-amount').value) || 0;
  const type = document.getElementById('sup-tx-type').value;
  const notes = document.getElementById('sup-tx-notes').value;
  
  if(!date || amount <= 0) return alert(window.t('valid_date_amount_required'));
  
  try {
    const result = await window.api.saveSupplierTransaction({
      id: currentEditSupTxId,
      supplier_id: currentSupplierId,
      tx_date: date,
      amount: amount,
      tx_type: type,
      notes: notes,
      year_id: window.currentYearId || 1,
      account_id: document.getElementById('sup-tx-account').value === 'cash' ? null : document.getElementById('sup-tx-account').value
    });
    if (result && result.success === false) {
      throw new Error(result.error || window.t('operation_not_saved'));
    }

    currentEditSupTxId = null;
    document.getElementById('sup-tx-amount').value = '0';
    document.getElementById('sup-tx-notes').value = '';
    if (typeof window.resetAccountDropdownToCashVault === 'function') {
      window.resetAccountDropdownToCashVault('sup-tx-account');
    }
    await loadSupplierTransactions();
  } catch (error) {
    console.error('Failed to save supplier transaction:', error);
    alert(window.t('operation_not_saved'));
  }
}

async function deleteSupplierTx(id) {
  const confirmed = await window.api.confirmDialog(window.t('confirm_delete_transaction'));
  if(confirmed) {
    try {
      await window.api.deleteSupplierTransaction(id);
      await loadSupplierTransactions();
    } catch(err) {
      console.error(err);
      alert(window.t('delete_error'));
    }
  }
}












function editSupplierTx(id) {
  const tx = currentSupplierTxs.find(t => t.id === id);
  if (!tx) return;
  currentEditSupTxId = id;
  document.getElementById('sup-tx-date').value = tx.tx_date;
  document.getElementById('sup-tx-amount').value = tx.amount;
  document.getElementById('sup-tx-type').value = tx.tx_type;
  document.getElementById('sup-tx-notes').value = tx.notes || '';
  const accSelect = document.getElementById('sup-tx-account');
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


let currentSupFocusedIndex = -1;

async function handleSupplierTxSearch() {
  const input = document.getElementById('sup-voucher-search');
  if(!input) return;
  const voucherNo = input.value.trim();
  if(!voucherNo) {
    alert(t('error') || 'يرجى إدخال رقم السند للبحث');
    return;
  }
  
  try {
    const tx = await window.api.getSupplierTransactionByVoucher(voucherNo, window.currentYearId);
    if(tx) {
      if (typeof currentSupplierId !== 'undefined' && currentSupplierId !== tx.supplier_id) {
        const sup = (typeof allSuppliers !== "undefined" ? allSuppliers : []).find(s => s.id == tx.supplier_id); 
        if(sup && typeof window.selectSupplierOption === "function") { 
          window.selectSupplierOption(sup.id, sup.name); 
          await new Promise(r => setTimeout(r, 100)); 
        }
      }
      
      // Open the voucher print modal directly
      if (typeof window.printSupplierVoucher === 'function') {
         window.printSupplierVoucher(tx.id);
      }
    } else {
      alert(window.t('voucher_not_found'));
    }
  } catch (err) {
    console.error('Error searching supplier transaction:', err);
    alert(window.t('search_error_reopen'));
  }
}
window.handleSupplierTxSearch = handleSupplierTxSearch;
