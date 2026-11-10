const { dbGet, dbAll, dbRun } = require('../database');
const { getBankAccountsWithBalance } = require('../banks.service');
const { getFinancialSummary } = require('../finance.service');

async function resolveValidYearId(yearId) {
  let targetYearId = Number(yearId);
  if (!Number.isInteger(targetYearId) || targetYearId <= 0) {
    const activeYear = await dbGet('SELECT YearID FROM FinancialYears WHERE IsClosed = 0 ORDER BY YearID DESC LIMIT 1')
      || await dbGet('SELECT YearID FROM FinancialYears ORDER BY YearID DESC LIMIT 1');
    return activeYear ? activeYear.YearID : 1;
  }
  const exists = await dbGet('SELECT YearID FROM FinancialYears WHERE YearID = ?', [targetYearId]);
  if (!exists) {
    const fallbackYear = await dbGet('SELECT YearID FROM FinancialYears WHERE IsClosed = 0 ORDER BY YearID DESC LIMIT 1')
      || await dbGet('SELECT YearID FROM FinancialYears ORDER BY YearID DESC LIMIT 1');
    return fallbackYear ? fallbackYear.YearID : 1;
  }
  return targetYearId;
}

// Closing Calculations
async function calculateClosingFigures(yearId) {
  const validYearId = await resolveValidYearId(yearId);
  const summary = await getFinancialSummary(null, null, validYearId);
  const roundMoney = value => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

  const totalSales = roundMoney(summary.totalSales);
  const totalPurchases = roundMoney(summary.totalPurchases);
  // Profit follows the accrual basis. Cash payments remain separate so
  // settling an employee or supplier liability never reduces profit twice.
  const employeeExpenses = roundMoney(summary.totalSalaryExpense);
  const employeeCashPayments = roundMoney(summary.totalSalaries);
  const appCommissions = roundMoney(summary.totalAppCommissions);
  const supplierDebts = roundMoney(summary.totalSupplierDebts);
  const operatingExpenses = roundMoney(summary.totalExpenses - summary.totalAppCommissions);
  const accountingNetProfit = roundMoney(summary.netProfit);
  const employeeReceivables = roundMoney(summary.totalEmployeeReceivables);
  // Employee debit balances are assets, but the business does not treat them
  // as available profit for partner distribution until collected.
  const netProfit = roundMoney(accountingNetProfit - employeeReceivables);
  const cashNetFlow = roundMoney(summary.cashNetFlow);
  const zakat = netProfit > 0 ? roundMoney(netProfit * 0.025) : 0;
  const distributable = netProfit > 0 ? roundMoney(netProfit - zakat) : 0;

  const cashWithdrawals = await dbAll(`SELECT partner_name,
    SUM(COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))) / 100.0 AS total
    FROM CashGeneralVouchers WHERE year_id = ? AND category = 'Partner Withdrawal'
    GROUP BY partner_name`, [validYearId]);
  const bankWithdrawals = await dbAll(`SELECT partner_name,
    SUM(COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))) / 100.0 AS total
    FROM BankTransactions WHERE year_id = ? AND tx_type = 'Payment'
      AND description LIKE '%Partner Withdrawal%' GROUP BY partner_name`, [validYearId]);
  
  const mergedMap = {};
  cashWithdrawals.forEach(w => { if(w.partner_name) mergedMap[w.partner_name] = (mergedMap[w.partner_name] || 0) + w.total; });
  bankWithdrawals.forEach(w => { if(w.partner_name) mergedMap[w.partner_name] = (mergedMap[w.partner_name] || 0) + w.total; });
  
  const withdrawals = Object.keys(mergedMap).map(k => ({ partner_name: k, total: mergedMap[k] }));

  const bankBalances = await getBankAccountsWithBalance(validYearId);

  return {
    totalSales,
    totalPurchases,
    employeeExpenses,
    employeeCashPayments,
    operatingExpenses,
    appCommissions,
    supplierDebts,
    accountingNetProfit,
    employeeReceivables,
    commissionBreakdown: summary.appCommissions,
    netProfit,
    cashNetFlow,
    zakat,
    distributable,
    withdrawals,
    bankBalances
  };
}

async function saveClosingReport({ yearId, closingDate, netProfit, zakat, distributableProfit, pdfBase64 }) {
  const validYearId = await resolveValidYearId(yearId);
  await dbRun(`
    INSERT INTO ClosingReports (year_id, closing_date, net_profit, zakat, distributable_profit, pdf_data)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(year_id) DO UPDATE SET
      closing_date = excluded.closing_date,
      net_profit = excluded.net_profit,
      zakat = excluded.zakat,
      distributable_profit = excluded.distributable_profit,
      pdf_data = excluded.pdf_data
  `, [validYearId, closingDate, netProfit, zakat, distributableProfit, Buffer.from(pdfBase64, 'base64')]);
  return { success: true };
}

async function getClosingReport(yearId) {
  const validYearId = await resolveValidYearId(yearId);
  return await dbGet(`SELECT closing_date,
    COALESCE(net_profit_minor, CAST(ROUND(net_profit * 100) AS INTEGER)) AS net_profit_minor,
    COALESCE(zakat_minor, CAST(ROUND(zakat * 100) AS INTEGER)) AS zakat_minor,
    COALESCE(distributable_profit_minor, CAST(ROUND(distributable_profit * 100) AS INTEGER)) AS distributable_profit_minor
    FROM ClosingReports WHERE year_id = ?`, [validYearId]);
}
module.exports = {
  calculateClosingFigures,
  saveClosingReport,
  getClosingReport
};
