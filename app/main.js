const { app, BrowserWindow, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { applyPendingDatabaseRestore } = require('./main/services/pending-restore.service');

// Expand V8 RAM allowance and enable hardware GPU acceleration to prevent lag across multiple windows
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// A restored database must be installed before the shared SQLite connection
// and schema migrations are loaded.
applyPendingDatabaseRestore();

// Import aggregated handlers
const { registerAllHandlers } = require('./main/ipc/index');
const { startMobileSyncServer } = require('./main/services/mobile-sync-server.service');

// Import database and utilities for startup migrations
const { dbGet, dbAll, dbRun, closeDatabase } = require('./main/services/database');
const { withTransaction } = require('./main/services/database/transaction');
const { getLocalDateString } = require('./main/utils/date');

let mainWindow;

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'مطعم حضرموت اليمن - النظام الإداري'
  });

  if (fs.existsSync(iconPath)) {
    mainWindow.setIcon(iconPath);
  }

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => { 
    console.log('[RENDERER]', message, 'at', sourceId, 'line', line); 
  });
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  try { startMobileSyncServer(); } catch(e){ console.error(e); }

  // Register all IPC handlers
  registerAllHandlers(mainWindow);

  // Auto-create missing Cash Vaults for existing financial years
  dbAll('SELECT YearID FROM FinancialYears').then(years => {
    years.forEach(year => {
      dbGet('SELECT id FROM BankAccounts WHERE year_id = ? AND is_cash_vault = 1', [year.YearID]).then(row => {
        if (!row) {
          const todayStr = getLocalDateString();
          dbRun("INSERT INTO BankAccounts (bank_name, account_number, opening_balance, current_balance, start_date, year_id, is_cash_vault) VALUES (?, '', 0, 0, ?, ?, 1)", 
            ['صندوق الكاش - Cash Vault', todayStr, year.YearID]
          ).catch(e => console.error('Error creating cash vault:', e));
        }
      }).catch(e => console.error(e));
    });
  }).catch(e => console.error(e));

  // Migrate old expenses missing account_id
  setTimeout(async () => {
    try {
      const oldExps = await dbAll("SELECT * FROM expenses WHERE account_id IS NULL");
      if (oldExps && oldExps.length > 0) {
        for (const exp of oldExps) {
          const vault = await dbGet("SELECT id FROM BankAccounts WHERE is_cash_vault = 1 AND year_id = ? LIMIT 1", [exp.year_id || 1]);
          if (vault) {
            await withTransaction(async () => {
              await dbRun("UPDATE expenses SET account_id = ? WHERE id = ?", [vault.id, exp.id]);
              await dbRun(
                "INSERT INTO BankTransactions (tx_date, tx_type, from_account_id, amount, description, created_by, year_id, reference_type, reference_id) VALUES (?, 'Withdrawal', ?, ?, ?, ?, ?, 'expense', ?)",
                [exp.report_date, vault.id, exp.amount, `مصروف: ${exp.name}`, exp.cashier_name || 'النظام', exp.year_id || 1, exp.id]
              );
            });
          }
        }
        console.log("Migrated " + oldExps.length + " old expenses to Cash Vault.");
      }
    } catch (err) {
      console.error("Migration failed:", err);
    }
  }, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function cleanOldBackups(dirPath, maxDays = 30) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  const now = Date.now();
  const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;
  
  files.forEach(file => {
    if (file.startsWith('backup_') && file.endsWith('.sqlite')) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old backup: ${filePath}`);
        }
      } catch (e) {
        console.error(`Failed to process/delete old backup: ${filePath}`, e);
      }
    }
  });
}

app.on('window-all-closed', async () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
    const today = getLocalDateString();
    const backupDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, `backup_${today}.sqlite`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Auto-backup saved to: ${backupPath}`);
    
    // Clean old backups in default directory
    cleanOldBackups(backupDir, 30);

    // Try custom backup path from DB settings
    try {
      const row = await dbGet("SELECT value FROM settings WHERE key = 'app_settings'");
      if (row && row.value) {
        const appSettings = JSON.parse(row.value);
        const customPath = appSettings.backupPath;
        if (customPath && fs.existsSync(customPath)) {
          const customBackupPath = path.join(customPath, `backup_${today}.sqlite`);
          fs.copyFileSync(dbPath, customBackupPath);
          console.log(`Custom auto-backup saved to: ${customBackupPath}`);
          
          // Clean old backups in custom directory
          cleanOldBackups(customPath, 30);
        }
      }
    } catch (e) {
      console.error('Failed to save custom auto-backup:', e);
    }
  } catch (err) {
    console.error('Failed to create auto-backup:', err);
  }

  try {
    if (typeof closeDatabase === 'function') {
      await closeDatabase();
    }
  } catch (_) {}

  if (process.platform !== 'darwin') app.quit();
});
