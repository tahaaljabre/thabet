const { ipcMain } = require('electron');
const systemService = require('../../services/system.service');
const { resolveWindowSession, setWindowSession, clearWindowSession, clearAllWindowSessions, activeWindowSessionCount } = require('../../services/system/users/session');
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

      if (resolveWindowSession(event.sender.id).role !== 'manager') {
        return { success: false, error: 'غير مصرح - هذه العملية تتطلب صلاحيات مدير' };
      }

      return await systemService.createUser(username, password, role, permissions);
    });
  
    ipcMain.handle('update-user', requireAuth({ role: 'manager' }, async (event, id, username, password, permissions) => {
      return await systemService.updateUser(id, username, password, permissions);
    }));
  
    ipcMain.handle('login-user', async (event, username, password) => {
      const result = await systemService.loginUser(username, password);
      if (result && result.success && result.user) {
        setWindowSession(event.sender.id, {
          role: result.user.role,
          permissions: result.user.permissions,
          user: result.user,
          yearId: null,
          yearName: ''
        });
      }
      return result;
    });

    ipcMain.handle('logout-user', async (event) => {
      clearWindowSession(event.sender.id);
      if (activeWindowSessionCount() === 0) {
        systemService.setActiveSession(null, {});
      }
      return { success: true };
    });
  
    ipcMain.handle('get-users', requireAuth({ role: 'manager' }, async () => {
      return await systemService.getUsers();
    }));
  
    ipcMain.handle('delete-user', requireAuth({ role: 'manager' }, async (event, id) => {
      return await systemService.deleteUser(id);
    }));
  
    ipcMain.handle('clear-all-data', requireAuth({ role: 'manager' }, async () => {
      const result = await systemService.clearAllData();
      clearAllWindowSessions();
      return result;
    }));
}

module.exports = { registerUserHandlers };
