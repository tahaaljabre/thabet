const { dbGet, dbRun } = require('./database');

const SOURCES = Object.freeze({
  sales: { table: 'daily_reports', column: 'voucher_number' },
  expenses: { table: 'expenses', column: 'voucher_number' },
  supplier: { table: 'supplier_transactions', column: 'voucher_no' }
});

async function getNextVoucherNumber(voucherType, yearId) {
  const source = SOURCES[voucherType];
  const numericYearId = Number(yearId);
  if (!source) throw new Error('نوع تسلسل السند غير معروف');
  if (!Number.isInteger(numericYearId) || numericYearId <= 0) {
    throw new Error('السنة المالية مطلوبة لتوليد رقم السند');
  }

  // This function is called from inside the caller's write transaction.
  // The upsert synchronizes a migrated database with its largest old number,
  // then the update reserves exactly one new number for the current save.
  await dbRun(`
    INSERT INTO VoucherSequences (voucher_type, year_id, last_number)
    SELECT ?, ?, COALESCE(MAX(${source.column}), 0)
    FROM ${source.table}
    WHERE year_id = ?
    ON CONFLICT(voucher_type, year_id) DO UPDATE SET
      last_number = MAX(VoucherSequences.last_number, excluded.last_number)
  `, [voucherType, numericYearId, numericYearId]);
  await dbRun(
    'UPDATE VoucherSequences SET last_number = last_number + 1 WHERE voucher_type = ? AND year_id = ?',
    [voucherType, numericYearId]
  );
  const sequence = await dbGet(
    'SELECT last_number FROM VoucherSequences WHERE voucher_type = ? AND year_id = ?',
    [voucherType, numericYearId]
  );
  if (!sequence) throw new Error('تعذر توليد رقم السند');
  return Number(sequence.last_number);
}

module.exports = { getNextVoucherNumber };
