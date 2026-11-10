const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { dbAll, dbGet, dbRun, getActiveUser, assertAccountingDateOpen } = require('./database');
const banksService = require('./banks.service');
const accounting = require('./accounting.service');

const previews = new Map();
const HEADER_ALIASES = {
  date: ['date', 'transaction date', 'value date', 'التاريخ', 'تاريخ الحركة'],
  description: ['description', 'details', 'narrative', 'البيان', 'الوصف', 'التفاصيل'],
  reference: ['reference', 'ref', 'transaction id', 'المرجع', 'رقم المرجع'],
  debit: ['debit', 'withdrawal', 'مدين', 'سحب'],
  credit: ['credit', 'deposit', 'دائن', 'إيداع'],
  amount: ['amount', 'المبلغ'],
  balance: ['balance', 'الرصيد']
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function detectMapping(headers) {
  const mapping = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = headers.findIndex(header => aliases.includes(normalizeHeader(header)));
    if (index >= 0) mapping[field] = index;
  }
  return mapping;
}

function parseCsvLine(line) {
  const result = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      result.push(value);
      value = '';
    } else value += char;
  }
  result.push(value);
  return result;
}

async function readRows(filePath) {
  if (/\.csv$/i.test(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    return lines.map(parseCsvLine);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  return sheet.getSheetValues().slice(1).map(row => (row || []).slice(1).map(cell => {
    if (cell && typeof cell === 'object' && 'result' in cell) return cell.result;
    if (cell && typeof cell === 'object' && 'text' in cell) return cell.text;
    return cell ?? '';
  }));
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const text = String(value || '').trim();
  const direct = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text);
  if (direct) return `${direct[1]}-${direct[2].padStart(2, '0')}-${direct[3].padStart(2, '0')}`;
  const reverse = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
  if (reverse) return `${reverse[3]}-${reverse[2].padStart(2, '0')}-${reverse[1].padStart(2, '0')}`;
  return '';
}

function numberValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value || '').replace(/[,\s]/g, '').replace(/[()]/g, match => match === '(' ? '-' : '');
  return Number(normalized) || 0;
}

function mapRow(row, mapping) {
  const debit = mapping.debit !== undefined ? Math.abs(numberValue(row[mapping.debit])) : 0;
  const credit = mapping.credit !== undefined ? Math.abs(numberValue(row[mapping.credit])) : 0;
  const amount = mapping.amount !== undefined ? numberValue(row[mapping.amount]) : credit - debit;
  return {
    txDate: normalizeDate(row[mapping.date]),
    description: mapping.description !== undefined ? String(row[mapping.description] || '') : '',
    reference: mapping.reference !== undefined ? String(row[mapping.reference] || '') : '',
    amountMinor: accounting.toMinor(mapping.amount !== undefined ? amount : credit - debit),
    balanceMinor: mapping.balance !== undefined ? accounting.toMinor(numberValue(row[mapping.balance])) : null,
    rawData: JSON.stringify(row)
  };
}

async function previewStatement(filePath) {
  const rows = await readRows(filePath);
  if (rows.length < 2) throw new Error('BANK_RECONCILIATION_FILE_EMPTY');
  const headers = rows[0].map(value => String(value || '').trim());
  const token = crypto.randomUUID();
  previews.set(token, { filePath, headers, rows: rows.slice(1), createdAt: Date.now() });
  for (const [key, item] of previews) {
    if (Date.now() - item.createdAt > 30 * 60 * 1000) previews.delete(key);
  }
  return { token, fileName: path.basename(filePath), headers, suggestedMapping: detectMapping(headers), previewRows: rows.slice(1, 6) };
}

