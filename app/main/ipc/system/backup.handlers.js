const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
const systemService = require('../../services/system.service');
const cloudWorkerService = require('../../services/cloud-worker.service');
const { requireAuth } = require('../auth.helper');
const { db, dbAll } = require('../../services/database');
const { getLocalDateString } = require('../../utils/date');

async function validateSQLiteFile(filePath) {
  const magic = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, magic, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (magic.toString('utf8', 0, 15) !== 'SQLite format 3') {
    const error = new Error('Invalid SQLite backup file.');
    error.code = 'CLOUD_BACKUP_INVALID_DATABASE';
    throw error;
  }

  const sqlite3 = require('sqlite3').verbose();
  const checkDb = new sqlite3.Database(filePath, sqlite3.OPEN_READONLY);
  try {
    const integrity = await new Promise((resolve, reject) => {
      checkDb.get('PRAGMA integrity_check', (error, row) => error ? reject(error) : resolve(row));
    });
    if (!integrity || integrity.integrity_check !== 'ok') {
      const error = new Error('SQLite integrity check failed.');
      error.code = 'CLOUD_BACKUP_INVALID_DATABASE';
      throw error;
    }
  } finally {
    await new Promise(resolve => checkDb.close(() => resolve()));
  }
}

async function createRestoreSafetyBackup(dbPath) {
  const safetyDir = path.join(app.getPath('userData'), 'restore-safety');
  fs.mkdirSync(safetyDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyPath = path.join(safetyDir, `before_cloud_restore_${stamp}.sqlite`);
  const escapedPath = safetyPath.replace(/'/g, "''");
  await new Promise((resolve, reject) => {
    db.run(`VACUUM INTO '${escapedPath}'`, error => error ? reject(error) : resolve());
  });
  await validateSQLiteFile(safetyPath);
  return safetyPath;
}

function runOnDatabase(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, error => error ? reject(error) : resolve());
  });
}

async function preserveUsersInStagedDatabase(stagedPath, localUsers) {
  if (!localUsers.length) return;
  const sqlite3 = require('sqlite3').verbose();
  const stagedDb = new sqlite3.Database(stagedPath);
  try {
    await runOnDatabase(stagedDb, 'BEGIN IMMEDIATE TRANSACTION');
    await runOnDatabase(stagedDb, 'DELETE FROM users');
    for (const user of localUsers) {
      await runOnDatabase(
        stagedDb,
        'INSERT INTO users (username, password_hash, role, permissions) VALUES (?, ?, ?, ?)',
        [user.username, user.password_hash, user.role, user.permissions]
      );
    }
    await runOnDatabase(stagedDb, 'COMMIT');
  } catch (error) {
    await runOnDatabase(stagedDb, 'ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await new Promise((resolve, reject) => {
      stagedDb.close(error => error ? reject(error) : resolve());
    });
  }
}

async function scheduleDatabaseRestore(sourcePath) {
  await validateSQLiteFile(sourcePath);
  const userData = app.getPath('userData');
  const dbPath = path.join(userData, 'database.sqlite');
  const stagedPath = path.join(userData, 'pending-cloud-restore.sqlite');
  const markerPath = path.join(userData, 'pending-cloud-restore.json');
  const localUsers = await dbAll('SELECT * FROM users').catch(() => []);
  const safetyPath = await createRestoreSafetyBackup(dbPath);

  try {
    if (fs.existsSync(stagedPath)) fs.unlinkSync(stagedPath);
    fs.copyFileSync(sourcePath, stagedPath);
    await preserveUsersInStagedDatabase(stagedPath, localUsers);
    await validateSQLiteFile(stagedPath);
    fs.writeFileSync(markerPath, JSON.stringify({
      stagedPath,
      safetyBackupPath: safetyPath,
      createdAt: new Date().toISOString()
    }), 'utf8');
  } catch (error) {
    if (fs.existsSync(stagedPath)) fs.unlinkSync(stagedPath);
    if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);
    throw error;
  }

  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 250);
  return { success: true, safetyBackupPath: safetyPath };
}

