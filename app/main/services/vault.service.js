const { dbAll, dbRun, dbGet, isYearClosed } = require('./database');

async function getVaultReports(startDate, endDate, yearId) {
  const vault = await dbGet("SELECT id FROM BankAccounts WHERE is_cash_vault = 1 AND year_id = ? LIMIT 1", [yearId]);
  const vaultId = vault ? vault.id : -1;

  const reports = await dbAll('SELECT * FROM daily_reports WHERE report_date >= ? AND report_date <= ? AND year_id = ? AND COALESCE(is_voided, 0) = 0 ORDER BY report_date ASC', [startDate, endDate, yearId]);
  // Load custom channel amounts in one query. The previous per-report query
  // made restored databases progressively slower (N+1 database calls).
  const channelRows = await dbAll(
    `SELECT report_date, cashier_name, channel_key, amount
     FROM DailyReportChannelSales
     WHERE report_date >= ? AND report_date <= ? AND year_id = ?`,
    [startDate, endDate, yearId]
  );
  const channelsByReport = new Map();
  channelRows.forEach(row => {
    const key = `${row.report_date}\u0000${row.cashier_name}`;
    if (!channelsByReport.has(key)) channelsByReport.set(key, {});
    channelsByReport.get(key)[row.channel_key] = parseFloat(row.amount) || 0;
  });
  reports.forEach(report => {
    const key = `${report.report_date}\u0000${report.cashier_name}`;
    report.channel_sales = channelsByReport.get(key) || {};
  });
  const expenses = await dbAll('SELECT * FROM expenses WHERE report_date >= ? AND report_date <= ? AND year_id = ? AND COALESCE(is_voided, 0) = 0 ORDER BY report_date ASC', [startDate, endDate, yearId]);
  const employeeTxs = await dbAll(`
    SELECT t.*, e.name as employee_name 
    FROM employee_transactions t 
    JOIN employees e ON t.employee_id = e.id 
    WHERE t.tx_date >= ? AND t.tx_date <= ? AND t.year_id = ? AND COALESCE(t.amount, 0) != 0 AND COALESCE(t.is_archived, 0) = 0
    ORDER BY t.tx_date ASC
  `, [startDate, endDate, yearId]);

  const supplierTxs = await dbAll(`
    SELECT t.*, s.name as supplier_name 
    FROM supplier_transactions t 
    JOIN suppliers s ON t.supplier_id = s.id 
    WHERE t.tx_date >= ? AND t.tx_date <= ? AND t.year_id = ? AND COALESCE(t.is_archived, 0) = 0
    ORDER BY t.tx_date ASC
  `, [startDate, endDate, yearId]);


  const bankTxs = await dbAll(`
    SELECT * FROM BankTransactions 
    WHERE tx_date >= ? AND tx_date <= ? AND year_id = ? AND tx_type IN ('Deposit', 'Withdrawal') AND reference_type IS NULL AND reference_id IS NULL AND COALESCE(is_voided, 0) = 0
  `, [startDate, endDate, yearId]);
  
  return { reports, expenses, employeeTxs, supplierTxs, bankTxs };
}

async function closeVaultPeriod(startDate, endDate, yearId) {
  if (await isYearClosed(yearId)) throw new Error('السنة المالية مغلقة، لا يمكن قفل/فتح الفترات.');
  await dbRun('UPDATE daily_reports SET is_closed = 1 WHERE report_date >= ? AND report_date <= ? AND year_id = ?', [startDate, endDate, yearId]);
  return { success: true };
}

async function unlockVaultPeriod(startDate, endDate, yearId) {
  if (await isYearClosed(yearId)) throw new Error('السنة المالية مغلقة، لا يمكن قفل/فتح الفترات.');
  await dbRun('UPDATE daily_reports SET is_closed = 0 WHERE report_date >= ? AND report_date <= ? AND year_id = ?', [startDate, endDate, yearId]);
  return { success: true };
}

module.exports = {
  getVaultReports,
  closeVaultPeriod,
  unlockVaultPeriod
};
