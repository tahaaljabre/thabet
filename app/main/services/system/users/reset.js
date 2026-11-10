const { dbRun } = require('../../database');
const { getActiveUserRole, setActiveSession } = require('./session');

async function clearAllData() {
  if (getActiveUserRole() !== 'manager') throw new Error('Unauthorized');
  await dbRun(
    `INSERT INTO FinancialMaintenanceFlags (flag, enabled) VALUES ('allow_financial_purge', 1)
     ON CONFLICT(flag) DO UPDATE SET enabled = 1`
  );
  
  const tables = [
    'users', 'DailyReportChannelSales', 'BankSalesMapping', 'BankTransactions', 'BankAccounts', 
    'employee_salary_history', 'employee_transactions', 'employees', 
    'supplier_transactions', 'suppliers', 'CashGeneralVouchers', 
    'ClosingPartners', 'ClosingReports', 'partners', 'daily_reports', 
    'expenses', 'FinancialYears', 'cashiers', 'settings'
  ];

  try {
    for (const table of tables) {
      try {
        await dbRun(`DELETE FROM ${table}`);
      } catch (e) {
        console.error(`Error deleting from ${table}:`, e);
      }
    }
  } finally {
    await dbRun("DELETE FROM FinancialMaintenanceFlags WHERE flag = 'allow_financial_purge'");
  }

  try {
    await dbRun("DELETE FROM sqlite_sequence");
  } catch(e) {}
  
  const currentYear = new Date().getFullYear().toString();
  await dbRun("INSERT INTO FinancialYears (YearName, IsClosed) VALUES (?, 0)", [currentYear]);
  setActiveSession(null, {});
  return { success: true };
}

module.exports = { clearAllData };
