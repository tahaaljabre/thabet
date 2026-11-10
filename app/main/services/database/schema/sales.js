const { initializeMoneyTable } = require('./money');

function initializeSalesSchema(db) {
// Create cashiers table
      db.run(`CREATE TABLE IF NOT EXISTS cashiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        active_user TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`, () => {
        // Seed default cashiers if empty
        db.get("SELECT COUNT(*) as count FROM cashiers", (err, row) => {
          if (!err && row && row.count === 0) {
            db.run("INSERT INTO cashiers (name, active_user) VALUES ('الدور الأول', 'أحمد')");
            db.run("INSERT INTO cashiers (name, active_user) VALUES ('الدور الثاني', 'محمد')");
            db.run("INSERT INTO cashiers (name, active_user) VALUES ('الدور الثالث', 'علي')");
          }
        });
      });

      // Migrate daily_reports if it's in the old single-key format
      db.all("PRAGMA table_info(daily_reports)", (err, columns) => {
        if (!err && columns && columns.length > 0) {
          const hasCashier = columns.some(col => col.name === 'cashier_name');
          if (!hasCashier) {
            console.log("Migrating daily_reports to multi-cashier layout...");
            db.serialize(() => {
              db.run("ALTER TABLE daily_reports RENAME TO daily_reports_old");
              db.run(`CREATE TABLE daily_reports (
                report_date TEXT NOT NULL,
                cashier_name TEXT NOT NULL DEFAULT 'الدور الأول',
                cashier_user TEXT NOT NULL DEFAULT 'أحمد',
                cash_sales REAL DEFAULT 0,
                cash_sales_minor INTEGER,
                kbank REAL DEFAULT 0,
                kbank_minor INTEGER,
                grab REAL DEFAULT 0,
                grab_minor INTEGER,
                lineman REAL DEFAULT 0,
                lineman_minor INTEGER,
                krungsri REAL DEFAULT 0,
                krungsri_minor INTEGER,
                cashier_actual REAL DEFAULT 0,
                cashier_actual_minor INTEGER,
                vat_rate_basis_points INTEGER,
                vat_minor INTEGER,
                net_sales_minor INTEGER,
                is_closed INTEGER DEFAULT 0,
                is_voided INTEGER NOT NULL DEFAULT 0,
                voided_at TEXT,
                voided_by TEXT,
                void_reason TEXT,
                PRIMARY KEY (report_date, cashier_name)
              )`);
              db.run(`INSERT OR IGNORE INTO daily_reports (report_date, cashier_name, cashier_user, cash_sales, kbank, grab, lineman, krungsri, cashier_actual, is_closed)
                      SELECT report_date, 'الدور الأول', 'أحمد', cash_sales, kbank, grab, lineman, krungsri, cashier_actual, is_closed
                      FROM daily_reports_old`, (err) => {
                        if (err) console.error("Migration insert error:", err);
                        db.run("DROP TABLE IF EXISTS daily_reports_old");
                        console.log("Migration complete!");
                      });
            });
          }
        } else {
          // Create the table from scratch if it doesn't exist
          db.run(`CREATE TABLE IF NOT EXISTS daily_reports (
            report_date TEXT NOT NULL,
            cashier_name TEXT NOT NULL DEFAULT 'الدور الأول',
            cashier_user TEXT NOT NULL DEFAULT 'أحمد',
            cash_sales REAL DEFAULT 0,
            cash_sales_minor INTEGER,
            kbank REAL DEFAULT 0,
            kbank_minor INTEGER,
            grab REAL DEFAULT 0,
            grab_minor INTEGER,
            lineman REAL DEFAULT 0,
            lineman_minor INTEGER,
            krungsri REAL DEFAULT 0,
            krungsri_minor INTEGER,
            cashier_actual REAL DEFAULT 0,
            cashier_actual_minor INTEGER,
            vat_rate_basis_points INTEGER,
            vat_minor INTEGER,
            net_sales_minor INTEGER,
            is_closed INTEGER DEFAULT 0,
            year_id INTEGER,
            voucher_number INTEGER,
            expense_voucher_number TEXT,
            is_voided INTEGER NOT NULL DEFAULT 0,
            voided_at TEXT,
            voided_by TEXT,
            void_reason TEXT,
            PRIMARY KEY (report_date, cashier_name)
          )`);
        }
        db.get("SELECT name FROM cashiers ORDER BY id ASC LIMIT 1", (err, row) => {
          if (!err && row && row.name) {
            db.run("UPDATE OR IGNORE daily_reports SET cashier_name = ? WHERE cashier_name = 'الدور الأول'", [row.name], (updateErr) => {
              if (updateErr) console.log("Ignored cashier name update error:", updateErr.message);
            });
          }
        });
        db.run('SELECT 1', () => {
          initializeMoneyTable(db, 'daily_reports');
          initializeMoneyTable(db, 'expenses');
        });
      });

      db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date TEXT NOT NULL,
        name TEXT NOT NULL,
        qty TEXT,
        amount REAL NOT NULL,
        amount_minor INTEGER,
        category TEXT,
        year_id INTEGER,
        cashier_name TEXT,
        account_id INTEGER,
        voucher_number INTEGER,
        is_voided INTEGER NOT NULL DEFAULT 0,
        voided_at TEXT,
        voided_by TEXT,
        void_reason TEXT
      )`, () => {
        db.exec(`
          DROP TRIGGER IF EXISTS protect_daily_reports_from_delete;
          DROP TRIGGER IF EXISTS protect_expenses_from_delete;
          CREATE TRIGGER protect_daily_reports_from_delete
          BEFORE DELETE ON daily_reports BEGIN
            SELECT CASE WHEN NOT EXISTS (
              SELECT 1 FROM FinancialMaintenanceFlags WHERE flag = 'allow_financial_purge' AND enabled = 1
            ) THEN RAISE(ABORT, 'FIN_DIRECT_DELETE_FORBIDDEN') END;
          END;
          CREATE TRIGGER protect_expenses_from_delete
          BEFORE DELETE ON expenses BEGIN
            SELECT CASE WHEN NOT EXISTS (
              SELECT 1 FROM FinancialMaintenanceFlags WHERE flag = 'allow_financial_purge' AND enabled = 1
            ) THEN RAISE(ABORT, 'FIN_DIRECT_DELETE_FORBIDDEN') END;
          END;
          DROP TRIGGER IF EXISTS protect_daily_reports_closed_period_insert;
          DROP TRIGGER IF EXISTS protect_daily_reports_closed_period_update;
          DROP TRIGGER IF EXISTS protect_expenses_closed_period_insert;
          DROP TRIGGER IF EXISTS protect_expenses_closed_period_update;
          CREATE TRIGGER protect_daily_reports_closed_period_insert
          BEFORE INSERT ON daily_reports
          WHEN EXISTS (
            SELECT 1 FROM AccountingPeriods p
            WHERE p.year_id = NEW.year_id
              AND p.period_month = CAST(strftime('%m', NEW.report_date) AS INTEGER)
              AND p.status = 'closed'
          )
          BEGIN SELECT RAISE(ABORT, 'FIN_ACCOUNTING_PERIOD_CLOSED'); END;
          CREATE TRIGGER protect_daily_reports_closed_period_update
          BEFORE UPDATE ON daily_reports
          WHEN EXISTS (
            SELECT 1 FROM AccountingPeriods p
            WHERE p.year_id IN (OLD.year_id, NEW.year_id)
              AND p.period_month IN (
                CAST(strftime('%m', OLD.report_date) AS INTEGER),
                CAST(strftime('%m', NEW.report_date) AS INTEGER)
              )
              AND p.status = 'closed'
          )
          BEGIN SELECT RAISE(ABORT, 'FIN_ACCOUNTING_PERIOD_CLOSED'); END;
          CREATE TRIGGER protect_expenses_closed_period_insert
          BEFORE INSERT ON expenses
          WHEN EXISTS (
            SELECT 1 FROM AccountingPeriods p
            WHERE p.year_id = NEW.year_id
              AND p.period_month = CAST(strftime('%m', NEW.report_date) AS INTEGER)
              AND p.status = 'closed'
          )
          BEGIN SELECT RAISE(ABORT, 'FIN_ACCOUNTING_PERIOD_CLOSED'); END;
          CREATE TRIGGER protect_expenses_closed_period_update
          BEFORE UPDATE ON expenses
          WHEN EXISTS (
            SELECT 1 FROM AccountingPeriods p
            WHERE p.year_id IN (OLD.year_id, NEW.year_id)
              AND p.period_month IN (
                CAST(strftime('%m', OLD.report_date) AS INTEGER),
                CAST(strftime('%m', NEW.report_date) AS INTEGER)
              )
              AND p.status = 'closed'
          )
          BEGIN SELECT RAISE(ABORT, 'FIN_ACCOUNTING_PERIOD_CLOSED'); END;
        `);
      });
}

module.exports = { initializeSalesSchema };
