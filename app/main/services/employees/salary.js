const { dbGet, dbAll } = require('../database');
const { getLocalDateString } = require('../../utils/date');

const DEFAULT_SALARY_ACCRUAL_DAY = 28;

function normalizeAccrualDay(day) {
  const parsed = parseInt(day, 10);
  if (!Number.isInteger(parsed)) return DEFAULT_SALARY_ACCRUAL_DAY;
  if (parsed < 1) return 1;
  if (parsed > 31) return 31;
  return parsed;
}

async function getSalaryAccrualDay() {
  try {
    const row = await dbGet("SELECT value FROM settings WHERE key = 'app_settings'");
    if (!row || !row.value) return DEFAULT_SALARY_ACCRUAL_DAY;
    const parsed = JSON.parse(row.value);
    return normalizeAccrualDay(parsed.salaryAccrualDay);
  } catch (err) {
    return DEFAULT_SALARY_ACCRUAL_DAY;
  }
}

function getMonthAccrualDate(year, monthIndex, accrualDay) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.min(Math.max(accrualDay, 1), lastDay);
  return new Date(year, monthIndex, safeDay);
}

function prorateFirstMonthSalary(salary, startDateStr, year, monthIndex) {
  const start = new Date(`${startDateStr}T00:00:00`);
  if (Number.isNaN(start.getTime()) || start.getFullYear() !== year || start.getMonth() !== monthIndex) {
    return Number(salary) || 0;
  }
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const payableDays = daysInMonth - start.getDate() + 1;
  return Math.round((((Number(salary) || 0) * payableDays) / daysInMonth) * 100) / 100;
}

function isEmployeeInactiveOn(accrualDate, emp, archivePeriods = []) {
  const periods = [...archivePeriods];
  if (
    emp.is_archived
    && emp.archived_at
    && !periods.some(period => !period.restored_at && period.archived_at === emp.archived_at)
  ) {
    periods.push({ archived_at: emp.archived_at, restored_at: null });
  }
  return periods.some(period => (
    period.archived_at < accrualDate
    && (!period.restored_at || accrualDate < period.restored_at)
  ));
}

function getAccruedSalary(emp, history, targetDate, accrualDay = DEFAULT_SALARY_ACCRUAL_DAY, archivePeriods = []) {
  let total = 0;
  let startDateStr = emp.monthly_accrual_start_date;
  if (!startDateStr) return emp.salary || 0;
  
  let current = new Date(startDateStr);
  current.setDate(1);
  
  let target = new Date(targetDate);
  if (isNaN(target.getTime())) target = new Date();

  while (true) {
    let monthStr = current.toISOString().slice(0, 7);
    let accrualDateStr = getLocalDateString(getMonthAccrualDate(current.getFullYear(), current.getMonth(), normalizeAccrualDay(accrualDay)));
    let targetStr = target.toISOString().slice(0, 10);
    
    if (accrualDateStr > targetStr) break;
    
    if (isEmployeeInactiveOn(accrualDateStr, emp, archivePeriods)) {
      current.setMonth(current.getMonth() + 1);
      continue;
    }

    let activeSalary = 0;
    let validHistory = history.filter(h => h.effective_date <= accrualDateStr).sort((a,b) => a.effective_date.localeCompare(b.effective_date));
    if (validHistory.length > 0) {
      activeSalary = validHistory[validHistory.length - 1].salary;
    }
    total += prorateFirstMonthSalary(activeSalary, startDateStr, current.getFullYear(), current.getMonth());
    
    current.setMonth(current.getMonth() + 1);
  }
  return total;
}

