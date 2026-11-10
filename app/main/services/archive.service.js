const { dbAll, dbRun } = require('./database');
const { dbGet } = require('./database');
const { getLocalDateString } = require('../utils/date');

async function archiveItem({ type, id, state }) {
  const isArchived = state ? 1 : 0;
  if (type === 'employee') {
    const employee = await dbGet('SELECT id, is_archived FROM employees WHERE id=?', [id]);
    if (!employee) throw new Error('الموظف غير موجود');
    if (Number(employee.is_archived || 0) === isArchived) return { changes: 0 };

    const today = getLocalDateString();
    await dbRun('BEGIN TRANSACTION');
    try {
      if (isArchived) {
        await dbRun('UPDATE employees SET is_archived=1, archived_at=? WHERE id=?', [today, id]);
        await dbRun(`
          INSERT INTO employee_archive_periods (employee_id, archived_at)
          VALUES (?, ?)
        `, [id, today]);
      } else {
        await dbRun('UPDATE employees SET is_archived=0, archived_at=NULL WHERE id=?', [id]);
        await dbRun(`
          UPDATE employee_archive_periods
          SET restored_at=?
          WHERE id=(
            SELECT id FROM employee_archive_periods
            WHERE employee_id=? AND restored_at IS NULL
            ORDER BY archived_at DESC, id DESC LIMIT 1
          )
        `, [today, id]);
      }
      await dbRun('COMMIT');
      return { changes: 1 };
    } catch (error) {
      await dbRun('ROLLBACK').catch(() => {});
      throw error;
    }
  } else if (type === 'supplier') {
    return await dbRun("UPDATE suppliers SET is_archived=? WHERE id=?", [isArchived, id]);
  } else if (type === 'employee_tx') {
    return await dbRun("UPDATE employee_transactions SET is_archived=? WHERE id=?", [isArchived, id]);
  } else if (type === 'supplier_tx') {
    return await dbRun("UPDATE supplier_transactions SET is_archived=? WHERE id=?", [isArchived, id]);
  }
}

async function getArchivedEmployees() {
  return await dbAll(`
    SELECT e.*, fy.YearName AS financial_year,
      (SELECT COUNT(*) FROM employee_transactions tx WHERE tx.employee_id = e.id) AS transaction_count
    FROM employees e
    LEFT JOIN FinancialYears fy ON fy.YearID = e.year_id
    WHERE COALESCE(e.is_archived, 0) = 1
    ORDER BY e.created_at DESC, e.id DESC
  `);
}

async function getArchivedSuppliers() {
  return await dbAll(`
    SELECT s.*, fy.YearName AS financial_year,
      (SELECT COUNT(*) FROM supplier_transactions tx WHERE tx.supplier_id = s.id) AS transaction_count
    FROM suppliers s
    LEFT JOIN FinancialYears fy ON fy.YearID = s.year_id
    WHERE COALESCE(s.is_archived, 0) = 1
    ORDER BY s.created_at DESC, s.id DESC
  `);
}

async function getArchivedEmployeeTransactions() {
  return await dbAll(`
    SELECT tx.*, e.name AS emp_name, COALESCE(e.is_archived, 0) AS parent_archived, fy.YearName AS financial_year
    FROM employee_transactions tx
    JOIN employees e ON tx.employee_id = e.id
    LEFT JOIN FinancialYears fy ON fy.YearID = tx.year_id
    WHERE COALESCE(tx.is_archived, 0) = 1 OR COALESCE(e.is_archived, 0) = 1
    ORDER BY tx.tx_date DESC, tx.id DESC
  `);
}

async function getArchivedSupplierTransactions() {
  return await dbAll(`
    SELECT tx.*, s.name AS sup_name, COALESCE(s.is_archived, 0) AS parent_archived, fy.YearName AS financial_year
    FROM supplier_transactions tx
    JOIN suppliers s ON tx.supplier_id = s.id
    LEFT JOIN FinancialYears fy ON fy.YearID = tx.year_id
    WHERE COALESCE(tx.is_archived, 0) = 1 OR COALESCE(s.is_archived, 0) = 1
    ORDER BY tx.tx_date DESC, tx.id DESC
  `);
}

module.exports = {
  archiveItem,
  getArchivedEmployees,
  getArchivedSuppliers,
  getArchivedEmployeeTransactions,
  getArchivedSupplierTransactions
};
