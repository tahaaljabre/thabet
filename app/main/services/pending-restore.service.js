const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SQLITE_MAGIC = 'SQLite format 3';

function hasSQLiteHeader(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const fd = fs.openSync(filePath, 'r');
  try {
    const magic = Buffer.alloc(16);
    fs.readSync(fd, magic, 0, 16, 0);
    return magic.toString('utf8', 0, 15) === SQLITE_MAGIC;
  } finally {
    fs.closeSync(fd);
  }
}

function applyPendingDatabaseRestore() {
  const userData = app.getPath('userData');
  const markerPath = path.join(userData, 'pending-cloud-restore.json');
  if (!fs.existsSync(markerPath)) return { applied: false };

  const expectedStagedPath = path.join(userData, 'pending-cloud-restore.sqlite');
  const databasePath = path.join(userData, 'database.sqlite');
  const replacementPath = path.join(userData, 'database.restore-new.sqlite');
  let marker;

  try {
    marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    if (path.resolve(marker.stagedPath || '') !== path.resolve(expectedStagedPath)) {
      throw new Error('Invalid pending restore path.');
    }
    if (!hasSQLiteHeader(expectedStagedPath)) {
      throw new Error('Pending restore is not a SQLite database.');
    }

    fs.copyFileSync(expectedStagedPath, replacementPath);
    for (const suffix of ['-journal', '-wal', '-shm']) {
      const auxiliaryPath = databasePath + suffix;
      if (fs.existsSync(auxiliaryPath)) fs.unlinkSync(auxiliaryPath);
    }
    if (fs.existsSync(databasePath)) fs.unlinkSync(databasePath);
    fs.renameSync(replacementPath, databasePath);
    fs.unlinkSync(expectedStagedPath);
    fs.unlinkSync(markerPath);
    return { applied: true };
  } catch (error) {
    console.error('Failed to apply pending cloud restore:', error);
    try {
      if (fs.existsSync(replacementPath)) fs.unlinkSync(replacementPath);
      if (marker?.safetyBackupPath && hasSQLiteHeader(marker.safetyBackupPath)) {
        fs.copyFileSync(marker.safetyBackupPath, databasePath);
      }
      if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);
    } catch (recoveryError) {
      console.error('Failed to recover from pending restore error:', recoveryError);
    }
    return { applied: false, error };
  }
}

module.exports = { applyPendingDatabaseRestore };