function getSalaryAccrualRows(emp, history, fromDate, toDate, accrualDay = DEFAULT_SALARY_ACCRUAL_DAY, archivePeriods = []) {
  let rows = [];
  let startDateStr = emp.monthly_accrual_start_date;
  if (!startDateStr) return rows;
  
  let current = new Date(startDateStr);
  current.setDate(1);
  
  let target = new Date(toDate || new Date());
  
  while (true) {
    let monthStr = current.toISOString().slice(0, 7);
    let accrualDateStr = getLocalDateString(getMonthAccrualDate(current.getFullYear(), current.getMonth(), normalizeAccrualDay(accrualDay)));
    let targetStr = target.toISOString().slice(0, 10);
    
    if (accrualDateStr > targetStr) break;
    
    if ((!fromDate || accrualDateStr >= fromDate) && !isEmployeeInactiveOn(accrualDateStr, emp, archivePeriods)) {
      let activeSalary = 0;
      let validHistory = history.filter(h => h.effective_date <= accrualDateStr).sort((a,b) => a.effective_date.localeCompare(b.effective_date));
      if (validHistory.length > 0) {
        activeSalary = validHistory[validHistory.length - 1].salary;
      }
      
      if (activeSalary > 0) {
        activeSalary = prorateFirstMonthSalary(activeSalary, startDateStr, current.getFullYear(), current.getMonth());
        rows.push({
          is_salary_row: true,
          tx_date: accrualDateStr,
          amount: 0,
          deductions: 0,
          allowances: activeSalary,
          notes: `استحقاق راتب شهر ${current.getMonth() + 1}/${current.getFullYear()}`,
          is_archived: 0
        });
      }
    }
    
    current.setMonth(current.getMonth() + 1);
  }
  return rows;
}

async function canDisburseSalaryOnDate(employeeId, txDate, yearId) {
  const salaryAccrualDay = await getSalaryAccrualDay();
  const date = new Date(txDate);
  if (isNaN(date.getTime())) {
    return { allowed: false, reasonCode: 'INVALID_DATE', accrualDay: salaryAccrualDay };
  }
  const txDateStr = getLocalDateString(date);
  if (txDateStr > getLocalDateString()) {
    return { allowed: false, reasonCode: 'FUTURE_DATE', accrualDay: salaryAccrualDay };
  }

  const emp = await dbGet('SELECT * FROM employees WHERE id = ? AND year_id = ?', [employeeId, yearId]);
  if (!emp) return { allowed: false, reasonCode: 'EMPLOYEE_NOT_FOUND', accrualDay: salaryAccrualDay };

  const [history, archivePeriods, transactions] = await Promise.all([
    dbAll('SELECT * FROM employee_salary_history WHERE employee_id = ?', [employeeId]),
    dbAll(`SELECT archived_at, restored_at FROM employee_archive_periods
      WHERE employee_id = ? ORDER BY archived_at, id`, [employeeId]),
    dbAll(`SELECT
        COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) AS amount_minor,
        COALESCE(deductions_minor, CAST(ROUND(deductions * 100) AS INTEGER)) AS deductions_minor,
        COALESCE(allowances_minor, CAST(ROUND(allowances * 100) AS INTEGER)) AS allowances_minor
      FROM employee_transactions
      WHERE employee_id = ? AND year_id = ? AND tx_date <= ? AND COALESCE(is_archived, 0) = 0`,
    [employeeId, yearId, txDateStr])
  ]);
  const accruedMinor = Math.round(getAccruedSalary(
    emp,
    history,
    txDateStr,
    salaryAccrualDay,
    archivePeriods
  ) * 100);
  const balanceMinor = transactions.reduce((balance, row) => (
    balance + Number(row.allowances_minor || 0)
      - Number(row.amount_minor || 0)
      - Number(row.deductions_minor || 0)
  ), accruedMinor);

  return {
    allowed: balanceMinor > 0,
    reasonCode: balanceMinor > 0 ? '' : 'NO_ACCRUED_BALANCE',
    payableAmount: balanceMinor / 100,
    accrualDay: salaryAccrualDay,
    paymentDate: txDateStr
  };
}

async function getSalaryAccrualDaySetting() {
  const day = await getSalaryAccrualDay();
  return { salaryAccrualDay: day };
}

module.exports = { getAccruedSalary, getSalaryAccrualRows, getSalaryAccrualDay, canDisburseSalaryOnDate, getSalaryAccrualDaySetting };
