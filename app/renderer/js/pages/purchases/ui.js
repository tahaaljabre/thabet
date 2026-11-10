import { state } from './state.js';
import * as service from './service.js';

export function getPurchaseReportDate() {
  const el = document.getElementById('expense-report-date');
  return el ? el.value : '';
}

export function setPurchaseReportDate(dateStr) {
  const el = document.getElementById('expense-report-date');
  if (el) el.value = dateStr;
}

export function clearFormInputs() {
  document.getElementById('expense-name').value = '';
  document.getElementById('expense-qty').value = '';
  document.getElementById('expense-amount').value = '';
  document.getElementById('expense-category').value = 'food';
  if (typeof window.resetAccountDropdownToCashVault === 'function') {
    window.resetAccountDropdownToCashVault('expense-account');
  } else {
    const accSelect = document.getElementById('expense-account');
    if (accSelect && accSelect.options.length > 0) accSelect.selectedIndex = 0;
  }
}

export function fillFormForEdit(item) {
  document.getElementById('expense-name').value = item.name;
  document.getElementById('expense-qty').value = item.qty || '';
  document.getElementById('expense-amount').value = item.amount;
  document.getElementById('expense-category').value = item.category || 'other';
  const accSelect = document.getElementById('expense-account');
  if (accSelect && accSelect.options.length > 0) {
    const itemAcc = item.account_id ? String(item.account_id) : '';
    const hasOpt = itemAcc && Array.from(accSelect.options).some(opt => opt.value === itemAcc);
    if (hasOpt) {
      accSelect.value = itemAcc;
    } else if (typeof window.resetAccountDropdownToCashVault === 'function') {
      window.resetAccountDropdownToCashVault(accSelect);
    } else {
      accSelect.selectedIndex = 0;
    }
  }
  
  const btnAdd = document.getElementById('btn-add-expense');
  if (btnAdd) {
    btnAdd.innerHTML = `<span>${t('save_edit_button')}</span>`;
    btnAdd.style.backgroundColor = 'var(--green2)';
  }
}

export function resetAddButton() {
  const btnAdd = document.getElementById('btn-add-expense');
  if (btnAdd) {
    btnAdd.innerHTML = `<span>${t('add_expense_report')}</span>`;
    btnAdd.style.backgroundColor = '';
  }
}

export function renderDraftTable() {
  const tbody = document.getElementById('input-expenses-tbody');
  if (!tbody || !state || !state.purchases) return;

  let html = '';
  state.purchases.forEach(item => {
    const catName = t(`expense_cat_${item.category}`, item.category || t('expense_cat_other'));
    const amount = window.safeParseFloat(item.amount) || 0;
    html += `
    <tr>
      <td>
        <div style="font-weight:700;">${window.escapeHTML(item.name)}</div>
        ${item.qty ? `<div style="font-size:10px; color:var(--muted)">${window.escapeHTML(item.qty)}</div>` : ''}
      </td>
      <td>${catName}</td>
      <td style="text-align: left;">${window.appSettings?.currency || ''}${amount.toLocaleString('en-US')}</td>
      <td class="no-print" style="white-space: nowrap; text-align: center;">
        <div style="display: inline-flex; gap: 4px; justify-content: center; align-items: center;">
          <button class="btn-submit edit-purchase-btn" data-id="${item.id}" style="padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer;" title="${t('edit_title')}">✏️</button>
          <button class="btn-danger delete-purchase-btn" data-id="${item.id}" style="padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer;" title="${t('delete_title')}">🗑️</button>
        </div>
      </td>
    </tr>`;
  });
  tbody.innerHTML = html;

  // Re-attach listeners dynamically
  document.querySelectorAll('.edit-purchase-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      service.editPurchase(id);
    });
  });

  document.querySelectorAll('.delete-purchase-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.getAttribute('data-id'));
      service.deletePurchase(id);
    });
  });
}

export function renderLedgerTable(ledgerData) {
  const tbody = document.getElementById('expenses-tx-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  if (!ledgerData || ledgerData.length === 0) {
    const emptyMsg = t('no_expenses_recorded');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${emptyMsg}</td></tr>`;
    return;
  }
  
  ledgerData.forEach((r, idx) => {
    const row = document.createElement('tr');
    const printTitle = t('print_voucher_title');
    const editTitle = t('edit_voucher_title');
    const deleteTitle = t('delete_voucher_title');
    
    row.innerHTML = `
      <td>${idx + 1}</td>
      <td style="color:#7A1A22; font-weight:bold;">${window.escapeHTML(r.voucherNumber || '-')}</td>
      <td>${window.formatDateString(r.report_date)}</td>
      <td>${r.items_count}</td>
      <td>${window.appSettings?.currency || ''}${(r.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td class="no-print" style="white-space: nowrap; text-align: center;">
        <div style="display: inline-flex; gap: 4px; justify-content: center; align-items: center;">
          <button class="btn-secondary print-ledger-btn" data-date="${r.report_date}" style="padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer;" title="${printTitle}">🖨️</button>
          <button class="btn-submit edit-ledger-btn" data-date="${r.report_date}" style="padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer;" title="${editTitle}">✏️</button>
          <button class="btn-danger delete-ledger-btn" data-date="${r.report_date}" style="padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer;" title="${deleteTitle}">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Attach ledger action listeners
  document.querySelectorAll('.print-ledger-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const date = e.currentTarget.getAttribute('data-date');
      service.printVoucher(date);
    });
  });

  document.querySelectorAll('.edit-ledger-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const date = e.currentTarget.getAttribute('data-date');
      service.editLedgerEntry(date);
    });
  });

  document.querySelectorAll('.delete-ledger-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const date = e.currentTarget.getAttribute('data-date');
      service.deleteLedgerEntry(date);
    });
  });
}

export function populateAccountsDropdown(accounts) {
  const accSelect = document.getElementById('expense-account');
  if (!accSelect) return;
  const list = Array.isArray(accounts) ? accounts : [];
  const sorted = [...list].sort((a, b) => {
    const aCash = (a.is_cash_vault === 1 || a.is_cash_vault === true) ? 1 : 0;
    const bCash = (b.is_cash_vault === 1 || b.is_cash_vault === true) ? 1 : 0;
    if (aCash !== bCash) return bCash - aCash;
    return (a.id || 0) - (b.id || 0);
  });
  const cashVault = sorted.find(a => a.is_cash_vault === 1 || a.is_cash_vault === true) || sorted[0] || null;
  const cashVaultId = cashVault ? String(cashVault.id) : 'cash';
  window.defaultCashVaultAccountId = cashVaultId;

  accSelect.disabled = false;
  if (sorted.length === 0) {
    accSelect.innerHTML = `<option value="cash">${window.escapeHTML(t('cash_vault_option'))}</option>`;
    accSelect.value = 'cash';
  } else {
    accSelect.innerHTML = sorted.map(acc => {
      const label = acc.bank_name || acc.name || t('cash_vault_option');
      return `<option value="${acc.id}">${window.escapeHTML(label)}</option>`;
    }).join('');
    accSelect.value = cashVaultId;
  }
}
