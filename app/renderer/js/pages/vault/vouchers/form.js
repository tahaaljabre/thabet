function handleVoucherAttachment(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    let base64Input = document.getElementById('voucher-attachment-base64');
    if (!base64Input) {
      base64Input = document.createElement('input');
      base64Input.type = 'hidden';
      base64Input.id = 'voucher-attachment-base64';
      document.body.appendChild(base64Input);
    }
    base64Input.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function viewVoucherAttachment(base64) {
  const win = window.open();
  win.document.write(`<iframe src="${base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
}


// Partner withdrawals tracking and voucher updates

async function toggleVoucherPartnerField(autoSelectName = '') {
    const category = document.getElementById('voucher-category').value;
    const group = document.getElementById('voucher-partner-group');
    if (category === 'Partner Withdrawal' || category === 'Profit Distribution') {
      group.style.display = 'block';
      const input = document.getElementById('voucher-partner-name');
      const datalist = document.getElementById('partners-list');
      const currentValue = autoSelectName || (input ? input.value : '');
      if (datalist && window.api.getSettingsPartners) {
        const partners = await window.api.getSettingsPartners();
        datalist.innerHTML = partners.map(p => `<option value="${window.escapeHTML(p.name)}">${window.escapeHTML(p.name)}</option>`).join('');
        if (input && currentValue) input.value = currentValue;
      }
    } else {
      group.style.display = 'none';
    }
  }

async function editGeneralVoucher(id) {
  const activeYear = (window.financialYears || []).find(y => y.YearID === window.currentYearId);
  if (activeYear && activeYear.IsClosed) {
    return alert(window.t('closed_year_edit_error'));
  }
  
  if (vaultData && vaultData.generalVouchers) {
    const v = vaultData.generalVouchers.find(item => item.id === id);
    if (v) {
      document.getElementById('edit-voucher-id').value = v.id;
      document.getElementById('voucher-date').value = v.voucher_date;
      document.getElementById('voucher-amount').value = v.amount;
      document.getElementById('voucher-category').value = v.category;
      document.getElementById('voucher-description').value = v.description;
      
      const accSelect = document.getElementById('voucher-account');
      if (accSelect && accSelect.options.length > 0) {
        const vAcc = v.account_id ? String(v.account_id) : '';
        const hasOpt = vAcc && Array.from(accSelect.options).some(opt => opt.value === vAcc);
        if (hasOpt) {
          accSelect.value = vAcc;
        } else if (typeof window.resetAccountDropdownToCashVault === 'function') {
          window.resetAccountDropdownToCashVault(accSelect);
        } else {
          accSelect.selectedIndex = 0;
        }
      }

      toggleVoucherPartnerField(v.partner_name);
      
      const base64Input = document.getElementById('voucher-attachment-base64');
      if (base64Input) base64Input.value = v.attachment || '';
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

window.handleVaultVoucherSearch = async function() {
  const inputEl = document.getElementById('vault-voucher-search-input');
  if (!inputEl) return;
  const vNum = parseInt(inputEl.value);
  if (!vNum) return;

  try {
    const activeYearId = window.currentYearId || 1;
    const allVouchers = await window.api.getGeneralVouchers(activeYearId);
    const v = allVouchers.find(item => item.id === vNum);
    
    if (v) {
      const fromEl = document.getElementById('vault-start-date');
      const toEl = document.getElementById('vault-end-date');
      if (fromEl) fromEl.value = v.voucher_date;
      if (toEl) toEl.value = v.voucher_date;
      
      if (typeof fetchVaultReports === 'function') {
        await fetchVaultReports();
        editGeneralVoucher(vNum);
      } else {
        editGeneralVoucher(vNum);
      }
    } else {
      alert(window.t('voucher_not_found'));
    }
  } catch (err) {
    console.error('Error searching vault voucher:', err);
  }
};
