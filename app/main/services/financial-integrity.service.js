const { dbAll, dbGet, dbRun, getActiveUser, logActivity } = require('./database');

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function finding(code, severity, count, details = []) {
  return { code, severity, count: Number(count) || 0, details };
}

async function runFinancialIntegrityCheck(yearId, options = {}) {
  if (!yearId) throw new Error('FIN_YEAR_REQUIRED');
  const checkDate = options.checkDate || todayIso();
  const triggerType = options.triggerType || 'manual';
  const findings = [];

  const unbalanced = await dbAll(
    `SELECT je.id, je.entry_number, je.entry_date,
       SUM(jl.debit_minor) AS debit_minor, SUM(jl.credit_minor) AS credit_minor
     FROM JournalEntries je JOIN JournalLines jl ON jl.entry_id = je.id
     WHERE je.year_id = ? AND je.status = 'posted' AND je.entry_date <= ?
     GROUP BY je.id HAVING SUM(jl.debit_minor) <> SUM(jl.credit_minor)`,
    [yearId, checkDate]
  );
  if (unbalanced.length) findings.push(finding('unbalanced_journals', 'critical', unbalanced.length, unbalanced));

  const salesMismatch = await dbAll(
    `SELECT * FROM (SELECT d.report_date, d.cashier_name,
       COALESCE(d.cash_sales_minor, ROUND(d.cash_sales*100), 0) +
       COALESCE(d.kbank_minor, ROUND(d.kbank*100), 0) +
       COALESCE(d.grab_minor, ROUND(d.grab*100), 0) +
       COALESCE(d.lineman_minor, ROUND(d.lineman*100), 0) +
       COALESCE(d.krungsri_minor, ROUND(d.krungsri*100), 0) AS source_minor,
       COALESCE((
         SELECT SUM(jl.debit_minor) FROM JournalEntries je
         JOIN JournalLines jl ON jl.entry_id=je.id
         WHERE je.year_id=d.year_id AND je.source_type='sales'
           AND je.source_key=d.report_date || '|' || d.cashier_name
           AND je.status='posted' AND je.reversed_by_entry_id IS NULL
       ), 0) AS journal_minor
     FROM daily_reports d
     WHERE d.year_id=? AND d.report_date<=? AND COALESCE(d.is_voided,0)=0)
     WHERE source_minor <> journal_minor`,
    [yearId, checkDate]
  );
  if (salesMismatch.length) findings.push(finding('sales_journal_mismatch', 'critical', salesMismatch.length, salesMismatch));

  const expenseMismatch = await dbAll(
    `SELECT e.report_date,
       SUM(COALESCE(e.amount_minor, ROUND(e.amount*100))) AS source_minor,
       COALESCE((
         SELECT SUM(jl.debit_minor) FROM JournalEntries je
         JOIN JournalLines jl ON jl.entry_id=je.id
         WHERE je.year_id=e.year_id AND je.source_type='expenses'
           AND je.source_key=e.report_date AND je.status='posted'
           AND je.reversed_by_entry_id IS NULL
       ), 0) AS journal_minor
     FROM expenses e
     WHERE e.year_id=? AND e.report_date<=? AND COALESCE(e.is_voided,0)=0
     GROUP BY e.report_date HAVING source_minor <> journal_minor`,
    [yearId, checkDate]
  );
  if (expenseMismatch.length) findings.push(finding('expenses_journal_mismatch', 'critical', expenseMismatch.length, expenseMismatch));

  const bankMissing = await dbAll(
    `SELECT b.id, b.tx_date, b.amount_minor
     FROM BankTransactions b
     WHERE b.year_id=? AND b.tx_date<=? AND COALESCE(b.is_voided,0)=0
       AND COALESCE(b.reference_type,'') NOT IN ('expense','commission')
       AND NOT EXISTS (
         SELECT 1 FROM JournalEntries je
         WHERE je.year_id=b.year_id AND je.source_type='bank'
           AND je.source_key=CAST(b.id AS TEXT) AND je.status='posted'
           AND je.reversed_by_entry_id IS NULL
       )`,
    [yearId, checkDate]
  );
  if (bankMissing.length) findings.push(finding('bank_transaction_without_journal', 'critical', bankMissing.length, bankMissing));

  const duplicateSales = await dbAll(
    `SELECT voucher_number, COUNT(*) AS duplicate_count
     FROM daily_reports WHERE year_id=? AND voucher_number IS NOT NULL
       AND COALESCE(is_voided,0)=0
     GROUP BY voucher_number HAVING COUNT(*)>1`,
    [yearId]
  );
  if (duplicateSales.length) findings.push(finding('duplicate_sales_vouchers', 'critical', duplicateSales.length, duplicateSales));

  const invalidVat = await dbAll(
    `SELECT report_date, cashier_name, net_sales_minor, vat_minor
     FROM daily_reports
     WHERE year_id=? AND report_date<=? AND COALESCE(is_voided,0)=0
       AND vat_minor IS NOT NULL AND net_sales_minor IS NOT NULL
       AND net_sales_minor + vat_minor <> (
         COALESCE(cash_sales_minor, ROUND(cash_sales*100), 0) +
         COALESCE(kbank_minor, ROUND(kbank*100), 0) +
         COALESCE(grab_minor, ROUND(grab*100), 0) +
         COALESCE(lineman_minor, ROUND(lineman*100), 0) +
         COALESCE(krungsri_minor, ROUND(krungsri*100), 0)
       )`,
    [yearId, checkDate]
  );
  if (invalidVat.length) findings.push(finding('vat_snapshot_mismatch', 'critical', invalidVat.length, invalidVat));

  const accounts = await dbGet('SELECT COUNT(*) AS count FROM LedgerAccounts WHERE year_id=?', [yearId]);
  const criticalCount = findings.filter(item => item.severity === 'critical').reduce((sum, item) => sum + item.count, 0);
  const warningCount = findings.filter(item => item.severity === 'warning').reduce((sum, item) => sum + item.count, 0);
  const status = criticalCount ? 'critical' : warningCount ? 'warning' : 'healthy';
  const inserted = await dbRun(
    `INSERT INTO FinancialIntegrityChecks
     (year_id, check_date, status, critical_count, warning_count, checked_accounts,
      findings_json, trigger_type, checked_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [yearId, checkDate, status, criticalCount, warningCount, accounts?.count || 0,
      JSON.stringify(findings), triggerType, getActiveUser()]
  );
  await logActivity('INTEGRITY_CHECK', 'FinancialIntegrityChecks', inserted.lastID,
    `Financial integrity check ${checkDate}: ${status}`, null, yearId);
  return getFinancialIntegrityCheck(inserted.lastID);
}

async function getFinancialIntegrityCheck(id) {
  const row = await dbGet('SELECT * FROM FinancialIntegrityChecks WHERE id=?', [id]);
  if (!row) return null;
  return { ...row, findings: JSON.parse(row.findings_json || '[]') };
}

async function getIntegrityHistory(yearId, limit = 30) {
  return dbAll(
    `SELECT * FROM FinancialIntegrityChecks
     WHERE year_id=? ORDER BY checked_at DESC, id DESC LIMIT ?`,
    [yearId, Math.min(100, Math.max(1, Number(limit) || 30))]
  );
}

async function ensureDailyIntegrityCheck(yearId) {
  const date = todayIso();
  const existing = await dbGet(
    `SELECT id FROM FinancialIntegrityChecks
     WHERE year_id=? AND check_date=? AND trigger_type='automatic'
     ORDER BY id DESC LIMIT 1`,
    [yearId, date]
  );
  return existing ? getFinancialIntegrityCheck(existing.id) : runFinancialIntegrityCheck(yearId, {
    checkDate: date,
    triggerType: 'automatic'
  });
}

module.exports = {
  runFinancialIntegrityCheck,
  getFinancialIntegrityCheck,
  getIntegrityHistory,
  ensureDailyIntegrityCheck
};
