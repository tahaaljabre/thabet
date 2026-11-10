import { handleVoucherSearch, loadCashierReports, handleEditDailyReport, handleDeleteDailyReport } from './ledger.js';
import { handleSaveReport } from './save.js';
import { fetchCashiers, fetchReportState, fetchSettings } from './api.js';

import { showToast } from '../../core/notifications.js';
import * as ui from './ui.js';
import { handlePrintDailyReportVoucher, handlePrintCashierStatement } from './service.js';
import { handleExportCashierExcel } from './printing/excel.js';
import { getState } from '../../core/state.js';

import { state, globals, updateState } from './state.js';
import { renderSalesChannels } from './channels.js';

let salesSessionListenerAttached = false;
let salesChannelsListenerAttached = false;

// Date helper
function getLocalDateString() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}


export async function initEvents() {
  globals.currentYearId = window.currentYearId || getState('currentFiscalYear') || 1;
  globals.currentLang = getState('globals.currentLang') || 'ar';
  
  // Load settings
  try {
    globals.appSettings = await fetchSettings();
    renderSalesChannels(globals.appSettings);
  } catch (err) {
    console.error('Failed to load settings in sales:', err);
  }

  // Load cashiers list
  try {
    const res = await fetchCashiers();
    globals.cashiersList = Array.isArray(res) ? res : [];
  } catch (err) {
    console.error('Failed to load cashiers list in sales:', err);
    globals.cashiersList = [];
  }

  // Populate cashier dropdown
  const select = document.getElementById('select-report-cashier');
  if (select) {
    ui.populateCashierDropdown(globals.cashiersList);
    }

    // Set default dates
  const todayStr = getLocalDateString();
  globals.currentSelectedDate = todayStr;
  
  const dateInput = document.getElementById('input-report-date');
  if (dateInput) dateInput.value = todayStr;

  const printFrom = document.getElementById('sales-print-from');
  const printTo = document.getElementById('sales-print-to');
  if (printFrom) printFrom.value = todayStr;
  if (printTo) printTo.value = todayStr;

  // Bind change/click events
  if (dateInput) dateInput.addEventListener('change', handleDateChange);
  if (select) select.addEventListener('change', handleCashierChange);

  const btnSave = document.getElementById('btn-save-income');
  if (btnSave) btnSave.addEventListener('click', () => handleSaveReport(handleLoadStateForDate));

  if (printFrom) printFrom.addEventListener('change', loadCashierReports);
  if (printTo) printTo.addEventListener('change', loadCashierReports);

  const btnPrintStatement = document.getElementById('btn-print-sales-statement');
  if (btnPrintStatement) btnPrintStatement.addEventListener('click', handlePrintCashierStatement);
  const btnExcelStatement = document.getElementById('btn-excel-sales-statement');
  if (btnExcelStatement) btnExcelStatement.addEventListener('click', handleExportCashierExcel);

  const btnSearchVoucher = document.getElementById('btn-search-voucher');
  if (btnSearchVoucher) btnSearchVoucher.addEventListener('click', handleVoucherSearch);
  const inputVoucherSearch = document.getElementById('input-voucher-search');
  if (inputVoucherSearch) {
    inputVoucherSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleVoucherSearch();
    });
  }

  
  // Table action event delegation
  const txTbody = document.getElementById('sales-tx-tbody');
  if (txTbody) {
    txTbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const date = btn.getAttribute('data-date');
      const cashier = btn.getAttribute('data-cashier');
      if (!date || !cashier) return;
      
      if (btn.classList.contains('delete-report-btn')) {
        if (btn.disabled) return;
        btn.disabled = true;
        try {
          await handleDeleteDailyReport(date, cashier, handleLoadStateForDate);
        } finally {
          if (btn.isConnected) btn.disabled = false;
        }
      }
      else if (btn.classList.contains('edit-report-btn')) handleEditDailyReport(date, cashier, handleLoadStateForDate);
      else if (btn.classList.contains('print-report-btn')) handlePrintDailyReportVoucher(date, cashier);
    });
  }


  // Initial data fetch
  await handleLoadStateForDate(globals.currentSelectedDate);

  // Sales modules mount before login. Reload protected data once the user and
  // financial year become available instead of keeping the initial empty list.
  if (!salesSessionListenerAttached) {
    window.addEventListener('stateChanged', reloadSalesSessionData);
    salesSessionListenerAttached = true;
  }
  if (!salesChannelsListenerAttached) {
    const refreshChannels = async () => {
      globals.appSettings = await fetchSettings();
      renderSalesChannels(globals.appSettings, state.channelSales || {});
      ui.renderCashierReportsTable(globals.currentCashierReports || [], globals.currentSelectedDate, globals.appSettings?.currency || '', globals.appSettings);
      if (state && typeof state.isClosed === 'boolean') {
        ui.renderLockState(state.isClosed);
      }
    };
    window.addEventListener('salesChannelsChanged', refreshChannels);
    window.addEventListener('languageChanged', refreshChannels);
    salesChannelsListenerAttached = true;
  }
}

async function reloadSalesSessionData() {
  try {
    globals.currentYearId = window.currentYearId || getState('currentFiscalYear') || 1;
    globals.appSettings = await fetchSettings();

    const result = await fetchCashiers();
    if (result && result.success === false) {
        throw new Error(result.error || t('cashiers_load_failed'));
    }
    globals.cashiersList = Array.isArray(result) ? result : [];
    ui.populateCashierDropdown(globals.cashiersList);

    if (globals.cashiersList.length === 0) {
      ui.renderCashierReportsTable([], globals.currentSelectedDate, globals.appSettings?.currency || '', globals.appSettings);
      showToast(t('no_cashiers_settings_warning'), 'warning');
      return;
    }

    await handleLoadStateForDate(globals.currentSelectedDate || getLocalDateString());
  } catch (err) {
    console.error('Failed to reload sales data after login:', err);
    showToast(`${t('sales_data_load_failed')}: ${err.message}`, 'error');
  }
}

async function handleDateChange(e) {
  const newDate = e.target.value;
  if (newDate) {
    globals.currentSelectedDate = newDate;
    await handleLoadStateForDate(newDate);
  }
}

async function handleCashierChange(e) {
  const cashierName = e.target.value;
  const cashierObj = globals.cashiersList.find(c => c.name === cashierName);
  if (cashierObj) {
    const userField = document.getElementById('input-cashier-user');
    if (userField) userField.value = cashierObj.active_user;
  }
  await handleLoadStateForDate(globals.currentSelectedDate);
}

async function handleLoadStateForDate(dateStr) {
  const select = document.getElementById('select-report-cashier');
  const cashierName = select ? select.value : '';

  try {
    const report = await fetchReportState(dateStr, cashierName, globals.currentYearId);
    if (report && report.success === false) {
      console.warn("fetchReportState returned error:", report.error);
      throw new Error(report.error);
    }
    updateState(report || {
      reportDate: dateStr,
      year_id: globals.currentYearId,
      cashierName: cashierName,
      cashierUser: document.getElementById('input-cashier-user').value || '',
      cashierActual: 0,
      sales: { cash: 0, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      purchases: []
    });
  } catch (err) {
    updateState({
      reportDate: dateStr,
      year_id: globals.currentYearId,
      cashierName: cashierName,
      cashierUser: document.getElementById('input-cashier-user').value || '',
      cashierActual: 0,
      sales: { cash: 0, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      purchases: []
    });
  }

  ui.updateFormInputs(state);
  renderSalesChannels(globals.appSettings, state.channelSales || {});
  ui.renderLockState(state.isClosed === 1);
  await loadCashierReports();
}
