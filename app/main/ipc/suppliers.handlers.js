const { ipcMain } = require('electron');
const suppliersService = require('../services/suppliers.service');
const { requireAuth } = require('./auth.helper');

function registerSuppliersHandlers() {
  ipcMain.handle('get-all-suppliers-statement', requireAuth({ permission: 'suppliers' }, async (event, startDate, endDate, yearId) => {
    return await suppliersService.getAllSuppliersStatement(startDate, endDate, yearId);
  }));

  ipcMain.handle('get-suppliers', requireAuth({ permission: 'suppliers' }, async (event, yearId) => {
    return await suppliersService.getSuppliers(yearId);
  }));

  ipcMain.handle('save-supplier', requireAuth({ permission: 'suppliers' }, async (event, sup) => {
    return await suppliersService.saveSupplier(sup);
  }));

  ipcMain.handle('delete-supplier', requireAuth({ role: 'manager' }, async (event, id) => {
    return await suppliersService.deleteSupplier(id);
  }));

  ipcMain.handle('get-supplier-transactions', requireAuth({ permission: 'suppliers' }, async (event, supId, yearId) => {
    return await suppliersService.getSupplierTransactions(supId, yearId);
  }));

  ipcMain.handle('save-supplier-transaction', requireAuth({ permission: 'suppliers' }, async (event, tx) => {
    return await suppliersService.saveSupplierTransaction(tx);
  }));

  ipcMain.handle('delete-supplier-transaction', requireAuth({ role: 'manager' }, async (event, id) => {
    return await suppliersService.deleteSupplierTransaction(id);
  }));

  ipcMain.handle('get-supplier-transaction-by-voucher', requireAuth({ permission: 'suppliers' }, async (event, voucherNo, yearId) => {
    return await suppliersService.getSupplierTransactionByVoucher(voucherNo, yearId);
  }));
}

module.exports = {
  registerSuppliersHandlers
};
