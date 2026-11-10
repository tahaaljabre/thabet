const { dbGet, dbAll, dbRun, isYearClosed, assertAccountingDateOpen, logActivity, getActiveUser } = require('../database');
const { moveToTrash } = require('../trash.service');
const accounting = require('../accounting.service');
const { withTransaction } = require('../database/transaction');

async function getEmployeeTransactions(empId, yearId) {
  if (yearId !== undefined && yearId !== null) {
    return await dbAll("SELECT * FROM employee_transactions WHERE employee_id=? AND year_id=? AND COALESCE(is_archived, 0) = 0 ORDER BY tx_date DESC, created_at DESC", [empId, yearId]);
  }
  return await dbAll("SELECT * FROM employee_transactions WHERE employee_id=? AND COALESCE(is_archived, 0) = 0 ORDER BY tx_date DESC, created_at DESC", [empId]);
}

async function getEmployeeTransactionById(id) {
  return await dbGet("SELECT * FROM employee_transactions WHERE id=? AND COALESCE(is_archived, 0) = 0", [id]);
}

async function saveEmployeeTransaction(tx) {
  const yearId = tx.year_id || 1;
  await assertAccountingDateOpen(yearId, tx.tx_date);
  if (tx.id) {
    const previousTx = await dbGet('SELECT tx_date, year_id FROM employee_transactions WHERE id = ?', [tx.id]);
    if (previousTx) await assertAccountingDateOpen(previousTx.year_id, previousTx.tx_date);
  }
  
  return withTransaction(async () => {
    let vault = await dbGet("SELECT id FROM BankAccounts WHERE is_cash_vault = 1 AND year_id = ? LIMIT 1", [yearId]);
    if (!vault) {
      const ins = await dbRun(
        "INSERT INTO BankAccounts (bank_name, account_number, opening_balance, current_balance, start_date, year_id, is_cash_vault) VALUES (?, '', 0, 0, '2000-01-01', ?, 1)",
        ['صندوق الكاش - Cash Vault', yearId]
      );
      vault = { id: ins.lastID };
    }
    let finalAccountId = vault ? vault.id : null;
    if (tx.account_id && tx.account_id !== 'cash') {
      const chosenBank = await dbGet('SELECT id FROM BankAccounts WHERE id = ? AND year_id = ?', [tx.account_id, yearId]);
      if (chosenBank) finalAccountId = chosenBank.id;
    }
    
    let txId = tx.id;
    const empRow = await dbGet('SELECT name FROM employees WHERE id = ?', [tx.employee_id]);
    const empName = empRow ? empRow.name : '';

    if(txId) {
      await dbRun("UPDATE employee_transactions SET tx_date=?, amount=?, attendance_days=?, absence_days=?, deductions=?, allowances=?, notes=?, account_id=? WHERE id=?", 
      [tx.tx_date, tx.amount, tx.attendance_days, tx.absence_days, tx.deductions, tx.allowances, tx.notes, finalAccountId, txId]);
      await logActivity('UPDATE', 'employee_transactions', txId, `تعديل حركة موظف لـ ${empName} بقيمة ${tx.amount} (بدلات: ${tx.allowances || 0}, خصومات: ${tx.deductions || 0})`, null, yearId);
    } else {
      const res = await dbRun("INSERT INTO employee_transactions (employee_id, tx_date, amount, attendance_days, absence_days, deductions, allowances, notes, account_id, year_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
      [tx.employee_id, tx.tx_date, tx.amount, tx.attendance_days, tx.absence_days, tx.deductions, tx.allowances, tx.notes, finalAccountId, yearId]);
      txId = res.lastID;
      await logActivity('INSERT', 'employee_transactions', txId, `إضافة حركة موظف لـ ${empName} بقيمة ${tx.amount} (بدلات: ${tx.allowances || 0}, خصومات: ${tx.deductions || 0})`, null, yearId);
    }

    // Sync BankTransactions
    await dbRun(
      `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = 'استبدال حركة الموظف بعد التعديل'
       WHERE reference_type = 'employee' AND reference_id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), txId]
    );
    if (finalAccountId && tx.amount > 0) {
      await dbRun(
        'INSERT INTO BankTransactions (tx_date, tx_type, from_account_id, to_account_id, amount, description, created_by, year_id, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tx.tx_date, 'Withdrawal', finalAccountId, null, tx.amount, `صرف راتب/بدلات: ${tx.notes || ''}`, 'System', yearId, 'employee', txId]
      );
    }
    const paymentMinor = accounting.toMinor(tx.amount || 0);
    const allowanceMinor = accounting.toMinor(tx.allowances || 0);
    const deductionMinor = accounting.toMinor(tx.deductions || 0);
    const payable = await accounting.getAccountByCode(yearId, '2020');
    const salaryExpense = await accounting.getAccountByCode(yearId, '5030');
    const clearing = await accounting.getAccountByCode(yearId, '3010');
    const lines = [];
    if (paymentMinor > 0) {
      const bank = finalAccountId
        ? await dbGet('SELECT * FROM BankAccounts WHERE id = ? AND year_id = ?', [finalAccountId, yearId])
        : null;
      const bankAccount = bank
        ? await accounting.ensureBankLedgerAccount(bank.id, yearId, bank.bank_name, bank.is_cash_vault)
        : await accounting.getAccountByCode(yearId, '1090');
      lines.push(
        { accountId: payable.id, debitMinor: paymentMinor, creditMinor: 0 },
        { accountId: bankAccount.id, debitMinor: 0, creditMinor: paymentMinor }
      );
    }
    if (allowanceMinor > 0) {
      lines.push(
        { accountId: salaryExpense.id, debitMinor: allowanceMinor, creditMinor: 0 },
        { accountId: payable.id, debitMinor: 0, creditMinor: allowanceMinor }
      );
    }
    if (deductionMinor > 0) {
      lines.push(
        { accountId: payable.id, debitMinor: deductionMinor, creditMinor: 0 },
        { accountId: clearing.id, debitMinor: 0, creditMinor: deductionMinor }
      );
    }
    if (lines.length) {
      await accounting.postSourceEntry({
        yearId,
        date: tx.tx_date,
        description: `حركة موظف: ${empName}`,
        sourceType: 'employee',
        sourceKey: txId,
        lines
      });
    }
    return txId;
  });
}

async function deleteEmployeeTransaction(id) {
  const tx = await dbGet('SELECT * FROM employee_transactions WHERE id = ?', [id]);
  if (tx) await assertAccountingDateOpen(tx.year_id, tx.tx_date);
  
  return withTransaction(async () => {
    let details = `إلغاء حركة موظف بقيمة ${tx ? tx.amount : 0}`;
    if (tx) {
      const empRow = await dbGet('SELECT name FROM employees WHERE id = ?', [tx.employee_id]);
      if (empRow) {
        details = `إلغاء حركة للموظف ${empRow.name} بقيمة ${tx.amount} (بدلات: ${tx.allowances || 0}, خصومات: ${tx.deductions || 0})`;
      }
    }
    if (tx) {
      await accounting.reverseSourceEntries(tx.year_id, 'employee', id, tx.tx_date, details);
    }
    await dbRun(
      `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = ?
       WHERE reference_type = 'employee' AND reference_id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), details, id]
    );
    await dbRun(
      `UPDATE employee_transactions SET is_archived = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = ? WHERE id = ? AND COALESCE(is_archived, 0) = 0`,
      [getActiveUser(), details, id]
    );
    await logActivity('CANCEL', 'employee_transactions', id, details, null, tx ? tx.year_id : 1);
    return true;
  });
}

module.exports = { getEmployeeTransactions, getEmployeeTransactionById, saveEmployeeTransaction, deleteEmployeeTransaction };
