const { ipcMain } = require('electron');
const systemService = require('../../services/system.service');
const { requireAuth } = require('../auth.helper');

function registerVoucherHandlers() {
  // General Vouchers
    ipcMain.handle('search-vouchers-by-notes', async (event, queryText, yearId) => {
      return await systemService.searchAllVouchersByNotes(queryText, yearId);
    });
    ipcMain.handle('get-general-vouchers', requireAuth({ permission: 'vault' }, async (event, yearId) => {
      return await systemService.getGeneralVouchers(yearId);
    }));
  
    ipcMain.handle('save-general-voucher', requireAuth({ permission: 'vault' }, async (event, voucher) => {
      return await systemService.saveGeneralVoucher(voucher);
    }));
  
    ipcMain.handle('delete-general-voucher', requireAuth({ role: 'manager' }, async (event, id) => {
      return await systemService.deleteGeneralVoucher(id);
    }));
  
    ipcMain.handle('update-general-voucher', requireAuth({ permission: 'vault' }, async (event, voucher) => {
      return await systemService.updateGeneralVoucher(voucher);
    }));
  
    ipcMain.handle('print-general-voucher', requireAuth({ permission: 'vault' }, async (event, id) => {
      return { success: true };
    }));
}

module.exports = { registerVoucherHandlers };
