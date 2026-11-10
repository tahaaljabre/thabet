import {
  calculateClosingFigures,
  getClosingPartners,
  saveGeneralVoucher,
  saveClosingPartners,
  closeFinancialYear,
  reopenFinancialYear,
  getFinancialYears,
  printHtmlToPDF,
  getAppSettings
} from '../../core/ipc.js';

export async function fetchClosingFigures(yearId) {
  return await calculateClosingFigures(yearId);
}

export async function fetchClosingPartners(yearId) {
  return await getClosingPartners(yearId);
}

export async function createGeneralVoucher(data) {
  return await saveGeneralVoucher(data);
}

export async function updateClosingPartners(yearId, partners) {
  return await saveClosingPartners(yearId, partners);
}

export async function closeYear(yearId, nextYearName) {
  return await closeFinancialYear(yearId, nextYearName);
}

export async function reopenYear(yearId) {
  return await reopenFinancialYear(yearId);
}

export async function fetchFinancialYears() {
  return await getFinancialYears();
}

export async function generatePDF(html, format = 'A4') {
  return await printHtmlToPDF(html, format);
}

export async function fetchSettings() {
  return await getAppSettings();
}
