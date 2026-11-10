const { ipcMain } = require('electron');
const expensesService = require('../services/expenses.service');
const { requireAuth } = require('./auth.helper');

function registerExpensesHandlers() {
  ipcMain.handle('get-expenses-by-date', requireAuth({ permission: 'reports' }, async (event, reportDate, yearId) => {
    return await expensesService.getExpensesByDate(reportDate, yearId);
  }));

  ipcMain.handle('save-expenses-report', requireAuth({ permission: 'reports' }, async (event, payload) => {
    return await expensesService.saveExpensesReport(payload);
  }));

  ipcMain.handle('get-expenses-ledger', requireAuth({ permission: 'reports' }, async (event, startDate, endDate, yearId) => {
    return await expensesService.getExpensesLedger(startDate, endDate, yearId);
  }));

  ipcMain.handle('delete-daily-expenses', requireAuth({ role: 'manager' }, async (event, reportDate, yearId) => {
    return await expensesService.deleteDailyExpenses(reportDate, yearId);
  }));

  ipcMain.handle('get-expenses-by-date-range', requireAuth({ permission: 'reports' }, async (event, startDate, endDate, yearId) => {
    return await expensesService.getExpensesByDateRange(startDate, endDate, yearId);
  }));

  ipcMain.handle('get-expense-by-voucher', requireAuth({ permission: 'reports' }, async (event, voucherNumber, yearId) => {
    return await expensesService.getExpenseReportByVoucherNumber(voucherNumber, yearId);
  }));
}

module.exports = {
  registerExpensesHandlers
};
