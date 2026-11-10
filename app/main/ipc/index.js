const { registerExpensesHandlers } = require('./expenses.handlers');
const { registerReportsHandlers } = require('./reports.handlers');
const { registerEmployeesHandlers } = require('./employees.handlers');
const { registerSuppliersHandlers } = require('./suppliers.handlers');
const { registerBanksHandlers } = require('./banks.handlers');
const { registerDashboardHandlers } = require('./dashboard.handlers');
const { registerVaultHandlers } = require('./vault.handlers');
const { registerArchiveHandlers } = require('./archive.handlers');
const { registerSystemHandlers } = require('./system.handlers');
const { registerExcelHandlers } = require('./excel.handlers');

function registerAllHandlers(mainWindow) {
  registerExpensesHandlers();
  registerReportsHandlers();
  registerEmployeesHandlers();
  registerSuppliersHandlers();
  registerBanksHandlers();
  registerDashboardHandlers();
  registerVaultHandlers();
  registerArchiveHandlers();
  registerSystemHandlers(mainWindow);
  registerExcelHandlers();
}

module.exports = {
  registerAllHandlers
};
