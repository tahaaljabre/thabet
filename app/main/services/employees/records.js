const { dbGet, dbAll, dbRun, isYearClosed, logActivity } = require('../database');
const { moveToTrash } = require('../trash.service');
const { getLocalDateString } = require('../../utils/date');
const { withTransaction } = require('../database/transaction');

async function getEmployees(yearId) {
  return await dbAll(`
    SELECT e.id, e.name, e.phone, e.created_at, e.is_archived, e.archived_at,
      e.monthly_accrual_start_date, e.year_id, e.category_id,
      c.name AS category_name,
      COALESCE((
        SELECT h.salary FROM employee_salary_history h
        WHERE h.employee_id = e.id AND h.effective_date <= date('now', 'localtime')
        ORDER BY h.effective_date DESC, h.id DESC LIMIT 1
      ), e.salary, 0) AS salary
    FROM employees e
    LEFT JOIN employee_categories c ON c.id = e.category_id
    WHERE COALESCE(e.is_archived, 0) = 0 AND e.year_id = ?
    ORDER BY e.created_at DESC
  `, [yearId]);
}

async function getEmployeeCategories() {
  return await dbAll(`
    SELECT c.id, c.name, c.created_at,
      (SELECT COUNT(*) FROM employees e WHERE e.category_id = c.id AND COALESCE(e.is_archived, 0) = 0) AS employee_count
    FROM employee_categories c
    ORDER BY c.id ASC
  `);
}

async function saveEmployeeCategory(category) {
  const name = String(category?.name || '').trim();
  if (!name) throw new Error('اسم الفئة مطلوب');
  if (category?.id) {
    const id = Number(category.id);
    const existing = await dbGet('SELECT id FROM employee_categories WHERE name = ? AND id <> ?', [name, id]);
    if (existing) throw new Error('هذه الفئة موجودة مسبقاً');
    await dbRun('UPDATE employee_categories SET name = ? WHERE id = ?', [name, id]);
    await logActivity('UPDATE', 'employee_categories', id, `تعديل فئة موظفين: ${name}`, null, 1);
    return { id, name };
  }
  const existing = await dbGet('SELECT id FROM employee_categories WHERE name = ?', [name]);
  if (existing) throw new Error('هذه الفئة موجودة مسبقاً');
  const res = await dbRun('INSERT INTO employee_categories (name) VALUES (?)', [name]);
  await logActivity('INSERT', 'employee_categories', res.lastID, `إضافة فئة موظفين: ${name}`, null, 1);
  return { id: res.lastID, name };
}

async function deleteEmployeeCategory(id) {
  const categoryId = Number(id);
  const existing = await dbGet('SELECT * FROM employee_categories WHERE id = ?', [categoryId]);
  if (!existing) throw new Error('الفئة غير موجودة');
  return withTransaction(async () => {
    await dbRun('UPDATE employees SET category_id = NULL WHERE category_id = ?', [categoryId]);
    const res = await dbRun('DELETE FROM employee_categories WHERE id = ?', [categoryId]);
    await logActivity('DELETE', 'employee_categories', categoryId, `حذف فئة موظفين: ${existing.name}`, null, 1);
    return { success: true, changes: res.changes };
  });
}

async function getEmployeePhoto(empId) {
  const row = await dbGet('SELECT photo FROM employees WHERE id=?', [empId]);
  return row ? (row.photo || '') : '';
}

