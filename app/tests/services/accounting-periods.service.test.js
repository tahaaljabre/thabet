const {
  dbGet,
  dbRun,
  closeDatabase,
  waitForDatabaseReady
} = require('../../main/services/database');
const {
  getAccountingPeriods,
  closeAccountingPeriod,
  reopenAccountingPeriod
} = require('../../main/services/accounting-periods.service');
const { saveReportState } = require('../../main/services/reports.service');

describe('Monthly accounting periods', () => {
  const yearId = 1201;

  beforeAll(async () => {
    await waitForDatabaseReady();
    await dbRun(
      "INSERT INTO FinancialYears (YearID, YearName, IsClosed) VALUES (?, '2030', 0)",
      [yearId]
    );
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('creates twelve open periods and requires sequential closing', async () => {
    const periods = await getAccountingPeriods(yearId);
    expect(periods).toHaveLength(12);
    expect(periods.every(period => period.status === 'open')).toBe(true);

    await expect(closeAccountingPeriod(yearId, 2)).rejects.toThrow('FIN_PREVIOUS_PERIOD_OPEN');
    const january = await closeAccountingPeriod(yearId, 1, 'January reviewed');
    expect(january.status).toBe('closed');
    expect(january.closed_by).toBeTruthy();
    expect(january.trial_debit_minor).toBe(january.trial_credit_minor);
  });

  it('blocks service and direct database writes inside a closed month', async () => {
    await expect(saveReportState({
      reportDate: '2030-01-15',
      cashierName: 'Period Cashier',
      cashierUser: 'Manager',
      year_id: yearId,
      sales: { cash: 10, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      cashierActual: 10
    })).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');

    await expect(dbRun(`
      INSERT INTO expenses (report_date, name, amount, category, year_id)
      VALUES ('2030-01-20', 'Closed period expense', 10, 'other', ?)
    `, [yearId])).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');

    const employee = await dbRun(
      "INSERT INTO employees (name, salary, year_id) VALUES ('Closed Period Employee', 0, ?)",
      [yearId]
    );
    const supplier = await dbRun(
      "INSERT INTO suppliers (name, year_id) VALUES ('Closed Period Supplier', ?)",
      [yearId]
    );
    const account = await dbRun(`
      INSERT INTO BankAccounts
        (bank_name, opening_balance, current_balance, start_date, year_id, is_cash_vault)
      VALUES ('Closed Period Bank', 0, 0, '2030-01-01', ?, 1)
    `, [yearId]);

    await expect(dbRun(`
      INSERT INTO employee_transactions
        (employee_id, tx_date, amount, year_id)
      VALUES (?, '2030-01-20', 10, ?)
    `, [employee.lastID, yearId])).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');
    await expect(dbRun(`
      INSERT INTO supplier_transactions
        (supplier_id, tx_date, amount, tx_type, year_id)
      VALUES (?, '2030-01-20', 10, 'له', ?)
    `, [supplier.lastID, yearId])).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');
    await expect(dbRun(`
      INSERT INTO CashGeneralVouchers
        (voucher_date, amount, category, created_by, year_id)
      VALUES ('2030-01-20', 10, 'General Expense', 'Manager', ?)
    `, [yearId])).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');
    await expect(dbRun(`
      INSERT INTO BankTransactions
        (tx_date, tx_type, to_account_id, amount, created_by, year_id)
      VALUES ('2030-01-20', 'Deposit', ?, 10, 'Manager', ?)
    `, [account.lastID, yearId])).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');

    await expect(saveReportState({
      reportDate: '2030-02-15',
      cashierName: 'Period Cashier',
      cashierUser: 'Manager',
      year_id: yearId,
      sales: { cash: 10, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      cashierActual: 10
    })).resolves.toMatchObject({ success: true });
  });

  it('requires a reason and reverse sequence when reopening', async () => {
    await closeAccountingPeriod(yearId, 2);
    await expect(reopenAccountingPeriod(yearId, 1, 'Correction')).rejects.toThrow('FIN_LATER_PERIOD_CLOSED');
    await expect(reopenAccountingPeriod(yearId, 2, '')).rejects.toThrow('FIN_PERIOD_REOPEN_REASON_REQUIRED');

    const reopened = await reopenAccountingPeriod(yearId, 2, 'February correction');
    expect(reopened.status).toBe('open');
    const stored = await dbGet(
      'SELECT reopen_reason, reopened_by FROM AccountingPeriods WHERE year_id = ? AND period_month = 2',
      [yearId]
    );
    expect(stored.reopen_reason).toBe('February correction');
    expect(stored.reopened_by).toBeTruthy();
  });

  it('blocks edits to existing employee, supplier, voucher, and bank movements in a closed month', async () => {
    const editYearId = 1202;
    await dbRun(
      "INSERT INTO FinancialYears (YearID, YearName, IsClosed) VALUES (?, '2031', 0)",
      [editYearId]
    );
    await closeAccountingPeriod(editYearId, 1, 'Closed edit test');
    const employee = await dbRun(
      "INSERT INTO employees (name, salary, year_id) VALUES ('Edit Lock Employee', 0, ?)",
      [editYearId]
    );
    const supplier = await dbRun(
      "INSERT INTO suppliers (name, year_id) VALUES ('Edit Lock Supplier', ?)",
      [editYearId]
    );
    const account = await dbRun(`
      INSERT INTO BankAccounts
        (bank_name, opening_balance, current_balance, start_date, year_id, is_cash_vault)
      VALUES ('Edit Lock Bank', 0, 0, '2031-01-01', ?, 0)
    `, [editYearId]);

    await dbRun(`
      INSERT OR REPLACE INTO FinancialMaintenanceFlags (flag, enabled)
      VALUES ('allow_financial_purge', 1)
    `);
    let employeeTx;
    let supplierTx;
    let voucher;
    let bankTx;
    try {
      employeeTx = await dbRun(`
        INSERT INTO employee_transactions (employee_id, tx_date, amount, year_id)
        VALUES (?, '2031-01-10', 10, ?)
      `, [employee.lastID, editYearId]);
      supplierTx = await dbRun(`
        INSERT INTO supplier_transactions (supplier_id, tx_date, amount, tx_type, year_id)
        VALUES (?, '2031-01-10', 10, 'له', ?)
      `, [supplier.lastID, editYearId]);
      voucher = await dbRun(`
        INSERT INTO CashGeneralVouchers
          (voucher_date, amount, category, created_by, year_id)
        VALUES ('2031-01-10', 10, 'General Expense', 'Manager', ?)
      `, [editYearId]);
      bankTx = await dbRun(`
        INSERT INTO BankTransactions
          (tx_date, tx_type, to_account_id, amount, created_by, year_id)
        VALUES ('2031-01-10', 'Deposit', ?, 10, 'Manager', ?)
      `, [account.lastID, editYearId]);
    } finally {
      await dbRun(
        "UPDATE FinancialMaintenanceFlags SET enabled = 0 WHERE flag = 'allow_financial_purge'"
      );
    }

    await expect(dbRun(
      'UPDATE employee_transactions SET amount = 20 WHERE id = ?',
      [employeeTx.lastID]
    )).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');
    await expect(dbRun(
      'UPDATE supplier_transactions SET amount = 20 WHERE id = ?',
      [supplierTx.lastID]
    )).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');
    await expect(dbRun(
      'UPDATE CashGeneralVouchers SET amount = 20 WHERE id = ?',
      [voucher.lastID]
    )).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');
    await expect(dbRun(
      'UPDATE BankTransactions SET amount = 20 WHERE id = ?',
      [bankTx.lastID]
    )).rejects.toThrow('FIN_ACCOUNTING_PERIOD_CLOSED');
  });
});
