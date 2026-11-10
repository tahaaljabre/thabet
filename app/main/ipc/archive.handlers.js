const { ipcMain } = require('electron');
const archiveService = require('../services/archive.service');
const { requireAuth } = require('./auth.helper');

function registerArchiveHandlers() {
  ipcMain.handle('archive-item', requireAuth({ role: 'manager' }, async (event, payload) => {
    return await archiveService.archiveItem(payload);
  }));

  ipcMain.handle('get-archived-employees', requireAuth({ permission: 'employees' }, async (event) => {
    return await archiveService.getArchivedEmployees();
  }));

  ipcMain.handle('get-archived-suppliers', requireAuth({ permission: 'suppliers' }, async (event) => {
    return await archiveService.getArchivedSuppliers();
  }));

  ipcMain.handle('get-archived-employee-transactions', requireAuth({ permission: 'employees' }, async (event) => {
    return await archiveService.getArchivedEmployeeTransactions();
  }));

  ipcMain.handle('get-archived-supplier-transactions', requireAuth({ permission: 'suppliers' }, async (event) => {
    return await archiveService.getArchivedSupplierTransactions();
  }));
}

module.exports = {
  registerArchiveHandlers
};
