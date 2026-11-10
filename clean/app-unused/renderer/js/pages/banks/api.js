import {
  getBankAccounts,
  saveBankAccount,
  deleteBankAccount,
  getBankSalesMappings,
  saveBankSalesMappings,
  getBankTransactions,
  saveBankTransaction,
  deleteBankTransaction
} from '../../core/ipc.js';

export async function fetchAccounts(yearId) {
  return await getBankAccounts(yearId);
}

export async function createOrUpdateAccount(acc) {
  return await saveBankAccount(acc);
}

export async function removeAccount(id) {
  return await deleteBankAccount(id);
}

export async function fetchMappings(yearId) {
  return await getBankSalesMappings(yearId);
}

export async function saveMappings(mappings) {
  return await saveBankSalesMappings(mappings);
}

export async function fetchTransactions(yearId) {
  return await getBankTransactions(yearId);
}

export async function createOrUpdateTransaction(tx) {
  return await saveBankTransaction(tx);
}

export async function removeTransaction(id) {
  return await deleteBankTransaction(id);
}
