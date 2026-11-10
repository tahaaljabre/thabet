function finalizeSchema(db) {
// Optimize Queries with Indexes
      db.run('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(report_date, year_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category, year_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_employee_tx_date ON employee_transactions(tx_date, year_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_supplier_tx_date ON supplier_transactions(tx_date, year_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_supplier_tx_voucher_no ON supplier_transactions(voucher_no)');
      db.run('CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date, year_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_vouchers_date ON CashGeneralVouchers(voucher_date, year_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON BankTransactions(tx_date, year_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_bank_tx_year_date ON BankTransactions(year_id, tx_date DESC, id DESC)');
      db.run('CREATE INDEX IF NOT EXISTS idx_bank_tx_reference ON BankTransactions(reference_type, reference_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_employee_tx_employee_year_date ON employee_transactions(employee_id, year_id, tx_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_supplier_tx_supplier_year_date ON supplier_transactions(supplier_id, year_id, tx_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_salary_history_employee_date ON employee_salary_history(employee_id, effective_date DESC)');
      db.run('CREATE INDEX IF NOT EXISTS idx_daily_reports_year_date ON daily_reports(year_id, report_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_expenses_year_date ON expenses(year_id, report_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_vouchers_year_date ON CashGeneralVouchers(year_id, voucher_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_daily_reports_voucher_num ON daily_reports(voucher_number)');
      db.run('CREATE INDEX IF NOT EXISTS idx_employees_year_archived ON employees(year_id, is_archived, id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_suppliers_year_archived ON suppliers(year_id, is_archived, id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_bank_accounts_year_vault ON BankAccounts(year_id, is_cash_vault)');
      db.run('CREATE INDEX IF NOT EXISTS idx_bank_tx_from_date ON BankTransactions(from_account_id, tx_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_bank_tx_to_date ON BankTransactions(to_account_id, tx_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_year_date ON AuditLogs(year_id, log_date DESC)');
      db.run('CREATE INDEX IF NOT EXISTS idx_trash_items_year_date ON TrashItems(year_id, deleted_at DESC)');
      db.run('CREATE INDEX IF NOT EXISTS idx_channel_sales_year_date ON DailyReportChannelSales(year_id, report_date, cashier_name)');
      db.exec(`
        CREATE TABLE IF NOT EXISTS FinancialMaintenanceFlags (
          flag TEXT PRIMARY KEY,
          enabled INTEGER NOT NULL DEFAULT 0
        );
        DROP TRIGGER IF EXISTS protect_supplier_transactions_from_delete;
        DROP TRIGGER IF EXISTS protect_employee_transactions_from_delete;
        DROP TRIGGER IF EXISTS protect_general_vouchers_from_delete;
        DROP TRIGGER IF EXISTS protect_bank_transactions_from_delete;
        CREATE TRIGGER protect_supplier_transactions_from_delete
        BEFORE DELETE ON supplier_transactions BEGIN
          SELECT CASE WHEN NOT EXISTS (
            SELECT 1 FROM FinancialMaintenanceFlags WHERE flag = 'allow_financial_purge' AND enabled = 1
          ) THEN RAISE(ABORT, 'FIN_DIRECT_DELETE_FORBIDDEN') END;
        END;
        CREATE TRIGGER protect_employee_transactions_from_delete
        BEFORE DELETE ON employee_transactions BEGIN
          SELECT CASE WHEN NOT EXISTS (
            SELECT 1 FROM FinancialMaintenanceFlags WHERE flag = 'allow_financial_purge' AND enabled = 1
          ) THEN RAISE(ABORT, 'FIN_DIRECT_DELETE_FORBIDDEN') END;
        END;
        CREATE TRIGGER protect_general_vouchers_from_delete
        BEFORE DELETE ON CashGeneralVouchers BEGIN
          SELECT CASE WHEN NOT EXISTS (
            SELECT 1 FROM FinancialMaintenanceFlags WHERE flag = 'allow_financial_purge' AND enabled = 1
          ) THEN RAISE(ABORT, 'FIN_DIRECT_DELETE_FORBIDDEN') END;
        END;
        CREATE TRIGGER protect_bank_transactions_from_delete
        BEFORE DELETE ON BankTransactions BEGIN
          SELECT CASE WHEN NOT EXISTS (
            SELECT 1 FROM FinancialMaintenanceFlags WHERE flag = 'allow_financial_purge' AND enabled = 1
          ) THEN RAISE(ABORT, 'FIN_DIRECT_DELETE_FORBIDDEN') END;
        END;
      `);
      const periodProtectedTables = [
        ['supplier_transactions', 'tx_date'],
        ['employee_transactions', 'tx_date'],
        ['CashGeneralVouchers', 'voucher_date'],
        ['BankTransactions', 'tx_date']
      ];
      periodProtectedTables.forEach(([table, dateColumn]) => {
        const safeName = table.replace(/[^a-zA-Z0-9_]/g, '_');
        db.exec(`
          DROP TRIGGER IF EXISTS protect_${safeName}_closed_period_insert;
          DROP TRIGGER IF EXISTS protect_${safeName}_closed_period_update;
          CREATE TRIGGER protect_${safeName}_closed_period_insert
          BEFORE INSERT ON "${table}"
          WHEN NOT EXISTS (
            SELECT 1 FROM FinancialMaintenanceFlags
            WHERE flag = 'allow_financial_purge' AND enabled = 1
          ) AND EXISTS (
            SELECT 1 FROM AccountingPeriods p
            WHERE p.year_id = NEW.year_id
              AND p.period_month = CAST(strftime('%m', NEW.${dateColumn}) AS INTEGER)
              AND p.status = 'closed'
          )
          BEGIN
            SELECT RAISE(ABORT, 'FIN_ACCOUNTING_PERIOD_CLOSED');
          END;
          CREATE TRIGGER protect_${safeName}_closed_period_update
          BEFORE UPDATE ON "${table}"
          WHEN NOT EXISTS (
            SELECT 1 FROM FinancialMaintenanceFlags
            WHERE flag = 'allow_financial_purge' AND enabled = 1
          ) AND (
            EXISTS (
              SELECT 1 FROM AccountingPeriods p
              WHERE p.year_id = OLD.year_id
                AND p.period_month = CAST(strftime('%m', OLD.${dateColumn}) AS INTEGER)
                AND p.status = 'closed'
            )
            OR EXISTS (
              SELECT 1 FROM AccountingPeriods p
              WHERE p.year_id = NEW.year_id
                AND p.period_month = CAST(strftime('%m', NEW.${dateColumn}) AS INTEGER)
                AND p.status = 'closed'
            )
          )
          BEGIN
            SELECT RAISE(ABORT, 'FIN_ACCOUNTING_PERIOD_CLOSED');
          END;
        `);
      });
      
      // Data Migration: Clean up erroneous partner names from supplier payments
      db.run("UPDATE BankTransactions SET partner_name = NULL WHERE reference_type = 'supplier'", (err) => {});

      // Unconditionally fix any NULL year_id values on startup
      db.get("SELECT YearID FROM FinancialYears ORDER BY YearID ASC LIMIT 1", (err, row) => {
        if (!err && row && row.YearID) {
          const defaultYearId = row.YearID;
          const tablesToUpdate = ['employees', 'employee_transactions', 'suppliers', 'supplier_transactions', 'daily_reports', 'expenses', 'CashGeneralVouchers', 'BankTransactions'];
          tablesToUpdate.forEach(table => {
            db.run(`UPDATE ${table} SET year_id = ? WHERE year_id IS NULL`, [defaultYearId], (updateErr) => {
              if (updateErr) console.log(`Ignored error during fallback year_id update of ${table}:`, updateErr.message);
            });
          });
        }
      });
}

module.exports = { finalizeSchema };
