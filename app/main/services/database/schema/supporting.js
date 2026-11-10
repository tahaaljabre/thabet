const { initializeSupportingFinancialConstraints } = require('./financial-constraints');
const { initializeAccountingSchema } = require('./accounting');

function initializeSupportingSchema(db, addColumnIfNotExists) {
db.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)");
      db.run(`CREATE TABLE IF NOT EXISTS VoucherSequences (
        voucher_type TEXT NOT NULL,
        year_id INTEGER NOT NULL,
        last_number INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (voucher_type, year_id),
        FOREIGN KEY(year_id) REFERENCES FinancialYears(YearID)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS ClosingReports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year_id INTEGER UNIQUE NOT NULL,
        closing_date TEXT NOT NULL,
        net_profit REAL NOT NULL,
        net_profit_minor INTEGER,
        zakat REAL NOT NULL,
        zakat_minor INTEGER,
        distributable_profit REAL NOT NULL,
        distributable_profit_minor INTEGER,
        pdf_data BLOB,
        FOREIGN KEY(year_id) REFERENCES FinancialYears(YearID)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS BankAccounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_name TEXT NOT NULL,
        account_number TEXT,
        opening_balance REAL DEFAULT 0.0,
        opening_balance_minor INTEGER,
        current_balance REAL DEFAULT 0.0,
        current_balance_minor INTEGER,
        start_date TEXT,
        year_id INTEGER NOT NULL,
        is_cash_vault INTEGER DEFAULT 0,
        FOREIGN KEY(year_id) REFERENCES FinancialYears(YearID)
      )`);

      addColumnIfNotExists('BankAccounts', 'start_date', 'TEXT', () => {});
      addColumnIfNotExists('BankAccounts', 'current_balance', 'REAL DEFAULT 0.0', () => {});
      addColumnIfNotExists('BankAccounts', 'is_cash_vault', 'INTEGER DEFAULT 0', () => {});

      db.run(`CREATE TABLE IF NOT EXISTS BankSalesMapping (
        channel_name TEXT NOT NULL,
        bank_account_id INTEGER NOT NULL,
        year_id INTEGER NOT NULL,
        PRIMARY KEY (channel_name, year_id),
        FOREIGN KEY(bank_account_id) REFERENCES BankAccounts(id)
      )`);

      // Older databases used channel_name alone as the primary key. That made
      // saving a mapping for a new financial year overwrite the prior year.
      db.all('PRAGMA table_info(BankSalesMapping)', (mappingInfoError, columns) => {
        if (mappingInfoError || !Array.isArray(columns)) {
          console.error('Failed to inspect BankSalesMapping schema:', mappingInfoError);
          return;
        }
        const primaryKeyColumns = columns
          .filter(column => Number(column.pk) > 0)
          .sort((a, b) => Number(a.pk) - Number(b.pk))
          .map(column => column.name);
        const hasYearScopedPrimaryKey =
          primaryKeyColumns.length === 2 &&
          primaryKeyColumns[0] === 'channel_name' &&
          primaryKeyColumns[1] === 'year_id';
        if (hasYearScopedPrimaryKey) return;

        db.exec(`
          BEGIN IMMEDIATE;
          DROP TABLE IF EXISTS BankSalesMapping_migration;
          CREATE TABLE BankSalesMapping_migration (
            channel_name TEXT NOT NULL,
            bank_account_id INTEGER NOT NULL,
            year_id INTEGER NOT NULL,
            PRIMARY KEY (channel_name, year_id),
            FOREIGN KEY(bank_account_id) REFERENCES BankAccounts(id)
          );
          INSERT OR REPLACE INTO BankSalesMapping_migration
            (channel_name, bank_account_id, year_id)
          SELECT channel_name, bank_account_id, year_id
          FROM BankSalesMapping;
          DROP TABLE BankSalesMapping;
          ALTER TABLE BankSalesMapping_migration RENAME TO BankSalesMapping;
          COMMIT;
        `, migrationError => {
          if (!migrationError) {
            console.log('BankSalesMapping migrated to a financial-year scoped primary key.');
            initializeSupportingFinancialConstraints(db);
            return;
          }
          console.error('Failed to migrate BankSalesMapping:', migrationError);
          db.run('ROLLBACK', () => {});
        });
      });

      db.run(`CREATE TABLE IF NOT EXISTS DailyReportChannelSales (
        report_date TEXT NOT NULL,
        cashier_name TEXT NOT NULL,
        year_id INTEGER NOT NULL,
        channel_key TEXT NOT NULL,
        amount REAL DEFAULT 0,
        amount_minor INTEGER,
        PRIMARY KEY (report_date, cashier_name, year_id, channel_key)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS AuditLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_date TEXT DEFAULT CURRENT_TIMESTAMP,
        action_type TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id INTEGER,
        details TEXT,
        user_name TEXT,
        year_id INTEGER NOT NULL
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS TrashItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        record_id TEXT,
        display_name TEXT,
        payload TEXT NOT NULL,
        deleted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_by TEXT,
        year_id INTEGER NOT NULL DEFAULT 1
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS BankTransactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_date TEXT NOT NULL,
        tx_type TEXT NOT NULL,
        from_account_id INTEGER,
        to_account_id INTEGER,
        amount REAL NOT NULL,
        amount_minor INTEGER,
        description TEXT,
        partner_name TEXT,
        created_by TEXT NOT NULL,
        year_id INTEGER NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        is_voided INTEGER NOT NULL DEFAULT 0,
        voided_at TEXT,
        voided_by TEXT,
        void_reason TEXT,
        FOREIGN KEY(year_id) REFERENCES FinancialYears(YearID)
      )`);
      initializeAccountingSchema(db);
      
      addColumnIfNotExists('BankTransactions', 'reference_type', 'TEXT', () => {});
      addColumnIfNotExists('BankTransactions', 'reference_id', 'INTEGER', () => {});
      addColumnIfNotExists('BankTransactions', 'partner_name', 'TEXT', () => {});

      db.run(`CREATE TABLE IF NOT EXISTS partners (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          phone TEXT
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS ClosingPartners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year_id INTEGER NOT NULL,
        partner_name TEXT NOT NULL,
        percentage REAL NOT NULL,
        FOREIGN KEY(year_id) REFERENCES FinancialYears(YearID)
      )`);
      initializeSupportingFinancialConstraints(db);
}

module.exports = { initializeSupportingSchema };
