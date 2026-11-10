const { saveReportState, getReportState, deleteDailyReport } = require('../../main/services/reports.service');
const {
  saveExpensesReport,
  getExpensesByDate,
  deleteDailyExpenses
} = require('../../main/services/expenses.service');
const { getTrashItems, restoreTrashItem } = require('../../main/services/trash.service');
const { waitForDatabaseReady, closeDatabase } = require('../../main/services/database');
const { saveSupplier } = require('../../main/services/suppliers.service');
const { saveEmployee } = require('../../main/services/employees.service');

describe('Financial voucher trash', () => {
  beforeAll(async () => {
    await waitForDatabaseReady();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  test('moves a sales voucher to trash and restores it with its journal', async () => {
    await saveReportState({
      reportDate: '2026-04-10',
      cashierName: 'Trash Cashier',
      cashierUser: 'Manager',
      year_id: 1,
      sales: { cash: 100, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      cashierActual: 100
    });
    const deletionResults = await Promise.all([
      deleteDailyReport('2026-04-10', 'Trash Cashier', 1),
      deleteDailyReport('2026-04-10', 'Trash Cashier', 1)
    ]);
    expect(deletionResults.every(result => result.success)).toBe(true);

    await expect(Promise.all([
      saveSupplier({ name: 'Supplier after delete', phone: '', address: '', year_id: 1 }),
      saveEmployee({
        name: 'Employee after delete',
        phone: '',
        salary: 1000,
        monthly_accrual_start_date: '2026-04-01',
        photo: '',
        year_id: 1
      }),
      saveExpensesReport({
        reportDate: '2026-04-12',
        year_id: 1,
        purchases: [{ name: 'Purchase after delete', qty: '1', amount: 10, category: 'other' }]
      })
    ])).resolves.toHaveLength(3);
    const trash = await getTrashItems(1);
    const item = trash.find(row => row.entity_type === 'daily_reports');
    expect(item).toBeDefined();
    expect(item.display_name).toContain('2026-04-10');

    await expect(restoreTrashItem(item.id)).resolves.toEqual({ success: true });
    const restored = await getReportState('2026-04-10', 'Trash Cashier', 1);
    expect(restored.sales.cash).toBe(100);
  });

  test('moves every purchase line together and restores the original voucher number', async () => {
    const saved = await saveExpensesReport({
      reportDate: '2026-04-11',
      year_id: 1,
      purchases: [
        { name: 'Purchase A', qty: '1', amount: 40, category: 'food' },
        { name: 'Purchase B', qty: '2', amount: 60, category: 'supplies' }
      ]
    });
    await deleteDailyExpenses('2026-04-11', 1);
    const trash = await getTrashItems(1);
    const item = trash.find(row => row.entity_type === 'expenses');
    expect(item).toBeDefined();

    await expect(restoreTrashItem(item.id)).resolves.toEqual({ success: true });
    const restored = await getExpensesByDate('2026-04-11', 1);
    expect(restored.expenseVoucherNumber).toBe(saved.expenseVoucherNumber);
    expect(restored.purchases).toHaveLength(2);
    expect(restored.purchases.reduce((sum, row) => sum + row.amount, 0)).toBe(100);
  });
});
