const { dbGet, dbAll, dbRun, getActiveUser } = require('./database');

const SYSTEM_ACCOUNTS = [
  ['1010', 'النقدية غير المودعة', 'Undeposited cash', 'asset'],
  ['1090', 'حساب تسوية بنكي', 'Bank clearing', 'asset'],
  ['2010', 'ذمم الموردين', 'Accounts payable', 'liability'],
  ['2020', 'رواتب مستحقة', 'Salaries payable', 'liability'],
  ['2030', 'ضريبة قيمة مضافة مستحقة', 'VAT payable', 'liability'],
  ['3010', 'حقوق الملكية', 'Owner equity', 'equity'],
  ['3020', 'مسحوبات وتوزيعات', 'Drawings and distributions', 'equity'],
  ['4010', 'إيرادات المبيعات', 'Sales revenue', 'revenue'],
  ['5010', 'تكلفة المشتريات', 'Purchases expense', 'expense'],
  ['5020', 'مصروفات تشغيلية', 'Operating expenses', 'expense'],
  ['5030', 'مصروف الرواتب', 'Salary expense', 'expense'],
  ['5040', 'عمولات قنوات البيع', 'Sales channel commissions', 'expense'],
  ['5050', 'مصروف الزكاة', 'Zakat expense', 'expense']
];

function toMinor(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error('FIN_INVALID_AMOUNT');
  return Math.round(numeric * 100);
}

