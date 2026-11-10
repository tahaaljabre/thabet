const TABLE_CONSTRAINTS = Object.freeze({
  daily_reports: `
    CREATE TRIGGER IF NOT EXISTS validate_daily_reports_insert
    BEFORE INSERT ON daily_reports BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN NEW.report_date IS NULL OR date(NEW.report_date) IS NULL
        OR date(NEW.report_date) <> NEW.report_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN COALESCE(NEW.cash_sales, 0) < 0 OR COALESCE(NEW.kbank, 0) < 0
        OR COALESCE(NEW.grab, 0) < 0 OR COALESCE(NEW.lineman, 0) < 0
        OR COALESCE(NEW.krungsri, 0) < 0 OR COALESCE(NEW.cashier_actual, 0) < 0
        THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_daily_reports_update
    BEFORE UPDATE ON daily_reports BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN NEW.report_date IS NULL OR date(NEW.report_date) IS NULL
        OR date(NEW.report_date) <> NEW.report_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN COALESCE(NEW.cash_sales, 0) < 0 OR COALESCE(NEW.kbank, 0) < 0
        OR COALESCE(NEW.grab, 0) < 0 OR COALESCE(NEW.lineman, 0) < 0
        OR COALESCE(NEW.krungsri, 0) < 0 OR COALESCE(NEW.cashier_actual, 0) < 0
        THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
    END;`,
  DailyReportChannelSales: `
    CREATE TRIGGER IF NOT EXISTS validate_channel_sales_insert
    BEFORE INSERT ON DailyReportChannelSales BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.report_date) IS NULL OR date(NEW.report_date) <> NEW.report_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount < 0
        THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_channel_sales_update
    BEFORE UPDATE ON DailyReportChannelSales BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.report_date) IS NULL OR date(NEW.report_date) <> NEW.report_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount < 0
        THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
    END;`,
  expenses: `
    CREATE TRIGGER IF NOT EXISTS validate_expenses_insert
    BEFORE INSERT ON expenses BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.report_date) IS NULL OR date(NEW.report_date) <> NEW.report_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount <= 0
        THEN RAISE(ABORT, 'ERR_AMOUNT_POSITIVE') END;
      SELECT CASE WHEN NEW.account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_expenses_update
    BEFORE UPDATE ON expenses BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.report_date) IS NULL OR date(NEW.report_date) <> NEW.report_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount <= 0
        THEN RAISE(ABORT, 'ERR_AMOUNT_POSITIVE') END;
      SELECT CASE WHEN NEW.account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;`,
  CashGeneralVouchers: `
    CREATE TRIGGER IF NOT EXISTS validate_cash_vouchers_insert
    BEFORE INSERT ON CashGeneralVouchers BEGIN
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id)
        THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.voucher_date) IS NULL OR date(NEW.voucher_date) <> NEW.voucher_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount <= 0
        THEN RAISE(ABORT, 'ERR_AMOUNT_POSITIVE') END;
      SELECT CASE WHEN NEW.account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_cash_vouchers_update
    BEFORE UPDATE ON CashGeneralVouchers BEGIN
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id)
        THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.voucher_date) IS NULL OR date(NEW.voucher_date) <> NEW.voucher_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount <= 0
        THEN RAISE(ABORT, 'ERR_AMOUNT_POSITIVE') END;
      SELECT CASE WHEN NEW.account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;`,
  employees: `
    CREATE TRIGGER IF NOT EXISTS validate_employees_insert
    BEFORE INSERT ON employees BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN typeof(COALESCE(NEW.salary, 0)) NOT IN ('integer', 'real')
        OR COALESCE(NEW.salary, 0) < 0 THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_employees_update
    BEFORE UPDATE ON employees BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN typeof(COALESCE(NEW.salary, 0)) NOT IN ('integer', 'real')
        OR COALESCE(NEW.salary, 0) < 0 THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
    END;`,
  suppliers: `
    CREATE TRIGGER IF NOT EXISTS validate_suppliers_insert
    BEFORE INSERT ON suppliers BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN trim(NEW.name) = '' THEN RAISE(ABORT, 'ERR_SUPPLIER_NAME_REQUIRED') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_suppliers_update
    BEFORE UPDATE ON suppliers BEGIN
      SELECT CASE WHEN NEW.year_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN trim(NEW.name) = '' THEN RAISE(ABORT, 'ERR_SUPPLIER_NAME_REQUIRED') END;
    END;`,
  employee_salary_history: `
    CREATE TRIGGER IF NOT EXISTS validate_salary_history_insert
    BEFORE INSERT ON employee_salary_history BEGIN
      SELECT CASE WHEN typeof(NEW.salary) NOT IN ('integer', 'real') OR NEW.salary < 0
        THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
      SELECT CASE WHEN date(NEW.effective_date) IS NULL OR date(NEW.effective_date) <> NEW.effective_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_salary_history_update
    BEFORE UPDATE ON employee_salary_history BEGIN
      SELECT CASE WHEN typeof(NEW.salary) NOT IN ('integer', 'real') OR NEW.salary < 0
        THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
      SELECT CASE WHEN date(NEW.effective_date) IS NULL OR date(NEW.effective_date) <> NEW.effective_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
    END;`,
  employee_transactions: `
    CREATE TRIGGER IF NOT EXISTS validate_employee_transactions_insert
    BEFORE INSERT ON employee_transactions BEGIN
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM employees WHERE id = NEW.employee_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ENTITY_YEAR_MISMATCH') END;
      SELECT CASE WHEN date(NEW.tx_date) IS NULL OR date(NEW.tx_date) <> NEW.tx_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN COALESCE(NEW.amount, 0) < 0 OR COALESCE(NEW.deductions, 0) < 0
        OR COALESCE(NEW.allowances, 0) < 0 OR COALESCE(NEW.attendance_days, 0) < 0
        OR COALESCE(NEW.absence_days, 0) < 0 THEN RAISE(ABORT, 'ERR_VALUE_NEGATIVE') END;
      SELECT CASE WHEN NEW.account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_employee_transactions_update
    BEFORE UPDATE ON employee_transactions BEGIN
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM employees WHERE id = NEW.employee_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ENTITY_YEAR_MISMATCH') END;
      SELECT CASE WHEN date(NEW.tx_date) IS NULL OR date(NEW.tx_date) <> NEW.tx_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN COALESCE(NEW.amount, 0) < 0 OR COALESCE(NEW.deductions, 0) < 0
        OR COALESCE(NEW.allowances, 0) < 0 OR COALESCE(NEW.attendance_days, 0) < 0
        OR COALESCE(NEW.absence_days, 0) < 0 THEN RAISE(ABORT, 'ERR_VALUE_NEGATIVE') END;
      SELECT CASE WHEN NEW.account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;`,
  supplier_transactions: `
    CREATE TRIGGER IF NOT EXISTS validate_supplier_transactions_insert
    BEFORE INSERT ON supplier_transactions BEGIN
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM suppliers WHERE id = NEW.supplier_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ENTITY_YEAR_MISMATCH') END;
      SELECT CASE WHEN date(NEW.tx_date) IS NULL OR date(NEW.tx_date) <> NEW.tx_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount <= 0
        THEN RAISE(ABORT, 'ERR_AMOUNT_POSITIVE') END;
      SELECT CASE WHEN NEW.tx_type NOT IN ('له', 'عليه', 'خصم')
        THEN RAISE(ABORT, 'ERR_SUPPLIER_TX_TYPE_INVALID') END;
      SELECT CASE WHEN NEW.account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_supplier_transactions_update
    BEFORE UPDATE ON supplier_transactions BEGIN
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM suppliers WHERE id = NEW.supplier_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ENTITY_YEAR_MISMATCH') END;
      SELECT CASE WHEN date(NEW.tx_date) IS NULL OR date(NEW.tx_date) <> NEW.tx_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount <= 0
        THEN RAISE(ABORT, 'ERR_AMOUNT_POSITIVE') END;
      SELECT CASE WHEN NEW.tx_type NOT IN ('له', 'عليه', 'خصم')
        THEN RAISE(ABORT, 'ERR_SUPPLIER_TX_TYPE_INVALID') END;
      SELECT CASE WHEN NEW.account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;`,
  BankAccounts: `
    CREATE TRIGGER IF NOT EXISTS validate_bank_accounts_insert
    BEFORE INSERT ON BankAccounts BEGIN
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id)
        THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN NEW.start_date IS NOT NULL AND (
        date(NEW.start_date) IS NULL OR date(NEW.start_date) <> NEW.start_date
      ) THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN COALESCE(NEW.is_cash_vault, 0) NOT IN (0, 1)
        THEN RAISE(ABORT, 'ERR_BOOLEAN_INVALID') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_bank_accounts_update
    BEFORE UPDATE ON BankAccounts BEGIN
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id)
        THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN NEW.start_date IS NOT NULL AND (
        date(NEW.start_date) IS NULL OR date(NEW.start_date) <> NEW.start_date
      ) THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN COALESCE(NEW.is_cash_vault, 0) NOT IN (0, 1)
        THEN RAISE(ABORT, 'ERR_BOOLEAN_INVALID') END;
    END;`,
  BankTransactions: `
    CREATE TRIGGER IF NOT EXISTS validate_bank_transactions_insert
    BEFORE INSERT ON BankTransactions BEGIN
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id)
        THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.tx_date) IS NULL OR date(NEW.tx_date) <> NEW.tx_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount <= 0
        THEN RAISE(ABORT, 'ERR_AMOUNT_POSITIVE') END;
      SELECT CASE WHEN NEW.tx_type NOT IN ('Transfer', 'Deposit', 'Receipt', 'Withdrawal', 'Payment')
        THEN RAISE(ABORT, 'ERR_BANK_TX_TYPE_INVALID') END;
      SELECT CASE WHEN NEW.tx_type = 'Transfer' AND (
        NEW.from_account_id IS NULL OR NEW.to_account_id IS NULL
        OR NEW.from_account_id = NEW.to_account_id
      ) THEN RAISE(ABORT, 'ERR_TRANSFER_ACCOUNTS_INVALID') END;
      SELECT CASE WHEN NEW.tx_type IN ('Deposit', 'Receipt') AND NEW.to_account_id IS NULL
        THEN RAISE(ABORT, 'ERR_BANK_DESTINATION_REQUIRED') END;
      SELECT CASE WHEN NEW.tx_type IN ('Withdrawal', 'Payment') AND NEW.from_account_id IS NULL
        THEN RAISE(ABORT, 'ERR_BANK_SOURCE_REQUIRED') END;
      SELECT CASE WHEN NEW.from_account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.from_account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
      SELECT CASE WHEN NEW.to_account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.to_account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_bank_transactions_update
    BEFORE UPDATE ON BankTransactions BEGIN
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id)
        THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.tx_date) IS NULL OR date(NEW.tx_date) <> NEW.tx_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN typeof(NEW.amount) NOT IN ('integer', 'real') OR NEW.amount <= 0
        THEN RAISE(ABORT, 'ERR_AMOUNT_POSITIVE') END;
      SELECT CASE WHEN NEW.tx_type NOT IN ('Transfer', 'Deposit', 'Receipt', 'Withdrawal', 'Payment')
        THEN RAISE(ABORT, 'ERR_BANK_TX_TYPE_INVALID') END;
      SELECT CASE WHEN NEW.tx_type = 'Transfer' AND (
        NEW.from_account_id IS NULL OR NEW.to_account_id IS NULL
        OR NEW.from_account_id = NEW.to_account_id
      ) THEN RAISE(ABORT, 'ERR_TRANSFER_ACCOUNTS_INVALID') END;
      SELECT CASE WHEN NEW.tx_type IN ('Deposit', 'Receipt') AND NEW.to_account_id IS NULL
        THEN RAISE(ABORT, 'ERR_BANK_DESTINATION_REQUIRED') END;
      SELECT CASE WHEN NEW.tx_type IN ('Withdrawal', 'Payment') AND NEW.from_account_id IS NULL
        THEN RAISE(ABORT, 'ERR_BANK_SOURCE_REQUIRED') END;
      SELECT CASE WHEN NEW.from_account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.from_account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
      SELECT CASE WHEN NEW.to_account_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.to_account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;`,
  ClosingReports: `
    CREATE TRIGGER IF NOT EXISTS validate_closing_reports_insert
    BEFORE INSERT ON ClosingReports BEGIN
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id)
        THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.closing_date) IS NULL OR date(NEW.closing_date) <> NEW.closing_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN NEW.zakat < 0 OR NEW.distributable_profit < 0
        THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_closing_reports_update
    BEFORE UPDATE ON ClosingReports BEGIN
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id)
        THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN date(NEW.closing_date) IS NULL OR date(NEW.closing_date) <> NEW.closing_date
        THEN RAISE(ABORT, 'ERR_DATE_INVALID') END;
      SELECT CASE WHEN NEW.zakat < 0 OR NEW.distributable_profit < 0
        THEN RAISE(ABORT, 'ERR_MONEY_NEGATIVE') END;
    END;`
});

