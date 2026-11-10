const { ipcMain } = require('electron');
const systemService = require('../../services/system.service');
const { getActiveUserRole } = require('../../services/system/users/session');
const { requireAuth } = require('../auth.helper');

function registerUserHandlers() {
  // Users
    ipcMain.handle('check-users-count', async () => {
      return await systemService.checkUsersCount();
    });
  
    ipcMain.handle('create-user', async (event, username, password, role, permissions) => {
      const { count } = await systemService.checkUsersCount();

      // Bootstrap is the only unauthenticated user creation path. Once an
      // account exists, adding users remains restricted to a signed-in manager.
      if (count === 0) {
        return await systemService.createUser(username, password, 'manager', permissions);
      }

      if (getActiveUserRole() !== 'manager') {
        return { success: false, error: 'غير مصرح - هذه العملية تتطلب صلاحيات مدير' };
      }

      return await systemService.createUser(username, password, role, permissions);
    });
  
    ipcMain.handle('update-user', requireAuth({ role: 'manager' }, async (event, id, username, password, permissions) => {
      return await systemService.updateUser(id, username, password, permissions);
    }));
  
    ipcMain.handle('login-user', async (event, username, password) => {
      return await systemService.loginUser(username, password);
    });
  
    ipcMain.handle('get-users', requireAuth({ role: 'manager' }, async () => {
      return await systemService.getUsers();
    }));
  
    ipcMain.handle('delete-user', requireAuth({ role: 'manager' }, async (event, id) => {
      return await systemService.deleteUser(id);
    }));
  
    ipcMain.handle('clear-all-data', requireAuth({ role: 'manager' }, async () => {
      return await systemService.clearAllData();
    }));
}

module.exports = { registerUserHandlers };
