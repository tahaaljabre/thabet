const { dbAll } = require('./database');
const { getAllEmployeesStatement } = require('./employees/statements');

/**
 * خدمة الحسابات المالية الموحدة
 * الهدف: حساب الأرقام المالية بشكل دقيق وموحد لتُستخدم في لوحة التحكم والإقفال السنوي
 */

async function getFinancialSummary(startDate, endDate, yearId, cashierName) {
  const activeYearId = yearId || 1;
  
  let summary = {
    totalSales: 0,
    totalExpenses: 0,
    totalPurchases: 0,
    totalSupplierInvoices: 0,
    totalPaidSupplierPurchases: 0,
    totalSupplierDiscounts: 0,
    totalSalaries: 0,
    totalSalaryExpense: 0,
    totalAccruedBaseSalary: 0,
    totalAccruedAllowances: 0,
    totalEmployeeDues: 0,
    totalEmployeeReceivables: 0,
    totalSupplierPayments: 0,
    totalCashExpenses: 0,
    totalCashInflows: 0,
    totalCashOutflows: 0,
    totalNonOperatingCashOutflows: 0,
    totalCashOperatingExpenses: 0,
    totalCashPurchases: 0,
    totalAppCommissions: 0,
    totalFinancialDeficit: 0,
    appCommissions: {
      grab: { sales: 0, amount: 0, rate: 0 },
      lineman: { sales: 0, amount: 0, rate: 0 }
    },
    totalSupplierDebts: 0,
    netProfit: 0,
    distributionNetProfit: 0,
    cashNetFlow: 0,
    accountingBasis: 'accrual',
    dailySales: [],
    dailyExpenses: [],
    dailyCashOutflows: [],
    expensesCategories: {}
  };

  let dailyMap = {};
  const addDaily = (d, s, accrualExpense, cashOutflow = accrualExpense) => {
    if (!d) return;
    if (!dailyMap[d]) dailyMap[d] = { sales: 0, accrualExpenses: 0, cashOutflows: 0 };
    dailyMap[d].sales += s;
    dailyMap[d].accrualExpenses += accrualExpense;
    dailyMap[d].cashOutflows += cashOutflow;
  };

  // 1. المبيعات (Sales)
  let qSales = `SELECT report_date,
    COALESCE(cash_sales_minor, CAST(ROUND(cash_sales * 100) AS INTEGER)) AS cash_sales_minor,
    COALESCE(kbank_minor, CAST(ROUND(kbank * 100) AS INTEGER)) AS kbank_minor,
    COALESCE(grab_minor, CAST(ROUND(grab * 100) AS INTEGER)) AS grab_minor,
    COALESCE(lineman_minor, CAST(ROUND(lineman * 100) AS INTEGER)) AS lineman_minor,
    COALESCE(krungsri_minor, CAST(ROUND(krungsri * 100) AS INTEGER)) AS krungsri_minor,
    COALESCE(cashier_actual_minor, CAST(ROUND(cashier_actual * 100) AS INTEGER)) AS cashier_actual_minor
    FROM daily_reports WHERE year_id = ? AND COALESCE(is_voided, 0) = 0`;
  let pSales = [activeYearId];
  if (cashierName) { qSales += " AND cashier_name = ?"; pSales.push(cashierName); }
  if (startDate) { qSales += " AND report_date >= ?"; pSales.push(startDate); }
  if (endDate) { qSales += " AND report_date <= ?"; pSales.push(endDate); }
  const salesRows = await dbAll(qSales, pSales);
  salesRows.forEach(r => {
    let d = r.report_date;
    let amt = (r.cash_sales||0) + (r.kbank||0) + (r.grab||0) + (r.lineman||0) + (r.krungsri||0);
    summary.totalSales += amt;
    summary.totalFinancialDeficit += Math.max(
      (Number(r.cash_sales) || 0) - (Number(r.cashier_actual) || 0),
      0
    );
    summary.appCommissions.grab.sales += Number(r.grab) || 0;
    summary.appCommissions.lineman.sales += Number(r.lineman) || 0;
    addDaily(d, amt, 0);
  });
  let qChannelSales = `SELECT report_date,
    COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor
    FROM DailyReportChannelSales WHERE year_id = ?`;
  const pChannelSales = [activeYearId];
  if (cashierName) { qChannelSales += ' AND cashier_name = ?'; pChannelSales.push(cashierName); }
  if (startDate) { qChannelSales += ' AND report_date >= ?'; pChannelSales.push(startDate); }
  if (endDate) { qChannelSales += ' AND report_date <= ?'; pChannelSales.push(endDate); }
  const channelSalesRows = await dbAll(qChannelSales, pChannelSales);
  channelSalesRows.forEach(row => {
    const amount = parseFloat(row.amount) || 0;
    summary.totalSales += amount;
    addDaily(row.report_date, amount, 0);
  });
  summary.totalCashInflows = summary.totalSales;

  // 2. المصروفات القديمة (Legacy Expenses)
  let qExp = `SELECT report_date, category,
    COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor
    FROM expenses WHERE year_id = ? AND COALESCE(is_voided, 0) = 0`;
  let pExp = [activeYearId];
  // المصروفات سجل مستقل للمنشأة ولا تُنسب إلى أي كاشير.
  // عند طلب ملخص كاشير لا نخلط مصروفات المنشأة مع مبيعاته.
  if (cashierName) { qExp += " AND 1 = 0"; }
  if (startDate) { qExp += " AND report_date >= ?"; pExp.push(startDate); }
  if (endDate) { qExp += " AND report_date <= ?"; pExp.push(endDate); }
  const expRows = await dbAll(qExp, pExp);
  expRows.forEach(r => {
    let d = r.report_date;
    let amt = r.amount || 0;
    let cat = r.category || 'أخرى';
    
    // كل سجل في جدول المصروفات يمثل مبلغاً مدفوعاً فعلياً.
    summary.totalCashExpenses += amt;
    summary.totalCashOutflows += amt;
    addDaily(d, 0, amt);
    summary.expensesCategories[cat] = (summary.expensesCategories[cat] || 0) + amt;

    if (cat === 'salaries') {
      summary.totalSalaries += amt;
      summary.totalSalaryExpense += amt;
    } else if (cat !== 'salaries' && cat !== 'maintenance' && cat !== 'other') {
      summary.totalPurchases += amt;
      summary.totalCashPurchases += amt;
    } else {
      summary.totalExpenses += amt;
      summary.totalCashOperatingExpenses += amt;
    }
  });

  // 3. المصروفات الحديثة والسندات العامة (CashGeneralVouchers)
  let qVou = `SELECT voucher_date, category,
    COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor
    FROM CashGeneralVouchers WHERE year_id = ? AND COALESCE(is_voided, 0) = 0`;
  let pVou = [activeYearId];
  if (cashierName) { qVou += " AND created_by = ?"; pVou.push(cashierName); }
  if (startDate) { qVou += " AND voucher_date >= ?"; pVou.push(startDate); }
  if (endDate) { qVou += " AND voucher_date <= ?"; pVou.push(endDate); }
  const vouRows = await dbAll(qVou, pVou);
  vouRows.forEach(r => {
    let d = r.voucher_date;
    let amt = r.amount || 0;
    let cat = r.category || 'أخرى';
    
    // استثناء التوزيعات والزكاة والمسحوبات الشخصية لأنها ليست مصروفات تشغيلية تخصم من الربح التشغيلي
    if (cat !== 'Partner Withdrawal' && cat !== 'Zakat' && cat !== 'Profit Distribution') {
      summary.totalExpenses += amt;
      summary.totalCashExpenses += amt;
      summary.totalCashOutflows += amt;
      summary.totalCashOperatingExpenses += amt;
      addDaily(d, 0, amt);
      summary.expensesCategories[cat] = (summary.expensesCategories[cat] || 0) + amt;
    } else {
      summary.totalCashOutflows += amt;
      summary.totalNonOperatingCashOutflows += amt;
      addDaily(d, 0, 0, amt);
    }
  });

  // 4. عمولات تطبيقات التوصيل المسحوبة فعلياً من الحسابات البنكية.
  let qCommissions = `
    SELECT tx_date, description,
      COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor
    FROM BankTransactions
    WHERE year_id = ? AND reference_type = 'commission' AND COALESCE(is_voided, 0) = 0
  `;
  const pCommissions = [activeYearId];
  if (cashierName) { qCommissions += ' AND created_by = ?'; pCommissions.push(cashierName); }
  if (startDate) { qCommissions += ' AND tx_date >= ?'; pCommissions.push(startDate); }
  if (endDate) { qCommissions += ' AND tx_date <= ?'; pCommissions.push(endDate); }
  const commissionRows = await dbAll(qCommissions, pCommissions);
  commissionRows.forEach(row => {
    const amount = Number(row.amount) || 0;
    const description = String(row.description || '');
    summary.totalAppCommissions += amount;
    summary.totalExpenses += amount;
    summary.totalCashExpenses += amount;
    summary.totalCashOutflows += amount;
    addDaily(row.tx_date, 0, amount);
    if (/grab/i.test(description)) summary.appCommissions.grab.amount += amount;
    if (/lineman|line\s*man/i.test(description)) summary.appCommissions.lineman.amount += amount;
  });
  if (summary.totalAppCommissions > 0) {
    summary.expensesCategories.dashboard_expense_category_app_commissions = summary.totalAppCommissions;
  }

  let configuredGrabRate = 0;
  let configuredLinemanRate = 0;
  try {
    const settingsRow = await dbAll("SELECT value FROM settings WHERE key = 'app_settings' LIMIT 1");
    const settings = settingsRow[0]?.value ? JSON.parse(settingsRow[0].value) : {};
    configuredGrabRate = Number(settings.grabCommission) || 0;
    configuredLinemanRate = Number(settings.linemanCommission) || 0;
  } catch (error) {
    console.error('Failed to read configured application commission rates:', error);
  }
  summary.appCommissions.grab.rate = summary.appCommissions.grab.sales > 0
    ? (summary.appCommissions.grab.amount / summary.appCommissions.grab.sales) * 100
    : configuredGrabRate;
  summary.appCommissions.lineman.rate = summary.appCommissions.lineman.sales > 0
    ? (summary.appCommissions.lineman.amount / summary.appCommissions.lineman.sales) * 100
    : configuredLinemanRate;

  // 5. مدفوعات الموظفين تدفق نقدي فقط. مصروف الرواتب يُحسب لاحقًا
  // من الراتب المستحق والبدلات خلال الفترة، بصرف النظر عن تاريخ الدفع.
  let qEmp = `SELECT tx_date,
    COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor,
    COALESCE(deductions_minor, CAST(ROUND(deductions * 100) AS INTEGER)) AS deductions_minor,
    COALESCE(allowances_minor, CAST(ROUND(allowances * 100) AS INTEGER)) AS allowances_minor
    FROM employee_transactions WHERE year_id = ? AND COALESCE(is_archived, 0) = 0`;
  let pEmp = [activeYearId];
  if (cashierName) { qEmp += " AND 1 = 0"; }
  if (startDate) { qEmp += " AND tx_date >= ?"; pEmp.push(startDate); }
  if (endDate) { qEmp += " AND tx_date <= ?"; pEmp.push(endDate); }
  const empRows = await dbAll(qEmp, pEmp);
  empRows.forEach(r => {
    let d = r.tx_date;
    let amt = r.amount || 0;
    summary.totalSalaries += amt;
    summary.totalCashExpenses += amt;
    summary.totalCashOutflows += amt;
    addDaily(d, 0, 0, amt);
  });
  
  const employeeAccrualStatements = await getAllEmployeesStatement(
    startDate || '',
    endDate || '',
    activeYearId
  );
  summary.totalAccruedBaseSalary = employeeAccrualStatements.reduce(
    (total, employee) => total + (Number(employee.salary) || 0),
    0
  );
  summary.totalAccruedAllowances = empRows.reduce(
    (total, row) => total + (Number(row.allowances) || 0),
    0
  );
  summary.totalSalaryExpense += summary.totalAccruedBaseSalary + summary.totalAccruedAllowances;
  employeeAccrualStatements.forEach(employee => {
    (employee.salaryAccrualRows || []).forEach(row => {
      addDaily(row.tx_date, 0, Number(row.allowances) || 0, 0);
    });
  });
  empRows.forEach(row => {
    const allowance = Number(row.allowances) || 0;
    if (allowance > 0) addDaily(row.tx_date, 0, allowance, 0);
  });
  if (summary.totalSalaryExpense > 0) {
    summary.expensesCategories.dashboard_expense_category_accrued_salaries = summary.totalSalaryExpense;
  }

  // المستحقات القائمة حتى نهاية الفترة تظهر كالتزام مستقل.
  const employeeStatementsToDate = await getAllEmployeesStatement('', endDate || '', activeYearId);
  summary.totalEmployeeDues = employeeStatementsToDate.reduce(
    (total, employee) => total + Math.max(Number(employee.closingBalance) || 0, 0),
    0
  );
  summary.totalEmployeeReceivables = employeeStatementsToDate.reduce(
    (total, employee) => total + (Number(employee.employeeReceivable) || 0),
    0
  );
  // 6. فواتير الموردين تُثبت كمشتريات عند تسجيلها، والخصم المكتسب
  // يخفض تكلفة المشتريات. الدفع اللاحق يسدد الالتزام ولا يكرر المصروف.
  let qPurchases = `SELECT tx_date, tx_type,
    COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor
    FROM supplier_transactions WHERE tx_type IN ('له', 'خصم') AND year_id = ? AND COALESCE(is_archived, 0) = 0`;
  let pPurchases = [activeYearId];
  if (cashierName) { qPurchases += " AND 1 = 0"; }
  if (startDate) { qPurchases += " AND tx_date >= ?"; pPurchases.push(startDate); }
  if (endDate) { qPurchases += " AND tx_date <= ?"; pPurchases.push(endDate); }
  const purchRows = await dbAll(qPurchases, pPurchases);
  purchRows.forEach(r => {
    const amount = Number(r.amount) || 0;
    if (r.tx_type === 'له') {
      summary.totalSupplierInvoices += amount;
      summary.totalPurchases += amount;
      addDaily(r.tx_date, 0, amount, 0);
      summary.expensesCategories.dashboard_expense_category_accrued_purchases =
        (summary.expensesCategories.dashboard_expense_category_accrued_purchases || 0) + amount;
    } else {
      summary.totalSupplierDiscounts += amount;
      summary.totalPurchases -= amount;
      addDaily(r.tx_date, 0, -amount, 0);
      summary.expensesCategories.dashboard_expense_category_accrued_purchases =
        (summary.expensesCategories.dashboard_expense_category_accrued_purchases || 0) - amount;
    }
  });

  // 7. مدفوعات الموردين (Supplier Payments)
  let qSup = `SELECT tx_date,
    COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor
    FROM supplier_transactions WHERE tx_type = 'عليه' AND year_id = ? AND COALESCE(is_archived, 0) = 0`;
  let pSup = [activeYearId];
  if (cashierName) { qSup += " AND 1 = 0"; }
  if (startDate) { qSup += " AND tx_date >= ?"; pSup.push(startDate); }
  if (endDate) { qSup += " AND tx_date <= ?"; pSup.push(endDate); }
  const supRows = await dbAll(qSup, pSup);
  supRows.forEach(r => {
    let d = r.tx_date;
    let amt = r.amount || 0;
    summary.totalSupplierPayments += amt;
    summary.totalPaidSupplierPurchases += amt;
    summary.totalCashExpenses += amt;
    summary.totalCashOutflows += amt;
    addDaily(d, 0, 0, amt);
  });
  // 8. أرصدة وديون الموردين (Supplier Debts)
  let qDebt = `
    SELECT supplier_id,
      SUM(
        CASE
          WHEN tx_type = 'له' THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))
          WHEN tx_type IN ('عليه', 'خصم') THEN -COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))
          ELSE 0
        END
      ) / 100.0 AS balance
    FROM supplier_transactions
    WHERE year_id = ? AND COALESCE(is_archived, 0) = 0
  `;
  let pDebt = [activeYearId];
  if (cashierName) { qDebt += " AND 1 = 0"; }
  // Supplier debt is a cumulative balance, so a report start date must not
  // discard invoices or payments recorded earlier in the financial year.
  if (endDate) { qDebt += " AND tx_date <= ?"; pDebt.push(endDate); }
  qDebt += " GROUP BY supplier_id";
  const debtRows = await dbAll(qDebt, pDebt);
  summary.totalSupplierDebts = debtRows.reduce(
    (total, row) => total + Math.max(Number(row.balance) || 0, 0),
    0
  );

  // الحركات البنكية اليدوية غير المرتبطة بمستند تشغيلي تمثل تدفقات
  // إضافية، بينما التحويل بين حسابين حركة داخلية لا تغير صافي النقد.
  let qManualBank = `SELECT tx_date, tx_type,
    COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor
    FROM BankTransactions
    WHERE year_id = ? AND reference_type IS NULL AND COALESCE(is_voided, 0) = 0
      AND tx_type IN ('Deposit', 'Receipt', 'Withdrawal', 'Payment')`;
  const pManualBank = [activeYearId];
  if (startDate) { qManualBank += ' AND tx_date >= ?'; pManualBank.push(startDate); }
  if (endDate) { qManualBank += ' AND tx_date <= ?'; pManualBank.push(endDate); }
  const manualBankRows = await dbAll(qManualBank, pManualBank);
  manualBankRows.forEach(row => {
    const amount = Number(row.amount) || 0;
    if (row.tx_type === 'Deposit' || row.tx_type === 'Receipt') {
      summary.totalCashInflows += amount;
    } else {
      summary.totalCashOutflows += amount;
      summary.totalNonOperatingCashOutflows += amount;
      addDaily(row.tx_date, 0, 0, amount);
    }
  });

  // Finalize Daily arrays
  let sortedDates = Object.keys(dailyMap).sort();
  sortedDates.forEach(date => {
     summary.dailySales.push({ date: date, amount: dailyMap[date].sales });
     summary.dailyExpenses.push({ date: date, amount: dailyMap[date].accrualExpenses });
     summary.dailyCashOutflows.push({ date: date, amount: dailyMap[date].cashOutflows });
  });

  // قائمة الدخل على أساس الاستحقاق.
  summary.netProfit = summary.totalSales - (summary.totalExpenses + summary.totalSalaryExpense + summary.totalPurchases);
  summary.distributionNetProfit = summary.netProfit - summary.totalEmployeeReceivables;
  // التدفق النقدي مستقل: الدفعات تسدد التزامات ولا تعيد التأثير على الربح.
  summary.cashNetFlow = summary.totalCashInflows - summary.totalCashOutflows;

  return summary;
}

module.exports = {
  getFinancialSummary
};
