import { fetchReportState, saveReport, fetchExpensesLedger, removeDailyExpenses } from '../api.js';
import { showToast } from '../../../core/notifications.js';
import { showConfirm } from '../../../components/modal.js';
import { state, updateDraftReportState, setEditingExpenseId } from '../state.js';
import { resetFormInputs, renderDraftTable } from '../ui.js';
import { clearElement } from '../../../core/dom.js';
import { renderDataTable } from '../../../components/data-table.js';

export async function handleDateOrCashierChange() {
  const dateStr = document.getElementById('expense-report-date').value;
  const cashierSelect = document.getElementById('expense-cashier-select');
  const cashierName = cashierSelect ? cashierSelect.value : '';

  if (!dateStr || !cashierName) return;

  try {
    const draft = await fetchReportState(dateStr, cashierName, state.currentYearId);
    updateDraftReportState(draft);
    setEditingExpenseId(null);
    resetFormInputs();
    renderDraftTable();
  } catch (err) {
    console.error('Failed to load report state:', err);
    showToast(t('selected_day_load_error'), 'error');
  }
}

export async function handleSaveReport() {
  if (!state.draftReportState) return;
  try {
    state.draftReportState.year_id = state.currentYearId;
    const res = await saveReport(state.draftReportState);
    if (res && res.success) {
      showToast(t('expenses_saved_reconciled'), 'success');
      await handleDateOrCashierChange();
      await loadLedger();
    }
  } catch (err) {
    console.error('Failed to save report state:', err);
    showToast(`${t('expenses_save_error')}: ${err.message}`, 'error');
  }
}

export async function loadLedger() {
  const fromDate = document.getElementById('expenses-print-from').value;
  const toDate = document.getElementById('expenses-print-to').value;
  const container = document.getElementById('expenses-ledger-table-container');

  if (!container) return;
  clearElement(container);

  try {
    const ledgerData = await fetchExpensesLedger(fromDate, toDate, state.currentYearId);
    
    const columns = [
      { key: 'report_date', label: t('date') },
      { key: 'items_count', label: t('expense_items_count') },
      { key: 'total_amount', label: t('total_amount'), format: (v) => {
        const currency = window.globals?.appSettings?.currency || window.appSettings?.currency || '';
        return `${currency}${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      } }
    ];

    renderDataTable(container, columns, ledgerData, {
      pageSize: 15,
      onEdit: (row) => handleEditLedger(row),
      onDelete: (row) => handleDeleteLedger(row)
    });
  } catch (err) {
    console.error('Failed to load ledger:', err);
  }
}

export async function handleEditLedger(row) {
  document.getElementById('expense-report-date').value = row.report_date;
  await handleDateOrCashierChange();
  
  // Scroll to form
  const formSection = document.querySelector('.cashier-card');
  if (formSection) formSection.scrollIntoView({ behavior: 'smooth' });
}

export async function handleDeleteLedger(row) {
  const confirmed = await showConfirm(t('delete_confirmation_title'), `${t('confirm_delete_expenses_date')} ${row.report_date}?`);
  if (!confirmed) return;

  try {
    const res = await removeDailyExpenses(row.report_date, '', state.currentYearId);
    if (res && res.success) {
      showToast(t('daily_expenses_deleted'), 'success');
      await handleDateOrCashierChange();
      await loadLedger();
    }
  } catch (err) {
    console.error('Failed to delete daily expenses:', err);
    showToast(`${t('delete_error')}: ${err.message}`, 'error');
  }
}
