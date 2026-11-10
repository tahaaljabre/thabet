import { state } from '../state.js';
import * as ui from '../ui.js';

let editingPurchaseId = null;

export function addPurchase() {
  const name = document.getElementById('expense-name').value.trim();
  const qty = document.getElementById('expense-qty').value.trim();
  const amountStr = document.getElementById('expense-amount').value.trim();
  const category = document.getElementById('expense-category').value;
  const accountSelect = document.getElementById('expense-account');
  const account_id = accountSelect ? accountSelect.value : null;

  if (!name || !amountStr) {
    alert(t('name_amount_required'));
    return;
  }

  const amount = window.safeParseFloat(amountStr);
  if (amount <= 0) {
    alert(t('amount_greater_zero'));
    return;
  }

  if (editingPurchaseId) {
    const idx = state.purchases.findIndex(p => p.id === editingPurchaseId);
    if (idx !== -1) {
      state.purchases[idx] = { id: editingPurchaseId, name, qty, amount, category, account_id };
    }
    editingPurchaseId = null;
    ui.resetAddButton();
  } else {
    state.purchases.push({
      id: Date.now(),
      name,
      qty,
      amount,
      category,
      account_id
    });
  }

  ui.clearFormInputs();
  ui.renderDraftTable();
  updateTotalAmount();
  document.getElementById('expense-name').focus();
}

export function editPurchase(id) {
  const item = state.purchases.find(p => p.id === id);
  if (!item) return;
  editingPurchaseId = id;
  ui.fillFormForEdit(item);
  document.getElementById('expense-name').focus();
}

export function deletePurchase(id) {
  state.purchases = state.purchases.filter(p => p.id !== id);
  if (editingPurchaseId === id) {
    editingPurchaseId = null;
    ui.clearFormInputs();
    ui.resetAddButton();
  }
  ui.renderDraftTable();
  updateTotalAmount();
}

export function updateTotalAmount() {
  const total = state.purchases.reduce((sum, item) => sum + (window.safeParseFloat(item.amount) || 0), 0);
  const totalEl = document.getElementById('purchases-total-display');
  if (totalEl) {
    totalEl.textContent = `${window.appSettings?.currency || ''}${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
}
