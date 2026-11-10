const {
  saveEmployee,
  getEmployees,
  getEmployeeCategories,
  saveEmployeeCategory,
  deleteEmployeeCategory,
  getEmployeePhoto,
  saveEmployeeTransaction,
  getEmployeeTransactions,
  getDetailedEmployeeStatement,
  getAllEmployeesStatement,
  getAccruedSalary,
  canDisburseSalaryOnDate
} = require('../../main/services/employees.service');
const { closeDatabase, waitForDatabaseReady } = require('../../main/services/database');

describe('Employees Service', () => {
  beforeAll(async () => {
    await waitForDatabaseReady();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('should save a new employee', async () => {
    const res = await saveEmployee({
      name: 'Test Employee',
      phone: '01010101010',
      job_title: 'Manager',
      salary: 5000,
      monthly_accrual_start_date: '2023-01-01',
      year_id: 1
    });

    expect(res).toBeDefined();

    const employees = await getEmployees(1);
    const emp = employees.find(e => e.id === res);
    expect(emp).toBeDefined();
    expect(emp.name).toBe('Test Employee');
    
    expect(emp.salary).toBe(5000);
  });

  it('should persist an edited salary and expose it immediately', async () => {
    const employees = await getEmployees(1);
    const emp = employees.find(e => e.name === 'Test Employee');
    await saveEmployee({
      ...emp,
      salary: 6200,
      year_id: 1
    });

    const updated = (await getEmployees(1)).find(e => e.id === emp.id);
    expect(updated.salary).toBe(6200);
  });

  it('should load employee photos only on demand', async () => {
    const emp = (await getEmployees(1)).find(e => e.name === 'Test Employee');
    const photo = 'data:image/jpeg;base64,dGVzdA==';
    await saveEmployee({ ...emp, photo, year_id: 1 });
    const listEmployee = (await getEmployees(1)).find(e => e.id === emp.id);
    expect(listEmployee.photo).toBeUndefined();
    expect(await getEmployeePhoto(emp.id)).toBe(photo);
  });

  it('should save an employee transaction (salary advance) and update statement', async () => {
    const employees = await getEmployees(1);
    const emp = employees.find(e => e.name === 'Test Employee');

    const txRes = await saveEmployeeTransaction({
      employee_id: emp.id,
      tx_date: '2023-05-15',
      amount: 1000,
      deductions: 0,
      allowances: 0,
      attendance_days: 0,
      absence_days: 0,
      notes: 'Salary Advance',
      year_id: 1
    });

    expect(txRes).toBeDefined();

    const txs = await getEmployeeTransactions(emp.id, 1);
    expect(txs.length).toBe(1);
    expect(txs[0].amount).toBe(1000);

    // Fetch statement to verify calculations (should include accrual rows and transaction rows)
    // Since startDate is 2023-01-01, by end of year there should be multiple monthly salaries accrued.
    const statement = await getDetailedEmployeeStatement(emp.id, '2023-01-01', '2023-12-31', 1);
    
    expect(statement).toBeDefined();
    expect(statement.transactions.length).toBeGreaterThan(1); // 1 transaction + multiple monthly accruals
    
    const advanceRow = statement.transactions.find(r => r.amount === 1000);
    expect(advanceRow).toBeDefined();
  });

  it('allows paying an accrued prior-month salary before the current month due day', async () => {
    const emp = (await getEmployees(1)).find(e => e.name === 'Test Employee');
    const eligibility = await canDisburseSalaryOnDate(emp.id, '2023-02-05', 1);

    expect(eligibility.allowed).toBe(true);
    expect(eligibility.payableAmount).toBeGreaterThan(0);
  });

  it('prorates the first salary month when employment starts after day one', () => {
    const employee = {
      salary: 16500,
      monthly_accrual_start_date: '2026-07-12',
      is_archived: 0
    };
    const history = [{ salary: 16500, effective_date: '2026-07-12' }];

    expect(getAccruedSalary(employee, history, '2026-07-31', 28)).toBeCloseTo(10645.16, 2);
  });

  it('blocks salary payment when no salary has accrued by the selected date', async () => {
    const emp = (await getEmployees(1)).find(e => e.name === 'Test Employee');
    const eligibility = await canDisburseSalaryOnDate(emp.id, '2023-01-05', 1);

    expect(eligibility.allowed).toBe(false);
    expect(eligibility.reasonCode).toBe('NO_ACCRUED_BALANCE');
  });

  it('stops salary accrual during archive periods without deleting prior salary', () => {
    const employee = {
      salary: 100,
      monthly_accrual_start_date: '2026-01-01',
      is_archived: 0
    };
    const history = [{ salary: 100, effective_date: '2026-01-01' }];
    const archivePeriods = [{
      archived_at: '2026-03-15',
      restored_at: '2026-06-01'
    }];

    const accrued = getAccruedSalary(employee, history, '2026-12-31', 28, archivePeriods);

    expect(accrued).toBe(900);
  });

  it('keeps an archived employee balance while blocking future salary accruals', () => {
    const employee = {
      salary: 100,
      monthly_accrual_start_date: '2026-01-01',
      is_archived: 1,
      archived_at: '2026-07-15'
    };
    const history = [{ salary: 100, effective_date: '2026-01-01' }];

    const accrued = getAccruedSalary(employee, history, '2026-12-31', 28);

    expect(accrued).toBe(600);
  });

  it('manages employee categories, links old employees, and filters general statements by category', async () => {
    const initialCategories = await getEmployeeCategories();
    expect(initialCategories.length).toBeGreaterThanOrEqual(2);

    const customCat = await saveEmployeeCategory({ name: 'إدارة عليا' });
    expect(customCat.id).toBeDefined();

    // Link existing old employee ("Test Employee") to a category
    const employeesBefore = await getEmployees(1);
    const existingEmp = employeesBefore.find(e => e.name === 'Test Employee');
    expect(existingEmp.category_id).toBeNull();

    await saveEmployee({
      ...existingEmp,
      category_id: customCat.id,
      year_id: 1
    });

    const employeesAfter = await getEmployees(1);
    const updatedEmp = employeesAfter.find(e => e.id === existingEmp.id);
    expect(updatedEmp.category_id).toBe(customCat.id);
    expect(updatedEmp.category_name).toBe('إدارة عليا');

    // Filter general statement by category
    const catStatement = await getAllEmployeesStatement('2023-01-01', '2023-12-31', 1, customCat.id);
    expect(catStatement.some(s => s.id === existingEmp.id)).toBe(true);
    expect(catStatement.find(s => s.id === existingEmp.id).category_name).toBe('إدارة عليا');

    const uncategorizedStatement = await getAllEmployeesStatement('2023-01-01', '2023-12-31', 1, 'uncategorized');
    expect(uncategorizedStatement.some(s => s.id === existingEmp.id)).toBe(false);

    // Deleting the category unlinks the employee safely without deleting the employee
    await deleteEmployeeCategory(customCat.id);
    const afterDeleteEmp = (await getEmployees(1)).find(e => e.id === existingEmp.id);
    expect(afterDeleteEmp).toBeDefined();
    expect(afterDeleteEmp.category_id).toBeNull();
  });

  it('shows zero balance in archived employee statement when all accrued dues were paid', async () => {
    const { archiveItem } = require('../../main/services/archive.service');
    const empId = await saveEmployee({
      name: 'Settled Archived Employee',
      phone: '0555555555',
      salary: 3000,
      monthly_accrual_start_date: '2026-01-01',
      year_id: 1
    });

    // Pay the accrued salary up to 2026-01-28 and archive the employee
    const allStats = await getAllEmployeesStatement('', '', 1);
    const empStat = allStats.find(s => s.id === empId);
    expect(empStat).toBeDefined();
    expect(empStat.closingBalance).toBeGreaterThan(0);

    await saveEmployeeTransaction({
      employee_id: empId,
      tx_date: '2026-02-01',
      amount: empStat.closingBalance,
      deductions: 0,
      allowances: 0,
      notes: 'تصفية مستحقات كاملة',
      year_id: 1
    });

    await archiveItem({ type: 'employee', id: empId, state: true });

    const statement = await getDetailedEmployeeStatement(empId, '', '', 1);
    expect(statement.previousBalance).toBe(0);
    expect(statement.closingBalance).toBe(0);
  });
});
