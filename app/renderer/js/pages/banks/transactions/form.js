function toggleBankTxFields() {
  const type = document.getElementById('bank-tx-type').value;
  const fromGroup = document.getElementById('bank-tx-from-group');
  const toGroup = document.getElementById('bank-tx-to-group');
  const partnerGroup = document.getElementById('bank-tx-partner-group');

  if (type === 'Payment') {
    fromGroup.style.display = 'block';
    toGroup.style.display = 'none';
    partnerGroup.style.display = 'block';
  } else if (type === 'Receipt') {
    fromGroup.style.display = 'none';
    toGroup.style.display = 'block';
    partnerGroup.style.display = 'none';
  } else if (type === 'Transfer') {
    fromGroup.style.display = 'block';
    toGroup.style.display = 'block';
    partnerGroup.style.display = 'none';
  } else if (type === 'Deposit') {
    fromGroup.style.display = 'none';
    toGroup.style.display = 'block';
    partnerGroup.style.display = 'none';
  } else if (type === 'Withdrawal') {
    fromGroup.style.display = 'block';
    toGroup.style.display = 'none';
    partnerGroup.style.display = 'none';
  }
}

function resetBankTxForm() {
  document.getElementById('edit-bank-tx-id').value = '';
  document.getElementById('bank-tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('bank-tx-amount').value = '';
  document.getElementById('bank-tx-from').value = '';
  document.getElementById('bank-tx-to').value = '';
  document.getElementById('bank-tx-partner-name').value = '';
  document.getElementById('bank-tx-description').value = '';
  document.getElementById('bank-tx-type').value = 'Payment';
  toggleBankTxFields();
  document.getElementById('bank-tx-form-title').setAttribute('data-i18n', 'title_add_bank_tx');
  document.getElementById('bank-tx-form-title').innerText = t('title_add_bank_tx');
}
