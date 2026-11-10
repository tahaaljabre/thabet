async function saveGeneralVoucher() {
  const date = document.getElementById('voucher-date').value;
  const amount = window.safeParseFloat(document.getElementById('voucher-amount').value) || 0;
  const category = document.getElementById('voucher-category').value;
  const accId = document.getElementById('voucher-account').value;
  const description = document.getElementById('voucher-description').value.trim();
  const attachment = document.getElementById('voucher-attachment-base64')?.value || '';
  const partner_name = (category === 'Partner Withdrawal' || category === 'Profit Distribution') ? document.getElementById('voucher-partner-name').value.trim() : '';

  if (!date) return alert(window.t('voucher_date_required'));
  if (amount <= 0) return alert(window.t('voucher_amount_positive'));
  if (!description) return alert(window.t('voucher_description_required'));
  if ((category === 'Partner Withdrawal' || category === 'Profit Distribution') && !partner_name) {
    return alert(window.t('partner_name_required'));
  }

  const activeYear = (window.financialYears || []).find(y => y.YearID === window.currentYearId);
  if (activeYear && activeYear.IsClosed) {
    return alert(window.t('closed_year_add_error'));
  }

  const id = document.getElementById('edit-voucher-id').value || null;

  const voucher = {
    id,
    voucher_date: date,
    amount,
    category,
    description,
    attachment,
    created_by: currentUser ? currentUser.username : window.t('system_user'),
    year_id: window.currentYearId,
    partner_name,
    account_id: accId === 'cash' ? null : accId
  };

  try {
    let res;
    if (voucher.id) {
      res = await window.api.updateGeneralVoucher(voucher);
    } else {
      res = await window.api.saveGeneralVoucher(voucher);
    }
    if (res.success) {
      alert(window.t('voucher_saved_success'));
      // Reset form
      document.getElementById('edit-voucher-id').value = '';
      document.getElementById('voucher-amount').value = '';
      document.getElementById('voucher-description').value = '';
      document.getElementById('voucher-partner-name').value = '';
      document.getElementById('voucher-partner-group').style.display = 'none';
      const fileInput = document.getElementById('voucher-attachment');
      if (fileInput) fileInput.value = '';
      const base64Input = document.getElementById('voucher-attachment-base64');
      if (base64Input) base64Input.value = '';
      if (typeof window.resetAccountDropdownToCashVault === 'function') {
        window.resetAccountDropdownToCashVault('voucher-account');
      }
      
      // Reload list
      fetchVaultReports();
    }
  } catch (err) {
    alert(`${window.t('voucher_save_error')}: ${err.message}`);
  }
}

async function deleteGeneralVoucher(id) {
  if (await window.api.confirmDialog(window.t('confirm_delete_voucher'))) {
    try {
      const res = await window.api.deleteGeneralVoucher(id);
      if (res.success) {
        alert(window.t('voucher_deleted_success'));
        fetchVaultReports();
      }
    } catch (err) {
      alert(`${window.t('error_occurred')}: ${err.message}`);
    }
  }
}
