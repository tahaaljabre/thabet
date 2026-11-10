export async function fetchExpensesByDate(dateStr, yearId) {
  return await window.api.getExpensesByDate(dateStr, yearId);
}

export async function saveExpensesReport(state) {
  return await window.api.saveExpensesReport(state);
}

export async function fetchExpensesLedger(start, end, yearId) {
  return await window.api.getExpensesLedger(start, end, yearId);
}

export async function removeDailyExpenses(reportDate, yearId) {
  return await window.api.deleteDailyExpenses(reportDate, yearId);
}

export async function fetchBankAccounts(yearId) {
  return await window.api.getBankAccounts(yearId);
}

export async function getExpensesByDateRange(start, end, yearId) {
  return await window.api.getExpensesByDateRange(start, end, yearId);
}

export async function printHtmlToPDF(html, size) {
  return await window.api.printHtmlToPDF(html, size);
}
