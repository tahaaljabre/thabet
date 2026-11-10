const { ipcMain } = require('electron');
const reportsService = require('../services/reports.service');
const { requireAuth } = require('./auth.helper');

function registerReportsHandlers() {
  ipcMain.handle('get-report-state', requireAuth({ permission: 'sales' }, async (event, dateStr, cashierName, yearId) => {
    return await reportsService.getReportState(dateStr, cashierName, yearId);
  }));

  ipcMain.handle('get-cashier-reports', requireAuth({ permission: 'sales' }, async (event, cashierName, yearId) => {
    return await reportsService.getCashierReports(cashierName, yearId);
  }));

  ipcMain.handle('delete-daily-report', requireAuth({ role: 'manager' }, async (event, reportDate, cashierName, yearId) => {
    return await reportsService.deleteDailyReport(reportDate, cashierName, yearId);
  }));

  ipcMain.handle('save-report-state', requireAuth({ permission: 'sales' }, async (event, state) => {
    return await reportsService.saveReportState(state);
  }));

  ipcMain.handle('get-report-by-voucher', requireAuth({ permission: 'sales' }, async (event, voucherNum, yearId) => {
    return await reportsService.getReportByVoucherNumber(voucherNum, yearId);
  }));
}

module.exports = {
  registerReportsHandlers
};
