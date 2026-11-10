const { ipcMain, dialog } = require('electron');
const systemService = require('../../services/system.service');
const { getMobileSyncServerInfo } = require('../../services/mobile-sync-server.service');
const { requireAuth } = require('../auth.helper');

function registerSettingsHandlers() {
  ipcMain.handle('get-mobile-sync-info', async () => {
    return getMobileSyncServerInfo();
  });

  // App Settings
  ipcMain.handle('get-app-settings', async () => {
    return await systemService.getAppSettings();
  });

  ipcMain.handle('save-app-settings', requireAuth({ role: 'manager' }, async (event, settings) => {
    return await systemService.saveAppSettings(settings);
  }));

  // UI Utilities
  ipcMain.handle('show-confirm', async (event, msg) => {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['نعم', 'إلغاء'],
      defaultId: 1,
      title: 'تأكيد',
      message: msg
    });
    return response === 0;
  });
}

module.exports = { registerSettingsHandlers };
