const { dbGet, dbAll, dbRun, isYearClosed, assertAccountingDateOpen, logActivity, getActiveUser } = require('./database');
const { getNextVoucherNumber } = require('./voucher-sequence.service');
const accounting = require('./accounting.service');
const { moveToTrash } = require('./trash.service');
const { withTransaction } = require('./database/transaction');

async function getAllSuppliersStatement(startDate, endDate, yearId) {
  const suppliers = await dbAll("SELECT * FROM suppliers WHERE year_id = ? ORDER BY name ASC", [yearId]);
  const supplierStatsPromises = suppliers.map(async (sup) => {
    const openingRows = await dbAll(`
      SELECT SUM(CASE WHEN tx_type='له'
        THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))
        ELSE -COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))
      END) / 100.0 as openingBalance
      FROM supplier_transactions 
      WHERE supplier_id=? AND tx_date < ? AND COALESCE(is_archived, 0) = 0 AND year_id = ?
    `, [sup.id, startDate, yearId]);
    const openingBalance = (openingRows[0] && openingRows[0].openingBalance) || 0;
    
    const periodRows = await dbAll(`
      SELECT 
        SUM(CASE WHEN tx_type='له'
          THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END) / 100.0 as totalInvoices,
        SUM(CASE WHEN tx_type IN ('عليه', 'خصم')
          THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END) / 100.0 as totalPayments
      FROM supplier_transactions 
      WHERE supplier_id=? AND tx_date >= ? AND tx_date <= ? AND COALESCE(is_archived, 0) = 0 AND year_id = ?
    `, [sup.id, startDate, endDate, yearId]);
    const totalInvoices = (periodRows[0] && periodRows[0].totalInvoices) || 0;
    const totalPayments = (periodRows[0] && periodRows[0].totalPayments) || 0;
    
    if (sup.is_archived == 1 || sup.is_archived === true) {
      if (openingBalance === 0 && totalInvoices === 0 && totalPayments === 0) {
        return null;
      }
    }
    
    return {
      id: sup.id,
      name: sup.name + (sup.is_archived ? ' (مؤرشف)' : ''),
      openingBalance,
      totalInvoices,
      totalPayments,
      closingBalance: openingBalance + totalInvoices - totalPayments
    };
  });
  
  const supplierStats = (await Promise.all(supplierStatsPromises)).filter(s => s !== null);
  return supplierStats;
}

async function getSuppliers(yearId) {
  return await dbAll("SELECT * FROM suppliers WHERE COALESCE(is_archived, 0) = 0 AND year_id = ? ORDER BY created_at DESC", [yearId]);
}

async function saveSupplier(sup) {
  const yearId = sup.year_id || 1;
  if (await isYearClosed(yearId)) throw new Error('السنة المالية مغلقة');
  if(sup.id) {
    await dbRun("UPDATE suppliers SET name=?, phone=?, address=? WHERE id=?", [sup.name, sup.phone, sup.address, sup.id]);
    await logActivity('UPDATE', 'suppliers', sup.id, `تعديل المورد: ${sup.name}`, null, yearId);
    return sup.id;
  } else {
    const res = await dbRun("INSERT INTO suppliers (name, phone, address, year_id) VALUES (?, ?, ?, ?)", [sup.name, sup.phone, sup.address, yearId]);
    await logActivity('INSERT', 'suppliers', res.lastID, `إضافة المورد: ${sup.name}`, null, yearId);
    return res.lastID;
  }
}

async function deleteSupplier(id) {
  const sup = await dbGet('SELECT * FROM suppliers WHERE id = ?', [id]);
  if (sup && await isYearClosed(sup.year_id)) throw new Error('السنة المالية مغلقة');
  const supName = sup ? sup.name : '';
  await moveToTrash('suppliers', sup, sup ? sup.name : `مورد #${id}`, sup ? sup.year_id : 1);
  await dbRun("DELETE FROM suppliers WHERE id=?", [id]);
  await logActivity('DELETE', 'suppliers', id, `حذف المورد: ${supName}`, null, sup ? sup.year_id : 1);
  return true;
}

async function getSupplierTransactions(supId, yearId) {
  if (yearId !== undefined && yearId !== null) {
    return await dbAll("SELECT * FROM supplier_transactions WHERE supplier_id=? AND year_id=? AND COALESCE(is_archived, 0) = 0 ORDER BY tx_date DESC, created_at DESC", [supId, yearId]);
  }
  return await dbAll("SELECT * FROM supplier_transactions WHERE supplier_id=? AND COALESCE(is_archived, 0) = 0 ORDER BY tx_date DESC, created_at DESC", [supId]);
}

