import {
  getEmployees,
  getAllEmployeesStatement,
  saveEmployee,
  getEmployeeSalaryHistory,
  addEmployeeSalaryChange,
  deleteEmployeeSalaryChange,
  deleteEmployee,
  getEmployeeTransactions,
  saveEmployeeTransaction,
  deleteEmployeeTransaction,
  archiveItem,
  getDetailedEmployeeStatement
} from '../../core/ipc.js';

export async function fetchDetailedEmployeeStatement(empId, startDate, endDate, yearId) {
  return await getDetailedEmployeeStatement(empId, startDate, endDate, yearId);
}

export async function fetchEmployees(yearId) {
  return await getEmployees(yearId);
}

export async function createOrUpdateEmployee(emp) {
  return await saveEmployee(emp);
}

export async function removeEmployee(id) {
  return await deleteEmployee(id);
}

export async function fetchEmployeeTransactions(employeeId, yearId) {
  return await getEmployeeTransactions(employeeId, yearId);
}

export async function saveTransaction(tx) {
  return await saveEmployeeTransaction(tx);
}

export async function deleteTransaction(id) {
  return await deleteEmployeeTransaction(id);
}

export async function fetchBankAccounts(yearId) {
  return await getBankAccounts(yearId);
}

export async function archiveEmployeeItem(type, id) {
  return await archiveItem(type, id);
}

export async function fetchAllEmployeesStatement(yearId) {
  return await getAllEmployeesStatement(yearId);
}

export async function fetchSalaryHistory(employeeId) {
  return await getEmployeeSalaryHistory(employeeId);
}

export async function saveSalaryChange(change) {
  return await addEmployeeSalaryChange(change);
}

export async function removeSalaryChange(id) {
  return await deleteEmployeeSalaryChange(id);
}
