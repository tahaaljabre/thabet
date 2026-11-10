const { ipcMain } = require('electron');
const employeesService = require('../services/employees.service');
const { requireAuth } = require('./auth.helper');

function registerEmployeesHandlers() {
  ipcMain.handle('get-all-employees-statement', requireAuth({ permission: 'employees' }, async (event, startDate, endDate, yearId, categoryId) => {
    return await employeesService.getAllEmployeesStatement(startDate, endDate, yearId, categoryId);
  }));

  ipcMain.handle('get-employee-categories', requireAuth({ permission: 'employees' }, async () => {
    return await employeesService.getEmployeeCategories();
  }));

  ipcMain.handle('save-employee-category', requireAuth({ role: 'manager' }, async (event, category) => {
    return await employeesService.saveEmployeeCategory(category);
  }));

  ipcMain.handle('delete-employee-category', requireAuth({ role: 'manager' }, async (event, id) => {
    return await employeesService.deleteEmployeeCategory(id);
  }));

  ipcMain.handle('get-detailed-employee-statement', requireAuth({ permission: 'employees' }, async (event, empId, startDate, endDate, yearId) => {
    return await employeesService.getDetailedEmployeeStatement(empId, startDate, endDate, yearId);
  }));

  ipcMain.handle('get-employees', requireAuth({ permission: 'employees' }, async (event, yearId) => {
    return await employeesService.getEmployees(yearId);
  }));

  ipcMain.handle('get-employee-photo', requireAuth({ permission: 'employees' }, async (event, empId) => {
    return await employeesService.getEmployeePhoto(empId);
  }));

  ipcMain.handle('save-employee', requireAuth({ role: 'manager' }, async (event, emp) => {
    return await employeesService.saveEmployee(emp);
  }));

  ipcMain.handle('get-employee-salary-history', requireAuth({ permission: 'employees' }, async (event, empId) => {
    return await employeesService.getEmployeeSalaryHistory(empId);
  }));

  ipcMain.handle('add-employee-salary-change', requireAuth({ role: 'manager' }, async (event, empId, salary, effectiveDate) => {
    return await employeesService.addEmployeeSalaryChange(empId, salary, effectiveDate);
  }));

  ipcMain.handle('delete-employee-salary-change', requireAuth({ role: 'manager' }, async (event, id) => {
    return await employeesService.deleteEmployeeSalaryChange(id);
  }));

  ipcMain.handle('delete-employee', requireAuth({ role: 'manager' }, async (event, id) => {
    return await employeesService.deleteEmployee(id);
  }));

  ipcMain.handle('get-employee-transactions', requireAuth({ permission: 'employees' }, async (event, empId, yearId) => {
    return await employeesService.getEmployeeTransactions(empId, yearId);
  }));

  ipcMain.handle('get-employee-transaction-by-id', requireAuth({ permission: 'employees' }, async (event, id) => {
    return await employeesService.getEmployeeTransactionById(id);
  }));

  ipcMain.handle('save-employee-transaction', requireAuth({ permission: 'employees' }, async (event, tx) => {
    return await employeesService.saveEmployeeTransaction(tx);
  }));

  ipcMain.handle('delete-employee-transaction', requireAuth({ role: 'manager' }, async (event, id) => {
    return await employeesService.deleteEmployeeTransaction(id);
  }));

  ipcMain.handle('can-disburse-salary-on-date', requireAuth({ permission: 'employees' }, async (event, employeeId, txDate, yearId) => {
    return await employeesService.canDisburseSalaryOnDate(employeeId, txDate, yearId);
  }));

  ipcMain.handle('get-salary-accrual-day', requireAuth({ permission: 'employees' }, async () => {
    return await employeesService.getSalaryAccrualDaySetting();
  }));
}

module.exports = {
  registerEmployeesHandlers
};
