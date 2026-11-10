const { dbGet, dbAll, dbRun, isYearClosed, assertAccountingDateOpen, logActivity, getActiveUser } = require('./database');
const accounting = require('./accounting.service');
const { moveToTrash } = require('./trash.service');
const { withTransaction } = require('./database/transaction');

function bankAccountSummary(acc) {
  if (!acc) return '—';
  return `${acc.bank_name || 'بدون اسم'} | رقم الحساب: ${acc.account_number || '—'} | الرصيد الافتتاحي: ${acc.opening_balance || 0}`;
}

function bankTransactionSummary(tx) {
  if (!tx) return '—';
  return `${tx.tx_type || '—'} | المبلغ: ${tx.amount || 0} | من: ${tx.from_account_id || '—'} | إلى: ${tx.to_account_id || '—'} | ${tx.description || ''}`;
}

function normalizeAccountName(value) {
  return String(value || '').replace(/[\sـ]+/g, '').toLocaleLowerCase('ar');
}

async function ensureBankNameIsNotPartner(bankName, currentAccountId) {
  const partnerRows = await dbAll(`
    SELECT name FROM partners
    UNION SELECT partner_name AS name FROM ClosingPartners WHERE partner_name IS NOT NULL
    UNION SELECT partner_name AS name FROM CashGeneralVouchers WHERE partner_name IS NOT NULL
    UNION SELECT partner_name AS name FROM BankTransactions WHERE partner_name IS NOT NULL
  `);
  const normalizedBankName = normalizeAccountName(bankName);
  const isPartnerName = partnerRows.some(row => normalizeAccountName(row.name) === normalizedBankName);
  if (isPartnerName) {
    const existing = currentAccountId
      ? await dbGet('SELECT bank_name FROM BankAccounts WHERE id = ?', [currentAccountId])
      : null;
    if (!existing || normalizeAccountName(existing.bank_name) !== normalizedBankName) {
      throw new Error('هذا الاسم مسجل كشريك. استخدم حساب الشريك للمسحوبات ولا تضفه كحساب بنكي.');
    }
  }
}

const alignedYears = new Set();

