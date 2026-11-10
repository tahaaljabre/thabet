const { initializeSalesSchema } = require('./schema/sales');
const { initializeSupportingSchema } = require('./schema/supporting');
const { finalizeSchema } = require('./schema/finalize');
const { initializeMoneySchema } = require('./schema/money');

function initializeSchema(db) {
db.serialize(() => {
      db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) console.error('Failed to enable foreign keys', err);
        else console.log('Foreign keys enabled.');
      });
      db.run('PRAGMA busy_timeout = 10000;');
      db.run('PRAGMA journal_mode = WAL;');
      db.run('PRAGMA synchronous = NORMAL;');
      db.run('PRAGMA cache_size = -131072;');
      db.run('PRAGMA mmap_size = 268435456;');
      db.run('PRAGMA temp_store = MEMORY;');
      db.run('PRAGMA wal_autocheckpoint = 1000;');
      
      initializeSalesSchema(db);

      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        permissions TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        phone TEXT
      )`);

      // 1. CREATE ALL TABLES
      db.run(`CREATE TABLE IF NOT EXISTS FinancialYears (
        YearID INTEGER PRIMARY KEY AUTOINCREMENT,
        YearName TEXT UNIQUE NOT NULL,
        IsClosed INTEGER DEFAULT 0
      )`, () => {
        // Seed default year if empty
        db.get("SELECT COUNT(*) as count FROM FinancialYears", (err, row) => {
          if (!err && row && row.count === 0) {
            const currentYear = new Date().getFullYear().toString();
            db.run("INSERT INTO FinancialYears (YearName, IsClosed) VALUES (?, 0)", [currentYear], function(err) {
              if (!err) {
                const defaultYearId = this.lastID;
                console.log(`Default financial year created with ID: ${defaultYearId}`);
                // Update existing tables with default year ID. 
                // Using a callback to gracefully ignore errors if the column hasn't been added yet by migrations.
                const tables = ['employees', 'employee_transactions', 'suppliers', 'supplier_transactions', 'daily_reports', 'expenses'];
                tables.forEach(table => {
                  db.run(`UPDATE ${table} SET year_id = ? WHERE year_id IS NULL`, [defaultYearId], (err) => {
                    if (err) console.log(`Ignored error during initial update of ${table}:`, err.message);
                  });
                });
              }
            });
          }
        });
      });

      db.run(`CREATE TABLE IF NOT EXISTS CashGeneralVouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_date TEXT NOT NULL,
        amount REAL NOT NULL,
        amount_minor INTEGER,
        category TEXT NOT NULL,
        description TEXT,
        attachment TEXT,
        created_by TEXT NOT NULL,
        year_id INTEGER NOT NULL,
        partner_name TEXT,
        is_voided INTEGER NOT NULL DEFAULT 0,
        voided_at TEXT,
        voided_by TEXT,
        void_reason TEXT,
        FOREIGN KEY(year_id) REFERENCES FinancialYears(YearID)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        salary REAL DEFAULT 0,
        salary_minor INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_archived INTEGER DEFAULT 0,
        archived_at TEXT,
        monthly_accrual_start_date TEXT,
        photo TEXT,
        year_id INTEGER,
        category_id INTEGER
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS employee_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS employee_archive_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        archived_at TEXT NOT NULL,
        restored_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS employee_salary_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        salary REAL NOT NULL,
        salary_minor INTEGER,
        effective_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS employee_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        tx_date TEXT NOT NULL,
        amount REAL DEFAULT 0,
        amount_minor INTEGER,
        attendance_days REAL DEFAULT 0,
        absence_days REAL DEFAULT 0,
        deductions REAL DEFAULT 0,
        deductions_minor INTEGER,
        allowances REAL DEFAULT 0,
        allowances_minor INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        year_id INTEGER,
        FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_archived INTEGER DEFAULT 0,
        year_id INTEGER
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS supplier_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        tx_date TEXT NOT NULL,
        amount REAL DEFAULT 0,
        amount_minor INTEGER,
        tx_type TEXT NOT NULL, -- 'له' or 'عليه'
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        year_id INTEGER,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
      )`);

      function addColumnIfNotExists(tableName, columnName, columnDef, callback) {
        db.all(`PRAGMA table_info(${tableName})`, (err, cols) => {
          if (!err && cols && cols.length > 0) {
            const hasCol = cols.some(c => c.name === columnName);
            if (!hasCol) {
              db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`, callback);
            } else {
              if (callback) callback();
            }
          } else {
            if (callback) callback();
          }
        });
      }

      // 2. MIGRATE SCHEMA (ALTER TABLES)
      addColumnIfNotExists('employees', 'is_archived', 'INTEGER DEFAULT 0', () => {});
      addColumnIfNotExists('employees', 'archived_at', 'TEXT', () => {});
      addColumnIfNotExists('employees', 'monthly_accrual_start_date', 'TEXT', () => {});
      addColumnIfNotExists('employees', 'photo', 'TEXT', () => {});
      addColumnIfNotExists('employees', 'year_id', 'INTEGER', () => { db.run("UPDATE employees SET year_id = (SELECT YearID FROM FinancialYears ORDER BY YearID ASC LIMIT 1) WHERE year_id IS NULL"); });
      addColumnIfNotExists('employees', 'category_id', 'INTEGER', () => {});
      
      addColumnIfNotExists('employee_transactions', 'amount', 'REAL DEFAULT 0', () => {});
      addColumnIfNotExists('employee_transactions', 'attendance_days', 'REAL DEFAULT 0', () => {});
      addColumnIfNotExists('employee_transactions', 'absence_days', 'REAL DEFAULT 0', () => {});
      addColumnIfNotExists('employee_transactions', 'deductions', 'REAL DEFAULT 0', () => {});
      addColumnIfNotExists('employee_transactions', 'allowances', 'REAL DEFAULT 0', () => {});
      addColumnIfNotExists('employee_transactions', 'is_archived', 'INTEGER DEFAULT 0', () => {});
      addColumnIfNotExists('employee_transactions', 'year_id', 'INTEGER', () => { db.run("UPDATE employee_transactions SET year_id = (SELECT YearID FROM FinancialYears ORDER BY YearID ASC LIMIT 1) WHERE year_id IS NULL"); });

      addColumnIfNotExists('suppliers', 'is_archived', 'INTEGER DEFAULT 0', () => {});
      addColumnIfNotExists('suppliers', 'year_id', 'INTEGER', () => { db.run("UPDATE suppliers SET year_id = (SELECT YearID FROM FinancialYears ORDER BY YearID ASC LIMIT 1) WHERE year_id IS NULL"); });

      addColumnIfNotExists('supplier_transactions', 'amount', 'REAL DEFAULT 0', () => {});
      addColumnIfNotExists('supplier_transactions', 'tx_type', "TEXT DEFAULT 'عليه'", () => {});
      addColumnIfNotExists('supplier_transactions', 'is_archived', 'INTEGER DEFAULT 0', () => {});
      addColumnIfNotExists('supplier_transactions', 'voided_at', 'TEXT', () => {});
      addColumnIfNotExists('supplier_transactions', 'voided_by', 'TEXT', () => {});
      addColumnIfNotExists('supplier_transactions', 'void_reason', 'TEXT', () => {});
      addColumnIfNotExists('supplier_transactions', 'year_id', 'INTEGER', () => { db.run("UPDATE supplier_transactions SET year_id = (SELECT YearID FROM FinancialYears ORDER BY YearID ASC LIMIT 1) WHERE year_id IS NULL"); });

      addColumnIfNotExists('daily_reports', 'year_id', 'INTEGER', () => { db.run("UPDATE daily_reports SET year_id = (SELECT YearID FROM FinancialYears ORDER BY YearID ASC LIMIT 1) WHERE year_id IS NULL"); });

      addColumnIfNotExists('expenses', 'year_id', 'INTEGER', () => {
        db.run("UPDATE expenses SET year_id = (SELECT YearID FROM FinancialYears ORDER BY YearID ASC LIMIT 1) WHERE year_id IS NULL");
      });
      addColumnIfNotExists('expenses', 'cashier_name', 'TEXT', () => {
        db.run("UPDATE expenses SET cashier_name = NULL WHERE cashier_name IS NOT NULL", () => {});
      });
      db.run("UPDATE daily_reports SET cashier_name = 'كاشير عام' WHERE cashier_name IS NULL OR cashier_name = ''", (err) => {});

      // Add account_id to support Cash Vault
      addColumnIfNotExists('expenses', 'account_id', 'INTEGER', () => {});
      addColumnIfNotExists('supplier_transactions', 'account_id', 'INTEGER', () => {});
      addColumnIfNotExists('employee_transactions', 'voided_at', 'TEXT', () => {});
      addColumnIfNotExists('employee_transactions', 'voided_by', 'TEXT', () => {});
      addColumnIfNotExists('employee_transactions', 'void_reason', 'TEXT', () => {});
      addColumnIfNotExists('supplier_transactions', 'voucher_no', 'INTEGER', () => {
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS prevent_duplicate_supplier_voucher_insert
          BEFORE INSERT ON supplier_transactions
          WHEN NEW.voucher_no IS NOT NULL AND EXISTS (
            SELECT 1 FROM supplier_transactions
            WHERE year_id = NEW.year_id AND voucher_no = NEW.voucher_no
          )
          BEGIN
            SELECT RAISE(ABORT, 'duplicate supplier voucher number');
          END;
          CREATE TRIGGER IF NOT EXISTS prevent_duplicate_supplier_voucher_update
          BEFORE UPDATE OF voucher_no, year_id ON supplier_transactions
          WHEN NEW.voucher_no IS NOT NULL AND EXISTS (
            SELECT 1 FROM supplier_transactions
            WHERE year_id = NEW.year_id AND voucher_no = NEW.voucher_no AND id <> OLD.id
          )
          BEGIN
            SELECT RAISE(ABORT, 'duplicate supplier voucher number');
          END;
        `, () => {});
      });
      addColumnIfNotExists('employee_transactions', 'account_id', 'INTEGER', () => {});
      addColumnIfNotExists('daily_reports', 'account_id', 'INTEGER', () => {});
      addColumnIfNotExists('daily_reports', 'vat_rate_basis_points', 'INTEGER', () => {});
      addColumnIfNotExists('daily_reports', 'vat_minor', 'INTEGER', () => {});
      addColumnIfNotExists('daily_reports', 'net_sales_minor', 'INTEGER', () => {});
      addColumnIfNotExists('daily_reports', 'voucher_number', 'INTEGER', () => {
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS prevent_duplicate_sales_voucher_insert
          BEFORE INSERT ON daily_reports
          WHEN NEW.voucher_number IS NOT NULL AND EXISTS (
            SELECT 1 FROM daily_reports
            WHERE year_id = NEW.year_id AND voucher_number = NEW.voucher_number
          )
          BEGIN
            SELECT RAISE(ABORT, 'duplicate sales voucher number');
          END;
          CREATE TRIGGER IF NOT EXISTS prevent_duplicate_sales_voucher_update
          BEFORE UPDATE OF voucher_number, year_id ON daily_reports
          WHEN NEW.voucher_number IS NOT NULL AND EXISTS (
            SELECT 1 FROM daily_reports
            WHERE year_id = NEW.year_id
              AND voucher_number = NEW.voucher_number
              AND NOT (report_date = OLD.report_date AND cashier_name = OLD.cashier_name)
          )
          BEGIN
            SELECT RAISE(ABORT, 'duplicate sales voucher number');
          END;
        `, () => {});
        // Migration: fill voucher numbers sequentially for those without one
        db.all("SELECT report_date, cashier_name FROM daily_reports WHERE voucher_number IS NULL ORDER BY report_date ASC", (err, rows) => {
          if (!err && rows && rows.length > 0) {
            db.get("SELECT MAX(voucher_number) as max_voucher FROM daily_reports", (err, maxRow) => {
              let currentVoucherNum = (maxRow && maxRow.max_voucher) ? maxRow.max_voucher : 0;
              db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                const stmt = db.prepare("UPDATE daily_reports SET voucher_number = ? WHERE report_date = ? AND cashier_name = ?");
                for (let row of rows) {
                  currentVoucherNum++;
                  stmt.run(currentVoucherNum, row.report_date, row.cashier_name);
                }
                stmt.finalize();
                db.run("COMMIT");
                console.log(`Migrated ${rows.length} daily_reports with sequential voucher numbers.`);
              });
            });
          }
        });
      });
      
      addColumnIfNotExists('expenses', 'voucher_number', 'INTEGER', () => {
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS prevent_duplicate_expense_voucher_insert
          BEFORE INSERT ON expenses
          WHEN NEW.voucher_number IS NOT NULL AND EXISTS (
            SELECT 1 FROM expenses
            WHERE year_id = NEW.year_id
              AND voucher_number = NEW.voucher_number
              AND report_date <> NEW.report_date
          )
          BEGIN
            SELECT RAISE(ABORT, 'duplicate expense voucher number');
          END;
          CREATE TRIGGER IF NOT EXISTS prevent_duplicate_expense_voucher_update
          BEFORE UPDATE OF voucher_number, year_id, report_date ON expenses
          WHEN NEW.voucher_number IS NOT NULL AND EXISTS (
            SELECT 1 FROM expenses
            WHERE year_id = NEW.year_id
              AND voucher_number = NEW.voucher_number
              AND report_date <> NEW.report_date
              AND id <> OLD.id
          )
          BEGIN
            SELECT RAISE(ABORT, 'duplicate expense voucher number');
          END;
        `, () => {});
        // Migration: fill voucher numbers sequentially grouped by report_date
        db.all("SELECT DISTINCT report_date FROM expenses WHERE voucher_number IS NULL ORDER BY report_date ASC", (err, rows) => {
          if (!err && rows && rows.length > 0) {
            db.get("SELECT MAX(voucher_number) as max_voucher FROM expenses", (err, maxRow) => {
              let currentVoucherNum = (maxRow && maxRow.max_voucher) ? maxRow.max_voucher : 0;
              db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                const stmt = db.prepare("UPDATE expenses SET voucher_number = ? WHERE report_date = ?");
                for (let row of rows) {
                  currentVoucherNum++;
                  stmt.run(currentVoucherNum, row.report_date);
                }
                stmt.finalize();
                db.run("COMMIT");
                console.log(`Migrated expenses with sequential voucher numbers.`);
              });
            });
          }
        });
      });

      addColumnIfNotExists('CashGeneralVouchers', 'account_id', 'INTEGER', () => {});

      addColumnIfNotExists('CashGeneralVouchers', 'partner_name', 'TEXT', () => {});
      const voidableFinancialTables = [
        'daily_reports',
        'expenses',
        'CashGeneralVouchers',
        'BankTransactions'
      ];
      voidableFinancialTables.forEach(table => {
        addColumnIfNotExists(table, 'is_voided', 'INTEGER NOT NULL DEFAULT 0', () => {});
        addColumnIfNotExists(table, 'voided_at', 'TEXT', () => {});
        addColumnIfNotExists(table, 'voided_by', 'TEXT', () => {});
        addColumnIfNotExists(table, 'void_reason', 'TEXT', () => {});
      });

      // 3. MIGRATE DATA
      db.run("UPDATE employees SET monthly_accrual_start_date = date('now') WHERE monthly_accrual_start_date IS NULL AND COALESCE(is_archived, 0)=0", () => {});
      db.run(`INSERT INTO employee_salary_history (employee_id, salary, effective_date) 
              SELECT id, salary, date('now') FROM employees 
              WHERE id NOT IN (SELECT employee_id FROM employee_salary_history)`, () => {});
      // Keep the direct salary field synchronized for old databases where it was saved as zero.
      db.run(`UPDATE employees SET salary = COALESCE((
        SELECT h.salary FROM employee_salary_history h
        WHERE h.employee_id = employees.id AND h.effective_date <= date('now', 'localtime')
        ORDER BY h.effective_date DESC, h.id DESC LIMIT 1
      ), salary)`, () => {});

      // 4. CREATE INDEXES
      db.run("CREATE INDEX IF NOT EXISTS idx_employee_tx_emp_id ON employee_transactions(employee_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_employee_tx_date ON employee_transactions(tx_date)");
      db.run("CREATE INDEX IF NOT EXISTS idx_employee_tx_archived ON employee_transactions(is_archived)");
      db.run("CREATE INDEX IF NOT EXISTS idx_supplier_tx_sup_id ON supplier_transactions(supplier_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_supplier_tx_date ON supplier_transactions(tx_date)");
      db.run("CREATE INDEX IF NOT EXISTS idx_supplier_tx_archived ON supplier_transactions(is_archived)");
      db.run("CREATE INDEX IF NOT EXISTS idx_salary_history_emp_id ON employee_salary_history(employee_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_employee_archive_periods_employee ON employee_archive_periods(employee_id, archived_at)");
      db.run("CREATE INDEX IF NOT EXISTS idx_employees_category_id ON employees(category_id)");
      initializeSupportingSchema(db, addColumnIfNotExists);
      db.run(`INSERT OR IGNORE INTO employee_categories (name)
        SELECT 'ابن البلد'
        WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'employee_categories_seeded')
          AND NOT EXISTS (SELECT 1 FROM employee_categories)`);
      db.run(`INSERT OR IGNORE INTO employee_categories (name)
        SELECT 'مقيم'
        WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'employee_categories_seeded')`);
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('employee_categories_seeded', '1')");
      initializeMoneySchema(db);

      finalizeSchema(db);

    });
}

module.exports = { initializeSchema };

