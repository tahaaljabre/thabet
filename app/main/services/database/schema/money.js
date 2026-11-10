const { initializeFinancialConstraintsForTable } = require('./financial-constraints');

const MONEY_COLUMNS = Object.freeze({
  daily_reports: ['cash_sales', 'kbank', 'grab', 'lineman', 'krungsri', 'cashier_actual'],
  DailyReportChannelSales: ['amount'],
  expenses: ['amount'],
  CashGeneralVouchers: ['amount'],
  employees: ['salary'],
  employee_salary_history: ['salary'],
  employee_transactions: ['amount', 'deductions', 'allowances'],
  suppliers: [],
  supplier_transactions: ['amount'],
  BankAccounts: ['opening_balance', 'current_balance'],
  BankTransactions: ['amount'],
  ClosingReports: ['net_profit', 'zakat', 'distributable_profit']
});

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function triggerName(prefix, table, column) {
  return `${prefix}_${table}_${column}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

function synchronizeMoneyColumn(db, table, column) {
  const tableSql = quoteIdentifier(table);
  const columnSql = quoteIdentifier(column);
  const minorColumn = `${column}_minor`;
  const minorSql = quoteIdentifier(minorColumn);
  const insertTrigger = quoteIdentifier(triggerName('sync_money_insert', table, column));
  const updateTrigger = quoteIdentifier(triggerName('sync_money_update', table, column));

  db.run(
    `UPDATE ${tableSql}
     SET ${minorSql} = CAST(ROUND(COALESCE(${columnSql}, 0) * 100) AS INTEGER)
     WHERE ${minorSql} IS NULL
        OR ${minorSql} <> CAST(ROUND(COALESCE(${columnSql}, 0) * 100) AS INTEGER)`,
    () => {}
  );
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS ${insertTrigger}
    AFTER INSERT ON ${tableSql}
    WHEN NEW.${minorSql} IS NULL
      OR NEW.${minorSql} <> CAST(ROUND(COALESCE(NEW.${columnSql}, 0) * 100) AS INTEGER)
    BEGIN
      UPDATE ${tableSql}
      SET ${minorSql} = CAST(ROUND(COALESCE(NEW.${columnSql}, 0) * 100) AS INTEGER)
      WHERE rowid = NEW.rowid;
    END;

    CREATE TRIGGER IF NOT EXISTS ${updateTrigger}
    AFTER UPDATE OF ${columnSql} ON ${tableSql}
    WHEN NEW.${minorSql} IS NULL
      OR NEW.${minorSql} <> CAST(ROUND(COALESCE(NEW.${columnSql}, 0) * 100) AS INTEGER)
    BEGIN
      UPDATE ${tableSql}
      SET ${minorSql} = CAST(ROUND(COALESCE(NEW.${columnSql}, 0) * 100) AS INTEGER)
      WHERE rowid = NEW.rowid;
    END;
  `, () => {});
}

function initializeMoneyTable(db, table) {
  const columns = MONEY_COLUMNS[table] || [];
  db.all(`PRAGMA table_info(${quoteIdentifier(table)})`, (tableError, tableColumns) => {
      if (tableError || !Array.isArray(tableColumns) || tableColumns.length === 0) {
        if (tableError) console.error(`Failed to inspect money columns for ${table}:`, tableError);
        return;
      }
      const existing = new Set(tableColumns.map(item => item.name));
      for (const column of columns) {
        if (!existing.has(column)) continue;
        const minorColumn = `${column}_minor`;
        if (existing.has(minorColumn)) {
          synchronizeMoneyColumn(db, table, column);
          continue;
        }
        db.run(
          `ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${quoteIdentifier(minorColumn)} INTEGER`,
          alterError => {
            if (alterError) {
              console.error(`Failed to add ${table}.${minorColumn}:`, alterError);
              return;
            }
            synchronizeMoneyColumn(db, table, column);
          }
        );
      }
      initializeFinancialConstraintsForTable(db, table);
  });
}

function initializeMoneySchema(db) {
  for (const table of Object.keys(MONEY_COLUMNS)) {
    initializeMoneyTable(db, table);
  }
}

module.exports = { MONEY_COLUMNS, initializeMoneySchema, initializeMoneyTable };
