const { dbGet, dbRun, closeDatabase, waitForDatabaseReady } = require('../../main/services/database');
const accounting = require('../../main/services/accounting.service');

describe('Double-entry accounting service', () => {
  beforeAll(async () => {
    await waitForDatabaseReady();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('posts a balanced journal and returns a balanced trial balance', async () => {
    const cash = await accounting.getAccountByCode(1, '1010');
    const revenue = await accounting.getAccountByCode(1, '4010');
    const entry = await accounting.postSourceEntry({
      yearId: 1,
      date: '2026-07-01',
      description: 'Test sale',
      sourceType: 'test-sale',
      sourceKey: 'one',
      lines: [
        { accountId: cash.id, debitMinor: 12345, creditMinor: 0 },
        { accountId: revenue.id, debitMinor: 0, creditMinor: 12345 }
      ]
    });

    expect(entry.status).toBe('posted');
    const trialBalance = await accounting.getTrialBalance({ yearId: 1 });
    expect(trialBalance.debitMinor).toBe(12345);
    expect(trialBalance.creditMinor).toBe(12345);
    expect(trialBalance.isBalanced).toBe(true);
  });

  it('prevents posting an unbalanced journal at the database layer', async () => {
    const cash = await accounting.getAccountByCode(1, '1010');
    const revenue = await accounting.getAccountByCode(1, '4010');
    const draft = await dbRun(`
      INSERT INTO JournalEntries
        (year_id, entry_number, entry_date, description, source_type, source_key)
      VALUES (1, 9999, '2026-07-02', 'Invalid journal', 'test', 'invalid')
    `);
    await dbRun(
      'INSERT INTO JournalLines (entry_id, account_id, debit_minor, credit_minor) VALUES (?, ?, 100, 0)',
      [draft.lastID, cash.id]
    );
    await dbRun(
      'INSERT INTO JournalLines (entry_id, account_id, debit_minor, credit_minor) VALUES (?, ?, 0, 90)',
      [draft.lastID, revenue.id]
    );

    await expect(
      dbRun("UPDATE JournalEntries SET status = 'posted' WHERE id = ?", [draft.lastID])
    ).rejects.toThrow('FIN_JOURNAL_UNBALANCED');
  });

  it('reverses a prior source entry and keeps posted journals immutable', async () => {
    const cash = await accounting.getAccountByCode(1, '1010');
    const revenue = await accounting.getAccountByCode(1, '4010');
    const original = await accounting.postSourceEntry({
      yearId: 1,
      date: '2026-07-03',
      description: 'Original sale',
      sourceType: 'test-update',
      sourceKey: 'sale-1',
      lines: [
        { accountId: cash.id, debitMinor: 500, creditMinor: 0 },
        { accountId: revenue.id, debitMinor: 0, creditMinor: 500 }
      ]
    });
    await accounting.postSourceEntry({
      yearId: 1,
      date: '2026-07-03',
      description: 'Updated sale',
      sourceType: 'test-update',
      sourceKey: 'sale-1',
      lines: [
        { accountId: cash.id, debitMinor: 700, creditMinor: 0 },
        { accountId: revenue.id, debitMinor: 0, creditMinor: 700 }
      ]
    });

    const reversed = await dbGet('SELECT reversed_by_entry_id FROM JournalEntries WHERE id = ?', [original.id]);
    expect(reversed.reversed_by_entry_id).toBeTruthy();
    await expect(
      dbRun("UPDATE JournalEntries SET description = 'Tampered' WHERE id = ?", [original.id])
    ).rejects.toThrow('FIN_POSTED_ENTRY_IMMUTABLE');

    const trialBalance = await accounting.getTrialBalance({ yearId: 1 });
    expect(trialBalance.debitMinor).toBe(trialBalance.creditMinor);
  });

  it('forbids direct deletion of financial movements at the database layer', async () => {
    const expense = await dbRun(`
      INSERT INTO expenses
        (report_date, name, amount, category, year_id)
      VALUES ('2026-07-04', 'Protected expense', 10, 'other', 1)
    `);

    await expect(
      dbRun('DELETE FROM expenses WHERE id = ?', [expense.lastID])
    ).rejects.toThrow('FIN_DIRECT_DELETE_FORBIDDEN');

    const preserved = await dbGet('SELECT id FROM expenses WHERE id = ?', [expense.lastID]);
    expect(preserved.id).toBe(expense.lastID);
  });
});