async function importStatement({ token, mapping, bankAccountId, yearId, month, startDate, endDate, statementClosing }) {
  const preview = previews.get(token);
  if (!preview) throw new Error('BANK_RECONCILIATION_PREVIEW_EXPIRED');
  if (mapping.date === undefined || (mapping.amount === undefined && mapping.debit === undefined && mapping.credit === undefined)) {
    throw new Error('BANK_RECONCILIATION_MAPPING_REQUIRED');
  }
  await assertAccountingDateOpen(yearId, endDate);
  const bank = await dbGet('SELECT * FROM BankAccounts WHERE id = ? AND year_id = ?', [bankAccountId, yearId]);
  if (!bank) throw new Error('BANK_RECONCILIATION_BANK_INVALID');

  const existing = await dbGet(
    'SELECT * FROM BankReconciliations WHERE bank_account_id = ? AND year_id = ? AND period_month = ?',
    [bankAccountId, yearId, month]
  );
  let sessionId = existing?.id;
  if (existing?.status === 'approved') throw new Error('BANK_RECONCILIATION_ALREADY_APPROVED');
  if (existing) {
    await dbRun(
      `UPDATE BankReconciliations SET start_date=?, end_date=?, statement_closing_minor=?,
       source_file_name=?, column_mapping=?, status='draft' WHERE id=?`,
      [startDate, endDate, accounting.toMinor(statementClosing), preview.fileName, JSON.stringify(mapping), sessionId]
    );
  } else {
    const inserted = await dbRun(
      `INSERT INTO BankReconciliations
       (bank_account_id, year_id, period_month, start_date, end_date, statement_closing_minor,
        source_file_name, column_mapping, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bankAccountId, yearId, month, startDate, endDate, accounting.toMinor(statementClosing),
        preview.fileName, JSON.stringify(mapping), getActiveUser()]
    );
    sessionId = inserted.lastID;
  }
  let imported = 0;
  let duplicates = 0;
  let invalid = 0;
  for (const rawRow of preview.rows) {
    const line = mapRow(rawRow, mapping);
    if (!line.txDate || !line.amountMinor) {
      invalid += 1;
      continue;
    }
    const fingerprint = crypto.createHash('sha256')
      .update([bankAccountId, line.txDate, line.amountMinor, line.reference, line.description].join('|'))
      .digest('hex');
    try {
      await dbRun(
        `INSERT INTO BankStatementLines
         (reconciliation_id, bank_account_id, tx_date, description, reference, amount_minor,
          balance_minor, fingerprint, raw_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, bankAccountId, line.txDate, line.description, line.reference, line.amountMinor,
          line.balanceMinor, fingerprint, line.rawData]
      );
      imported += 1;
    } catch (error) {
      if (/UNIQUE constraint/.test(error.message)) duplicates += 1;
      else throw error;
    }
  }
  previews.delete(token);
  await suggestMatches(sessionId);
  return { sessionId, imported, duplicates, invalid };
}

async function getCandidates(session, line) {
  const bankTx = await dbAll(
    `SELECT 'bank' AS source_type, t.id AS source_id, t.tx_date, t.description,
       CASE
         WHEN t.tx_type IN ('Deposit','Receipt') AND t.to_account_id = ? THEN COALESCE(t.amount_minor, ROUND(t.amount*100))
         WHEN t.tx_type IN ('Withdrawal','Payment') AND t.from_account_id = ? THEN -COALESCE(t.amount_minor, ROUND(t.amount*100))
         WHEN t.tx_type = 'Transfer' AND t.to_account_id = ? THEN COALESCE(t.amount_minor, ROUND(t.amount*100))
         WHEN t.tx_type = 'Transfer' AND t.from_account_id = ? THEN -COALESCE(t.amount_minor, ROUND(t.amount*100))
       END AS amount_minor
     FROM BankTransactions t
     WHERE t.year_id = ? AND COALESCE(t.is_voided,0)=0
       AND (t.from_account_id = ? OR t.to_account_id = ?)
       AND ABS(julianday(t.tx_date)-julianday(?)) <= 3`,
    [session.bank_account_id, session.bank_account_id, session.bank_account_id, session.bank_account_id,
      session.year_id, session.bank_account_id, session.bank_account_id, line.tx_date]
  );
  const account = await accounting.ensureBankLedgerAccount(session.bank_account_id, session.year_id);
  const journals = await dbAll(
    `SELECT 'journal' AS source_type, jl.id AS source_id, je.entry_date AS tx_date,
       COALESCE(jl.description, je.description) AS description,
       (jl.debit_minor-jl.credit_minor) AS amount_minor
     FROM JournalLines jl JOIN JournalEntries je ON je.id=jl.entry_id
     WHERE jl.account_id=? AND je.status='posted'
       AND ABS(julianday(je.entry_date)-julianday(?)) <= 3`,
    [account.id, line.tx_date]
  );
  return [...bankTx, ...journals].filter(item => Number(item.amount_minor) === Number(line.amount_minor));
}

