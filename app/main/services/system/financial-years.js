const { dbGet, dbAll, dbRun, logActivity } = require('../database');
const { getLocalDateString } = require('../../utils/date');
const { getBankAccountsWithBalance } = require('../banks.service');
const { getAccruedSalary } = require('../employees.service');
// Financial Years
async function getFinancialYears() {
  return await dbAll('SELECT * FROM FinancialYears ORDER BY YearName ASC');
}

async function createFinancialYear(name) {
  const openYears = await dbAll('SELECT * FROM FinancialYears WHERE IsClosed = 0');
  if (openYears && openYears.length > 0) {
    throw new Error('لا يمكن إضافة سنة مالية جديدة. يجب إغلاق السنة المالية المفتوحة أولاً من شاشة الإقفال.');
  }

  const existing = await dbGet('SELECT * FROM FinancialYears WHERE YearName = ?', [name]);
  if (existing) throw new Error('السنة المالية موجودة بالفعل');
  const res = await dbRun('INSERT INTO FinancialYears (YearName, IsClosed) VALUES (?, 0)', [name]);
  const newYearId = res.lastID;
  const todayStr = getLocalDateString();
  await dbRun("INSERT INTO BankAccounts (bank_name, account_number, opening_balance, current_balance, start_date, year_id, is_cash_vault) VALUES (?, '', 0, 0, ?, ?, 1)", ['الصندوق الرئيسي - Cash Vault', todayStr, newYearId]);
  return { success: true, yearId: newYearId };
}

async function saveClosingPartners(yearId, partners) {
  if (!yearId || !Array.isArray(partners) || partners.length === 0) {
    throw new Error('ERR_CLOSING_PARTNERS_REQUIRED');
  }
  const normalized = partners.map(partner => ({
    name: String(partner.name || '').trim(),
    percentage: Number(partner.percentage)
  }));
  if (normalized.some(partner =>
    !partner.name ||
    !Number.isFinite(partner.percentage) ||
    partner.percentage <= 0 ||
    partner.percentage > 100
  )) {
    throw new Error('ERR_PARTNER_PERCENTAGE_INVALID');
  }
  if (new Set(normalized.map(partner => partner.name)).size !== normalized.length) {
    throw new Error('ERR_PARTNER_DUPLICATE');
  }
  const totalPercentage = normalized.reduce((total, partner) => total + partner.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.000001) {
    throw new Error('ERR_PARTNER_PERCENTAGE_TOTAL');
  }

  await dbRun('BEGIN TRANSACTION');
  try {
    await dbRun('DELETE FROM ClosingPartners WHERE year_id = ?', [yearId]);
    for (const partner of normalized) {
      await dbRun(
        'INSERT INTO ClosingPartners (year_id, partner_name, percentage) VALUES (?, ?, ?)',
        [yearId, partner.name, partner.percentage]
      );
    }
    await dbRun('COMMIT');
  } catch (error) {
    await dbRun('ROLLBACK').catch(() => {});
    throw error;
  }
  return { success: true };
}

async function getClosingPartners(yearId) {
  return await dbAll('SELECT partner_name as name, percentage FROM ClosingPartners WHERE year_id = ?', [yearId]);
}

async function reopenFinancialYear(yearId) {
  await dbRun('UPDATE FinancialYears SET IsClosed = 0 WHERE YearID = ?', [yearId]);
  await dbRun('DELETE FROM ClosingReports WHERE year_id = ?', [yearId]);
  await dbRun('DELETE FROM ClosingPartners WHERE year_id = ?', [yearId]);
  await logActivity('REOPEN_YEAR', 'FinancialYears', yearId, `إعادة فتح السنة المالية: ${yearId}`, null, yearId);
  return { success: true };
}