async function getBankAccountsWithBalance(yearId) {
  let targetYearId = Number(yearId);
  if (!Number.isInteger(targetYearId) || targetYearId <= 0) {
    const activeYear = await dbGet('SELECT YearID FROM FinancialYears WHERE IsClosed = 0 ORDER BY YearID DESC LIMIT 1')
      || await dbGet('SELECT YearID FROM FinancialYears ORDER BY YearID DESC LIMIT 1');
    targetYearId = activeYear ? activeYear.YearID : 1;
  } else {
    const exists = await dbGet('SELECT YearID FROM FinancialYears WHERE YearID = ?', [targetYearId]);
    if (!exists) {
      const fallbackYear = await dbGet('SELECT YearID FROM FinancialYears WHERE IsClosed = 0 ORDER BY YearID DESC LIMIT 1')
        || await dbGet('SELECT YearID FROM FinancialYears ORDER BY YearID DESC LIMIT 1');
      targetYearId = fallbackYear ? fallbackYear.YearID : 1;
    }
  }
  yearId = targetYearId;

  let hasCash = await dbGet("SELECT id FROM BankAccounts WHERE year_id = ? AND is_cash_vault = 1", [yearId]);
  if (!hasCash) {
    const ins = await dbRun("INSERT INTO BankAccounts (bank_name, account_number, opening_balance, current_balance, start_date, year_id, is_cash_vault) VALUES (?, '', 0, 0, ?, ?, 1)", ['صندوق الكاش - Cash Vault', '2000-01-01', yearId]);
    hasCash = { id: ins.lastID };
  }
  if (hasCash && hasCash.id && !alignedYears.has(yearId)) {
    alignedYears.add(yearId);
    const vId = hasCash.id;
    await dbRun("UPDATE expenses SET account_id = ? WHERE year_id = ? AND (account_id IS NULL OR account_id NOT IN (SELECT id FROM BankAccounts WHERE year_id = ?))", [vId, yearId, yearId]).catch(() => {});
    await dbRun("UPDATE supplier_transactions SET account_id = ? WHERE year_id = ? AND (account_id IS NULL OR account_id NOT IN (SELECT id FROM BankAccounts WHERE year_id = ?))", [vId, yearId, yearId]).catch(() => {});
    await dbRun("UPDATE employee_transactions SET account_id = ? WHERE year_id = ? AND (account_id IS NULL OR account_id NOT IN (SELECT id FROM BankAccounts WHERE year_id = ?))", [vId, yearId, yearId]).catch(() => {});
    await dbRun("UPDATE CashGeneralVouchers SET account_id = ? WHERE year_id = ? AND (account_id IS NULL OR account_id NOT IN (SELECT id FROM BankAccounts WHERE year_id = ?))", [vId, yearId, yearId]).catch(() => {});
    await dbRun(
      "UPDATE BankTransactions SET from_account_id = ? WHERE year_id = ? AND reference_type IN ('expense', 'supplier', 'employee', 'voucher') AND (from_account_id IS NULL OR from_account_id NOT IN (SELECT id FROM BankAccounts WHERE year_id = ?))",
      [vId, yearId, yearId]
    ).catch(() => {});
  }
  const accounts = await dbAll("SELECT * FROM BankAccounts WHERE year_id = ?", [yearId]);
  const mappings = await dbAll("SELECT * FROM BankSalesMapping WHERE year_id = ?", [yearId]);
  
  for (const acc of accounts) {
    const startDate = acc.start_date || '2000-01-01';
    
    // Sum daily sales for mapped channels on or after start_date
    let salesAmt = 0;
    const myMappings = mappings.filter(m => m.bank_account_id === acc.id);
    let myChannels = myMappings.map(m => m.channel_name);
    
    // Auto-map cash_sales to cash vault if not explicitly mapped elsewhere
    if ((acc.is_cash_vault === 1 || acc.is_cash_vault === true) && !myChannels.includes('cash_sales')) {
      const isCashMappedElsewhere = mappings.some(m => m.channel_name === 'cash_sales');
      if (!isCashMappedElsewhere) {
        myChannels.push('cash_sales');
      }
    }

    for (const channel of myChannels) {
      if (['kbank', 'grab', 'lineman', 'krungsri', 'cash_sales'].includes(channel)) {
        const sumRow = await dbGet(`SELECT
          SUM(COALESCE(${channel}_minor, CAST(ROUND(${channel} * 100) AS INTEGER))) / 100.0 AS total
          FROM daily_reports WHERE year_id = ? AND report_date >= ?`, [yearId, startDate]);
        salesAmt += (sumRow ? (sumRow.total || 0) : 0);
      } else {
        const sumRow = await dbGet(
          `SELECT SUM(COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER))) / 100.0 AS total
           FROM DailyReportChannelSales WHERE year_id = ? AND channel_key = ? AND report_date >= ?`,
          [yearId, channel, startDate]
        );
        salesAmt += (sumRow ? (sumRow.total || 0) : 0);
      }
    }

    // Sum transactions on or after start_date
    const txSum = await dbGet(`
      SELECT 
        SUM(CASE WHEN tx_type = 'Transfer' AND to_account_id = ?
          THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END) / 100.0 as tx_in_transfer,
        SUM(CASE WHEN tx_type = 'Transfer' AND from_account_id = ?
          THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END) / 100.0 as tx_out_transfer,
        SUM(CASE WHEN tx_type IN ('Deposit', 'Receipt') AND to_account_id = ?
          THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END) / 100.0 as tx_deposit_receipt,
        SUM(CASE WHEN tx_type IN ('Withdrawal', 'Payment') AND from_account_id = ?
          THEN COALESCE(amount_minor, CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END) / 100.0 as tx_withdraw_payment
      FROM BankTransactions
      WHERE year_id = ? AND tx_date >= ? AND COALESCE(is_voided, 0) = 0
    `, [acc.id, acc.id, acc.id, acc.id, yearId, startDate]);

    const incoming = (txSum ? (txSum.tx_in_transfer || 0) + (txSum.tx_deposit_receipt || 0) : 0);
    const outgoing = (txSum ? (txSum.tx_out_transfer || 0) + (txSum.tx_withdraw_payment || 0) : 0);

    acc.current_balance = acc.opening_balance + salesAmt + incoming - outgoing;
  }
  
  return accounts;
}