function registerBackupHandlers(mainWindow) {
  // Backup & Restore
    ipcMain.handle('upload-cloud-backup', requireAuth({ role: 'manager' }, async () => {
      try {
        return await cloudWorkerService.uploadBackup();
      } catch (err) {
        console.error('Cloud Backup failed:', err);
        return { success: false, message: err.message };
      }
    }));

    ipcMain.handle('list-cloud-backups', requireAuth({ role: 'manager' }, async () => {
      return await cloudWorkerService.listBackups();
    }));

    ipcMain.handle('restore-cloud-backup', requireAuth({ role: 'manager' }, async (event, fileId) => {
      let downloadedPath = null;
      try {
        const downloaded = await cloudWorkerService.downloadBackup(fileId);
        downloadedPath = downloaded.tempPath;
        return await scheduleDatabaseRestore(downloadedPath);
      } catch (error) {
        console.error('Cloud restore failed:', error);
        return {
          success: false,
          code: error.code || 'CLOUD_RESTORE_FAILED',
          message: error.message
        };
      } finally {
        if (downloadedPath && fs.existsSync(downloadedPath)) {
          try { fs.unlinkSync(downloadedPath); } catch (error) { console.error('Failed to remove cloud restore temp file:', error); }
        }
      }
    }));

    ipcMain.handle('backup-db', requireAuth({ role: 'manager' }, async () => {
      try {
        const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
        const today = getLocalDateString();
        const defaultPath = path.join(app.getPath('documents'), `backup_${today}.sqlite`);
        
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'حفظ نسخة احتياطية لقاعدة البيانات',
          defaultPath: defaultPath,
          filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
        });
  
        if (canceled || !filePath) return { success: false, canceled: true };
  
        fs.copyFileSync(dbPath, filePath);
        return { success: true, filePath };
      } catch (err) {
        console.error('Backup failed:', err);
        return { success: false, error: err.message };
      }
    }));
  
    ipcMain.handle('restore-db', requireAuth({ role: 'manager' }, async () => {
      if (systemService.getActiveUserRole() !== 'manager') return { success: false, error: 'Unauthorized' };
      try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: 'استعادة نسخة احتياطية',
          properties: ['openFile'],
          filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
        });
  
        if (canceled || filePaths.length === 0) return { success: false, canceled: true };
        return await scheduleDatabaseRestore(filePaths[0]);
      } catch (err) {
        console.error('Restore failed:', err);
        return { success: false, error: err.message };
      }
    }));
  
    ipcMain.handle('get-audit-logs', requireAuth({ role: 'manager' }, async (event, yearId) => {
      if (systemService.getActiveUserRole() !== 'manager') return [];
      try {
        return await dbAll('SELECT * FROM AuditLogs WHERE year_id = ? ORDER BY log_date DESC LIMIT 500', [yearId]);
      } catch (e) {
        console.error(e);
        return [];
      }
    }));
  
    ipcMain.handle('select-backup-directory', requireAuth({ role: 'manager' }, async (event) => {
      const targetWin = require('electron').BrowserWindow.fromWebContents(event.sender) || mainWindow;
      const { canceled, filePaths } = await dialog.showOpenDialog(targetWin, {
        title: 'اختر مجلد النسخ الاحتياطي الخارجي',
        properties: ['openDirectory']
      });
      if (canceled || filePaths.length === 0) return null;
      return filePaths[0];
    }));

    ipcMain.handle('get-cloud-status', requireAuth({ role: 'manager' }, async () => {
      const tokenPath = path.join(app.getPath('userData'), 'google_drive_token.json');
      const isConnected = fs.existsSync(tokenPath);
      let lastBackupDate = null;
      try {
        const metadataPath = path.join(app.getPath('userData'), 'cloud-backup-info.json');
        if (fs.existsSync(metadataPath)) {
           const data = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
           lastBackupDate = data.lastBackupDate;
        }
      } catch (e) {}
      return { isConnected, lastBackupDate };
    }));

    ipcMain.handle('disconnect-cloud', requireAuth({ role: 'manager' }, async () => {
      const tokenPath = path.join(app.getPath('userData'), 'google_drive_token.json');
      if (fs.existsSync(tokenPath)) {
         fs.unlinkSync(tokenPath);
      }
      return { success: true };
    }));
}

module.exports = { registerBackupHandlers };
