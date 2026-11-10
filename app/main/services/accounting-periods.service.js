const { dbAll, dbGet, dbRun, isYearClosed, getActiveUser, logActivity } = require('./database');
const integrityService = require('./financial-integrity.service');

async function ensurePeriods(yearId) {
  if (!yearId) throw new Error('FIN_YEAR_REQUIRED');
  for (let month = 1; month <= 12; month += 1) {
    await dbRun(
      `INSERT OR IGNORE INTO AccountingPeriods (year_id, period_month)
       VALUES (?, ?)`,
      [yearId, month]
    );
  }
}

async function getAccountingPeriods(yearId) {
  await ensurePeriods(yearId);
  return dbAll(
    `SELECT p.*,
       (SELECT COUNT(*) FROM AccountingPeriodAudit a WHERE a.period_id = p.id) AS audit_count
     FROM AccountingPeriods p
     WHERE p.year_id = ?
     ORDER BY p.period_month`,
    [yearId]
  );
}

async function getPeriodAudit(periodId) {
  return dbAll(
    `SELECT * FROM AccountingPeriodAudit
     WHERE period_id = ? ORDER BY action_at DESC, id DESC`,
    [periodId]
  );
}

async function closeAccountingPeriod(yearId, month, note = '') {
  const periodMonth = Number(month);
  if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    throw new Error('FIN_PERIOD_MONTH_INVALID');
  }
  if (await isYearClosed(yearId)) throw new Error('FIN_YEAR_CLOSED');
  await ensurePeriods(yearId);

  const earlierOpen = await dbGet(
    `SELECT period_month FROM AccountingPeriods
     WHERE year_id = ? AND period_month < ? AND status <> 'closed'
     ORDER BY period_month LIMIT 1`,
    [yearId, periodMonth]
  );
  if (earlierOpen) {
    const error = new Error('FIN_PREVIOUS_PERIOD_OPEN');
    error.periodMonth = earlierOpen.period_month;
    throw error;
  }

  const draft = await dbGet(
    `SELECT id, entry_number FROM JournalEntries
     WHERE year_id = ? AND CAST(strftime('%m', entry_date) AS INTEGER) = ?
       AND status <> 'posted'
     ORDER BY entry_date, entry_number LIMIT 1`,
    [yearId, periodMonth]
  );
  if (draft) throw new Error('FIN_PERIOD_HAS_DRAFT_JOURNALS');

  const unreconciledBank = await dbGet(
    `SELECT b.id, b.bank_name FROM BankAccounts b
     WHERE b.year_id = ? AND COALESCE(b.is_cash_vault, 0) = 0
       AND NOT EXISTS (
         SELECT 1 FROM BankReconciliations r
         WHERE r.bank_account_id = b.id AND r.year_id = b.year_id
           AND r.period_month = ? AND r.status = 'approved'
       )
     ORDER BY b.id LIMIT 1`,
    [yearId, periodMonth]
  );
  if (unreconciledBank) {
    const error = new Error('FIN_PERIOD_BANK_RECONCILIATION_REQUIRED');
    error.bankName = unreconciledBank.bank_name;
    throw error;
  }

  const periodDate = await dbGet(
    `SELECT MAX(date_value) AS period_end FROM (
       SELECT entry_date AS date_value FROM JournalEntries WHERE year_id=?
       UNION ALL SELECT report_date FROM daily_reports WHERE year_id=?
       UNION ALL SELECT report_date FROM expenses WHERE year_id=?
     ) WHERE CAST(strftime('%m', date_value) AS INTEGER)=?`,
    [yearId, yearId, yearId, periodMonth]
  );
  const periodEnd = periodDate?.period_end || `${new Date().getFullYear()}-${String(periodMonth).padStart(2, '0')}-31`;
  const integrity = await integrityService.runFinancialIntegrityCheck(yearId, {
    checkDate: periodEnd,
    triggerType: 'period_close'
  });
  if (integrity.critical_count > 0) throw new Error('FIN_PERIOD_INTEGRITY_CHECK_FAILED');

  const totals = await dbGet(
    `SELECT
       COALESCE(SUM(jl.debit_minor), 0) AS debit_minor,
       COALESCE(SUM(jl.credit_minor), 0) AS credit_minor
     FROM JournalEntries je
     JOIN JournalLines jl ON jl.entry_id = je.id
     WHERE je.year_id = ? AND je.status = 'posted'
       AND CAST(strftime('%m', je.entry_date) AS INTEGER) = ?`,
    [yearId, periodMonth]
  );
  if (totals.debit_minor !== totals.credit_minor) throw new Error('FIN_PERIOD_TRIAL_BALANCE_UNBALANCED');

  await dbRun('BEGIN IMMEDIATE');
  try {
    const result = await dbRun(
      `UPDATE AccountingPeriods
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = ?,
           close_note = ?, trial_debit_minor = ?, trial_credit_minor = ?,
           reopened_at = NULL, reopened_by = NULL, reopen_reason = NULL
       WHERE year_id = ? AND period_month = ? AND status = 'open'`,
      [getActiveUser(), String(note || ''), totals.debit_minor, totals.credit_minor, yearId, periodMonth]
    );
    if (!result.changes) throw new Error('FIN_PERIOD_ALREADY_CLOSED');
    const period = await dbGet(
      'SELECT * FROM AccountingPeriods WHERE year_id = ? AND period_month = ?',
      [yearId, periodMonth]
    );
    await dbRun(
      `INSERT INTO AccountingPeriodAudit
       (period_id, action, action_by, reason, debit_minor, credit_minor)
       VALUES (?, 'close', ?, ?, ?, ?)`,
      [period.id, getActiveUser(), String(note || ''), totals.debit_minor, totals.credit_minor]
    );
    await dbRun('COMMIT');
    await logActivity('CLOSE_PERIOD', 'AccountingPeriods', period.id,
      `إقفال الفترة الشهرية ${periodMonth}`, null, yearId);
    return period;
  } catch (error) {
    await dbRun('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function reopenAccountingPeriod(yearId, month, reason) {
  const periodMonth = Number(month);
  const normalizedReason = String(reason || '').trim();
  if (!normalizedReason) throw new Error('FIN_PERIOD_REOPEN_REASON_REQUIRED');
  if (await isYearClosed(yearId)) throw new Error('FIN_YEAR_CLOSED');
  await ensurePeriods(yearId);

  const laterClosed = await dbGet(
    `SELECT period_month FROM AccountingPeriods
     WHERE year_id = ? AND period_month > ? AND status = 'closed'
     ORDER BY period_month DESC LIMIT 1`,
    [yearId, periodMonth]
  );
  if (laterClosed) {
    const error = new Error('FIN_LATER_PERIOD_CLOSED');
    error.periodMonth = laterClosed.period_month;
    throw error;
  }

  await dbRun('BEGIN IMMEDIATE');
  try {
    const result = await dbRun(
      `UPDATE AccountingPeriods
       SET status = 'open', reopened_at = CURRENT_TIMESTAMP, reopened_by = ?,
           reopen_reason = ?
       WHERE year_id = ? AND period_month = ? AND status = 'closed'`,
      [getActiveUser(), normalizedReason, yearId, periodMonth]
    );
    if (!result.changes) throw new Error('FIN_PERIOD_ALREADY_OPEN');
    const period = await dbGet(
      'SELECT * FROM AccountingPeriods WHERE year_id = ? AND period_month = ?',
      [yearId, periodMonth]
    );
    await dbRun(
      `INSERT INTO AccountingPeriodAudit (period_id, action, action_by, reason)
       VALUES (?, 'reopen', ?, ?)`,
      [period.id, getActiveUser(), normalizedReason]
    );
    await dbRun('COMMIT');
    await logActivity('REOPEN_PERIOD', 'AccountingPeriods', period.id,
      `إعادة فتح الفترة الشهرية ${periodMonth}: ${normalizedReason}`, null, yearId);
    return period;
  } catch (error) {
    await dbRun('ROLLBACK').catch(() => {});
    throw error;
  }
}

module.exports = {
  getAccountingPeriods,
  getPeriodAudit,
  closeAccountingPeriod,
  reopenAccountingPeriod
};
