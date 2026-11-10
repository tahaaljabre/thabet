async function saveBankTransaction() {
  const id = document.getElementById('edit-bank-tx-id').value || null;
  const date = document.getElementById('bank-tx-date').value;
  const type = document.getElementById('bank-tx-type').value;
  const amount = parseFloat(document.getElementById('bank-tx-amount').value) || 0;
  const from_id = document.getElementById('bank-tx-from').value;
  const to_id = document.getElementById('bank-tx-to').value;
  const partner = document.getElementById('bank-tx-partner-name').value.trim();
  const desc = document.getElementById('bank-tx-description').value.trim();

  if (!date) return alert(t('err_tx_date'));
  if (amount <= 0) return alert(t('err_tx_amount'));

  if ((type === 'Payment' || type === 'Transfer' || type === 'Withdrawal') && !from_id) {
    return alert(t('err_from_bank'));
  }
  if ((type === 'Receipt' || type === 'Transfer' || type === 'Deposit') && !to_id) {
    return alert(t('err_to_bank'));
  }
  if (type === 'Transfer' && from_id === to_id) {
      return alert(t('bank_same_account_error'));
  }

  const tx = {
    id,
    tx_date: date,
    tx_type: type,
    from_account_id: from_id ? parseInt(from_id) : null,
    to_account_id: to_id ? parseInt(to_id) : null,
    amount,
    partner_name: partner || null,
    description: desc,
    created_by: currentUser ? currentUser.username : t('system_user'),
    year_id: window.currentYearId
  };

  try {
    const res = await window.api.saveBankTransaction(tx);
    if (res?.success === false) throw new Error(res.error || 'تعذر حفظ التحويل');
    if (res?.success) {
      alert(res.warning ? `${t('msg_bank_tx_saved')}\n\n${res.warning}` : t('msg_bank_tx_saved'));
      resetBankTxForm();
      const fromFilter = document.getElementById('bank-tx-filter-from');
      const toFilter = document.getElementById('bank-tx-filter-to');
      if (fromFilter) fromFilter.value = date;
      if (toFilter) toFilter.value = date;
      await loadBanksData();
      if (typeof fetchVaultReports === 'function') fetchVaultReports();
    }
  } catch (err) {
    alert(t('err_prefix') + err.message);
  }
}

function editBankTransaction(id) {
  const tx = bankTransactions.find(t => Number(t.id) === Number(id));
  if (tx) {
    document.getElementById('edit-bank-tx-id').value = tx.id;
    document.getElementById('bank-tx-date').value = tx.tx_date;
    document.getElementById('bank-tx-type').value = tx.tx_type;
    toggleBankTxFields();

    document.getElementById('bank-tx-from').value = tx.from_account_id || '';
    document.getElementById('bank-tx-to').value = tx.to_account_id || '';
    document.getElementById('bank-tx-amount').value = tx.amount;
    document.getElementById('bank-tx-partner-name').value = tx.partner_name || '';
    document.getElementById('bank-tx-description').value = tx.description || '';

    document.getElementById('bank-tx-form-title').setAttribute('data-i18n', 'title_edit_bank_tx');
    document.getElementById('bank-tx-form-title').innerText = t('title_edit_bank_tx');
    document.getElementById('bank-tx-amount').focus();
  }
}

async function deleteBankTransaction(id) {
  if (await window.api.confirmDialog(t('confirm_delete_tx'))) {
    try {
      const res = await window.api.deleteBankTransaction(id);
      if (res.success) {
        alert(t('msg_bank_tx_deleted'));
        loadBanksData();
        if (typeof fetchVaultReports === 'function') fetchVaultReports();
      }
    } catch (err) {
      alert(t('err_prefix') + err.message);
    }
  }
}
