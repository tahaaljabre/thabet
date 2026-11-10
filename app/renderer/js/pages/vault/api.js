import {
  getVaultReports,
  closeVaultPeriod,
  unlockVaultPeriod,
  getGeneralVouchers,
  saveGeneralVoucher,
  updateGeneralVoucher,
  deleteGeneralVoucher,
  getBankAccounts,
  getAllPartners,
  savePartner,
  getSettingsPartners,
  printHtmlToPDF,
  getAppSettings,
  getFinancialYears
} from '../../core/ipc.js';

export async function fetchVaultReports(start, end, yearId) {
  return await getVaultReports(start, end, yearId);
}

export async function closePeriod(start, end, yearId) {
  return await closeVaultPeriod(start, end, yearId);
}

export async function unlockPeriod(start, end, yearId) {
  return await unlockVaultPeriod(start, end, yearId);
}

export async function fetchGeneralVouchers(yearId) {
  return await getGeneralVouchers(yearId);
}

export async function createGeneralVoucher(voucher) {
  return await saveGeneralVoucher(voucher);
}

export async function editGeneralVoucher(voucher) {
  return await updateGeneralVoucher(voucher);
}

export async function removeGeneralVoucher(id) {
  return await deleteGeneralVoucher(id);
}

export async function fetchBankAccounts(yearId) {
  return await getBankAccounts(yearId);
}

export async function fetchAllPartners(yearId) {
  return await getAllPartners(yearId);
}

export async function createPartner(partner) {
  return await savePartner(partner);
}

export async function fetchSettingsPartners() {
  return await getSettingsPartners();
}

export async function generatePDF(html, format = 'A4') {
  return await printHtmlToPDF(html, format);
}

export async function fetchSettings() {
  return await getAppSettings();
}

export async function fetchFinancialYears() {
  return await getFinancialYears();
}
