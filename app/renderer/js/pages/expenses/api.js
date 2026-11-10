import { 
  getReportState, 
  saveReportState, 
  getExpensesLedger, 
  deleteDailyExpenses, 
  getBankAccounts, 
  getCashiers 
} from '../../core/ipc.js';

export async function fetchReportState(dateStr, cashierName, yearId) {
  return await getReportState(dateStr, cashierName, yearId);
}

export async function saveReport(state) {
  return await saveReportState(state);
}

export async function fetchExpensesLedger(start, end, yearId) {
  return await getExpensesLedger(start, end, yearId);
}

export async function removeDailyExpenses(reportDate, cashierName, yearId) {
  return await deleteDailyExpenses(reportDate, cashierName, yearId);
}

export async function fetchBankAccounts(yearId) {
  return await getBankAccounts(yearId);
}

export async function fetchCashiers() {
  return await getCashiers();
}
