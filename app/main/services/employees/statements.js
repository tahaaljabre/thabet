const { dbGet, dbAll } = require('../database');
const { getLocalDateString } = require('../../utils/date');
const { getAccruedSalary, getSalaryAccrualRows, getSalaryAccrualDay } = require('./salary');

async function getDetailedEmployeeStatement(empId, startDate, endDate, yearId) {
  const salaryAccrualDay = await getSalaryAccrualDay();
  const emp = await dbGet(`
    SELECT e.*, c.name AS category_name
    FROM employees e
    LEFT JOIN employee_categories c ON c.id = e.category_id
    WHERE e.id = ?
  `, [empId]);
  if (!emp) throw new Error("الموظف غير موجود");

  const effectiveYearId = yearId || emp.year_id || 1;
  const history = await dbAll("SELECT * FROM employee_salary_history WHERE employee_id=?", [empId]);
  const archivePeriods = await dbAll(`
    SELECT archived_at, restored_at
    FROM employee_archive_periods
    WHERE employee_id=?
    ORDER BY archived_at, id
  `, [empId]);

  if (emp.is_archived && !emp.archived_at && archivePeriods.length === 0) {
    const lastTxRow = await dbGet(
      'SELECT MAX(tx_date) AS max_tx_date FROM employee_transactions WHERE employee_id=? AND COALESCE(is_archived, 0) = 0',
      [empId]
    );
    const fallbackArchivedAt = lastTxRow?.max_tx_date || emp.monthly_accrual_start_date || getLocalDateString();
    archivePeriods.push({ archived_at: fallbackArchivedAt, restored_at: null });
  }
  
  // 1. Calculate Opening Balance
  let openingAccrued = 0;
  let openingDeductions = 0;
  let openingAllowances = 0;
  let previousBalance = 0;
  
  if (startDate) {
    let prevDate = new Date(startDate);
    prevDate.setDate(prevDate.getDate() - 1);
    openingAccrued = getAccruedSalary(emp, history, getLocalDateString(prevDate), salaryAccrualDay, archivePeriods);
    
    const openingRows = await dbAll(`
      SELECT 
        SUM(
          COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) +
          COALESCE(deductions_minor, CAST(ROUND(deductions * 100) AS INTEGER))
        ) / 100.0 as totalDeductions,
        SUM(COALESCE(allowances_minor, CAST(ROUND(allowances * 100) AS INTEGER))) / 100.0 as totalAllowances
      FROM employee_transactions 
      WHERE employee_id=? AND tx_date < ? AND COALESCE(is_archived, 0) = 0 AND year_id = ?
    `, [empId, startDate, effectiveYearId]);
    openingDeductions = (openingRows[0] && openingRows[0].totalDeductions) || 0;
    openingAllowances = (openingRows[0] && openingRows[0].totalAllowances) || 0;
    
    // Balance: Earned - Drawn
    previousBalance = openingAccrued + openingAllowances - openingDeductions;
  } else if (!emp.monthly_accrual_start_date) {
    previousBalance = Number(emp.salary) || 0;
  }
  
  // 2. Fetch Period Transactions
  let qTx = "SELECT * FROM employee_transactions WHERE employee_id=? AND COALESCE(is_archived, 0) = 0 AND year_id = ?";
  let pTx = [empId, effectiveYearId];
  if (startDate) { qTx += " AND tx_date >= ?"; pTx.push(startDate); }
  if (endDate) { qTx += " AND tx_date <= ?"; pTx.push(endDate); }
  qTx += " ORDER BY tx_date ASC, id ASC";
  
  const txRows = await dbAll(qTx, pTx);
  
  // 3. Generate Salary Accrual Rows for the period
  const salaryRows = getSalaryAccrualRows(emp, history, startDate, endDate, salaryAccrualDay, archivePeriods);
  
  // 4. Combine and Sort
  let combinedRows = [...txRows, ...salaryRows].sort((a, b) => {
    const dateDiff = a.tx_date.localeCompare(b.tx_date);
    if (dateDiff !== 0) return dateDiff;
    return Number(Boolean(a.is_salary_row)) - Number(Boolean(b.is_salary_row));
  });
  
  // 5. Calculate Running Balance
  let runningBalance = previousBalance;
  combinedRows.forEach(row => {
    let earned = row.allowances || 0;
    let drawn = (row.amount || 0) + (row.deductions || 0);
    // Positive balance = company owes employee
    runningBalance += (earned - drawn);
    row.runningBalance = runningBalance;
  });
  
  return {
    employee: emp,
    previousBalance,
    archivedBalanceValue: 0,
    transactions: combinedRows,
    closingBalance: runningBalance
  };
}

