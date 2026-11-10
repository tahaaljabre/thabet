import { createElement, clearElement } from '../../core/dom.js';
import { state, setEditingExpenseId } from './state.js';
import { handleEditDraftItem, handleDeleteDraftItem } from './service.js';
import { fetchCashiers, fetchBankAccounts } from './api.js';

export async function loadCashiersDropdown(selectEl) {
  if (!selectEl) return;
  try {
    const cashiers = await fetchCashiers();
    clearElement(selectEl);
    cashiers.forEach(c => {
      const opt = createElement('option', { value: c.name, textContent: c.name });
      selectEl.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load cashiers:', err);
  }
}

export async function loadAccountsDropdown() {
  const selectEl = document.getElementById('expense-account');
  if (!selectEl) return;
  let accounts = [];
  try {
    accounts = await fetchBankAccounts(state.currentYearId);
  } catch (err) {
    console.error('Failed to load payment accounts:', err);
  }

  try {
    clearElement(selectEl);
    
    accounts.forEach(a => {
      const name = a.bank_name + (a.account_number ? ` - ${a.account_number}` : '');
      const opt = createElement('option', { value: a.id, textContent: name });
      selectEl.appendChild(opt);
    });

    const cashVault = accounts.find(a => a.is_cash_vault === 1);
    if (cashVault) {
      selectEl.value = cashVault.id;
    }
  } catch (err) {
    console.error('Failed to render payment accounts:', err);
  }
}

export function resetFormInputs() {
  document.getElementById('expense-name').value = '';
  document.getElementById('expense-qty').value = '';
  document.getElementById('expense-amount').value = '';
  document.getElementById('expense-category').selectedIndex = 0;
  
  const addBtn = document.getElementById('btn-add-expense-item');
  if (addBtn) {
    addBtn.innerHTML = `<span>${t('add_expense_draft')}</span>`;
    addBtn.style.backgroundColor = '';
  }
}

export function renderDraftTable() {
  const tbody = document.getElementById('input-expenses-tbody');
  if (!tbody) return;
  clearElement(tbody);

  if (!state.draftReportState || !state.draftReportState.purchases || state.draftReportState.purchases.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--muted)">${t('empty_expense_draft')}</td></tr>`;
    return;
  }

  state.draftReportState.purchases.forEach(item => {
    const tr = createElement('tr');
    
    // Description
    const tdDesc = createElement('td', { textContent: item.name + (item.qty ? ` (${item.qty})` : '') });
    tr.appendChild(tdDesc);

    // Category
    const tdCat = createElement('td', { textContent: t(`expense_cat_${item.category}`, item.category || t('expense_cat_other')) });
    tr.appendChild(tdCat);

    // Amount
    // Safe check using an optional chaining and fallback
    const currency = window.globals?.appSettings?.currency || window.appSettings?.currency || '';
    const tdAmount = createElement('td', { textContent: `${currency}${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` });
    tdAmount.style.textAlign = 'left';
    tr.appendChild(tdAmount);

    // Actions
    const tdActions = createElement('td');
    tdActions.style.textAlign = 'center';
    
    const editBtn = createElement('button', { textContent: '✏️', class: 'btn-edit', style: 'background:none; border:none; cursor:pointer; margin-right:5px;' });
    editBtn.addEventListener('click', () => handleEditDraftItem(item.id));
    
    const deleteBtn = createElement('button', { textContent: '🗑️', class: 'btn-delete', style: 'background:none; border:none; cursor:pointer;' });
    deleteBtn.addEventListener('click', () => handleDeleteDraftItem(item.id));

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}
