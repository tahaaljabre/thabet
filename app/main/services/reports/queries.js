const { dbGet, dbAll } = require('../database');

async function getReportState(dateStr, cashierName, yearId) {
  if (!cashierName) {
    const defaultCashier = await dbGet('SELECT name FROM cashiers ORDER BY id ASC LIMIT 1');
    cashierName = defaultCashier ? defaultCashier.name : 'الدور الأول';
  }
  const report = await dbGet('SELECT * FROM daily_reports WHERE report_date = ? AND cashier_name = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0', [dateStr, cashierName, yearId]);
  const empTxs = await dbAll('SELECT t.*, e.name as employee_name FROM employee_transactions t JOIN employees e ON t.employee_id = e.id WHERE t.tx_date = ? AND t.year_id = ? AND COALESCE(t.amount, 0) != 0', [dateStr, yearId]);
  const supTxs = await dbAll('SELECT t.*, s.name as supplier_name FROM supplier_transactions t JOIN suppliers s ON t.supplier_id = s.id WHERE t.tx_date = ? AND t.tx_type = \'عليه\' AND t.year_id = ?', [dateStr, yearId]);
  const cashierObj = await dbGet('SELECT active_user FROM cashiers WHERE name = ?', [cashierName]);
  const cashierUser = cashierObj ? cashierObj.active_user : 'الموظف المسؤول';
  const channelRows = await dbAll(
    'SELECT channel_key, amount FROM DailyReportChannelSales WHERE report_date = ? AND cashier_name = ? AND year_id = ?',
    [dateStr, cashierName, yearId]
  );
  const channelSales = Object.fromEntries(channelRows.map(row => [row.channel_key, parseFloat(row.amount) || 0]));
  
  if (report) {
    return {
      reportDate: report.report_date,
      voucherNumber: report.voucher_number || '',
      isClosed: report.is_closed === 1,
      cashierName: report.cashier_name,
      cashierUser: report.cashier_user,
      cashierActual: report.cashier_actual,
      sales: {
        cash: report.cash_sales,
        kbank: report.kbank,
        grab: report.grab,
        lineman: report.lineman,
        krungsri: report.krungsri
      },
      channelSales,
      empTxs: empTxs,
      supTxs: supTxs
    };
  } else {
    return {
      reportDate: dateStr,
      voucherNumber: '',
      isClosed: false,
      cashierName: cashierName,
      cashierUser: cashierUser,
      cashierActual: 0,
      sales: { cash: 0, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      channelSales,
      empTxs: empTxs,
      supTxs: supTxs
    };
  }
}

async function getCashierReports(cashierName, yearId) {
  let reports;
  if (cashierName) {
    reports = await dbAll(
      'SELECT * FROM daily_reports WHERE cashier_name = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0 ORDER BY report_date DESC',
      [cashierName, yearId]
    );
  } else {
    reports = await dbAll(
      'SELECT * FROM daily_reports WHERE year_id = ? AND COALESCE(is_voided, 0) = 0 ORDER BY report_date DESC',
      [yearId]
    );
  }
  for (const r of reports) {
    const channelRows = await dbAll(
      'SELECT channel_key, amount FROM DailyReportChannelSales WHERE report_date = ? AND cashier_name = ? AND year_id = ?',
      [r.report_date, r.cashier_name, yearId]
    );
    r.channel_sales = Object.fromEntries(channelRows.map(row => [row.channel_key, parseFloat(row.amount) || 0]));
    const empSum = await dbGet(`SELECT
      SUM(COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))) / 100.0 AS total
      FROM employee_transactions WHERE tx_date = ? AND year_id = ?`, [r.report_date, yearId]);
    const supSum = await dbGet(`SELECT
      SUM(COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))) / 100.0 AS total
      FROM supplier_transactions WHERE tx_date = ? AND tx_type = 'عليه' AND year_id = ?`, [r.report_date, yearId]);
    
    r.total_emp = (empSum ? empSum.total : 0) || 0;
    r.total_sup = (supSum ? supSum.total : 0) || 0;
  }
  return reports;
}

async function getReportByVoucherNumber(voucherNum, yearId) {
  if (!yearId) throw new Error('السنة المالية مطلوبة للبحث برقم السند');
  const report = await dbGet(
    'SELECT * FROM daily_reports WHERE voucher_number = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0',
    [voucherNum, yearId]
  );
  if (!report) return null;
  return await getReportState(report.report_date, report.cashier_name, report.year_id);
}

module.exports = { getReportState, getCashierReports, getReportByVoucherNumber };
