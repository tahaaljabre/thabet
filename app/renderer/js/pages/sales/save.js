import { saveReport } from './api.js';
import { showToast } from '../../core/notifications.js';
import { state, globals } from './state.js';
import { getConfiguredChannels, readCustomChannelSales } from './channels.js';

function safeParseFloat(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export async function handleSaveReport(loadStateForDate) {
  if (state.isClosed === 1) {
    showToast(t('closed_movement_no_edit'), 'warning');
    return;
  }

  const cashierSelect = document.getElementById('select-report-cashier');
  state.cashierName = cashierSelect ? cashierSelect.value : '';
  state.cashierUser = document.getElementById('input-cashier-user').value || '';
  state.reportDate = document.getElementById('input-report-date').value;
  state.year_id = globals.currentYearId;

  if (!state.cashierName) {
    showToast(t('select_cashier_before_save'), 'warning');
    return;
  }
  if (!state.reportDate) {
    showToast(t('select_report_date_before_save'), 'warning');
    return;
  }

  state.cashierActual = Number(safeParseFloat(document.getElementById('input-cashier-actual').value)) || 0;
  state.sales = {
    cash: Number(safeParseFloat(document.getElementById('input-sales-cash').value)) || 0,
    kbank: Number(safeParseFloat(document.getElementById('input-sales-kbank').value)) || 0,
    grab: Number(safeParseFloat(document.getElementById('input-sales-grab').value)) || 0,
    lineman: Number(safeParseFloat(document.getElementById('input-sales-lineman').value)) || 0,
    krungsri: Number(safeParseFloat(document.getElementById('input-sales-krungsri').value)) || 0
  };
  const activeChannelKeys = new Set(getConfiguredChannels(globals.appSettings).filter(channel => channel.active !== false).map(channel => channel.key));
  for (const key of ['kbank', 'grab', 'lineman', 'krungsri']) {
    if (!activeChannelKeys.has(key)) state.sales[key] = 0;
  }
  state.channelSales = readCustomChannelSales();

  try {
    const result = await saveReport(state);
    if (!result || result.success === false || !result.voucherNumber) {
      throw new Error(result?.error || t('voucher_number_not_returned'));
    }
    state.voucherNumber = result.voucherNumber;
    showToast(`${t('sales_voucher_saved_prefix')} ${result.voucherNumber} ${t('sales_voucher_saved_suffix')}`, 'success');
    await loadStateForDate(state.reportDate);
  } catch (err) {
    console.error('Failed to save report state:', err);
    showToast(t('cashier_reconciliation_save_error'), 'error');
  }
}
