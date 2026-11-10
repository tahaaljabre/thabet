import { getState } from '../../core/state.js';
import { setCurrentYearId } from './state.js';
import { loadCashiersDropdown, loadAccountsDropdown } from './ui.js';
import { handleDateOrCashierChange, loadLedger, handleAddOrUpdateItem, handleSaveReport, handlePrintStatement } from './service.js';

export async function initEvents() {
  const yearId = getState('currentFiscalYear') || 1;
  setCurrentYearId(yearId);

  // Initialize inputs
  const dateEl = document.getElementById('expense-report-date');
  const cashierEl = document.getElementById('expense-cashier-select');
  const fromEl = document.getElementById('expenses-print-from');
  const toEl = document.getElementById('expenses-print-to');

  // Set default date to today
  const today = new Date().toISOString().substring(0, 10);
  if (dateEl) {
    dateEl.value = today;
    dateEl.addEventListener('change', handleDateOrCashierChange);
  }
  if (fromEl) {
    fromEl.value = today;
    fromEl.addEventListener('change', loadLedger);
  }
  if (toEl) {
    toEl.value = today;
    toEl.addEventListener('change', loadLedger);
  }

  // Load Cashiers and Accounts
  await loadCashiersDropdown(cashierEl);
  await loadAccountsDropdown();

  if (cashierEl) {
    cashierEl.addEventListener('change', handleDateOrCashierChange);
  }

  // Setup buttons
  const addBtn = document.getElementById('btn-add-expense-item');
  if (addBtn) addBtn.addEventListener('click', handleAddOrUpdateItem);

  const saveBtn = document.getElementById('btn-save-expenses-report');
  if (saveBtn) saveBtn.addEventListener('click', handleSaveReport);

  const printBtn = document.getElementById('btn-print-expenses-statement');
  if (printBtn) printBtn.addEventListener('click', handlePrintStatement);

  // Initial load
  await handleDateOrCashierChange();
  await loadLedger();
}