async function ensureChartOfAccounts(yearId) {
  if (!yearId) throw new Error('FIN_YEAR_REQUIRED');
  for (const [code, ar, en, type] of SYSTEM_ACCOUNTS) {
    await dbRun(
      `INSERT OR IGNORE INTO LedgerAccounts
       (year_id, account_code, name_ar, name_en, account_type, is_system)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [yearId, code, ar, en, type]
    );
  }
  const banks = await dbAll('SELECT id, bank_name, is_cash_vault FROM BankAccounts WHERE year_id = ?', [yearId]);
  for (const bank of banks) await ensureBankLedgerAccount(bank.id, yearId, bank.bank_name, bank.is_cash_vault);
  return dbAll('SELECT * FROM LedgerAccounts WHERE year_id = ? ORDER BY account_code', [yearId]);
}

async function ensureBankLedgerAccount(bankAccountId, yearId, bankName, isCashVault = 0) {
  if (!bankAccountId) return getAccountByCode(yearId, '1010');
  const existing = await dbGet(
    'SELECT * FROM LedgerAccounts WHERE year_id = ? AND bank_account_id = ?',
    [yearId, bankAccountId]
  );
  if (existing) return existing;
  const code = `10${isCashVault ? '1' : '2'}-${String(bankAccountId).padStart(4, '0')}`;
  await dbRun(
    `INSERT OR IGNORE INTO LedgerAccounts
     (year_id, account_code, name_ar, name_en, account_type, bank_account_id, is_system)
     VALUES (?, ?, ?, ?, 'asset', ?, 1)`,
    [yearId, code, bankName || `حساب ${bankAccountId}`, bankName || `Account ${bankAccountId}`, bankAccountId]
  );
  return dbGet(
    'SELECT * FROM LedgerAccounts WHERE year_id = ? AND bank_account_id = ?',
    [yearId, bankAccountId]
  );
}

async function getAccountByCode(yearId, code) {
  await ensureChartOfAccounts(yearId);
  const account = await dbGet(
    'SELECT * FROM LedgerAccounts WHERE year_id = ? AND account_code = ?',
    [yearId, code]
  );
  if (!account) throw new Error(`FIN_ACCOUNT_NOT_FOUND:${code}`);
  return account;
}

async function nextEntryNumber(yearId) {
  await dbRun(
    `INSERT INTO JournalSequences (year_id, last_number) VALUES (?, 1)
     ON CONFLICT(year_id) DO UPDATE SET last_number = last_number + 1`,
    [yearId]
  );
  const row = await dbGet('SELECT last_number FROM JournalSequences WHERE year_id = ?', [yearId]);
  return row.last_number;
}

async function createPostedEntry({ yearId, date, description, sourceType, sourceKey, lines, reversesEntryId = null }) {
  if (!Array.isArray(lines) || lines.length < 2) throw new Error('FIN_JOURNAL_MINIMUM_TWO_LINES');
  const normalized = lines
    .map(line => ({
      ...line,
      debitMinor: line.debitMinor ?? toMinor(line.debit || 0),
      creditMinor: line.creditMinor ?? toMinor(line.credit || 0)
    }))
    .filter(line => line.debitMinor > 0 || line.creditMinor > 0);
  const debits = normalized.reduce((sum, line) => sum + line.debitMinor, 0);
  const credits = normalized.reduce((sum, line) => sum + line.creditMinor, 0);
  if (debits <= 0 || debits !== credits) throw new Error('FIN_JOURNAL_UNBALANCED');

  const entryNumber = await nextEntryNumber(yearId);
  const inserted = await dbRun(
    `INSERT INTO JournalEntries
     (year_id, entry_number, entry_date, description, source_type, source_key, reverses_entry_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [yearId, entryNumber, date, description, sourceType, String(sourceKey), reversesEntryId, getActiveUser()]
  );
  for (const line of normalized) {
    await dbRun(
      `INSERT INTO JournalLines
       (entry_id, account_id, description, debit_minor, credit_minor)
       VALUES (?, ?, ?, ?, ?)`,
      [inserted.lastID, line.accountId, line.description || null, line.debitMinor, line.creditMinor]
    );
  }
  await dbRun(
    "UPDATE JournalEntries SET status = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = ?",
    [inserted.lastID]
  );
  return dbGet('SELECT * FROM JournalEntries WHERE id = ?', [inserted.lastID]);
}

async function reverseEntry(entry, reversalDate, description) {
  if (!entry || entry.reversed_by_entry_id) return null;
  const lines = await dbAll('SELECT * FROM JournalLines WHERE entry_id = ? ORDER BY id', [entry.id]);
  const reversal = await createPostedEntry({
    yearId: entry.year_id,
    date: reversalDate || entry.entry_date,
    description: description || `Reversal of journal ${entry.entry_number}`,
    sourceType: `${entry.source_type}:reversal`,
    sourceKey: entry.id,
    reversesEntryId: entry.id,
    lines: lines.map(line => ({
      accountId: line.account_id,
      debitMinor: line.credit_minor,
      creditMinor: line.debit_minor,
      description: line.description
    }))
  });
  await dbRun('UPDATE JournalEntries SET reversed_by_entry_id = ? WHERE id = ?', [reversal.id, entry.id]);
  return reversal;
}

async function reverseSourceEntries(yearId, sourceType, sourceKey, reversalDate, description) {
  const entries = await dbAll(
    `SELECT * FROM JournalEntries
     WHERE year_id = ? AND source_type = ? AND source_key = ?
       AND status = 'posted' AND reversed_by_entry_id IS NULL
     ORDER BY id`,
    [yearId, sourceType, String(sourceKey)]
  );
  for (const entry of entries) await reverseEntry(entry, reversalDate, description);
  return entries.length;
}

async function postSourceEntry(input) {
  await ensureChartOfAccounts(input.yearId);
  await reverseSourceEntries(
    input.yearId,
    input.sourceType,
    input.sourceKey,
    input.date,
    `عكس قيد سابق: ${input.description}`
  );
  return createPostedEntry(input);
}

async function getTrialBalance({ yearId, startDate, endDate }) {
  await ensureChartOfAccounts(yearId);
  const params = [yearId];
  let dateFilter = '';
  if (startDate) {
    dateFilter += ' AND je.entry_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND je.entry_date <= ?';
    params.push(endDate);
  }
  const rows = await dbAll(
    `SELECT la.id AS account_id, la.account_code, la.name_ar, la.name_en, la.account_type,
       COALESCE(SUM(jl.debit_minor), 0) AS debit_minor,
       COALESCE(SUM(jl.credit_minor), 0) AS credit_minor
     FROM LedgerAccounts la
     LEFT JOIN JournalLines jl ON jl.account_id = la.id
     LEFT JOIN JournalEntries je ON je.id = jl.entry_id
     WHERE la.year_id = ?
       AND (jl.id IS NULL OR (je.status = 'posted' ${dateFilter}))
     GROUP BY la.id
     ORDER BY la.account_code`,
    params
  );
  const debitMinor = rows.reduce((sum, row) => sum + row.debit_minor, 0);
  const creditMinor = rows.reduce((sum, row) => sum + row.credit_minor, 0);
  return { rows, debitMinor, creditMinor, isBalanced: debitMinor === creditMinor };
}

async function getGeneralLedger({ yearId, accountId, startDate, endDate }) {
  const params = [yearId];
  let filters = '';
  if (accountId) {
    filters += ' AND la.id = ?';
    params.push(accountId);
  }
  if (startDate) {
    filters += ' AND je.entry_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    filters += ' AND je.entry_date <= ?';
    params.push(endDate);
  }
  return dbAll(
    `SELECT je.id AS entry_id, je.entry_number, je.entry_date, je.description,
       je.source_type, je.source_key, la.id AS account_id, la.account_code,
       la.name_ar, la.name_en, jl.description AS line_description,
       jl.debit_minor, jl.credit_minor
     FROM JournalEntries je
     JOIN JournalLines jl ON jl.entry_id = je.id
     JOIN LedgerAccounts la ON la.id = jl.account_id
     WHERE je.year_id = ? AND je.status = 'posted' ${filters}
     ORDER BY je.entry_date, je.entry_number, jl.id`,
    params
  );
}

module.exports = {
  ensureChartOfAccounts,
  ensureBankLedgerAccount,
  getAccountByCode,
  createPostedEntry,
  postSourceEntry,
  reverseSourceEntries,
  getTrialBalance,
  getGeneralLedger,
  toMinor
};
