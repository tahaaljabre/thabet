const { ipcMain } = require('electron');
const systemService = require('../../services/system.service');
const { requireAuth } = require('../auth.helper');
const accountingPeriods = require('../../services/accounting-periods.service');
const integrityService = require('../../services/financial-integrity.service');

function registerFinanceHandlers() {
  // Financial Years & Closing
    ipcMain.handle('get-financial-years', async () => {
      return await systemService.getFinancialYears();
    });
  
    ipcMain.handle('create-financial-year', requireAuth({ role: 'manager' }, async (event, name) => {
      return await systemService.createFinancialYear(name);
    }));

    ipcMain.handle('save-closing-partners', requireAuth({ role: 'manager' }, async (event, yearId, partners) => {
      return await systemService.saveClosingPartners(yearId, partners);
    }));
  
    ipcMain.handle('get-closing-partners', requireAuth({ role: 'manager' }, async (event, yearId) => {
      return await systemService.getClosingPartners(yearId);
    }));
  
    ipcMain.handle('reopen-financial-year', requireAuth({ role: 'manager' }, async (event, yearId) => {
      return await systemService.reopenFinancialYear(yearId);
    }));
  
    ipcMain.handle('close-financial-year', requireAuth({ role: 'manager' }, async (event, yearId, newYearName) => {
      return await systemService.closeFinancialYear(yearId, newYearName);
    }));
  
    ipcMain.handle('calculate-closing-figures', requireAuth({ role: 'manager' }, async (event, yearId) => {
      return await systemService.calculateClosingFigures(yearId);
    }));
  
    ipcMain.handle('save-closing-report', requireAuth({ role: 'manager' }, async (event, payload) => {
      return await systemService.saveClosingReport(payload);
    }));
  
    ipcMain.handle('get-closing-report', requireAuth({ role: 'manager' }, async (event, yearId) => {
      return await systemService.getClosingReport(yearId);
    }));

    ipcMain.handle('get-accounting-periods', requireAuth({ role: 'manager' }, async (event, yearId) => {
      return accountingPeriods.getAccountingPeriods(yearId);
    }));

    ipcMain.handle('close-accounting-period', requireAuth({ role: 'manager' }, async (event, yearId, month, note) => {
      return accountingPeriods.closeAccountingPeriod(yearId, month, note);
    }));

    ipcMain.handle('reopen-accounting-period', requireAuth({ role: 'manager' }, async (event, yearId, month, reason) => {
      return accountingPeriods.reopenAccountingPeriod(yearId, month, reason);
    }));

    ipcMain.handle('get-accounting-period-audit', requireAuth({ role: 'manager' }, async (event, periodId) => {
      return accountingPeriods.getPeriodAudit(periodId);
    }));

    ipcMain.handle('run-financial-integrity-check', requireAuth({ role: 'manager' }, async (event, yearId, checkDate) => {
      return integrityService.runFinancialIntegrityCheck(yearId, { checkDate, triggerType: 'manual' });
    }));

    ipcMain.handle('get-financial-integrity-history', requireAuth({ role: 'manager' }, async (event, yearId) => {
      await integrityService.ensureDailyIntegrityCheck(yearId);
      return integrityService.getIntegrityHistory(yearId);
    }));
}

module.exports = { registerFinanceHandlers };