async function getAllEmployeesStatement(startDate, endDate, yearId, categoryFilter = null) {
  const salaryAccrualDay = await getSalaryAccrualDay();
  let empQuery = `
    SELECT e.*, c.name AS category_name
    FROM employees e
    LEFT JOIN employee_categories c ON c.id = e.category_id
    WHERE e.year_id = ?
  `;
  const empParams = [yearId];
  if (categoryFilter === 'uncategorized') {
    empQuery += ' AND e.category_id IS NULL';
  } else if (categoryFilter !== null && categoryFilter !== undefined && categoryFilter !== '' && categoryFilter !== 'all') {
    const catId = Number(categoryFilter);
    if (Number.isFinite(catId) && catId > 0) {
      empQuery += ' AND e.category_id = ?';
      empParams.push(catId);
    }
  }
  empQuery += ' ORDER BY e.name ASC';
  const employees = await dbAll(empQuery, empParams);
  if (employees.length === 0) return [];

  const employeeIds = new Set(employees.map(emp => Number(emp.id)));
  const [allHistory, allTransactions, allArchivePeriods] = await Promise.all([
    dbAll(`SELECT h.* FROM employee_salary_history h
      JOIN employees e ON e.id=h.employee_id
      WHERE e.year_id=? ORDER BY h.effective_date ASC, h.id ASC`, [yearId]),
    dbAll(`SELECT employee_id, tx_date,
        COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor,
        COALESCE(deductions_minor, CAST(ROUND(deductions * 100) AS INTEGER)) AS deductions_minor,
        COALESCE(allowances_minor, CAST(ROUND(allowances * 100) AS INTEGER)) AS allowances_minor
      FROM employee_transactions
      WHERE year_id=? AND COALESCE(is_archived, 0)=0`, [yearId]),
    dbAll(`SELECT p.employee_id, p.archived_at, p.restored_at
      FROM employee_archive_periods p
      JOIN employees e ON e.id=p.employee_id
      WHERE e.year_id=?
      ORDER BY p.archived_at, p.id`, [yearId])
  ]);
  const historyByEmployee = new Map();
  const transactionsByEmployee = new Map();
  const archivePeriodsByEmployee = new Map();
  allHistory.forEach(row => {
    const id = Number(row.employee_id);
    if (!employeeIds.has(id)) return;
    if (!historyByEmployee.has(id)) historyByEmployee.set(id, []);
    historyByEmployee.get(id).push(row);
  });
  allTransactions.forEach(row => {
    const id = Number(row.employee_id);
    if (!transactionsByEmployee.has(id)) transactionsByEmployee.set(id, []);
    transactionsByEmployee.get(id).push({
      ...row,
      amount: Number(row.amount_minor || 0) / 100,
      deductions: Number(row.deductions_minor || 0) / 100,
      allowances: Number(row.allowances_minor || 0) / 100
    });
  });
  allArchivePeriods.forEach(row => {
    const id = Number(row.employee_id);
    if (!archivePeriodsByEmployee.has(id)) archivePeriodsByEmployee.set(id, []);
    archivePeriodsByEmployee.get(id).push(row);
  });

  const stats = employees.map(emp => {
    const history = historyByEmployee.get(Number(emp.id)) || [];
    const employeeTransactions = transactionsByEmployee.get(Number(emp.id)) || [];
    const archivePeriods = [...(archivePeriodsByEmployee.get(Number(emp.id)) || [])];
    if (emp.is_archived && !emp.archived_at && archivePeriods.length === 0) {
      const maxTxDate = employeeTransactions.reduce(
        (max, tx) => (tx.tx_date > max ? tx.tx_date : max),
        emp.monthly_accrual_start_date || getLocalDateString()
      );
      archivePeriods.push({ archived_at: maxTxDate, restored_at: null });
    }
    
    // Opening balance (up to startDate - 1 day)
    let openingAccrued = 0;
    let openingDeductions = 0;
    let openingAllowances = 0;
    
    if (startDate) {
      let prevDate = new Date(startDate);
      prevDate.setDate(prevDate.getDate() - 1);
      openingAccrued = getAccruedSalary(emp, history, getLocalDateString(prevDate), salaryAccrualDay, archivePeriods);
      
      const openingTransactions = employeeTransactions.filter(row => row.tx_date < startDate);
      openingDeductions = openingTransactions.reduce((total, row) => total + (row.amount || 0) + (row.deductions || 0), 0);
      openingAllowances = openingTransactions.reduce((total, row) => total + (row.allowances || 0), 0);
    }
    let openingBalance = openingAccrued + openingAllowances - openingDeductions;

    // Period calculations
    const periodStart = startDate || '1970-01-01';
    const periodEnd = endDate || '2099-12-31';
    const periodTransactions = employeeTransactions.filter(row => row.tx_date >= periodStart && row.tx_date <= periodEnd);
    const totalDeductions = periodTransactions.reduce((total, row) => total + (row.amount || 0) + (row.deductions || 0), 0);
    const totalCashPayments = periodTransactions.reduce((total, row) => total + (row.amount || 0), 0);
    const totalManualDeductions = periodTransactions.reduce((total, row) => total + (row.deductions || 0), 0);
    const totalAllowances = periodTransactions.reduce((total, row) => total + (row.allowances || 0), 0);
    
    // Period accrued salary
    let endAccrued = getAccruedSalary(emp, history, endDate || getLocalDateString(), salaryAccrualDay, archivePeriods);
    let periodAccrued = endAccrued - openingAccrued;
    const salaryAccrualRows = getSalaryAccrualRows(
      emp,
      history,
      startDate,
      endDate || getLocalDateString(),
      salaryAccrualDay,
      archivePeriods
    );
    
    let totalPeriodCredit = totalAllowances + periodAccrued;
    const transactionsToEnd = employeeTransactions.filter(row => row.tx_date <= periodEnd);
    const cashPaymentsToEnd = transactionsToEnd.reduce((total, row) => total + (row.amount || 0), 0);
    const manualDeductionsToEnd = transactionsToEnd.reduce((total, row) => total + (row.deductions || 0), 0);
    const allowancesToEnd = transactionsToEnd.reduce((total, row) => total + (row.allowances || 0), 0);
    const earnedAfterDeductions = Math.max(endAccrued + allowancesToEnd - manualDeductionsToEnd, 0);
    const employeeReceivable = Math.max(cashPaymentsToEnd - earnedAfterDeductions, 0);

    if (totalDeductions === 0 && totalPeriodCredit === 0 && openingBalance === 0) {
      return null;
    }
    
    return {
      id: emp.id,
      name: emp.name + (emp.is_archived ? ' (مؤرشف)' : ''),
      category_id: emp.category_id || null,
      category_name: emp.category_name || '',
      salary: periodAccrued, // Reverted to periodAccrued to reflect salary adjustments correctly
      salaryAccrualRows,
      totalDeductions,
      totalCashPayments,
      totalManualDeductions,
      totalAllowances: totalAllowances, 
      closingBalance: openingBalance + totalPeriodCredit - totalDeductions,
      employeeReceivable
    };
  }).filter(s => s !== null);
  return stats;
}

module.exports = { getDetailedEmployeeStatement, getAllEmployeesStatement };
