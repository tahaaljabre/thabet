const { dbGet, dbAll, dbRun, getActiveUser, logActivity, isYearClosed } = require('./database');
const { withTransaction } = require('./database/transaction');

const ALLOWED_TABLES = new Set([
  'BankAccounts', 'BankTransactions', 'BankSalesMapping',
  'suppliers', 'supplier_transactions', 'employees', 'employee_transactions',
  'employee_salary_history', 'CashGeneralVouchers'
]);

async function restoreFinancialVoucher(item, payload) {
  const rows = [payload.primary, ...(payload.related || [])].map(entry => entry.row);
  if (payload.primary.table === 'daily_reports') {
    const row = rows[0];
    const { saveReportState } = require('./reports/mutations');
    await saveReportState({
      reportDate: row.report_date,
      cashierName: row.cashier_name,
      cashierUser: row.cashier_user,
      year_id: row.year_id,
      sales: {
        cash: row.cash_sales,
        kbank: row.kbank,
        grab: row.grab,
        lineman: row.lineman,
        krungsri: row.krungsri
      },
      cashierActual: row.cashier_actual
    });
  } else {
    const { saveExpensesReport } = require('./expenses.service');
    await saveExpensesReport({
      reportDate: rows[0].report_date,
      year_id: rows[0].year_id,
      restoreVoucherNumber: rows[0].voucher_number,
      purchases: rows.map(row => ({
        name: row.name,
        qty: row.qty,
        amount: row.amount,
        category: row.category,
        account_id: row.account_id
      }))
    });
  }
  await dbRun('DELETE FROM TrashItems WHERE id=?', [item.id]);
  await logActivity('RESTORE', payload.primary.table, item.record_id,
    `استعادة من سلة المحذوفات: ${item.display_name}`, null, item.year_id);
  return { success: true };
}

async function moveToTrash(entityType, row, displayName, yearId, related = []) {
  if (!row) return null;
  const payload = JSON.stringify({ primary: { table: entityType, row }, related });
  const result = await dbRun(
    'INSERT INTO TrashItems (entity_type, record_id, display_name, payload, deleted_by, year_id) VALUES (?, ?, ?, ?, ?, ?)',
    [entityType, row.id ?? row.channel_name ?? row.voucher_number ?? row.report_date ?? null,
      displayName || entityType, payload, getActiveUser(), yearId || row.year_id || 1]
  );
  return result.lastID;
}

async function getTrashItems(yearId) {
  return dbAll('SELECT id, entity_type, record_id, display_name, deleted_at, deleted_by, year_id FROM TrashItems WHERE year_id = ? ORDER BY deleted_at DESC, id DESC', [yearId || 1]);
}

async function insertRow(table, row) {
  if (!ALLOWED_TABLES.has(table)) throw new Error('نوع السجل غير مسموح باستعادته');
  const columns = Object.keys(row);
  if (!columns.length) throw new Error('بيانات الاستعادة فارغة');
  const names = columns.map(name => `"${name.replace(/"/g, '')}"`).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  await dbRun(`INSERT INTO "${table}" (${names}) VALUES (${placeholders})`, columns.map(name => row[name]));
}

async function restoreTrashItem(id) {
  const item = await dbGet('SELECT * FROM TrashItems WHERE id = ?', [id]);
  if (!item) throw new Error('العنصر غير موجود في سلة المحذوفات');
  if (await isYearClosed(item.year_id)) throw new Error('لا يمكن الاستعادة إلى سنة مالية مغلقة');
  const payload = JSON.parse(item.payload);
  if (payload.primary.table === 'daily_reports' || payload.primary.table === 'expenses') {
    return restoreFinancialVoucher(item, payload);
  }
  try {
    return await withTransaction(async () => {
      await insertRow(payload.primary.table, payload.primary.row);
      for (const related of payload.related || []) await insertRow(related.table, related.row);
      await dbRun('DELETE FROM TrashItems WHERE id = ?', [id]);
      await logActivity('RESTORE', payload.primary.table, item.record_id, `استعادة من سلة المحذوفات: ${item.display_name}`, null, item.year_id);
      return { success: true };
    });
  } catch (error) {
    if (/UNIQUE|PRIMARY KEY/i.test(error.message)) throw new Error('تعذر الاستعادة لأن رقم السجل مستخدم حاليًا');
    throw error;
  }
}

async function permanentlyDeleteTrashItem(id) {
  const item = await dbGet('SELECT * FROM TrashItems WHERE id = ?', [id]);
  if (!item) throw new Error('العنصر غير موجود في سلة المحذوفات');
  await dbRun('DELETE FROM TrashItems WHERE id = ?', [id]);
  await logActivity('PURGE', 'TrashItems', item.record_id, `حذف نهائي من سلة المحذوفات: ${item.display_name}`, null, item.year_id);
  return { success: true };
}

module.exports = { moveToTrash, getTrashItems, restoreTrashItem, permanentlyDeleteTrashItem };
