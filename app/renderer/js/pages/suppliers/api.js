import {
  getSuppliers,
  getAllSuppliersStatement,
  saveSupplier,
  deleteSupplier,
  getSupplierTransactions,
  saveSupplierTransaction,
  deleteSupplierTransaction,
  getBankAccounts,
  archiveItem
} from '../../core/ipc.js';

export async function fetchSuppliers(yearId) {
  return await getSuppliers(yearId);
}

export async function createOrUpdateSupplier(data) {
  return await saveSupplier(data);
}

export async function removeSupplier(id) {
  return await deleteSupplier(id);
}

export async function fetchSupplierTransactions(supplierId, yearId) {
  return await getSupplierTransactions(supplierId, yearId);
}

export async function saveTransaction(tx) {
  return await saveSupplierTransaction(tx);
}

export async function deleteTransaction(id) {
  return await deleteSupplierTransaction(id);
}

export async function fetchBankAccounts(yearId) {
  return await getBankAccounts(yearId);
}

export async function archiveSupplierItem(type, id) {
  return await archiveItem(type, id);
}

export async function fetchAllSuppliersStatement(yearId) {
  return await getAllSuppliersStatement(yearId);
}
