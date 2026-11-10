const {
  runFinancialIntegrityCheck,
  ensureDailyIntegrityCheck,
  getIntegrityHistory
} = require('../../main/services/financial-integrity.service');
const accounting = require('../../main/services/accounting.service');
const { dbRun, waitForDatabaseReady, closeDatabase } = require('../../main/services/database');

describe('Financial integrity checks', () => {
  let yearId;

  beforeAll(async () => {
    await waitForDatabaseReady();
    const year = await dbRun(
      "INSERT INTO FinancialYears (YearName, IsClosed) VALUES ('Integrity-2040', 0)"
    );
    yearId = year.lastID;
    await accounting.ensureChartOfAccounts(yearId);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  test('records a healthy result when sources and journals agree', async () => {
    const result = await runFinancialIntegrityCheck(yearId, {
      checkDate: '2040-01-31',
      triggerType: 'manual'
    });
    expect(result.status).toBe('healthy');
    expect(result.critical_count).toBe(0);
    expect(result.checked_accounts).toBeGreaterThan(0);
  });

  test('detects a source sales movement without its journal entry', async () => {
    await dbRun(
      `INSERT INTO daily_reports
       (report_date, cashier_name, cashier_user, cash_sales, year_id, voucher_number)
       VALUES ('2040-01-15', 'Integrity Cashier', 'Manager', 100, ?, 1)`,
      [yearId]
    );
    const result = await runFinancialIntegrityCheck(yearId, {
      checkDate: '2040-01-31',
      triggerType: 'manual'
    });
    expect(result.status).toBe('critical');
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'sales_journal_mismatch', count: 1 })
    ]));
  });

  test('creates only one automatic result per day', async () => {
    const first = await ensureDailyIntegrityCheck(yearId);
    const second = await ensureDailyIntegrityCheck(yearId);
    expect(second.id).toBe(first.id);
    const history = await getIntegrityHistory(yearId);
    expect(history.filter(row => row.trigger_type === 'automatic')).toHaveLength(1);
  });
});
