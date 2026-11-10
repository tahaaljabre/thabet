import { state, setState, resetState } from '../state.js';
import * as api from '../api.js';
import * as ui from '../ui.js';
import { getState } from '../../../core/state.js';
import { updateTotalAmount } from './draft.js';

export async function loadStateForDate(dateStr) {
  try {
    const yearId = getState('currentFiscalYear') || 1;
    const reportData = await api.fetchExpensesByDate(dateStr, yearId);
    if (reportData && Array.isArray(reportData.purchases)) {
      setState(reportData);
    } else {
      resetState();
      state.reportDate = dateStr;
    }
    ui.renderDraftTable();
    updateTotalAmount();
  } catch (err) {
    console.error('Failed to load purchases state:', err);
  }
}

export async function loadLedger() {
  try {
    const fromDate = document.getElementById('expenses-print-from')?.value;
    const toDate = document.getElementById('expenses-print-to')?.value;
    
    // Purchases and Expenses share the same database table and endpoints
    const yearId = getState('currentFiscalYear') || 1;
    const ledgerData = await api.fetchExpensesLedger(fromDate, toDate, yearId);
    if (ledgerData && ledgerData.success === false) {
      console.warn("fetchExpensesLedger error:", ledgerData.error);
      ui.renderLedgerTable([]);
    } else {
      ui.renderLedgerTable(ledgerData || []);
    }
  } catch (err) {
    console.error('Failed to load purchases ledger:', err);
  }
}

export async function savePurchasesReport() {
  if (!state.purchases || state.purchases.length === 0) {
    alert(t('no_purchases_to_save'));
    return;
  }

  const dateStr = ui.getPurchaseReportDate();
  if (!dateStr) {
    alert(t('select_date_required'));
    return;
  }

  const saveButton = document.getElementById('btn-save-purchases-report');

  try {
    if (saveButton) saveButton.disabled = true;
    const payload = {
      reportDate: dateStr,
      year_id: getState('currentFiscalYear') || window.currentYearId || 1,
      purchases: state.purchases,
      expenseVoucherNumber: state.expenseVoucherNumber
    };

    const result = await api.saveExpensesReport(payload);
    if (result && result.success && result.savedPurchasesCount === state.purchases.length) {
      // Update the voucher number if a new one was generated
      if (result.expenseVoucherNumber) {
        state.expenseVoucherNumber = result.expenseVoucherNumber;
      }

      // Read the saved rows back from SQLite before confirming success.
      await loadStateForDate(dateStr);
      await loadLedger();
      alert(t('save_success'));
    } else {
      throw new Error(result?.error || t('save_failed'));
    }
  } catch (err) {
    console.error('Save error:', err);
    alert(t('save_failed'));
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

export async function editLedgerEntry(dateStr) {
  ui.setPurchaseReportDate(dateStr);
  await loadStateForDate(dateStr);
  
  const formSection = document.getElementById('tab-purchases');
  if (formSection) formSection.scrollIntoView({ behavior: 'smooth' });
}

export async function deleteLedgerEntry(dateStr) {
  if (deleteLedgerEntry.inProgress) return;
  deleteLedgerEntry.inProgress = true;
  try {
  const confirmMsg = t('confirm_delete_daily_purchases');
  const confirmed = await window.api.confirmDialog(confirmMsg);
  if (!confirmed) return;
  
  try {
    const yearId = getState('currentFiscalYear') || 1;
    const res = await api.removeDailyExpenses(dateStr, yearId);
    
    if (res && res.success) {
      if (ui.getPurchaseReportDate() === dateStr) {
        await loadStateForDate(dateStr);
      }
      await loadLedger();
    } else {
      alert(t('delete_failed'));
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert(t('delete_failed'));
  }
  } finally {
    deleteLedgerEntry.inProgress = false;
  }
}

// Reuse print functions from existing print logic

export async function initializeModule() {
  const today = window.formatDateForInput ? window.formatDateForInput(new Date()) : new Date().toISOString().split('T')[0];
  ui.setPurchaseReportDate(today);
  
  const yearId = window.currentYearId || getState('currentFiscalYear') || 1;
  const banks = await api.fetchBankAccounts(yearId);
  ui.populateAccountsDropdown(banks);
  
  await loadStateForDate(today);
  await loadLedger();
}

export async function handleVoucherSearch() {
  const inputSearch = document.getElementById('expenses-voucher-search-input');
  if (!inputSearch) return;
  const val = inputSearch.value.trim();
  if (!val) {
    await loadLedger();
    return;
  }
  
  const match = await window.api.getExpenseReportByVoucherNumber(val, state.currentYearId);
  if (match && match.report_date) {
    const searchResult = await api.fetchExpensesLedger(match.report_date, match.report_date, state.currentYearId);
    ui.renderLedgerTable(searchResult);
  } else {
    ui.renderLedgerTable([]);
  }
}
