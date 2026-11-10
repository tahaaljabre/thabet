const { ipcMain } = require('electron');
const vaultService = require('../services/vault.service');
const { requireAuth } = require('./auth.helper');

function registerVaultHandlers() {
  ipcMain.handle('get-vault-reports', requireAuth({ permission: 'vault' }, async (event, startDate, endDate, yearId) => {
    return await vaultService.getVaultReports(startDate, endDate, yearId);
  }));

  ipcMain.handle('close-vault-period', requireAuth({ role: 'manager' }, async (event, startDate, endDate, yearId) => {
    return await vaultService.closeVaultPeriod(startDate, endDate, yearId);
  }));

  ipcMain.handle('unlock-vault-period', requireAuth({ role: 'manager' }, async (event, startDate, endDate, yearId) => {
    return await vaultService.unlockVaultPeriod(startDate, endDate, yearId);
  }));
}

module.exports = {
  registerVaultHandlers
};
