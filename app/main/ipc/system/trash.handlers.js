const { ipcMain } = require('electron');
const trashService = require('../../services/trash.service');
const { requireAuth } = require('../auth.helper');

function registerTrashHandlers() {
  ipcMain.handle('get-trash-items', requireAuth({ role: 'manager' }, async (event, yearId) => trashService.getTrashItems(yearId)));
  ipcMain.handle('restore-trash-item', requireAuth({ role: 'manager' }, async (event, id) => trashService.restoreTrashItem(id)));
  ipcMain.handle('permanently-delete-trash-item', requireAuth({ role: 'manager' }, async (event, id) => trashService.permanentlyDeleteTrashItem(id)));
}

module.exports = { registerTrashHandlers };
