import { fetchReportByVoucherNumber, fetchCashierReports, removeDailyReport } from './api.js';
import { showToast } from '../../core/notifications.js';
import { showConfirm } from '../../components/modal.js';
import * as ui from './ui.js';
import { state, globals, updateState } from './state.js';

export async function handleVoucherSearch() {
  const searchInput = document.getElementById('input-voucher-search');
  if (!searchInput || !searchInput.value) return;
  const voucherNum = parseInt(searchInput.value, 10);
  if (isNaN(voucherNum)) return;
  
  try {
    const report = await fetchReportByVoucherNumber(voucherNum, globals.currentYearId);
    if (report && report.success === false) {
      showToast(report.error || t('voucher_fetch_error'), 'error');
      return;
    }
    if (report) {
      updateState(report);
      globals.currentSelectedDate = report.reportDate;
      const dateInput = document.getElementById('input-report-date');
      if (dateInput) dateInput.value = report.reportDate;
      
      const printFrom = document.getElementById('sales-print-from');
      if (printFrom) printFrom.value = report.reportDate;
      
      const printTo = document.getElementById('sales-print-to');
      if (printTo) printTo.value = report.reportDate;
      
      const select = document.getElementById('select-report-cashier');
      if (select) select.value = report.cashierName;
      
      ui.updateFormInputs(state);
      ui.renderLockState(state.isClosed === 1);
      await loadCashierReports();
      showToast(t('voucher_found'), 'success');
    } else {
      showToast(t('voucher_missing'), 'warning');
    }
  } catch (err) {
    console.error('Failed to search by voucher:', err);
    showToast(t('search_failed'), 'error');
  }
}

export async function loadCashierReports() {
  const select = document.getElementById('select-report-cashier');
  if (!select) return;
  const cashierName = select.value;
  if (!cashierName) return;

  try {
    const result = await fetchCashierReports(cashierName, globals.currentYearId);
    if (result && result.success === false) {
      throw new Error(result.error || t('sales_vouchers_fetch_failed'));
    }
    const reports = Array.isArray(result) ? result : [];
    
    const fromDateVal = document.getElementById('sales-print-from').value;
    const toDateVal = document.getElementById('sales-print-to').value;

    let filteredReports = reports;
    if (fromDateVal) {
      filteredReports = filteredReports.filter(r => r.report_date >= fromDateVal);
    }
    if (toDateVal) {
      filteredReports = filteredReports.filter(r => r.report_date <= toDateVal);
    }

    const currencySymbol = globals.appSettings?.currency || '';
    ui.renderCashierReportsTable(filteredReports, globals.currentSelectedDate, currencySymbol, globals.appSettings);
  } catch (err) {
    console.error('Failed to load cashier reports in events:', err);
    ui.renderCashierReportsTable([], globals.currentSelectedDate, globals.appSettings?.currency || '', globals.appSettings);
    showToast(`${t('sales_vouchers_load_failed')}: ${err.message}`, 'error');
  }
}
export async function handleEditDailyReport(reportDate, cashierName, loadStateForDate) {
  const select = document.getElementById('select-report-cashier');
  if (select) select.value = cashierName;
  
  const dateInput = document.getElementById('input-report-date');
  if (dateInput) dateInput.value = reportDate;
  
  globals.currentSelectedDate = reportDate;
  await loadStateForDate(reportDate);
}

export async function handleDeleteDailyReport(reportDate, cashierName, loadStateForDate) {
  const confirmed = await showConfirm(
    t('delete_confirmation_title'),
    `${t('confirm_delete_sales_movement')} ${reportDate} ${t('cashier_word')}: ${cashierName}?`
  );

  if (confirmed) {
    try {
      console.log('Deleting report...', { reportDate, cashierName, currentYearId: globals.currentYearId });
      const res = await removeDailyReport(reportDate, cashierName, globals.currentYearId);
      if (res && res.success) {
        showToast(t('movement_deleted'), 'success');
        
        try {
          if (globals.currentSelectedDate === reportDate) {
            await loadStateForDate(globals.currentSelectedDate);
          } else {
            await loadCashierReports();
          }
        } catch (loadErr) {
          console.error('Error refreshing list after deletion:', loadErr);
        }
      } else {
        alert(t('movement_delete_failed'));
      }
    } catch (err) {
      console.error('Delete operation failed:', err);
      alert(`${t('movement_delete_error')}: ${err.message}`);
    }
  }
}
