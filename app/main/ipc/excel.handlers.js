const { ipcMain, dialog } = require('electron');
const { requireAuth } = require('./auth.helper');
const { saveExcelReport } = require('../services/excel.service');

function registerExcelHandlers() {
  ipcMain.handle('export-excel-report', requireAuth({}, async (event, spec) => {
    return await saveExcelReport(spec, dialog);
  }));
}

module.exports = { registerExcelHandlers };
