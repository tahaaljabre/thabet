const { ipcMain } = require('electron');
const dashboardService = require('../services/dashboard.service');
const accountingService = require('../services/accounting.service');
const { requireAuth } = require('./auth.helper');

function registerDashboardHandlers() {
  ipcMain.handle('get-dashboard-stats', requireAuth({ role: 'manager' }, async (event, startDate, endDate, yearId, cashierName) => {
    return await dashboardService.getDashboardStats(startDate, endDate, yearId, cashierName);
  }));

  ipcMain.handle('get-trial-balance', requireAuth({ role: 'manager' }, async (event, filters) => {
    return accountingService.getTrialBalance(filters);
  }));

  ipcMain.handle('get-general-ledger', requireAuth({ role: 'manager' }, async (event, filters) => {
    return accountingService.getGeneralLedger(filters);
  }));

  ipcMain.handle('get-ledger-accounts', requireAuth({ role: 'manager' }, async (event, yearId) => {
    return accountingService.ensureChartOfAccounts(yearId);
  }));

  ipcMain.handle('get-settings-partners', requireAuth({ role: 'manager' }, async (event) => {
    return await dashboardService.getSettingsPartners();
  }));

  ipcMain.handle('update-partner', requireAuth({ role: 'manager' }, async (event, data) => {
    return await dashboardService.updatePartner(data);
  }));

  ipcMain.handle('delete-partner', requireAuth({ role: 'manager' }, async (event, name) => {
    return await dashboardService.deletePartner(name);
  }));

  ipcMain.handle('save-partner', requireAuth({ role: 'manager' }, async (event, partner) => {
    return await dashboardService.savePartner(partner);
  }));

  ipcMain.handle('get-all-partners', requireAuth({ role: 'manager' }, async (event, yearId) => {
    return await dashboardService.getAllPartners(yearId);
  }));

  ipcMain.handle('get-cashiers', requireAuth({ permission: 'sales' }, async (event) => {
    return await dashboardService.getCashiers();
  }));

  ipcMain.handle('save-cashier', requireAuth({ role: 'manager' }, async (event, cashier) => {
    return await dashboardService.saveCashier(cashier);
  }));

  ipcMain.handle('delete-cashier', requireAuth({ role: 'manager' }, async (event, id) => {
    return await dashboardService.deleteCashier(id);
  }));
}

module.exports = {
  registerDashboardHandlers
};