async function saveBankAccount(acc) {
  const yearId = acc.year_id || 1;
  if (await isYearClosed(yearId)) throw new Error('السنة المالية مغلقة');
  await ensureBankNameIsNotPartner(acc.bank_name, acc.id);
  
  if (acc.id) {
    const previous = await dbGet('SELECT * FROM BankAccounts WHERE id = ?', [acc.id]);
    await dbRun('UPDATE BankAccounts SET bank_name=?, account_number=?, opening_balance=?, start_date=? WHERE id=?', 
      [acc.bank_name, acc.account_number, acc.opening_balance, acc.start_date, acc.id]);
    await logActivity('UPDATE', 'BankAccounts', acc.id,
      `تعديل حساب بنكي | قبل: ${bankAccountSummary(previous)} | بعد: ${bankAccountSummary(acc)}`, null, yearId);
    return { success: true, id: acc.id };
  } else {
    const res = await dbRun('INSERT INTO BankAccounts (bank_name, account_number, opening_balance, current_balance, start_date, year_id) VALUES (?, ?, ?, ?, ?, ?)', 
      [acc.bank_name, acc.account_number, acc.opening_balance, acc.opening_balance, acc.start_date, yearId]);
    await logActivity('INSERT', 'BankAccounts', res.lastID, `إضافة حساب بنكي: ${bankAccountSummary(acc)}`, null, yearId);
    return { success: true, id: res.lastID };
  }
}

async function deleteBankAccount(id) {
  const acc = await dbGet('SELECT * FROM BankAccounts WHERE id = ?', [id]);
  if (acc && await isYearClosed(acc.year_id)) {
    throw new Error('السنة المالية مغلقة، لا يمكن الحذف.');
  }
  if (acc && acc.is_cash_vault) {
    throw new Error('لا يمكن حذف الصندوق الرئيسي (Cash Vault).');
  }

  // Check if bank account has transactions
  const txs = await dbAll("SELECT id FROM BankTransactions WHERE from_account_id = ? OR to_account_id = ?", [id, id]);
  if (txs.length > 0) {
    throw new Error('لا يمكن حذف البنك لوجود حركات مالية مسجلة عليه. يرجى حذف الحركات أولاً.');
  }
  
  // Check mappings
  const mappings = await dbAll('SELECT * FROM BankSalesMapping WHERE bank_account_id = ?', [id]);
  await moveToTrash('BankAccounts', acc, acc ? acc.bank_name : `حساب بنكي #${id}`, acc ? acc.year_id : 1,
    mappings.map(row => ({ table: 'BankSalesMapping', row })));
  await dbRun("DELETE FROM BankSalesMapping WHERE bank_account_id = ?", [id]);
  await dbRun("DELETE FROM BankAccounts WHERE id = ?", [id]);
  await logActivity('DELETE', 'BankAccounts', id, `حذف حساب بنكي: ${bankAccountSummary(acc)}`, null, acc ? acc.year_id : 1);
  return { success: true };
}

async function getBankSalesMappings(yearId) {
  return await dbAll("SELECT * FROM BankSalesMapping WHERE year_id = ?", [yearId]);
}

async function saveBankSalesMappings(mappings, requestedYearId) {
  if (!Array.isArray(mappings)) throw new Error('قائمة ربط قنوات البيع غير صالحة');
  const yearId = requestedYearId || mappings[0]?.year_id || 1;
  if (await isYearClosed(yearId)) throw new Error('السنة المالية مغلقة');
  const channelNames = new Set();
  for (const mapping of mappings) {
    const channelName = String(mapping.channel_name || '').trim();
    const accountId = Number(mapping.bank_account_id);
    if (!channelName || !accountId) throw new Error('بيانات ربط قناة البيع غير مكتملة');
    if (channelNames.has(channelName)) throw new Error('لا يمكن ربط قناة البيع نفسها أكثر من مرة في السنة المالية');
    channelNames.add(channelName);
    const account = await dbGet('SELECT year_id FROM BankAccounts WHERE id = ?', [accountId]);
    if (!account) throw new Error('الحساب البنكي المرتبط بقناة البيع غير موجود');
    if (Number(account.year_id) !== Number(yearId)) {
      throw new Error('لا يمكن ربط قناة بيع بحساب بنكي من سنة مالية مختلفة');
    }
  }
  const previousMappings = await dbAll('SELECT channel_name, bank_account_id FROM BankSalesMapping WHERE year_id = ? ORDER BY channel_name', [yearId]);
  await withTransaction(async () => {
    await dbRun('DELETE FROM BankSalesMapping WHERE year_id = ?', [yearId]);
    if (mappings.length > 0) {
      for (const m of mappings) {
        await dbRun(
          'INSERT INTO BankSalesMapping (channel_name, bank_account_id, year_id) VALUES (?, ?, ?)',
          [String(m.channel_name).trim(), m.bank_account_id, yearId]
        );
      }
    }
  });
  const summarizeMappings = items => items.map(item => `${item.channel_name}→${item.bank_account_id}`).join(', ') || 'بدون ربط';
  await logActivity('UPDATE', 'BankSalesMapping', null,
    `تعديل ربط قنوات البيع بالبنوك | قبل: ${summarizeMappings(previousMappings)} | بعد: ${summarizeMappings(mappings)}`, null, yearId);
  return { success: true };
}

