const { ipcMain } = require('electron');
const {
  getCurrentAppVersion,
  checkForAppUpdates,
  downloadAndInstallAppUpdate
} = require('../../services/updater.service');

function registerUpdaterHandlers(mainWindow) {
  ipcMain.handle('get-app-version', async () => {
    return { version: getCurrentAppVersion() };
  });

  ipcMain.handle('check-app-updates', async () => {
    return await checkForAppUpdates();
  });

  ipcMain.handle('download-and-install-update', async (_event, payload = {}) => {
    return await downloadAndInstallAppUpdate(mainWindow, payload.fileId || null, payload.version || null);
  });
}

module.exports = { registerUpdaterHandlers };

