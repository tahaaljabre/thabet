const path = require('path');
const { closeDatabase, dbRun, waitForDatabaseReady } = require('../../main/services/database');
const { saveBankAccount, saveBankTransaction } = require('../../main/services/banks.service');
const reconciliation = require('../../main/services/bank-reconciliation.service');
const { closeAccountingPeriod } = require('../../main/services/accounting-periods.service');

describe('Bank reconciliation', () => {
  const yearId = 1301;
  let bankId;

  beforeAll(async () => {
    await waitForDatabaseReady();
    await dbRun("INSERT INTO FinancialYears (YearID, YearName, IsClosed) VALUES (?, '2031', 0)", [yearId]);
    const bank = await saveBankAccount({
      bank_name: 'Reconciliation Bank',
      account_number: '100',
      opening_balance: 0,
      start_date: '2031-01-01',
      year_id: yearId
    });
    bankId = bank.id;
    await saveBankTransaction({
      tx_date: '2031-01-15',
      tx_type: 'Deposit',
      to_account_id: bankId,
      amount: 100,
      description: 'Customer deposit',
      created_by: 'Manager',
      year_id: yearId
    });
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('imports, deduplicates, matches, and approves a statement', async () => {
    const file = path.join(__dirname, '..', 'fixtures', 'bank-statement.csv');
    const preview = await reconciliation.previewStatement(file);
    expect(preview.suggestedMapping.date).toBe(0);
    expect(preview.suggestedMapping.credit).toBe(4);

    const imported = await reconciliation.importStatement({
      token: preview.token,
      mapping: preview.suggestedMapping,
      bankAccountId: bankId,
      yearId,
      month: 1,
      startDate: '2031-01-01',
      endDate: '2031-01-31',
      statementClosing: 100
    });
    expect(imported.imported).toBe(1);

    const data = await reconciliation.getReconciliation(imported.sessionId);
    const candidates = await reconciliation.getLineCandidates(data.lines[0].id);
    expect(candidates.length).toBeGreaterThan(0);
    const bankCandidate = candidates.find(candidate => candidate.source_type === 'bank');
    await reconciliation.matchLine(data.lines[0].id, bankCandidate.source_type, bankCandidate.source_id);
    await expect(reconciliation.approveReconciliation(imported.sessionId))
      .resolves.toMatchObject({ success: true, differenceMinor: 0 });
  });

  it('requires approved bank reconciliation before monthly closing', async () => {
    await expect(closeAccountingPeriod(yearId, 1)).resolves.toMatchObject({ status: 'closed' });
  });
});
