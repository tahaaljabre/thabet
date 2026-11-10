import {
  getCashiers,
  getReportState,
  saveReportState,
  getCashierReports,
  deleteDailyReport,
  printHtmlToPDF,
  getAppSettings
} from '../../core/ipc.js';

export async function fetchCashiers() {
  return await getCashiers();
}

export async function fetchReportState(dateStr, cashierName, yearId) {
  return await getReportState(dateStr, cashierName, yearId);
}

export async function fetchReportByVoucherNumber(voucherNum, yearId) {
  return await window.api.getReportByVoucherNumber(voucherNum, yearId);
}

export async function saveReport(state) {
  return await saveReportState(state);
}

export async function fetchCashierReports(cashierName, yearId) {
  return await getCashierReports(cashierName, yearId);
}

export async function removeDailyReport(reportDate, cashierName, yearId) {
  return await deleteDailyReport(reportDate, cashierName, yearId);
}

export async function generatePDF(html, format = 'A4') {
  return await printHtmlToPDF(html, format);
}

export async function fetchSettings() {
  return await getAppSettings();
}