async function suggestMatches(sessionId) {
  const session = await dbGet('SELECT * FROM BankReconciliations WHERE id = ?', [sessionId]);
  const lines = await dbAll(
    "SELECT * FROM BankStatementLines WHERE reconciliation_id=? AND match_status='unmatched'",
    [sessionId]
  );
  let suggested = 0;
  for (const line of lines) {
    const candidates = await getCandidates(session, line);
    if (candidates.length === 1) {
      const candidate = candidates[0];
      await dbRun(
        `UPDATE BankStatementLines SET match_status='suggested',
         suggested_transaction_id=? WHERE id=?`,
        [candidate.source_type === 'bank' ? candidate.source_id : null, line.id]
      );
      suggested += 1;
    }
  }
  return suggested;
}

async function getReconciliation(sessionId) {
  const session = await dbGet('SELECT * FROM BankReconciliations WHERE id=?', [sessionId]);
  if (!session) return null;
  const lines = await dbAll(
    `SELECT l.*, COALESCE(SUM(m.matched_minor),0) AS matched_minor
     FROM BankStatementLines l
     LEFT JOIN BankReconciliationMatches m ON m.statement_line_id=l.id
     WHERE l.reconciliation_id=? GROUP BY l.id ORDER BY l.tx_date,l.id`,
    [sessionId]
  );
  const unmatchedBook = await dbAll(
    `SELECT * FROM BankTransactions WHERE year_id=? AND COALESCE(is_voided,0)=0
     AND (from_account_id=? OR to_account_id=?) AND tx_date BETWEEN ? AND ?`,
    [session.year_id, session.bank_account_id, session.bank_account_id, session.start_date, session.end_date]
  );
  return { session, lines, unmatchedBook };
}

