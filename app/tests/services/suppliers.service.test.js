const {
  saveSupplier,
  getSuppliers,
  saveSupplierTransaction,
  getSupplierTransactions,
  getSupplierTransactionByVoucher
} = require('../../main/services/suppliers.service');
const { dbRun, dbGet, closeDatabase, waitForDatabaseReady } = require('../../main/services/database');
const { getBankAccountsWithBalance } = require('../../main/services/banks.service');

describe('Suppliers Service', () => {
  beforeAll(async () => {
    await waitForDatabaseReady();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('should save a new supplier', async () => {
    const supplierId = await saveSupplier({
      name: 'Test Supplier',
      phone: '123456789',
      address: 'Test Address',
      year_id: 1
    });
    expect(supplierId).toBeDefined();

    const suppliers = await getSuppliers(1);
    const found = suppliers.find(s => s.id === supplierId);
    expect(found).toBeDefined();
    expect(found.name).toBe('Test Supplier');
  });

  it('should add a transaction and sync to BankTransactions', async () => {
    const accounts = await getBankAccountsWithBalance(1);
    const vault = accounts.find(account => account.is_cash_vault === 1);
    const supplierId = await saveSupplier({
      name: 'Another Supplier',
      phone: '987654321',
      address: 'Test 2',
      year_id: 1
    });

    const txId = await saveSupplierTransaction({
      supplier_id: supplierId,
      tx_date: '2023-10-01',
      amount: 500,
      tx_type: 'عليه', // 'عليه' triggers a withdrawal from bank/cash vault
      notes: 'Payment test',
      year_id: 1,
      account_id: vault.id
    });

    expect(txId).toBeDefined();

    const transactions = await getSupplierTransactions(supplierId, 1);
    expect(transactions.length).toBe(1);
    expect(transactions[0].amount).toBe(500);
    expect(transactions[0].voucher_no).toBeGreaterThan(0);

    const foundByVoucher = await getSupplierTransactionByVoucher(transactions[0].voucher_no, 1);
    expect(foundByVoucher.id).toBe(txId);

    await expect(dbRun(`
      INSERT INTO supplier_transactions
        (supplier_id, tx_date, amount, tx_type, voucher_no, year_id)
      VALUES (?, '2023-10-02', 25, 'له', ?, 1)
    `, [supplierId, transactions[0].voucher_no])).rejects.toThrow('duplicate supplier voucher number');

    // Verify BankTransactions was synchronized
    const bankTx = await dbGet('SELECT * FROM BankTransactions WHERE reference_type = ? AND reference_id = ?', ['supplier', txId]);
    expect(bankTx).toBeDefined();
    expect(bankTx.amount).toBe(500);
    expect(bankTx.tx_type).toBe('Withdrawal');
  });
});