function initializeFinancialConstraintsForTable(db, table) {
  const sql = TABLE_CONSTRAINTS[table];
  if (!sql) return;
  db.exec(sql, error => {
    if (error) console.error(`Failed to initialize financial constraints for ${table}:`, error);
  });
}

function initializeSupportingFinancialConstraints(db) {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS validate_closing_partners_insert
    BEFORE INSERT ON ClosingPartners BEGIN
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM FinancialYears WHERE YearID = NEW.year_id)
        THEN RAISE(ABORT, 'ERR_FINANCIAL_YEAR_INVALID') END;
      SELECT CASE WHEN typeof(NEW.percentage) NOT IN ('integer', 'real')
        OR NEW.percentage <= 0 OR NEW.percentage > 100
        THEN RAISE(ABORT, 'ERR_PARTNER_PERCENTAGE_INVALID') END;
      SELECT CASE WHEN trim(NEW.partner_name) = ''
        THEN RAISE(ABORT, 'ERR_PARTNER_NAME_REQUIRED') END;
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM ClosingPartners
        WHERE year_id = NEW.year_id AND partner_name = NEW.partner_name
      ) THEN RAISE(ABORT, 'ERR_PARTNER_DUPLICATE') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_closing_partners_update
    BEFORE UPDATE ON ClosingPartners BEGIN
      SELECT CASE WHEN typeof(NEW.percentage) NOT IN ('integer', 'real')
        OR NEW.percentage <= 0 OR NEW.percentage > 100
        THEN RAISE(ABORT, 'ERR_PARTNER_PERCENTAGE_INVALID') END;
      SELECT CASE WHEN trim(NEW.partner_name) = ''
        THEN RAISE(ABORT, 'ERR_PARTNER_NAME_REQUIRED') END;
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM ClosingPartners
        WHERE year_id = NEW.year_id AND partner_name = NEW.partner_name AND id <> OLD.id
      ) THEN RAISE(ABORT, 'ERR_PARTNER_DUPLICATE') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_bank_sales_mapping_insert
    BEFORE INSERT ON BankSalesMapping BEGIN
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.bank_account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;
    CREATE TRIGGER IF NOT EXISTS validate_bank_sales_mapping_update
    BEFORE UPDATE ON BankSalesMapping BEGIN
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM BankAccounts WHERE id = NEW.bank_account_id AND year_id = NEW.year_id
      ) THEN RAISE(ABORT, 'ERR_ACCOUNT_YEAR_MISMATCH') END;
    END;
  `, error => {
    if (error) console.error('Failed to initialize supporting financial constraints:', error);
  });
}

module.exports = {
  initializeFinancialConstraintsForTable,
  initializeSupportingFinancialConstraints
};
