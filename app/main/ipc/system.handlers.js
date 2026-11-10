const { registerUserHandlers } = require('./system/users.handlers');
const { registerFinanceHandlers } = require('./system/finance.handlers');
const { registerVoucherHandlers } = require('./system/vouchers.handlers');
const { registerSettingsHandlers } = require('./system/settings.handlers');
const { registerBackupHandlers } = require('./system/backup.handlers');
const { registerPrintingHandlers } = require('./system/printing.handlers');
const { registerTrashHandlers } = require('./system/trash.handlers');
const { registerUpdaterHandlers } = require('./system/updater.handlers');
const { registerWindowHandlers } = require('./system/windows.handlers');

function registerSystemHandlers(mainWindow) {
  registerUserHandlers();
  registerFinanceHandlers();
  registerVoucherHandlers();
  registerSettingsHandlers();
  registerBackupHandlers(mainWindow);
  registerPrintingHandlers(mainWindow);
  registerTrashHandlers();
  registerUpdaterHandlers(mainWindow);
  registerWindowHandlers(mainWindow);
}

module.exports = { registerSystemHandlers };