async function saveSupplierTransaction(tx) {
  const yearId = tx.year_id || 1;
  await assertAccountingDateOpen(yearId, tx.tx_date);
  if (tx.id) {
    const previousTx = await dbGet('SELECT tx_date, year_id FROM supplier_transactions WHERE id = ?', [tx.id]);
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
    let supplierName = '';
    const supplier = await dbGet('SELECT name FROM suppliers WHERE id = ?', [tx.supplier_id]);
    if (supplier) supplierName = supplier.name;

    if(txId) {
      await dbRun("UPDATE supplier_transactions SET tx_date=?, amount=?, tx_type=?, notes=?, account_id=? WHERE id=?", 
      [tx.tx_date, tx.amount, tx.tx_type, tx.notes, finalAccountId, txId]);
      await logActivity('UPDATE', 'supplier_transactions', txId, `تعديل حركة مورد لـ ${supplierName} بقيمة ${tx.amount} (${tx.tx_type})`, null, yearId);
    } else {
        const nextVoucher = await getNextVoucherNumber('supplier', yearId);
        const res = await dbRun("INSERT INTO supplier_transactions (supplier_id, tx_date, amount, tx_type, notes, account_id, voucher_no, year_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
        [tx.supplier_id, tx.tx_date, tx.amount, tx.tx_type, tx.notes, finalAccountId, nextVoucher, yearId]);
      txId = res.lastID;
      await logActivity('INSERT', 'supplier_transactions', txId, `إضافة حركة مورد لـ ${supplierName} بقيمة ${tx.amount} (${tx.tx_type})`, null, yearId);
    }

    // Sync BankTransactions
    await dbRun(
      `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = 'استبدال حركة المورد بعد التعديل'
       WHERE reference_type = 'supplier' AND reference_id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), txId]
    );
    if (finalAccountId && tx.tx_type === 'عليه' && tx.amount > 0) {
      const desc = `سداد لمورد: ${supplierName}${tx.notes ? ' - ' + tx.notes : ''}`;
      
      await dbRun(
        'INSERT INTO BankTransactions (tx_date, tx_type, from_account_id, to_account_id, amount, description, partner_name, created_by, year_id, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tx.tx_date, 'Withdrawal', finalAccountId, null, tx.amount, desc, null, 'System', yearId, 'supplier', txId]
      );
    }
    const amountMinor = accounting.toMinor(tx.amount);
    if (amountMinor > 0) {
      const payable = await accounting.getAccountByCode(yearId, '2010');
      const purchases = await accounting.getAccountByCode(yearId, '5010');
      let debitAccount = purchases;
      let creditAccount = payable;
      if (tx.tx_type === 'عليه') {
        debitAccount = payable;
        const bank = finalAccountId
          ? await dbGet('SELECT * FROM BankAccounts WHERE id = ? AND year_id = ?', [finalAccountId, yearId])
          : null;
        creditAccount = bank
          ? await accounting.ensureBankLedgerAccount(bank.id, yearId, bank.bank_name, bank.is_cash_vault)
          : await accounting.getAccountByCode(yearId, '1090');
      }
      await accounting.postSourceEntry({
        yearId,
        date: tx.tx_date,
        description: `حركة مورد: ${supplierName}`,
        sourceType: 'supplier',
        sourceKey: txId,
        lines: [
          { accountId: debitAccount.id, debitMinor: amountMinor, creditMinor: 0 },
          { accountId: creditAccount.id, debitMinor: 0, creditMinor: amountMinor }
        ]
      });
    }
    return txId;
  });
}

async function deleteSupplierTransaction(id) {
  const tx = await dbGet('SELECT * FROM supplier_transactions WHERE id = ?', [id]);
  if (tx) await assertAccountingDateOpen(tx.year_id, tx.tx_date);
  
  return withTransaction(async () => {
    let details = `إلغاء حركة مورد بقيمة ${tx ? tx.amount : 0} (${tx ? tx.tx_type : ''})`;
    if (tx) {
      const supplier = await dbGet('SELECT name FROM suppliers WHERE id = ?', [tx.supplier_id]);
      if (supplier) {
        details = `إلغاء حركة للمورد ${supplier.name} بقيمة ${tx.amount} (${tx.tx_type})`;
      }
    }
    if (tx) {
      await accounting.reverseSourceEntries(tx.year_id, 'supplier', id, tx.tx_date, details);
    }
    await dbRun(
      `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = ?
       WHERE reference_type = 'supplier' AND reference_id = ? AND COALESCE(is_voided, 0) = 0`,
      [getActiveUser(), details, id]
    );
    await dbRun(
      `UPDATE supplier_transactions SET is_archived = 1, voided_at = CURRENT_TIMESTAMP,
       voided_by = ?, void_reason = ? WHERE id = ? AND COALESCE(is_archived, 0) = 0`,
      [getActiveUser(), details, id]
    );
    await logActivity('CANCEL', 'supplier_transactions', id, details, null, tx ? tx.year_id : 1);
    return true;
  });
}


async function getSupplierTransactionByVoucher(voucherNo, yearId) {
  return await dbGet(`
    SELECT tx.*, s.name as supplier_name, s.phone as supplier_phone
    FROM supplier_transactions tx
    JOIN suppliers s ON tx.supplier_id = s.id
    WHERE tx.voucher_no = ? AND tx.year_id = ? AND COALESCE(tx.is_archived, 0) = 0
  `, [voucherNo, yearId]);
}

module.exports = {
  getAllSuppliersStatement,
  getSuppliers,
  saveSupplier,
  deleteSupplier,
  getSupplierTransactions,
  getSupplierTransactionByVoucher,
  saveSupplierTransaction,
  deleteSupplierTransaction
};
