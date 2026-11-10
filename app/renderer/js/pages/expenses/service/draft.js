import { showToast } from '../../../core/notifications.js';
import { state, setEditingExpenseId } from '../state.js';
import { resetFormInputs, renderDraftTable } from '../ui.js';

export function handleEditDraftItem(id) {
  if (!state.draftReportState) return;
  const item = state.draftReportState.purchases.find(p => p.id === id);
  if (!item) return;

  document.getElementById('expense-name').value = item.name;
  document.getElementById('expense-qty').value = item.qty || '';
  document.getElementById('expense-amount').value = item.amount;
  document.getElementById('expense-category').value = item.category || 'other';
  
  const accSelect = document.getElementById('expense-account');
  if (accSelect && item.account_id) {
    accSelect.value = item.account_id;
  }

  setEditingExpenseId(id);
  const addBtn = document.getElementById('btn-add-expense-item');
  if (addBtn) {
    addBtn.innerHTML = `<span>${t('edit_expense_draft_item')}</span>`;
    addBtn.style.backgroundColor = 'var(--yellow)';
  }
}

export function handleDeleteDraftItem(id) {
  if (!state.draftReportState) return;
  state.draftReportState.purchases = state.draftReportState.purchases.filter(p => p.id !== id);
  if (state.editingExpenseId === id) {
    setEditingExpenseId(null);
    resetFormInputs();
  }
  renderDraftTable();
  showToast(t('draft_item_deleted'), 'success');
}

export async function handleAddOrUpdateItem() {
  const name = document.getElementById('expense-name').value.trim();
  const qty = document.getElementById('expense-qty').value.trim();
  const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
  const category = document.getElementById('expense-category').value;
  const accSelect = document.getElementById('expense-account');
  const account_id = accSelect ? (parseInt(accSelect.value) || null) : null;

  if (!name || amount <= 0) {
    showToast(t('expense_valid_input_required'), 'error');
    return;
  }

  if (!state.draftReportState) {
      showToast(t('draft_not_loaded'), 'error');
      return;
  }

  if (state.editingExpenseId !== null) {
    // Update existing item
    const item = state.draftReportState.purchases.find(p => p.id === state.editingExpenseId);
    if (item) {
      item.name = name;
      item.qty = qty;
      item.amount = amount;
      item.category = category;
      item.account_id = account_id;
    }
    setEditingExpenseId(null);
    showToast(t('draft_item_updated'), 'success');
  } else {
    // Add new item
    const nextId = state.draftReportState.purchases.length > 0 ? Math.max(...state.draftReportState.purchases.map(p => p.id)) + 1 : 1;
    state.draftReportState.purchases.push({
      id: nextId,
      name,
      qty,
      amount,
      category,
      account_id
    });
    showToast(t('draft_item_added'), 'success');
  }

  resetFormInputs();
  renderDraftTable();
}