async function matchLine(lineId, sourceType, sourceId) {
  const line = await dbGet('SELECT * FROM BankStatementLines WHERE id=?', [lineId]);
  if (!line) throw new Error('BANK_RECONCILIATION_LINE_NOT_FOUND');
  await dbRun(
    `INSERT OR REPLACE INTO BankReconciliationMatches
     (statement_line_id, bank_transaction_id, journal_line_id, matched_minor, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [lineId, sourceType === 'bank' ? sourceId : null, sourceType === 'journal' ? sourceId : null,
      Math.abs(line.amount_minor), getActiveUser()]
  );
  await dbRun("UPDATE BankStatementLines SET match_status='matched' WHERE id=?", [lineId]);
  return { success: true };
}

async function getLineCandidates(lineId) {
  const line = await dbGet('SELECT * FROM BankStatementLines WHERE id=?', [lineId]);
  if (!line) throw new Error('BANK_RECONCILIATION_LINE_NOT_FOUND');
  const session = await dbGet('SELECT * FROM BankReconciliations WHERE id=?', [line.reconciliation_id]);
  return getCandidates(session, line);
}

async function ignoreLine(lineId, note) {
  if (!String(note || '').trim()) throw new Error('BANK_RECONCILIATION_NOTE_REQUIRED');
  await dbRun(
    "UPDATE BankStatementLines SET match_status='ignored', resolution_note=? WHERE id=?",
    [String(note).trim(), lineId]
  );
  return { success: true };
}

async function createAdjustment(lineId, category = 'Bank adjustment') {
  const line = await dbGet(
    `SELECT l.*, r.year_id FROM BankStatementLines l
     JOIN BankReconciliations r ON r.id=l.reconciliation_id WHERE l.id=?`,
    [lineId]
  );
  if (!line) throw new Error('BANK_RECONCILIATION_LINE_NOT_FOUND');
  const tx = line.amount_minor > 0
    ? { tx_type: 'Deposit', to_account_id: line.bank_account_id }
    : { tx_type: 'Withdrawal', from_account_id: line.bank_account_id };
  const saved = await banksService.saveBankTransaction({
    ...tx,
    tx_date: line.tx_date,
    amount: Math.abs(line.amount_minor) / 100,
    description: `${category}: ${line.description || line.reference || ''}`,
    created_by: getActiveUser(),
    year_id: line.year_id
  });
  await matchLine(lineId, 'bank', saved.id);
  await dbRun("UPDATE BankStatementLines SET match_status='adjusted' WHERE id=?", [lineId]);
  return saved;
}

async function approveReconciliation(sessionId) {
  const data = await getReconciliation(sessionId);
  if (!data) throw new Error('BANK_RECONCILIATION_NOT_FOUND');
  if (data.lines.some(line => !['matched', 'adjusted', 'ignored'].includes(line.match_status))) {
    throw new Error('BANK_RECONCILIATION_UNRESOLVED_LINES');
  }
  const account = await accounting.ensureBankLedgerAccount(data.session.bank_account_id, data.session.year_id);
  const bank = await dbGet('SELECT opening_balance_minor, opening_balance FROM BankAccounts WHERE id=?', [data.session.bank_account_id]);
  const ledger = await dbGet(
    `SELECT COALESCE(SUM(jl.debit_minor-jl.credit_minor),0) AS movement_minor
     FROM JournalLines jl JOIN JournalEntries je ON je.id=jl.entry_id
     WHERE jl.account_id=? AND je.status='posted' AND je.entry_date<=?`,
    [account.id, data.session.end_date]
  );
  const bookMinor = Number(bank.opening_balance_minor ?? Math.round(Number(bank.opening_balance || 0) * 100)) + Number(ledger.movement_minor || 0);
  const differenceMinor = Number(data.session.statement_closing_minor) - bookMinor;
  if (differenceMinor !== 0) throw new Error(`BANK_RECONCILIATION_DIFFERENCE:${differenceMinor}`);
  await dbRun(
    `UPDATE BankReconciliations SET status='approved', book_balance_minor=?,
     difference_minor=0, approved_at=CURRENT_TIMESTAMP, approved_by=? WHERE id=?`,
    [bookMinor, getActiveUser(), sessionId]
  );
  return { success: true, bookBalanceMinor: bookMinor, differenceMinor: 0 };
}

async function listReconciliations(yearId, bankAccountId) {
  let sql = 'SELECT * FROM BankReconciliations WHERE year_id=?';
  const params = [yearId];
  if (bankAccountId) {
    sql += ' AND bank_account_id=?';
    params.push(bankAccountId);
  }
  sql += ' ORDER BY period_month DESC,id DESC';
  return dbAll(sql, params);
}

async function hasApprovedReconciliation(yearId, month, bankAccountId) {
  const row = await dbGet(
    `SELECT id FROM BankReconciliations WHERE year_id=? AND period_month=?
     AND bank_account_id=? AND status='approved'`,
    [yearId, month, bankAccountId]
  );
  return Boolean(row);
}

module.exports = {
  previewStatement,
  importStatement,
  listReconciliations,
  getReconciliation,
  suggestMatches,
  matchLine,
  ignoreLine,
  createAdjustment,
  approveReconciliation,
  hasApprovedReconciliation,
  getCandidates,
  getLineCandidates
};