async function getBankTransactions(yearId, options = {}) {
  const requestedLimit = Number(options && options.limit);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 500) : null;
  const offset = limit ? Math.max(Number(options.offset) || 0, 0) : 0;
  const accountId = Number(options && options.accountId);
  let query = `
    SELECT t.*, 
           f.bank_name as from_bank_name,
           o.bank_name as to_bank_name,
           f.start_date as from_start_date,
           o.start_date as to_start_date
    FROM BankTransactions t
    LEFT JOIN BankAccounts f ON t.from_account_id = f.id
    LEFT JOIN BankAccounts o ON t.to_account_id = o.id
    WHERE t.year_id = ? AND COALESCE(t.is_voided, 0) = 0
  `;
  const params = [yearId];
  if (Number.isInteger(accountId) && accountId > 0) {
    query += ' AND (t.from_account_id = ? OR t.to_account_id = ?)';
    params.push(accountId, accountId);
  }
  query += ' ORDER BY t.tx_date DESC, t.id DESC';
  if (limit) {
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  return await dbAll(query, params);
}

async function saveBankTransaction(tx) {
  const yearId = tx.year_id || 1;
  await assertAccountingDateOpen(yearId, tx.tx_date);
  if (tx.id) {
    const previousTx = await dbGet('SELECT tx_date, year_id FROM BankTransactions WHERE id = ?', [tx.id]);
    if (previousTx) await assertAccountingDateOpen(previousTx.year_id, previousTx.tx_date);
  }
  let trackingWarning = '';

  if (tx.tx_type === 'Transfer') {
    const fromId = Number(tx.from_account_id);
    const toId = Number(tx.to_account_id);
    if (!fromId || !toId) throw new Error('يجب اختيار الحساب المصدر والحساب المستلم');
    if (fromId === toId) throw new Error('لا يمكن التحويل من الحساب إلى الحساب نفسه');
    const [fromAccount, toAccount] = await Promise.all([
      dbGet('SELECT bank_name, start_date, year_id FROM BankAccounts WHERE id = ?', [fromId]),
      dbGet('SELECT bank_name, start_date, year_id FROM BankAccounts WHERE id = ?', [toId])
    ]);
    if (!fromAccount || !toAccount) throw new Error('أحد حسابات التحويل غير موجود');
    if (Number(fromAccount.year_id) !== Number(yearId) || Number(toAccount.year_id) !== Number(yearId)) {
      throw new Error('لا يمكن التحويل بين حسابات من سنوات مالية مختلفة');
    }
    const invalidAccount = [fromAccount, toAccount].find(account => account.start_date && tx.tx_date < account.start_date);
    if (invalidAccount) {
      trackingWarning = `تاريخ التحويل يسبق تاريخ بدء تتبع حساب ${invalidAccount.bank_name} (${invalidAccount.start_date})، لذلك تظهر الحركة للتوثيق لكنها لا تُضاف مرة ثانية إلى رصيد هذا الحساب لأنها ضمن الرصيد الافتتاحي.`;
    }
  }
  
  if (tx.id) {
    const previous = await dbGet('SELECT * FROM BankTransactions WHERE id = ?', [tx.id]);
    await dbRun(`
      UPDATE BankTransactions 
      SET tx_date=?, tx_type=?, from_account_id=?, to_account_id=?, amount=?, description=?, partner_name=? 
      WHERE id=?
    `, [tx.tx_date, tx.tx_type, tx.from_account_id || null, tx.to_account_id || null, tx.amount, tx.description, tx.partner_name || null, tx.id]);
    await logActivity('UPDATE', 'BankTransactions', tx.id,
      `تعديل حركة بنكية | قبل: ${bankTransactionSummary(previous)} | بعد: ${bankTransactionSummary(tx)}`, null, yearId);
    await postManualBankJournal(tx.id, { ...tx, year_id: yearId });
    return { success: true, id: tx.id, warning: trackingWarning };
  } else {
    const res = await dbRun(`
      INSERT INTO BankTransactions (tx_date, tx_type, from_account_id, to_account_id, amount, description, partner_name, created_by, year_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [tx.tx_date, tx.tx_type, tx.from_account_id || null, tx.to_account_id || null, tx.amount, tx.description, tx.partner_name || null, tx.created_by, yearId]);
    await logActivity('INSERT', 'BankTransactions', res.lastID, `إضافة حركة بنكية: ${bankTransactionSummary(tx)}`, null, yearId);
    await postManualBankJournal(res.lastID, { ...tx, year_id: yearId });
    return { success: true, id: res.lastID, warning: trackingWarning };
  }
}

async function postManualBankJournal(id, tx) {
  const yearId = tx.year_id || 1;
  const amountMinor = accounting.toMinor(tx.amount);
  if (amountMinor <= 0) return;
  const getBankLedger = async bankId => {
    const bank = await dbGet('SELECT * FROM BankAccounts WHERE id = ? AND year_id = ?', [bankId, yearId]);
    if (!bank) return accounting.getAccountByCode(yearId, '1090');
    return accounting.ensureBankLedgerAccount(bank.id, yearId, bank.bank_name, bank.is_cash_vault);
  };
  let debitAccount;
  let creditAccount;
  if (tx.tx_type === 'Transfer') {
    debitAccount = await getBankLedger(tx.to_account_id);
    creditAccount = await getBankLedger(tx.from_account_id);
  } else if (tx.tx_type === 'Deposit') {
    debitAccount = await getBankLedger(tx.to_account_id || tx.from_account_id);
    creditAccount = await accounting.getAccountByCode(yearId, '3010');
  } else {
    debitAccount = await accounting.getAccountByCode(yearId, '5020');
    creditAccount = await getBankLedger(tx.from_account_id);
  }
  await accounting.postSourceEntry({
    yearId,
    date: tx.tx_date,
    description: tx.description || `حركة بنكية ${tx.tx_type}`,
    sourceType: 'bank',
    sourceKey: id,
    lines: [
      { accountId: debitAccount.id, debitMinor: amountMinor, creditMinor: 0 },
      { accountId: creditAccount.id, debitMinor: 0, creditMinor: amountMinor }
    ]
  });
}

async function deleteBankTransaction(id) {
  const tx = await dbGet("SELECT * FROM BankTransactions WHERE id = ?", [id]);
  if (tx) await assertAccountingDateOpen(tx.year_id, tx.tx_date);
  
  if (tx) {
    await accounting.reverseSourceEntries(tx.year_id, 'bank', id, tx.tx_date, `عكس حركة بنكية ${id}`);
  }
  await dbRun(
    `UPDATE BankTransactions SET is_voided = 1, voided_at = CURRENT_TIMESTAMP,
     voided_by = ?, void_reason = ? WHERE id = ? AND COALESCE(is_voided, 0) = 0`,
    [getActiveUser(), `إلغاء حركة بنكية ${id}`, id]
  );
  await logActivity('CANCEL', 'BankTransactions', id, `إلغاء حركة بنكية: ${bankTransactionSummary(tx)}`, null, tx ? tx.year_id : 1);
  return { success: true };
}

module.exports = {
  getBankAccountsWithBalance,
  saveBankAccount,
  deleteBankAccount,
  getBankSalesMappings,
  saveBankSalesMappings,
  getBankTransactions,
  saveBankTransaction,
  deleteBankTransaction
};
