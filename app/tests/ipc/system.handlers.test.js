jest.mock('../../main/services/system.service', () => ({
  getActiveUserRole: jest.fn()
}));
jest.mock('../../main/services/database', () => ({ db: {}, dbAll: jest.fn() }));
jest.mock('../../main/services/google-drive.service', () => ({
  listBackups: jest.fn()
}));
jest.mock('../../main/ipc/auth.helper', () => ({
  requireAuth: jest.fn((_requirements, handler) => handler)
}));

const { ipcMain } = require('electron');
const { registerSystemHandlers } = require('../../main/ipc/system.handlers');
const systemService = require('../../main/services/system.service');
const { dbAll } = require('../../main/services/database');
const googleDriveService = require('../../main/services/google-drive.service');
const { requireAuth } = require('../../main/ipc/auth.helper');

describe('System IPC registration', () => {
  beforeEach(() => {
    ipcMain.handle.mockClear();
    dbAll.mockReset();
    systemService.getActiveUserRole.mockReset();
    googleDriveService.listBackups.mockReset();
    requireAuth.mockClear();
  });

  it('loads every split handler and registers each channel once', () => {
    expect(() => registerSystemHandlers({})).not.toThrow();

    const channels = ipcMain.handle.mock.calls.map(([channel]) => channel);
    expect(channels.length).toBeGreaterThanOrEqual(46);
    expect(new Set(channels).size).toBe(channels.length);
    expect(channels).toEqual(expect.arrayContaining([
      'login-user',
      'run-financial-integrity-check',
      'get-financial-integrity-history',
      'get-accounting-periods',
      'close-accounting-period',
      'reopen-accounting-period',
      'get-accounting-period-audit',
      'get-financial-years',
      'get-general-vouchers',
      'get-app-settings',
      'backup-db',
      'upload-cloud-backup',
      'list-cloud-backups',
      'restore-cloud-backup',
      'print-html-to-pdf',
      'get-trash-items',
      'restore-trash-item',
      'permanently-delete-trash-item'
    ]));
  });

  it('registers monthly period reopening as a manager operation', () => {
    registerSystemHandlers({});

    const reopenRegistration = ipcMain.handle.mock.calls.find(
      ([channel]) => channel === 'reopen-accounting-period'
    );
    expect(reopenRegistration).toBeTruthy();
    expect(requireAuth).toHaveBeenCalledWith(
      { role: 'manager' },
      expect.any(Function)
    );
  });

});
