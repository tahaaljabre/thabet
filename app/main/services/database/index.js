const { db } = require('./connection');
const { initializeSchema } = require('./schema');

initializeSchema(db);

function normalizeMoneyRow(row) {
  if (!row || typeof row !== 'object') return row;
  for (const [key, value] of Object.entries(row)) {
    if (!key.endsWith('_minor') || value === null || value === undefined) continue;
    const baseKey = key.slice(0, -6);
    row[baseKey] = Number(value) / 100;
  }
  return row;
}

// Helper function for DB calls
const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(normalizeMoneyRow(row));
    });
  });
};

const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(normalizeMoneyRow));
    });
  });
};

const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

async function waitForDatabaseReady({ timeoutMs = 10000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const requiredTables = await dbAll(`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name IN (
          'FinancialYears', 'daily_reports', 'expenses', 'BankTransactions',
          'JournalEntries', 'JournalLines', 'LedgerAccounts'
        )
      `);
      const dailyColumns = await dbAll('PRAGMA table_info(daily_reports)');
      const expenseColumns = await dbAll('PRAGMA table_info(expenses)');
      const requiredTriggers = await dbAll(`
        SELECT name FROM sqlite_master
        WHERE type = 'trigger' AND name IN (
          'protect_daily_reports_from_delete',
          'protect_expenses_from_delete',
          'trg_journal_entry_validate_post',
          'sync_money_insert_daily_reports_cash_sales',
          'sync_money_insert_expenses_amount'
        )
      `);
      const dailyColumnNames = new Set(dailyColumns.map(column => column.name));
      const expenseColumnNames = new Set(expenseColumns.map(column => column.name));
      if (
        requiredTables.length === 7 &&
        requiredTriggers.length === 5 &&
        dailyColumnNames.has('cash_sales_minor') &&
        dailyColumnNames.has('is_voided') &&
        expenseColumnNames.has('amount_minor') &&
        expenseColumnNames.has('is_voided')
      ) {
        return true;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const error = new Error('Database schema initialization timed out.');
  error.code = 'DATABASE_INITIALIZATION_TIMEOUT';
  error.cause = lastError;
  throw error;
}

async function isYearClosed(yearId) {
  if (!yearId) return false;
  try {
    const row = await dbGet('SELECT IsClosed FROM FinancialYears WHERE YearID = ?', [yearId]);
    return row ? row.IsClosed === 1 : false;
  } catch (e) {
    console.error('Failed to check if year is closed:', e);
    return false;
  }
}

async function isAccountingPeriodClosed(yearId, dateValue) {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(String(dateValue || ''));
  if (!match || !yearId) return false;
  const month = Number(match[2]);
  const row = await dbGet(
    `SELECT status FROM AccountingPeriods
     WHERE year_id = ? AND period_month = ?`,
    [yearId, month]
  );
  return row?.status === 'closed';
}

async function assertAccountingDateOpen(yearId, dateValue) {
  if (await isYearClosed(yearId)) {
    const error = new Error('FIN_YEAR_CLOSED');
    error.code = 'FIN_YEAR_CLOSED';
    throw error;
  }
  if (await isAccountingPeriodClosed(yearId, dateValue)) {
    const error = new Error('FIN_ACCOUNTING_PERIOD_CLOSED');
    error.code = 'FIN_ACCOUNTING_PERIOD_CLOSED';
    error.periodMonth = Number(String(dateValue).slice(5, 7));
    throw error;
  }
}

let activeUserName = 'System';
function setActiveUser(username) {
  activeUserName = username || 'System';
}
function getActiveUser() {
  return activeUserName;
}

async function logActivity(actionType, tableName, recordId, details, userName, yearId) {
  try {
    const todayStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const finalUser = userName || getActiveUser();
    await dbRun('INSERT INTO AuditLogs (log_date, action_type, table_name, record_id, details, user_name, year_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [todayStr, actionType, tableName, recordId, details, finalUser, yearId || 1]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

function closeDatabase() {
  if (typeof markDatabaseClosing === 'function') {
    markDatabaseClosing();
  }
  return new Promise((resolve) => {
    try {
      db.close(() => {
        resolve();
      });
    } catch (_) {
      resolve();
    }
  });
}

module.exports = {
  db,
  dbGet,
  dbAll,
  dbRun,
  waitForDatabaseReady,
  isYearClosed,
  isAccountingPeriodClosed,
  assertAccountingDateOpen,
  logActivity,
  setActiveUser,
  getActiveUser,
  closeDatabase
};

