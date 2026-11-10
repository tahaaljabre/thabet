const { dbGet, dbAll, dbRun, isYearClosed, assertAccountingDateOpen, logActivity, getActiveUser } = require('../database');
const { moveToTrash } = require('../trash.service');
const accounting = require('../accounting.service');
const { withTransaction } = require('../database/transaction');
// General Vouchers
async function getGeneralVouchers(yearId) {
  return await dbAll('SELECT v.*, b.is_cash_vault FROM CashGeneralVouchers v LEFT JOIN BankAccounts b ON v.account_id = b.id WHERE v.year_id = ? AND COALESCE(v.is_voided, 0) = 0 ORDER BY v.voucher_date DESC, v.id DESC', [yearId]);
}

async function saveGeneralVoucher(voucher) {
  const yearId = voucher.year_id || 1;
  await assertAccountingDateOpen(yearId, voucher.voucher_date);
  if (voucher.id) {
    const previousVoucher = await dbGet('SELECT voucher_date, year_id FROM CashGeneralVouchers WHERE id = ?', [voucher.id]);
    if (previousVoucher) await assertAccountingDateOpen(previousVoucher.year_id, previousVoucher.voucher_date);
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
    if (voucher.account_id && voucher.account_id !== 'cash') {
      const chosenBank = await dbGet('SELECT id FROM BankAccounts WHERE id = ? AND year_id = ?', [voucher.account_id, yearId]);
      if (chosenBank) finalAccountId = chosenBank.id;
    }
    
    let txId = voucher.id;
    if (txId) {
      await dbRun('UPDATE CashGeneralVouchers SET voucher_date=?, amount=?, category=?, description=?, attachment=?, created_by=?, partner_name=?, account_id=? WHERE id=?', 
      [voucher.voucher_date, voucher.amount, voucher.category, voucher.description, voucher.attachment, voucher.created_by, voucher.partner_name, finalAccountId, txId]);
      await logActivity('UPDATE', 'CashGeneralVouchers', txId, `تعديل سند صرف عام بقيمة ${voucher.amount} (${voucher.category}) - ${voucher.description || ''}`, null, yearId);
    } else {
      const res = await dbRun('INSERT INTO CashGeneralVouchers (voucher_date, amount, category, description, attachment, created_by, year_id, partner_name, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [voucher.voucher_date, voucher.amount, voucher.category, voucher.description, voucher.attachment, voucher.created_by, yearId, voucher.partner_name, finalAccountId]);
      txId = res.lastID;
      await logActivity('INSERT', 'CashGeneralVouchers', txId, `إضافة سند صرف عام بقيمة ${voucher.amount} (${voucher.category}) - ${voucher.description || ''}`, null, yearId);
    }

    // Sync BankTransactions
    await dbRun(
      `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = 'استبدال سند الصرف بعد التعديل'
       WHERE reference_type = 'voucher' AND reference_id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), txId]
    );
    if (finalAccountId && voucher.amount > 0) {
      await dbRun(
        'INSERT INTO BankTransactions (tx_date, tx_type, from_account_id, to_account_id, amount, description, created_by, year_id, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [voucher.voucher_date, 'Withdrawal', finalAccountId, null, voucher.amount, `سند صرف: ${voucher.description || voucher.category}`, voucher.created_by, yearId, 'voucher', txId]
      );
    }
    const amountMinor = accounting.toMinor(voucher.amount);
    if (amountMinor > 0) {
      const categoryText = `${voucher.category || ''} ${voucher.description || ''}`;
      const debitCode = /زكاة|zakat/i.test(categoryText)
        ? '5050'
        : (/توزيع|شريك|partner|distribution/i.test(categoryText) ? '3020' : '5020');
      const debitAccount = await accounting.getAccountByCode(yearId, debitCode);
      const bank = finalAccountId
        ? await dbGet('SELECT * FROM BankAccounts WHERE id = ? AND year_id = ?', [finalAccountId, yearId])
        : null;
      const creditAccount = bank
        ? await accounting.ensureBankLedgerAccount(bank.id, yearId, bank.bank_name, bank.is_cash_vault)
        : await accounting.getAccountByCode(yearId, '1090');
      await accounting.postSourceEntry({
        yearId,
        date: voucher.voucher_date,
        description: `سند صرف: ${voucher.description || voucher.category}`,
        sourceType: 'voucher',
        sourceKey: txId,
        lines: [
          { accountId: debitAccount.id, debitMinor: amountMinor, creditMinor: 0 },
          { accountId: creditAccount.id, debitMinor: 0, creditMinor: amountMinor }
        ]
      });
    }
    return { success: true, id: txId };
  });
}

async function deleteGeneralVoucher(id) {
  const voucher = await dbGet('SELECT * FROM CashGeneralVouchers WHERE id = ?', [id]);
  if (voucher) await assertAccountingDateOpen(voucher.year_id, voucher.voucher_date);
  return withTransaction(async () => {
    if (voucher) {
      await accounting.reverseSourceEntries(
        voucher.year_id,
        'voucher',
        id,
        voucher.voucher_date,
        `عكس سند صرف ${id}`
      );
    }
    await dbRun(
      `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = ?
       WHERE reference_type = 'voucher' AND reference_id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), `إلغاء سند صرف ${id}`, id]
    );
    await dbRun(
      `UPDATE CashGeneralVouchers SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = ? WHERE id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), `إلغاء سند صرف ${id}`, id]
    );
    await logActivity('CANCEL', 'CashGeneralVouchers', id, `إلغاء سند صرف عام بقيمة ${voucher ? voucher.amount : 0} (${voucher ? voucher.category : ''})`, null, voucher ? voucher.year_id : 1);
    return { success: true };
  });
}

async function updateGeneralVoucher(voucher) {
  return await saveGeneralVoucher(voucher);
}

async function searchAllVouchersByNotes(queryText, yearId = 1) {
  const q = String(queryText || '').trim();
  if (q.length < 2) return [];
  const likeParam = `%${q}%`;
  const results = [];

  try {
    // 1. Vault General Vouchers (CashGeneralVouchers)
    const vaultRows = await dbAll(
      `SELECT id, voucher_date, amount, category, description, partner_name
       FROM CashGeneralVouchers
       WHERE year_id = ? AND COALESCE(is_voided, 0) = 0
         AND (COALESCE(description, '') LIKE ? OR COALESCE(category, '') LIKE ? OR COALESCE(partner_name, '') LIKE ?)
       ORDER BY voucher_date DESC, id DESC LIMIT 8`,
      [yearId, likeParam, likeParam, likeParam]
    );
    vaultRows.forEach(r => {
      results.push({
        type: 'vault',
        voucherNo: r.id,
        date: r.voucher_date,
        amount: r.amount,
        note: r.description || r.category || '',
        subLabel: r.category || ''
      });
    });

    // 2. Supplier Transactions
    const supRows = await dbAll(
      `SELECT t.id, t.supplier_id, t.tx_date, t.amount, t.tx_type, t.notes, s.name AS supplier_name
       FROM supplier_transactions t
       LEFT JOIN suppliers s ON t.supplier_id = s.id
       WHERE t.year_id = ? AND COALESCE(t.is_archived, 0) = 0 AND COALESCE(t.is_voided, 0) = 0
         AND (COALESCE(t.notes, '') LIKE ? OR COALESCE(s.name, '') LIKE ?)
       ORDER BY t.tx_date DESC, t.id DESC LIMIT 8`,
      [yearId, likeParam, likeParam]
    );
    supRows.forEach(r => {
      results.push({
        type: 'supplier',
        voucherNo: r.id,
        entityId: r.supplier_id,
        entityName: r.supplier_name || '',
        date: r.tx_date,
        amount: r.amount,
        note: r.notes || '',
        subLabel: r.supplier_name || ''
      });
    });

    // 3. Employee Transactions
    const empRows = await dbAll(
      `SELECT t.id, t.employee_id, t.tx_date, t.amount, t.allowances, t.notes, e.name AS employee_name
       FROM employee_transactions t
       LEFT JOIN employees e ON t.employee_id = e.id
       WHERE t.year_id = ? AND COALESCE(t.is_archived, 0) = 0 AND COALESCE(t.is_voided, 0) = 0
         AND (COALESCE(t.notes, '') LIKE ? OR COALESCE(e.name, '') LIKE ?)
       ORDER BY t.tx_date DESC, t.id DESC LIMIT 8`,
      [yearId, likeParam, likeParam]
    );
    empRows.forEach(r => {
      results.push({
        type: 'employee',
        voucherNo: r.id,
        entityId: r.employee_id,
        entityName: r.employee_name || '',
        date: r.tx_date,
        amount: Number(r.amount) > 0 ? r.amount : (r.allowances || 0),
        note: r.notes || '',
        subLabel: r.employee_name || ''
      });
    });

    // 4. Purchases & Daily Expenses
    const expRows = await dbAll(
      `SELECT e.id, e.report_date, e.name, e.qty, e.amount, dr.expense_voucher_number
       FROM expenses e
       LEFT JOIN daily_reports dr ON dr.report_date = e.report_date AND dr.year_id = e.year_id
       WHERE e.year_id = ? AND COALESCE(e.is_voided, 0) = 0
         AND (COALESCE(e.name, '') LIKE ? OR COALESCE(e.qty, '') LIKE ?)
       ORDER BY e.report_date DESC, e.id DESC LIMIT 8`,
      [yearId, likeParam, likeParam]
    );
    expRows.forEach(r => {
      results.push({
        type: 'purchases',
        voucherNo: r.expense_voucher_number || r.id,
        date: r.report_date,
        amount: r.amount,
        note: `${r.name || ''}${r.qty ? ' (' + r.qty + ')' : ''}`,
        subLabel: r.report_date || ''
      });
    });

    // 5. Bank Transactions
    const bankRows = await dbAll(
      `SELECT bt.id, bt.tx_date, bt.amount, bt.description, b.bank_name
       FROM BankTransactions bt
       LEFT JOIN BankAccounts b ON bt.from_account_id = b.id OR bt.to_account_id = b.id
       WHERE bt.year_id = ? AND COALESCE(bt.is_voided, 0) = 0
         AND COALESCE(bt.description, '') LIKE ?
       ORDER BY bt.tx_date DESC, bt.id DESC LIMIT 6`,
      [yearId, likeParam]
    );
    bankRows.forEach(r => {
      results.push({
        type: 'banks',
        voucherNo: r.id,
        date: r.tx_date,
        amount: r.amount,
        note: r.description || '',
        subLabel: r.bank_name || ''
      });
    });
  } catch (err) {
    console.error('searchAllVouchersByNotes error:', err);
  }

  return results.slice(0, 20);
}

module.exports = {
  getGeneralVouchers,
  saveGeneralVoucher,
  deleteGeneralVoucher,
  updateGeneralVoucher,
  searchAllVouchersByNotes
};
