const { dbRun, dbGet, closeDatabase, waitForDatabaseReady } = require('../../main/services/database');
const { withTransaction } = require('../../main/services/database/transaction');
const { saveReportState } = require('../../main/services/reports.service');
const { saveExpensesReport } = require('../../main/services/expenses.service');

const insertYear = name => dbRun(
  'INSERT INTO FinancialYears (YearName, IsClosed) VALUES (?, 0)',
  [name]
);
const findYear = name => dbGet('SELECT YearID FROM FinancialYears WHERE YearName = ?', [name]);

describe('Database transaction queue', () => {
  beforeAll(async () => {
    await waitForDatabaseReady();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('serializes concurrent financial writes instead of opening nested transactions', async () => {
    const salesWrites = Array.from({ length: 6 }, (_, index) => saveReportState({
      reportDate: `2026-06-0${index + 1}`,
      cashierName: 'Concurrent Cashier',
      cashierUser: 'Admin',
      year_id: 1,
      sales: { cash: 10 + index, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      cashierActual: 10 + index
    }));
    const expensesWrite = saveExpensesReport({
      reportDate: '2026-06-07',
      year_id: 1,
      purchases: [{ name: 'Concurrent purchase', qty: 1, amount: 5, category: 'other' }]
    });

    const settled = await Promise.all([...salesWrites, expensesWrite]);
    expect(settled).toHaveLength(7);
    settled.forEach(result => expect(result.success).toBe(true));
  });

  it('rolls back every write of a failed transaction', async () => {
    await expect(withTransaction(async () => {
      await insertYear('Queue rollback probe');
      await dbRun('DELETE FROM FinancialYears WHERE YearName = ?', ['Queue rollback probe']);
      await insertYear('Queue rollback probe 2');
      throw new Error('rollback probe');
    })).rejects.toThrow('rollback probe');

    await expect(findYear('Queue rollback probe')).resolves.toBeUndefined();
    await expect(findYear('Queue rollback probe 2')).resolves.toBeUndefined();
  });

  it('joins a nested transaction to the outer one and rolls it back as a unit', async () => {
    await expect(withTransaction(async () => {
      await insertYear('Nested outer probe');
      await withTransaction(async () => {
        await insertYear('Nested inner probe');
      });
      throw new Error('nested probe failure');
    })).rejects.toThrow('nested probe failure');

    await expect(findYear('Nested outer probe')).resolves.toBeUndefined();
    await expect(findYear('Nested inner probe')).resolves.toBeUndefined();
  });

  it('keeps standalone writes out of a transaction that is still open', async () => {
    const failingTransaction = withTransaction(async () => {
      await insertYear('Standalone isolation probe');
      await new Promise(resolve => setTimeout(resolve, 30));
      throw new Error('standalone isolation failure');
    });
    const standaloneWrite = dbRun(
      'INSERT INTO FinancialYears (YearName, IsClosed) VALUES (?, 0)',
      ['Standalone survives probe']
    );

    await expect(failingTransaction).rejects.toThrow('standalone isolation failure');
    await expect(standaloneWrite).resolves.toBeDefined();

    await expect(findYear('Standalone isolation probe')).resolves.toBeUndefined();
    await expect(findYear('Standalone survives probe')).resolves.toBeDefined();
  });

  it('keeps accepting writes after a rollback', async () => {
    await withTransaction(async () => {
      await insertYear('Queue recovery probe');
    });
    await expect(findYear('Queue recovery probe')).resolves.toBeDefined();
  });
});
