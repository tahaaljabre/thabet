const { ipcMain, dialog } = require('electron');
const banksService = require('../services/banks.service');
const reconciliationService = require('../services/bank-reconciliation.service');
const { requireAuth } = require('./auth.helper');

function registerBanksHandlers() {
  ipcMain.handle('get-bank-accounts', requireAuth({}, async (event, yearId) => {
    return await banksService.getBankAccountsWithBalance(yearId);
  }));

  ipcMain.handle('save-bank-account', requireAuth({ role: 'manager' }, async (event, acc) => {
    return await banksService.saveBankAccount(acc);
  }));

  ipcMain.handle('delete-bank-account', requireAuth({ role: 'manager' }, async (event, id) => {
    return await banksService.deleteBankAccount(id);
  }));

  ipcMain.handle('get-bank-sales-mappings', requireAuth({ role: 'manager' }, async (event, yearId) => {
    return await banksService.getBankSalesMappings(yearId);
  }));

  ipcMain.handle('save-bank-sales-mappings', requireAuth({ role: 'manager' }, async (event, mappings, yearId) => {
    return await banksService.saveBankSalesMappings(mappings, yearId);
  }));

  ipcMain.handle('get-bank-transactions', requireAuth({ role: 'manager' }, async (event, yearId, options) => {
    return await banksService.getBankTransactions(yearId, options);
  }));

  ipcMain.handle('save-bank-transaction', requireAuth({ role: 'manager' }, async (event, tx) => {
    return await banksService.saveBankTransaction(tx);
  }));

  ipcMain.handle('delete-bank-transaction', requireAuth({ role: 'manager' }, async (event, id) => {
    return await banksService.deleteBankTransaction(id);
  }));

  ipcMain.handle('preview-bank-statement', requireAuth({ role: 'manager' }, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Bank statements', extensions: ['xlsx', 'csv'] }]
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    return reconciliationService.previewStatement(result.filePaths[0]);
  }));

  ipcMain.handle('import-bank-statement', requireAuth({ role: 'manager' }, async (event, payload) => {
    return reconciliationService.importStatement(payload);
  }));
  ipcMain.handle('list-bank-reconciliations', requireAuth({ role: 'manager' }, async (event, yearId, bankId) => {
    return reconciliationService.listReconciliations(yearId, bankId);
  }));
  ipcMain.handle('get-bank-reconciliation', requireAuth({ role: 'manager' }, async (event, id) => {
    return reconciliationService.getReconciliation(id);
  }));
  ipcMain.handle('match-bank-statement-line', requireAuth({ role: 'manager' }, async (event, lineId, sourceType, sourceId) => {
    return reconciliationService.matchLine(lineId, sourceType, sourceId);
  }));
  ipcMain.handle('get-bank-line-candidates', requireAuth({ role: 'manager' }, async (event, lineId) => {
    return reconciliationService.getLineCandidates(lineId);
  }));
  ipcMain.handle('ignore-bank-statement-line', requireAuth({ role: 'manager' }, async (event, lineId, note) => {
    return reconciliationService.ignoreLine(lineId, note);
  }));
  ipcMain.handle('adjust-bank-statement-line', requireAuth({ role: 'manager' }, async (event, lineId, category) => {
    return reconciliationService.createAdjustment(lineId, category);
  }));
  ipcMain.handle('approve-bank-reconciliation', requireAuth({ role: 'manager' }, async (event, id) => {
    return reconciliationService.approveReconciliation(id);
  }));
}

module.exports = {
  registerBanksHandlers
};