async function closeFinancialYear(yearId, newYearName) {
  const periodSummary = await dbGet(
    `SELECT COUNT(*) AS total_periods,
       SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_periods
     FROM AccountingPeriods WHERE year_id = ?`,
    [yearId]
  );
  if (Number(periodSummary?.total_periods) !== 12 || Number(periodSummary?.closed_periods) !== 12) {
    throw new Error('FIN_ALL_MONTHS_MUST_BE_CLOSED');
  }
  await dbRun('BEGIN TRANSACTION');
  try {
    await dbRun('UPDATE FinancialYears SET IsClosed = 1 WHERE YearID = ?', [yearId]);
    const res = await dbRun('INSERT INTO FinancialYears (YearName, IsClosed) VALUES (?, 0)', [newYearName]);
    const newYearId = res.lastID;
    const todayStr = getLocalDateString();

    const employees = await dbAll("SELECT * FROM employees WHERE COALESCE(is_archived, 0) = 0 AND year_id = ?", [yearId]);
    for (const emp of employees) {
      const history = await dbAll("SELECT * FROM employee_salary_history WHERE employee_id=?", [emp.id]);
      const endAccrued = getAccruedSalary(emp, history, todayStr);
      
      const periodRows = await dbAll(`
        SELECT 
          SUM(
            COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) +
            COALESCE(deductions_minor, CAST(ROUND(deductions * 100) AS INTEGER))
          ) / 100.0 as totalDeductions,
          SUM(COALESCE(allowances_minor, CAST(ROUND(allowances * 100) AS INTEGER))) / 100.0 as totalAllowances
        FROM employee_transactions 
        WHERE employee_id=? AND COALESCE(is_archived, 0) = 0 AND year_id = ?
      `, [emp.id, yearId]);
      
      const totalDeductions = (periodRows[0] && periodRows[0].totalDeductions) || 0;
      const totalAllowances = (periodRows[0] && periodRows[0].totalAllowances) || 0;
      const closingBalance = endAccrued + totalAllowances - totalDeductions;
      
      let nextDay = new Date(new Date(todayStr).getTime() + 86400000).toISOString().slice(0, 10);
      const empRes = await dbRun("INSERT INTO employees (name, phone, salary, is_archived, monthly_accrual_start_date, photo, year_id, category_id) VALUES (?, ?, ?, 0, ?, ?, ?, ?)",
        [emp.name, emp.phone, emp.salary, nextDay, emp.photo, newYearId, emp.category_id ?? null]);

      const newEmpId = empRes.lastID;
      for (const h of history) {
        await dbRun("INSERT INTO employee_salary_history (employee_id, salary, effective_date) VALUES (?, ?, ?)",
          [newEmpId, h.salary, h.effective_date]);
      }
      
      if (closingBalance !== 0) {
        if (closingBalance > 0) {
          await dbRun("INSERT INTO employee_transactions (employee_id, tx_date, amount, deductions, allowances, notes, year_id) VALUES (?, ?, 0, 0, ?, ?, ?)",
            [newEmpId, todayStr, closingBalance, 'رصيد افتتاحي مرحل من السنة السابقة', newYearId]);
        } else {
          await dbRun("INSERT INTO employee_transactions (employee_id, tx_date, amount, deductions, allowances, notes, year_id) VALUES (?, ?, 0, ?, 0, ?, ?)",
            [newEmpId, todayStr, Math.abs(closingBalance), 'سلف متراكمة مرحلة من السنة السابقة', newYearId]);
        }
      }
    }
    
    const suppliers = await dbAll("SELECT * FROM suppliers WHERE year_id = ?", [yearId]);
    for (const sup of suppliers) {
      const periodRows = await dbAll(`
        SELECT 
          SUM(CASE WHEN tx_type='له'
            THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END) / 100.0 as totalInvoices,
          SUM(CASE WHEN tx_type IN ('عليه', 'خصم')
            THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END) / 100.0 as totalPayments
        FROM supplier_transactions 
        WHERE supplier_id=? AND COALESCE(is_archived, 0) = 0 AND year_id = ?
      `, [sup.id, yearId]);
      const totalInvoices = (periodRows[0] && periodRows[0].totalInvoices) || 0;
      const totalPayments = (periodRows[0] && periodRows[0].totalPayments) || 0;
      const closingBalance = totalInvoices - totalPayments;
      
      const supRes = await dbRun("INSERT INTO suppliers (name, phone, address, year_id) VALUES (?, ?, ?, ?)",
        [sup.name, sup.phone, sup.address, newYearId]);
      const newSupId = supRes.lastID;
      
      if (closingBalance !== 0) {
        if (closingBalance > 0) {
          await dbRun("INSERT INTO supplier_transactions (supplier_id, tx_date, amount, tx_type, notes, year_id) VALUES (?, ?, ?, 'له', ?, ?)",
            [newSupId, todayStr, closingBalance, 'رصيد مرحل من السنة السابقة (دائن)', newYearId]);
        } else {
          await dbRun("INSERT INTO supplier_transactions (supplier_id, tx_date, amount, tx_type, notes, year_id) VALUES (?, ?, ?, 'عليه', ?, ?)",
            [newSupId, todayStr, Math.abs(closingBalance), 'رصيد مرحل من السنة السابقة (مدين)', newYearId]);
        }
      }
    }

    const mappings = await dbAll("SELECT * FROM BankSalesMapping WHERE year_id = ?", [yearId]);
    const accountsWithBalance = await getBankAccountsWithBalance(yearId);
    
    for (const acc of accountsWithBalance) {
      const accRes = await dbRun("INSERT INTO BankAccounts (bank_name, account_number, opening_balance, current_balance, start_date, year_id, is_cash_vault) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [acc.bank_name, acc.account_number, acc.current_balance, acc.current_balance, todayStr, newYearId, acc.is_cash_vault || 0]);
      const newAccId = accRes.lastID;
      
      const myMappings = mappings.filter(m => m.bank_account_id === acc.id);
      for (const m of myMappings) {
        await dbRun("INSERT INTO BankSalesMapping (channel_name, bank_account_id, year_id) VALUES (?, ?, ?)",
          [m.channel_name, newAccId, newYearId]);
      }
    }
    
    await logActivity('CLOSE_YEAR', 'FinancialYears', yearId, `إغلاق السنة المالية وترحيل الحسابات إلى السنة الجديدة: ${newYearName}`, null, yearId);
    await dbRun('COMMIT');
    return { success: true, newYearId };
  } catch (err) {
    await dbRun('ROLLBACK').catch(() => {});
    throw err;
  }
}
module.exports = {
  getFinancialYears,
  createFinancialYear,
  saveClosingPartners,
  getClosingPartners,
  reopenFinancialYear,
  closeFinancialYear
};
