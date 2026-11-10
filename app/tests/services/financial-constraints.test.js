const { dbAll, dbRun, closeDatabase, waitForDatabaseReady } = require('../../main/services/database');
const { getBankAccountsWithBalance } = require('../../main/services/banks.service');
const { saveClosingPartners } = require('../../main/services/system/financial-years');

describe('Financial database constraints', () => {
  beforeAll(async () => {
    await waitForDatabaseReady();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('rejects invalid amounts, dates, transaction types, and account-year mismatches', async () => {
    const accounts = await getBankAccountsWithBalance(1);
    const yearOneAccount = accounts.find(account => account.is_cash_vault === 1);
    const yearTwo = await dbRun(
      "INSERT INTO FinancialYears (YearName, IsClosed) VALUES ('Constraint Year 2', 0)"
    );

    await expect(dbRun(`
      INSERT INTO expenses (report_date, name, amount, category, year_id)
      VALUES ('2026-01-01', 'Invalid negative expense', -1, 'other', 1)
    `)).rejects.toThrow('ERR_AMOUNT_POSITIVE');

    await expect(dbRun(`
      INSERT INTO daily_reports
        (report_date, cashier_name, cashier_user, cash_sales, year_id)
      VALUES ('not-a-date', 'Constraint Cashier', 'Admin', 1, 1)
    `)).rejects.toThrow('ERR_DATE_INVALID');

    await expect(dbRun(`
      INSERT INTO BankTransactions
        (tx_date, tx_type, from_account_id, amount, created_by, year_id)
      VALUES ('2026-01-01', 'UnknownType', ?, 10, 'Admin', 1)
    `, [yearOneAccount.id])).rejects.toThrow('ERR_BANK_TX_TYPE_INVALID');

    await expect(dbRun(`
      INSERT INTO expenses
        (report_date, name, amount, category, account_id, year_id)
      VALUES ('2026-01-01', 'Wrong year account', 10, 'other', ?, ?)
    `, [yearOneAccount.id, yearTwo.lastID])).rejects.toThrow('ERR_ACCOUNT_YEAR_MISMATCH');
  });

  it('rejects entity-year mismatches and unsupported supplier transaction types', async () => {
    const supplier = await dbRun(
      "INSERT INTO suppliers (name, year_id) VALUES ('Constraint Supplier', 1)"
    );
    const employee = await dbRun(
      "INSERT INTO employees (name, salary, monthly_accrual_start_date, year_id) VALUES ('Constraint Employee', 100, '2026-01-01', 1)"
    );
    const yearTwo = await dbRun(
      "INSERT INTO FinancialYears (YearName, IsClosed) VALUES ('Constraint Entity Year 2', 0)"
    );

    await expect(dbRun(`
      INSERT INTO supplier_transactions
        (supplier_id, tx_date, amount, tx_type, year_id)
      VALUES (?, '2026-01-01', 10, 'invalid', 1)
    `, [supplier.lastID])).rejects.toThrow('ERR_SUPPLIER_TX_TYPE_INVALID');

    await expect(dbRun(`
      INSERT INTO supplier_transactions
        (supplier_id, tx_date, amount, tx_type, year_id)
      VALUES (?, '2026-01-01', 10, 'له', ?)
    `, [supplier.lastID, yearTwo.lastID])).rejects.toThrow('ERR_ENTITY_YEAR_MISMATCH');

    await expect(dbRun(`
      INSERT INTO employee_transactions
        (employee_id, tx_date, amount, deductions, allowances, year_id)
      VALUES (?, '2026-01-01', 10, 0, 0, ?)
    `, [employee.lastID, yearTwo.lastID])).rejects.toThrow('ERR_ENTITY_YEAR_MISMATCH');
  });

  it('requires valid partner percentages totaling exactly one hundred', async () => {
    await expect(saveClosingPartners(1, [
      { name: 'Partner A', percentage: 60 },
      { name: 'Partner B', percentage: 30 }
    ])).rejects.toThrow('ERR_PARTNER_PERCENTAGE_TOTAL');

    await expect(saveClosingPartners(1, [
      { name: 'Partner A', percentage: 60 },
      { name: 'Partner A', percentage: 40 }
    ])).rejects.toThrow('ERR_PARTNER_DUPLICATE');

    await expect(dbRun(`
      INSERT INTO ClosingPartners (year_id, partner_name, percentage)
      VALUES (1, 'Invalid Partner', 120)
    `)).rejects.toThrow('ERR_PARTNER_PERCENTAGE_INVALID');

    await expect(saveClosingPartners(1, [
      { name: 'Partner A', percentage: 60 },
      { name: 'Partner B', percentage: 40 }
    ])).resolves.toEqual({ success: true });

    const saved = await dbAll(
      'SELECT partner_name, percentage FROM ClosingPartners WHERE year_id = ? ORDER BY partner_name',
      [1]
    );
    expect(saved).toEqual([
      { partner_name: 'Partner A', percentage: 60 },
      { partner_name: 'Partner B', percentage: 40 }
    ]);
  });
});
