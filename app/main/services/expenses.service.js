const { dbAll, dbRun, dbGet, isYearClosed, assertAccountingDateOpen, logActivity, getActiveUser } = require('./database');
const { getNextVoucherNumber } = require('./voucher-sequence.service');
const accounting = require('./accounting.service');
const { moveToTrash } = require('./trash.service');
const { withTransaction } = require('./database/transaction');

const expenseSourceKey = reportDate => String(reportDate);

async function getExpensesByDate(reportDate, yearId) {
  const expenses = await dbAll(
      'SELECT * FROM expenses WHERE report_date = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0 ORDER BY id ASC',
    [reportDate, yearId || 1]
  );
  return {
    reportDate,
    expenseVoucherNumber: expenses[0]?.voucher_number || '',
    purchases: expenses.map(expense => ({ ...expense, amount: parseFloat(expense.amount) || 0 }))
  };
}

async function saveExpensesReport(payload) {
  const yearId = payload.year_id || payload.yearId || 1;
  const reportDate = payload.reportDate;
  const purchases = payload.purchases;
  if (!reportDate) throw new Error('تاريخ المصروفات مطلوب');
  if (!Array.isArray(purchases)) throw new Error('قائمة المصروفات غير صالحة');
  await assertAccountingDateOpen(yearId, reportDate);

  return withTransaction(async () => {
    const existing = await dbGet(
      'SELECT voucher_number FROM expenses WHERE report_date = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0 AND voucher_number IS NOT NULL LIMIT 1',
      [reportDate, yearId]
    );
    let voucherNumber = existing?.voucher_number || payload.restoreVoucherNumber || null;
    if (!voucherNumber && purchases.length > 0) {
      voucherNumber = await getNextVoucherNumber('expenses', yearId);
    }

    const existingRows = await dbAll(
      'SELECT id FROM expenses WHERE report_date = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0',
      [reportDate, yearId]
    );
    for (const row of existingRows) {
      await dbRun(
        `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
         voided_by = ?, void_reason = 'استبدال المصروف بعد التعديل'
         WHERE reference_type = 'expense' AND reference_id = ? AND COALESCE(is_voided, 0) = 0`,
        [getActiveUser(), row.id]
      );
    }
    await dbRun(
      `UPDATE expenses SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = 'استبدال تقرير المصروفات بعد التعديل'
       WHERE report_date = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), reportDate, yearId]
    );

    let vault = await dbGet(
      'SELECT id FROM BankAccounts WHERE is_cash_vault = 1 AND year_id = ? LIMIT 1',
      [yearId]
    );
    if (!vault) {
      const ins = await dbRun(
        "INSERT INTO BankAccounts (bank_name, account_number, opening_balance, current_balance, start_date, year_id, is_cash_vault) VALUES (?, '', 0, 0, '2000-01-01', ?, 1)",
        ['صندوق الكاش - Cash Vault', yearId]
      );
      vault = { id: ins.lastID };
    }
    const journalLines = [];
    const expenseAccount = await accounting.getAccountByCode(yearId, '5020');
    for (const expense of purchases) {
      let accountId = null;
      if (expense.account_id && expense.account_id !== 'cash') {
        const chosenBank = await dbGet('SELECT id FROM BankAccounts WHERE id = ? AND year_id = ?', [expense.account_id, yearId]);
        if (chosenBank) accountId = chosenBank.id;
      }
      if (!accountId) accountId = vault?.id || null;
      const result = await dbRun(
        'INSERT INTO expenses (report_date, name, qty, amount, category, account_id, year_id, voucher_number, cashier_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)',
        [reportDate, expense.name, expense.qty, expense.amount, expense.category, accountId, yearId, voucherNumber]
      );
      if (accountId) {
        await dbRun(
          'INSERT INTO BankTransactions (tx_date, tx_type, from_account_id, to_account_id, amount, description, created_by, year_id, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [reportDate, 'Withdrawal', accountId, null, expense.amount, `مصروف: ${expense.name}`, 'المصروفات', yearId, 'expense', result.lastID]
        );
      }
      const bank = accountId
        ? await dbGet('SELECT * FROM BankAccounts WHERE id = ? AND year_id = ?', [accountId, yearId])
        : null;
      const creditAccount = bank
        ? await accounting.ensureBankLedgerAccount(bank.id, yearId, bank.bank_name, bank.is_cash_vault)
        : await accounting.getAccountByCode(yearId, '1090');
      const amountMinor = accounting.toMinor(expense.amount);
      if (amountMinor > 0) {
        journalLines.push({
          accountId: expenseAccount.id,
          debitMinor: amountMinor,
          creditMinor: 0,
          description: expense.name
        });
        journalLines.push({
          accountId: creditAccount.id,
          debitMinor: 0,
          creditMinor: amountMinor,
          description: expense.name
        });
      }
    }
    if (journalLines.length > 0) {
      await accounting.postSourceEntry({
        yearId,
        date: reportDate,
        description: `مصروفات يوم ${reportDate}`,
        sourceType: 'expenses',
        sourceKey: expenseSourceKey(reportDate),
        lines: journalLines
      });
    } else {
      await accounting.reverseSourceEntries(
        yearId,
        'expenses',
        expenseSourceKey(reportDate),
        reportDate,
        `إلغاء مصروفات ${reportDate}`
      );
    }
    await logActivity(
      'UPDATE',
      'expenses',
      null,
      `حفظ مصروفات يوم ${reportDate} | عدد البنود: ${purchases.length}`,
      null,
      yearId
    );
    return { success: true, expenseVoucherNumber: voucherNumber, savedPurchasesCount: purchases.length };
  });
}

async function getExpensesLedger(startDate, endDate, yearId) {
  let query = `SELECT report_date,
    SUM(COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))) / 100.0 AS total_amount,
    COUNT(*) as items_count, MAX(voucher_number) as voucherNumber
    FROM expenses WHERE year_id = ? AND COALESCE(is_voided, 0) = 0`;
  let params = [yearId || 1];
  if (startDate) {
    query += " AND report_date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND report_date <= ?";
    params.push(endDate);
  }
  query += " GROUP BY report_date ORDER BY report_date DESC";
  return await dbAll(query, params);
}

async function deleteDailyExpenses(reportDate, yearId) {
  return withTransaction(async () => {
  if (!yearId) throw new Error('السنة المالية مطلوبة لحذف المصروفات.');
  const exp = await dbGet('SELECT year_id FROM expenses WHERE report_date = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0 LIMIT 1', [reportDate, yearId]);
  const summary = await dbGet(`SELECT COUNT(*) AS item_count,
    COALESCE(SUM(COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))), 0) / 100.0 AS total_amount
    FROM expenses WHERE report_date = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0`, [reportDate, yearId]);
  const rowsToTrash = await dbAll(
    'SELECT * FROM expenses WHERE report_date=? AND year_id=? AND COALESCE(is_voided,0)=0 ORDER BY id',
    [reportDate, yearId]
  );
  if (!rowsToTrash.length) return { success: true, alreadyDeleted: true };
  
  if (exp && await isYearClosed(exp.year_id)) {
    throw new Error('السنة المالية مغلقة، لا يمكن الحذف.');
  }
  await assertAccountingDateOpen(yearId, reportDate);

    await accounting.reverseSourceEntries(
      yearId,
      'expenses',
      expenseSourceKey(reportDate),
      reportDate,
      `عكس مصروفات ${reportDate}`
    );
    await dbRun(
      `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = ?
       WHERE tx_date = ? AND reference_type = 'expense' AND year_id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), `إلغاء مصروفات ${reportDate}`, reportDate, yearId]
    );
    await dbRun(
      `UPDATE expenses SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = ?
       WHERE report_date = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), `إلغاء مصروفات ${reportDate}`, reportDate, yearId]
    );
    if (rowsToTrash.length) {
      await moveToTrash(
        'expenses',
        rowsToTrash[0],
        `سند مشتريات #${rowsToTrash[0].voucher_number || '—'} - ${reportDate}`,
        yearId,
        rowsToTrash.slice(1).map(row => ({ table: 'expenses', row }))
      );
    }
  await logActivity('CANCEL', 'expenses', null,
    `إلغاء مصروفات يوم ${reportDate} | عدد البنود: ${summary ? summary.item_count : 0} | الإجمالي: ${summary ? summary.total_amount : 0}`,
    null, yearId);
  return { success: true };
  }, { immediate: true });
}

async function getExpensesByDateRange(startDate, endDate, yearId) {
  let query = "SELECT * FROM expenses WHERE year_id = ? AND COALESCE(is_voided, 0) = 0";
  let params = [yearId || 1];
  if (startDate) {
    query += " AND report_date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND report_date <= ?";
    params.push(endDate);
  }
  query += " ORDER BY report_date ASC, id ASC";
  return await dbAll(query, params);
}

async function getExpenseReportByVoucherNumber(voucherNumber, yearId) {
  return await dbGet('SELECT report_date FROM expenses WHERE voucher_number = ? AND year_id = ? AND COALESCE(is_voided, 0) = 0 LIMIT 1', [voucherNumber, yearId || 1]);
}

module.exports = {
  getExpensesByDate,
  saveExpensesReport,
  getExpensesLedger,
  deleteDailyExpenses,
  getExpensesByDateRange,
  getExpenseReportByVoucherNumber
};
