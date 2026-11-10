import {
  getArchivedEmployees,
  getArchivedSuppliers,
  getArchivedEmployeeTransactions,
  getArchivedSupplierTransactions,
  archiveItem,
  getEmployeeTransactions,
  getEmployeeSalaryHistory,
  getSupplierTransactions,
  printHtmlToPDF,
  getAppSettings
} from '../../core/ipc.js';

export async function fetchArchivedEmployees() {
  return await getArchivedEmployees();
}

export async function fetchArchivedSuppliers() {
  return await getArchivedSuppliers();
}

export async function fetchArchivedEmployeeTxs() {
  return await getArchivedEmployeeTransactions();
}

export async function fetchArchivedSupplierTxs() {
  return await getArchivedSupplierTransactions();
}

export async function restoreArchivedItem(type, id) {
  // restore is archiveItem with archive=false
  return await archiveItem(type, id, false);
}

export async function fetchEmployeeTransactions(id) {
  return await getEmployeeTransactions(id);
}

export async function fetchEmployeeSalaryHistory(id) {
  return await getEmployeeSalaryHistory(id);
}

export async function fetchSupplierTransactions(id) {
  return await getSupplierTransactions(id);
}

export async function generatePDF(html, format = 'A4') {
  return await printHtmlToPDF(html, format);
}

export async function fetchSettings() {
  return await getAppSettings();
}
