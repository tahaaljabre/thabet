const {
  saveBankAccount,
  getBankAccountsWithBalance,
  saveBankTransaction,
  getBankTransactions,
  deleteBankTransaction,
  saveBankSalesMappings,
  getBankSalesMappings
} = require('../../main/services/banks.service');
const { closeDatabase, dbRun, waitForDatabaseReady } = require('../../main/services/database');

describe('Banks / Vault Service', () => {
  beforeAll(async () => {
    await waitForDatabaseReady();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('should auto-create cash vault and return it', async () => {
    const accounts = await getBankAccountsWithBalance(1);
    const vault = accounts.find(a => a.is_cash_vault === 1);
    expect(vault).toBeDefined();
    expect(vault.bank_name).toContain('صندوق الكاش');
  });

  it('should save a new bank account', async () => {
    const res = await saveBankAccount({
      bank_name: 'Test Bank',
      account_number: '12345',
      opening_balance: 1000,
      start_date: '2023-01-01',
      year_id: 1
    });
    
    expect(res.success).toBe(true);
    expect(res.id).toBeDefined();

    const accounts = await getBankAccountsWithBalance(1);
    const bank = accounts.find(a => a.id === res.id);
    expect(bank).toBeDefined();
    expect(bank.bank_name).toBe('Test Bank');
    expect(bank.current_balance).toBe(1000); // 1000 opening + 0 transactions
  });

  it('should add a transaction and update balance', async () => {
    const accounts = await getBankAccountsWithBalance(1);
    const bank = accounts.find(a => a.bank_name === 'Test Bank');
    
    // Deposit 500
    const txRes = await saveBankTransaction({
      tx_date: '2023-10-02',
      tx_type: 'Deposit',
      to_account_id: bank.id,
      amount: 500,
      description: 'Test Deposit',
      created_by: 'Admin',
      year_id: 1
    });

    expect(txRes.success).toBe(true);

    const updatedAccounts = await getBankAccountsWithBalance(1);
    const updatedBank = updatedAccounts.find(a => a.id === bank.id);
    
    // 1000 opening + 500 deposit
    expect(updatedBank.current_balance).toBe(1500);

    // Verify transaction exists
    const txs = await getBankTransactions(1);
    const myTx = txs.find(t => t.id === txRes.id);
    expect(myTx).toBeDefined();
    expect(myTx.amount).toBe(500);

    const firstPage = await getBankTransactions(1, { limit: 1, offset: 0 });
    const secondPage = await getBankTransactions(1, { limit: 1, offset: 1 });
    expect(firstPage).toHaveLength(1);
    expect(secondPage).toHaveLength(0);
  });

  it('should keep the same sales channel mapped independently in each financial year', async () => {
    const yearTwo = await dbRun(
      "INSERT INTO FinancialYears (YearName, IsClosed) VALUES ('Bank Mapping Year 2', 0)"
    );
    const yearOneAccounts = await getBankAccountsWithBalance(1);
    const yearOneAccount = yearOneAccounts.find(account => account.bank_name === 'Test Bank');
    const yearTwoAccountResult = await saveBankAccount({
      bank_name: 'Year Two Bank',
      account_number: 'YEAR-2',
      opening_balance: 0,
      start_date: '2024-01-01',
      year_id: yearTwo.lastID
    });

    await saveBankSalesMappings([
      { channel_name: 'kbank', bank_account_id: yearOneAccount.id }
    ], 1);
    await saveBankSalesMappings([
      { channel_name: 'kbank', bank_account_id: yearTwoAccountResult.id }
    ], yearTwo.lastID);

    const yearOneMappings = await getBankSalesMappings(1);
    const yearTwoMappings = await getBankSalesMappings(yearTwo.lastID);
    expect(yearOneMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel_name: 'kbank', bank_account_id: yearOneAccount.id, year_id: 1 })
    ]));
    expect(yearTwoMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel_name: 'kbank',
        bank_account_id: yearTwoAccountResult.id,
        year_id: yearTwo.lastID
      })
    ]));

    await expect(saveBankSalesMappings([
      { channel_name: 'grab', bank_account_id: yearOneAccount.id }
    ], yearTwo.lastID)).rejects.toThrow('سنة مالية مختلفة');
  });

  it('should mark historical transfers and reject transfers to the same account', async () => {
    const accounts = await getBankAccountsWithBalance(1);
    const bank = accounts.find(a => a.bank_name === 'Test Bank');
    const vault = accounts.find(a => a.is_cash_vault === 1);

    const historicalTransfer = await saveBankTransaction({
      tx_date: '2022-12-31',
      tx_type: 'Transfer',
      from_account_id: vault.id,
      to_account_id: bank.id,
      amount: 100,
      created_by: 'Admin',
      year_id: 1
    });
    expect(historicalTransfer.success).toBe(true);
    expect(historicalTransfer.warning).toContain('ضمن الرصيد الافتتاحي');

    await expect(saveBankTransaction({
      tx_date: '2023-10-02',
      tx_type: 'Transfer',
      from_account_id: bank.id,
      to_account_id: bank.id,
      amount: 100,
      year_id: 1
    })).rejects.toThrow('الحساب نفسه');
  });
});
