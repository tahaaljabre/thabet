const {
  saveReportState,
  getReportState,
  getReportByVoucherNumber,
  deleteDailyReport
} = require('../../main/services/reports.service');
const { getFinancialSummary } = require('../../main/services/finance.service');
const { calculateClosingFigures } = require('../../main/services/system/closing');
const { saveExpensesReport, getExpensesByDate } = require('../../main/services/expenses.service');
const { closeDatabase, dbRun, dbGet, waitForDatabaseReady } = require('../../main/services/database');

describe('Reports (Sales) Service', () => {
  beforeAll(async () => {
    await waitForDatabaseReady();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('should save a new daily sales report', async () => {
    const reportData = {
      reportDate: '2023-11-01',
      cashierName: 'Test Cashier',
      cashierUser: 'Admin',
      year_id: 1,
      sales: {
        cash: 1500,
        kbank: 200,
        grab: 0,
        lineman: 100,
        krungsri: 0
      },
      cashierActual: 1500, // Drawer actual cash matches cash sales
      purchases: [],
      newExpenses: []
    };

    const res = await saveReportState(reportData);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.voucherNumber).toBeGreaterThan(0);

    const savedState = await getReportState('2023-11-01', 'Test Cashier', 1);
    expect(savedState).toBeDefined();
    expect(savedState.sales.cash).toBe(1500);
    expect(savedState.sales.kbank).toBe(200);
    expect(savedState.cashierName).toBe('Test Cashier');
  });

  it('should update an existing daily report', async () => {
    const purchaseResult = await saveExpensesReport({
      reportDate: '2023-11-01',
      year_id: 1,
      purchases: [{
        name: 'Test purchase',
        qty: '1',
        amount: 125,
        category: 'food',
        account_id: null
      }]
    });
    expect(purchaseResult.savedPurchasesCount).toBe(1);
    expect(purchaseResult.expenseVoucherNumber).toBeGreaterThan(0);

    const reportData = {
      reportDate: '2023-11-01',
      cashierName: 'Test Cashier',
      cashierUser: 'Admin',
      year_id: 1,
      sales: {
        cash: 2000,
        kbank: 300,
        grab: 0,
        lineman: 100,
        krungsri: 0
      },
      cashierActual: 2000,
      purchases: [],
      newExpenses: []
    };

    const updateResult = await saveReportState(reportData);
    expect(updateResult.voucherNumber).toBeGreaterThan(0);

    const savedState = await getReportState('2023-11-01', 'Test Cashier', 1);
    expect(savedState.sales.cash).toBe(2000);
    expect(savedState.sales.kbank).toBe(300);
    expect(savedState).not.toHaveProperty('purchases');

    const savedExpenses = await getExpensesByDate('2023-11-01', 1);
    expect(savedExpenses.purchases).toHaveLength(1);
    expect(savedExpenses.purchases[0].name).toBe('Test purchase');
    expect(savedExpenses.purchases[0].cashier_name).toBeNull();

    const cashierSummary = await getFinancialSummary(null, null, 1, 'Test Cashier');
    expect(cashierSummary.totalCashExpenses).toBeCloseTo(0, 2);
  });

  it('should snapshot configurable VAT and split the sales journal entry', async () => {
    await dbRun(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)",
      [JSON.stringify({ vatEnabled: true, vatRate: 15 })]
    );
    try {
      await saveReportState({
        reportDate: '2023-11-02',
        cashierName: 'VAT Cashier',
        cashierUser: 'Admin',
        year_id: 1,
        sales: { cash: 115, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
        cashierActual: 115
      });

      const report = await dbGet(
        `SELECT vat_rate_basis_points, vat_minor, net_sales_minor
         FROM daily_reports
         WHERE report_date = ? AND cashier_name = ? AND year_id = ?`,
        ['2023-11-02', 'VAT Cashier', 1]
      );
      expect(report).toMatchObject({
        vat_rate_basis_points: 1500,
        vat_minor: 1500,
        net_sales_minor: 10000
      });

      const vatLine = await dbGet(
        `SELECT jl.credit_minor
         FROM JournalLines jl
         JOIN JournalEntries je ON je.id = jl.entry_id
         JOIN LedgerAccounts la ON la.id = jl.account_id
         WHERE je.source_type = 'sales' AND je.source_key = ?
           AND je.status = 'posted' AND la.account_code = '2030'`,
        ['2023-11-02|VAT Cashier']
      );
      expect(vatLine.credit_minor).toBe(1500);
    } finally {
      await deleteDailyReport('2023-11-02', 'VAT Cashier', 1);
      await dbRun(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)",
        [JSON.stringify({ vatEnabled: false, vatRate: 15 })]
      );
    }
  });

  it('should search for a sales voucher only inside the selected financial year', async () => {
    const yearOneReport = await getReportState('2023-11-01', 'Test Cashier', 1);
    const duplicateVoucherNumber = yearOneReport.voucherNumber;
    const yearTwo = await dbRun(
      "INSERT INTO FinancialYears (YearName, IsClosed) VALUES ('Voucher Search Year 2', 0)"
    );
    await dbRun(`
      INSERT INTO daily_reports
        (report_date, cashier_name, cashier_user, cash_sales, kbank, grab, lineman, krungsri,
         cashier_actual, year_id, voucher_number)
      VALUES ('2024-02-01', 'Year Two Cashier', 'Admin', 900, 0, 0, 0, 0, 900, ?, ?)
    `, [yearTwo.lastID, duplicateVoucherNumber]);

    const resultForYearOne = await getReportByVoucherNumber(duplicateVoucherNumber, 1);
    const resultForYearTwo = await getReportByVoucherNumber(duplicateVoucherNumber, yearTwo.lastID);

    expect(resultForYearOne.reportDate).toBe('2023-11-01');
    expect(resultForYearOne.cashierName).toBe('Test Cashier');
    expect(resultForYearTwo.reportDate).toBe('2024-02-01');
    expect(resultForYearTwo.cashierName).toBe('Year Two Cashier');
    await expect(getReportByVoucherNumber(duplicateVoucherNumber)).rejects.toThrow('السنة المالية مطلوبة');
  });

  it('should allocate unique sales and expense voucher numbers per financial year', async () => {
    const sequenceYear = await dbRun(
      "INSERT INTO FinancialYears (YearName, IsClosed) VALUES ('Voucher Sequence Test Year', 0)"
    );
    const sequenceYearId = sequenceYear.lastID;
    const firstSales = await saveReportState({
      reportDate: '2023-11-10',
      cashierName: 'Sequence Cashier',
      cashierUser: 'Admin',
      year_id: sequenceYearId,
      sales: { cash: 100, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      cashierActual: 100
    });
    const secondSales = await saveReportState({
      reportDate: '2023-11-11',
      cashierName: 'Sequence Cashier',
      cashierUser: 'Admin',
      year_id: sequenceYearId,
      sales: { cash: 200, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      cashierActual: 200
    });
    expect(secondSales.voucherNumber).toBe(firstSales.voucherNumber + 1);

    await expect(dbRun(`
      INSERT INTO daily_reports
        (report_date, cashier_name, cashier_user, year_id, voucher_number)
      VALUES ('2023-11-12', 'Duplicate Voucher Cashier', 'Admin', ?, ?)
    `, [sequenceYearId, firstSales.voucherNumber])).rejects.toThrow('duplicate sales voucher number');

    const firstExpenses = await saveExpensesReport({
      reportDate: '2023-11-10',
      year_id: sequenceYearId,
      purchases: [{ name: 'Expense A', qty: 1, amount: 10, category: 'other' }]
    });
    const secondExpenses = await saveExpensesReport({
      reportDate: '2023-11-11',
      year_id: sequenceYearId,
      purchases: [{ name: 'Expense B', qty: 1, amount: 20, category: 'other' }]
    });
    expect(secondExpenses.expenseVoucherNumber).toBe(firstExpenses.expenseVoucherNumber + 1);
    await expect(dbRun(`
      INSERT INTO expenses
        (report_date, name, qty, amount, category, year_id, voucher_number)
      VALUES ('2023-11-12', 'Duplicate expense voucher', 1, 5, 'other', ?, ?)
    `, [sequenceYearId, firstExpenses.expenseVoucherNumber])).rejects.toThrow('duplicate expense voucher number');
  });

  it('should store and aggregate money using exact integer minor units', async () => {
    const moneyYear = await dbRun(
      "INSERT INTO FinancialYears (YearName, IsClosed) VALUES ('Minor Unit Test Year', 0)"
    );
    const moneyYearId = moneyYear.lastID;
    await saveReportState({
      reportDate: '2025-01-01',
      cashierName: 'Precision Cashier',
      cashierUser: 'Admin',
      year_id: moneyYearId,
      sales: { cash: 0.1, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      cashierActual: 0.1
    });
    await saveReportState({
      reportDate: '2025-01-02',
      cashierName: 'Precision Cashier',
      cashierUser: 'Admin',
      year_id: moneyYearId,
      sales: { cash: 0.2, kbank: 0, grab: 0, lineman: 0, krungsri: 0 },
      cashierActual: 0.2
    });
    await saveExpensesReport({
      reportDate: '2025-01-01',
      year_id: moneyYearId,
      purchases: [
        { name: 'Exact 0.1', qty: 1, amount: 0.1, category: 'other' },
        { name: 'Exact 0.2', qty: 1, amount: 0.2, category: 'other' }
      ]
    });

    const storedSales = await dbRun('UPDATE daily_reports SET cash_sales = cash_sales WHERE year_id = ?', [moneyYearId]);
    expect(storedSales.changes).toBe(2);
    const salesMinor = await dbGet(
      'SELECT SUM(cash_sales_minor) AS total_minor FROM daily_reports WHERE year_id = ?',
      [moneyYearId]
    );
    const expenseMinor = await dbGet(
      'SELECT SUM(amount_minor) AS total_minor FROM expenses WHERE year_id = ?',
      [moneyYearId]
    );
    expect(salesMinor.total_minor).toBe(30);
    expect(expenseMinor.total_minor).toBe(30);
    expect(Number.isInteger(salesMinor.total_minor)).toBe(true);
    expect(Number.isInteger(expenseMinor.total_minor)).toBe(true);

    const summary = await getFinancialSummary(null, null, moneyYearId);
    expect(summary.totalSales).toBeCloseTo(0.3, 10);
    expect(summary.totalExpenses).toBeCloseTo(0.3, 10);
    expect(summary.netProfit).toBeCloseTo(0, 10);
  });

  it('should deduct delivery application commissions from dashboard and closing profit', async () => {
    await dbRun(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)",
      [JSON.stringify({ grabCommission: 20, linemanCommission: 10 })]
    );
    const account = await dbRun(`
      INSERT INTO BankAccounts
        (bank_name, account_number, opening_balance, current_balance, start_date, year_id, is_cash_vault)
      VALUES ('Commission Bank', '', 0, 0, '2023-01-01', 1, 0)
    `);
    await dbRun(
      "INSERT OR REPLACE INTO BankSalesMapping (channel_name, bank_account_id, year_id) VALUES ('lineman', ?, 1)",
      [account.lastID]
    );

    await saveReportState({
      reportDate: '2023-11-01',
      cashierName: 'Test Cashier',
      cashierUser: 'Admin',
      year_id: 1,
      sales: { cash: 2000, kbank: 300, grab: 0, lineman: 100, krungsri: 0 },
      cashierActual: 2000
    });

    const summary = await getFinancialSummary(null, null, 1);
    expect(summary.totalAppCommissions).toBeCloseTo(10, 2);
    expect(summary.appCommissions.lineman.amount).toBeCloseTo(10, 2);
    expect(summary.appCommissions.lineman.rate).toBeCloseTo(10, 2);
    expect(summary.netProfit).toBeCloseTo(2265, 2);

    const closing = await calculateClosingFigures(1);
    expect(closing.appCommissions).toBeCloseTo(10, 2);
    expect(closing.netProfit).toBeCloseTo(2265, 2);
    expect(closing.distributable).toBeCloseTo(2208.37, 2);
  });

  it('should recognize a supplier invoice on accrual and treat payment only as liability settlement', async () => {
    const beforeInvoice = await getFinancialSummary(null, null, 1);
    const supplier = await dbRun(
      "INSERT INTO suppliers (name, year_id) VALUES ('Cash Basis Supplier', 1)"
    );
    await dbRun(`
      INSERT INTO supplier_transactions
        (supplier_id, tx_date, amount, tx_type, notes, year_id)
      VALUES (?, '2023-11-02', 1000, 'له', 'Unpaid invoice', 1)
    `, [supplier.lastID]);

    const afterInvoice = await getFinancialSummary(null, null, 1);
    expect(afterInvoice.totalSupplierInvoices - beforeInvoice.totalSupplierInvoices).toBeCloseTo(1000, 2);
    expect(afterInvoice.totalSupplierDebts - beforeInvoice.totalSupplierDebts).toBeCloseTo(1000, 2);
    expect(afterInvoice.totalPurchases - beforeInvoice.totalPurchases).toBeCloseTo(1000, 2);
    expect(afterInvoice.netProfit).toBeCloseTo(beforeInvoice.netProfit - 1000, 2);

    await dbRun(`
      INSERT INTO supplier_transactions
        (supplier_id, tx_date, amount, tx_type, notes, year_id)
      VALUES (?, '2023-11-03', 400, 'عليه', 'Supplier payment', 1)
    `, [supplier.lastID]);

    const afterPayment = await getFinancialSummary(null, null, 1);
    expect(afterPayment.totalPurchases - beforeInvoice.totalPurchases).toBeCloseTo(1000, 2);
    expect(afterPayment.totalSupplierPayments - beforeInvoice.totalSupplierPayments).toBeCloseTo(400, 2);
    expect(afterPayment.totalSupplierDebts - beforeInvoice.totalSupplierDebts).toBeCloseTo(600, 2);
    expect(afterPayment.netProfit).toBeCloseTo(afterInvoice.netProfit, 2);
    expect(afterPayment.cashNetFlow).toBeCloseTo(afterInvoice.cashNetFlow - 400, 2);

    const closing = await calculateClosingFigures(1);
    expect(closing.supplierDebts).toBeCloseTo(afterPayment.totalSupplierDebts, 2);

    const supplierWithCredit = await dbRun(
      "INSERT INTO suppliers (name, year_id) VALUES ('Supplier With Credit', 1)"
    );
    await dbRun(`
      INSERT INTO supplier_transactions
        (supplier_id, tx_date, amount, tx_type, notes, year_id)
      VALUES (?, '2023-11-03', 500, 'عليه', 'Supplier credit', 1)
    `, [supplierWithCredit.lastID]);

    const afterSupplierCredit = await getFinancialSummary(null, null, 1);
    expect(afterSupplierCredit.totalSupplierDebts).toBeCloseTo(afterPayment.totalSupplierDebts, 2);
  });

  it('should keep supplier debt cumulative when the report has a start date', async () => {
    const yearId = 987;
    await dbRun(
      "INSERT INTO FinancialYears (YearID, YearName, IsClosed) VALUES (?, 'Cumulative Debt Test Year', 0)",
      [yearId]
    );
    const supplier = await dbRun(
      "INSERT INTO suppliers (name, year_id) VALUES ('Cumulative Debt Supplier', ?)",
      [yearId]
    );
    await dbRun(`
      INSERT INTO supplier_transactions
        (supplier_id, tx_date, amount, tx_type, notes, year_id)
      VALUES (?, '2023-01-10', 1000, 'له', 'Invoice before report period', ?)
    `, [supplier.lastID, yearId]);
    await dbRun(`
      INSERT INTO supplier_transactions
        (supplier_id, tx_date, amount, tx_type, notes, year_id)
      VALUES (?, '2023-06-10', 300, 'عليه', 'Payment inside report period', ?)
    `, [supplier.lastID, yearId]);

    const summary = await getFinancialSummary('2023-06-01', '2023-06-30', yearId);

    expect(summary.totalSupplierInvoices).toBeCloseTo(0, 2);
    expect(summary.totalSupplierPayments).toBeCloseTo(300, 2);
    expect(summary.totalSupplierDebts).toBeCloseTo(700, 2);
  });

  it('should reduce employee dues without increasing profit when a deduction is recorded', async () => {
    const employee = await dbRun(`
      INSERT INTO employees
        (name, salary, monthly_accrual_start_date, year_id)
      VALUES ('Deduction Test Employee', 0, '2023-11-01', 1)
    `);
    const beforeDeduction = await getFinancialSummary(null, null, 1);
    const closingBeforeDeduction = await calculateClosingFigures(1);

    await dbRun(`
      INSERT INTO employee_transactions
        (employee_id, tx_date, amount, deductions, allowances, notes, year_id)
      VALUES (?, '2023-11-04', 0, 1000, 0, 'Manual deduction', 1)
    `, [employee.lastID]);

    const afterDeduction = await getFinancialSummary(null, null, 1);
    expect(afterDeduction.totalSalaryExpense).toBeCloseTo(beforeDeduction.totalSalaryExpense, 2);
    expect(afterDeduction.netProfit).toBeCloseTo(beforeDeduction.netProfit, 2);
    expect(afterDeduction.totalEmployeeReceivables).toBeCloseTo(beforeDeduction.totalEmployeeReceivables, 2);
    const closingAfterDeduction = await calculateClosingFigures(1);
    expect(closingAfterDeduction.netProfit).toBeCloseTo(closingBeforeDeduction.netProfit, 2);
  });

  it('should treat an employee payment as cash settlement without repeating salary expense', async () => {
    const employee = await dbRun(`
      INSERT INTO employees
        (name, salary, monthly_accrual_start_date, year_id)
      VALUES ('Payment Test Employee', 0, '2023-11-01', 1)
    `);
    const beforePayment = await getFinancialSummary(null, null, 1);
    const closingBeforePayment = await calculateClosingFigures(1);

    await dbRun(`
      INSERT INTO employee_transactions
        (employee_id, tx_date, amount, deductions, allowances, notes, year_id)
      VALUES (?, '2023-11-05', 1000, 0, 0, 'Actual employee payment', 1)
    `, [employee.lastID]);

    const afterPayment = await getFinancialSummary(null, null, 1);
    expect(afterPayment.totalSalaries - beforePayment.totalSalaries).toBeCloseTo(1000, 2);
    expect(afterPayment.totalSalaryExpense).toBeCloseTo(beforePayment.totalSalaryExpense, 2);
    expect(afterPayment.netProfit).toBeCloseTo(beforePayment.netProfit, 2);
    expect(afterPayment.cashNetFlow).toBeCloseTo(beforePayment.cashNetFlow - 1000, 2);
    expect(afterPayment.totalEmployeeReceivables - beforePayment.totalEmployeeReceivables).toBeCloseTo(1000, 2);
    expect(afterPayment.distributionNetProfit).toBeCloseTo(
      afterPayment.netProfit - afterPayment.totalEmployeeReceivables,
      2
    );
    const closingAfterPayment = await calculateClosingFigures(1);
    expect(closingAfterPayment.accountingNetProfit).toBeCloseTo(closingBeforePayment.accountingNetProfit, 2);
    expect(closingAfterPayment.netProfit).toBeCloseTo(closingBeforePayment.netProfit - 1000, 2);
  });

  it('should recognize an accrued salary before it is paid', async () => {
    const beforeAccrual = await getFinancialSummary('2023-12-01', '2023-12-31', 1);
    const employee = await dbRun(`
      INSERT INTO employees
        (name, salary, monthly_accrual_start_date, year_id)
      VALUES ('Accrual Basis Employee', 1000, '2023-12-01', 1)
    `);
    await dbRun(`
      INSERT INTO employee_salary_history
        (employee_id, salary, effective_date)
      VALUES (?, 1000, '2023-12-01')
    `, [employee.lastID]);

    const afterAccrual = await getFinancialSummary('2023-12-01', '2023-12-31', 1);
    expect(afterAccrual.totalSalaryExpense - beforeAccrual.totalSalaryExpense).toBeCloseTo(1000, 2);
    expect(afterAccrual.totalEmployeeDues - beforeAccrual.totalEmployeeDues).toBeCloseTo(1000, 2);
    expect(afterAccrual.netProfit).toBeCloseTo(beforeAccrual.netProfit - 1000, 2);
    expect(afterAccrual.cashNetFlow).toBeCloseTo(beforeAccrual.cashNetFlow, 2);
  });

  it('should calculate the dashboard financial deficit from expected versus actual cashier cash', async () => {
    const yearId = 988;
    await dbRun(
      "INSERT INTO FinancialYears (YearID, YearName, IsClosed) VALUES (?, 'Dashboard Deficit Test Year', 0)",
      [yearId]
    );
    await saveReportState({
      reportDate: '2024-01-10',
      cashierName: 'Deficit Cashier',
      cashierUser: 'Admin',
      year_id: yearId,
      sales: { cash: 1000, kbank: 500, grab: 0, lineman: 0, krungsri: 0 },
      cashierActual: 925
    });

    const summary = await getFinancialSummary('2024-01-01', '2024-01-31', yearId);

    expect(summary.totalSales).toBeCloseTo(1500, 2);
    expect(summary.totalFinancialDeficit).toBeCloseTo(75, 2);
  });

  it('should delete a daily report and return a valid success result', async () => {
    const result = await deleteDailyReport('2023-11-01', 'Test Cashier', 1);
    expect(result).toEqual({ success: true });

    const deletedState = await getReportState('2023-11-01', 'Test Cashier', 1);
    expect(deletedState.voucherNumber).toBe('');
    expect(deletedState.sales.cash).toBe(0);
    expect(deletedState).not.toHaveProperty('purchases');
    const retainedCancelledReport = await dbGet(
      `SELECT is_voided, voided_at, voided_by
       FROM daily_reports
       WHERE report_date = '2023-11-01' AND cashier_name = 'Test Cashier' AND year_id = 1`
    );
    expect(retainedCancelledReport.is_voided).toBe(1);
    expect(retainedCancelledReport.voided_at).toBeTruthy();
    expect(retainedCancelledReport.voided_by).toBeTruthy();

    const preservedExpenses = await getExpensesByDate('2023-11-01', 1);
    expect(preservedExpenses.purchases).toHaveLength(1);
    expect(preservedExpenses.purchases[0].name).toBe('Test purchase');
  });
});
