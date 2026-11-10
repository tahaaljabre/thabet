function resetBankAccountForm() {
  document.getElementById('edit-bank-id').value = '';
  document.getElementById('bank-name-input').value = '';
  document.getElementById('bank-number-input').value = '';
  document.getElementById('bank-balance-input').value = '';
  document.getElementById('bank-start-date-input').value = new Date().toISOString().split('T')[0];
  document.getElementById('bank-form-title').setAttribute('data-i18n', 'title_add_bank');
  document.getElementById('bank-form-title').innerText = t('title_add_bank');
}

async function saveBankAccount() {
  const id = document.getElementById('edit-bank-id').value || null;
  const name = document.getElementById('bank-name-input').value.trim();
  const num = document.getElementById('bank-number-input').value.trim();
  const balance = parseFloat(document.getElementById('bank-balance-input').value) || 0;
  const sDate = document.getElementById('bank-start-date-input').value || new Date().toISOString().split('T')[0];

  if (!name) return alert(t('err_enter_bank_name'));

  const acc = {
    id,
    bank_name: name,
    account_number: num,
    opening_balance: balance,
    start_date: sDate,
    year_id: window.currentYearId
  };

  try {
    const res = await window.api.saveBankAccount(acc);
    if (res.success) {
      alert(t('msg_bank_saved'));
      resetBankAccountForm();
      loadBanksData();
    }
  } catch (err) {
    alert(t('err_prefix') + err.message);
  }
}

function editBankAccount(id) {
  const acc = bankAccounts.find(a => Number(a.id) === Number(id));
  if (acc) {
    document.getElementById('edit-bank-id').value = acc.id;
    document.getElementById('bank-name-input').value = acc.bank_name;
    document.getElementById('bank-number-input').value = acc.account_number || '';
    document.getElementById('bank-balance-input').value = acc.opening_balance;
    document.getElementById('bank-start-date-input').value = acc.start_date || new Date().toISOString().split('T')[0];
    document.getElementById('bank-form-title').setAttribute('data-i18n', 'title_edit_bank');
    document.getElementById('bank-form-title').innerText = t('title_edit_bank');
  }
}

async function deleteBankAccount(id) {
  if (await window.api.confirmDialog(t('confirm_delete_bank'))) {
    try {
      const res = await window.api.deleteBankAccount(id);
      if (res.success) {
        alert(t('msg_bank_deleted'));
        loadBanksData();
      }
    } catch (err) {
      alert(t('err_prefix') + err.message);
    }
  }
}

async function saveBankSalesMappings() {
  const selects = [...document.querySelectorAll('.bank-select-map[data-channel-key]')];
  const visibleChannelKeys = selects.map(select => select.dataset.channelKey);
  // Keep mappings for hidden/deleted channels so their historical sales remain
  // included in the bank balances, while removing them from the current UI.
  const mappings = (bankMappings || []).filter(mapping => !visibleChannelKeys.includes(mapping.channel_name));

  for (const select of selects) {
    const channelKey = select.dataset.channelKey;
    const val = select.value;
    if (val) {
      mappings.push({
        channel_name: channelKey,
        bank_account_id: parseInt(val),
        year_id: window.currentYearId
      });
    }
  }

  try {
    const res = await window.api.saveBankSalesMappings(mappings, window.currentYearId || 1);
    if (res.success) {
      alert(t('msg_mapping_saved'));
      loadBanksData();
    }
  } catch (err) {
    alert(t('err_prefix') + err.message);
  }
}