async function saveEmployee(emp) {
  const yearId = emp.year_id || 1;
  if (await isYearClosed(yearId)) throw new Error('السنة المالية مغلقة');
  const salary = Number(emp.salary);
  if (!emp.name || !String(emp.name).trim()) throw new Error('اسم الموظف مطلوب');
  if (!Number.isFinite(salary) || salary < 0) throw new Error('الراتب يجب أن يكون رقمًا صحيحًا وغير سالب');
  const rawCategoryId = emp.category_id;
  const parsedCategoryId = rawCategoryId !== undefined && rawCategoryId !== null && rawCategoryId !== ''
    ? Number(rawCategoryId)
    : null;
  const normalizedCategoryId = Number.isFinite(parsedCategoryId) && parsedCategoryId > 0 ? parsedCategoryId : null;
  if(emp.id) {
    const previous = await dbGet('SELECT * FROM employees WHERE id = ?', [emp.id]);
    if (!previous) throw new Error('الموظف غير موجود');
    const nextCategoryId = rawCategoryId !== undefined ? normalizedCategoryId : (previous.category_id ?? null);
    const latestSalary = await dbGet('SELECT salary FROM employee_salary_history WHERE employee_id=? ORDER BY effective_date DESC, id DESC LIMIT 1', [emp.id]);
    const previousSalary = latestSalary ? Number(latestSalary.salary) : Number(previous.salary || 0);
    return withTransaction(async () => {
      await dbRun("UPDATE employees SET name=?, phone=?, salary=?, photo=?, monthly_accrual_start_date=?, category_id=? WHERE id=?", [String(emp.name).trim(), emp.phone, salary, emp.photo, emp.monthly_accrual_start_date, nextCategoryId, emp.id]);
      if (salary !== previousSalary) {
        await dbRun("INSERT INTO employee_salary_history (employee_id, salary, effective_date) VALUES (?, ?, ?)", [emp.id, salary, getLocalDateString()]);
      }
      await logActivity('UPDATE', 'employees', emp.id, `تعديل الموظف: ${emp.name} | الراتب: ${previousSalary} ← ${salary}`, null, yearId);
      return emp.id;
    });
  } else {
    let today = getLocalDateString();
    let startDateStr = emp.monthly_accrual_start_date || today;
    const res = await dbRun("INSERT INTO employees (name, phone, salary, monthly_accrual_start_date, photo, year_id, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)", [String(emp.name).trim(), emp.phone, salary, startDateStr, emp.photo, yearId, normalizedCategoryId]);
    // Insert initial salary history
    await dbRun("INSERT INTO employee_salary_history (employee_id, salary, effective_date) VALUES (?, ?, ?)", [res.lastID, salary, startDateStr]);
    await logActivity('INSERT', 'employees', res.lastID, `إضافة الموظف: ${emp.name} براتب ${emp.salary || 0}`, null, yearId);
    return res.lastID;
  }
}

async function getEmployeeSalaryHistory(empId) {
  return await dbAll("SELECT * FROM employee_salary_history WHERE employee_id=? ORDER BY effective_date DESC, created_at DESC", [empId]);
}

async function addEmployeeSalaryChange(empId, salary, effectiveDate) {
  const employee = await dbGet('SELECT year_id FROM employees WHERE id=?', [empId]);
  if (!employee) throw new Error('الموظف غير موجود');
  if (await isYearClosed(employee.year_id)) throw new Error('السنة المالية مغلقة');
  const numericSalary = Number(salary);
  if (!Number.isFinite(numericSalary) || numericSalary < 0 || !effectiveDate) throw new Error('بيانات الراتب غير صالحة');
  const res = await dbRun("INSERT INTO employee_salary_history (employee_id, salary, effective_date) VALUES (?, ?, ?)", [empId, numericSalary, effectiveDate]);
  if (effectiveDate <= getLocalDateString()) {
    await dbRun('UPDATE employees SET salary=? WHERE id=?', [numericSalary, empId]);
  }
  return res.lastID;
}

async function deleteEmployeeSalaryChange(id) {
  const record = await dbGet('SELECT employee_id FROM employee_salary_history WHERE id=?', [id]);
  if (!record) return false;
  const employee = await dbGet('SELECT year_id FROM employees WHERE id=?', [record.employee_id]);
  if (employee && await isYearClosed(employee.year_id)) throw new Error('السنة المالية مغلقة');
  await dbRun("DELETE FROM employee_salary_history WHERE id=?", [id]);
  const current = await dbGet(`SELECT salary FROM employee_salary_history
    WHERE employee_id=? AND effective_date <= ? ORDER BY effective_date DESC, id DESC LIMIT 1`,
    [record.employee_id, getLocalDateString()]);
  await dbRun('UPDATE employees SET salary=? WHERE id=?', [current ? current.salary : 0, record.employee_id]);
  return true;
}

async function deleteEmployee(id) {
  const emp = await dbGet('SELECT * FROM employees WHERE id = ?', [id]);
  if (emp && await isYearClosed(emp.year_id)) throw new Error('السنة المالية مغلقة');
  const empName = emp ? emp.name : '';
  await moveToTrash('employees', emp, emp ? emp.name : `موظف #${id}`, emp ? emp.year_id : 1);
  await dbRun("DELETE FROM employees WHERE id=?", [id]);
  await logActivity('DELETE', 'employees', id, `حذف الموظف: ${empName}`, null, emp ? emp.year_id : 1);
  return true;
}

module.exports = {
  getEmployees,
  getEmployeeCategories,
  saveEmployeeCategory,
  deleteEmployeeCategory,
  getEmployeePhoto,
  saveEmployee,
  getEmployeeSalaryHistory,
  addEmployeeSalaryChange,
  deleteEmployeeSalaryChange,
  deleteEmployee
};
