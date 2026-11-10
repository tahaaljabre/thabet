/**
 * IPC wrapper with centralized error handling.
 * Every channel call goes through here.
 */

function createIpcCall(propName) {
  return async (...args) => {
    if (!window.api || !window.api[propName]) {
      throw new Error(`IPC channel "${propName}" is not exposed in preload api`);
    }
    try {
      return await window.api[propName](...args);
    } catch (err) {
      console.error(`IPC error on "${propName}":`, err);
      throw err;
    }
  };
}

// Report channels
export const getReportState = createIpcCall('getReportState');
export const getReportByVoucherNumber = createIpcCall('getReportByVoucherNumber');
export const saveReportState = createIpcCall('saveReportState');
export const deleteDailyReport = createIpcCall('deleteDailyReport');
export const getCashierReports = createIpcCall('getCashierReports');

// Partners & Cashiers channels
export const getAllPartners = createIpcCall('getAllPartners');
export const savePartner = createIpcCall('savePartner');
export const getSettingsPartners = createIpcCall('getSettingsPartners');
export const updatePartner = createIpcCall('updatePartner');
export const deletePartner = createIpcCall('deletePartner');
export const getCashiers = createIpcCall('getCashiers');
export const saveCashier = createIpcCall('saveCashier');
export const deleteCashier = createIpcCall('deleteCashier');

// Vault & Closing channels
export const getVaultReports = createIpcCall('getVaultReports');
export const closeVaultPeriod = createIpcCall('closeVaultPeriod');
export const unlockVaultPeriod = createIpcCall('unlockVaultPeriod');

// Printing & PDF channels
export const printVoucher = createIpcCall('printVoucher');
export const printToPDF = createIpcCall('printToPDF');
export const printHtmlToPDF = createIpcCall('printHtmlToPDF');

// Backup & Restore channels
export const backupDB = createIpcCall('backupDB');
export const restoreDB = createIpcCall('restoreDB');
export const uploadCloudBackup = createIpcCall('uploadCloudBackup');
export const listCloudBackups = createIpcCall('listCloudBackups');
export const restoreCloudBackup = createIpcCall('restoreCloudBackup');
export const importLegacyData = createIpcCall('importLegacyData');

// User & Authentication channels
export const checkUsersCount = createIpcCall('checkUsersCount');
export const createUser = createIpcCall('createUser');
export const updateUser = createIpcCall('updateUser');
export const loginUser = createIpcCall('loginUser');
export const getUsers = createIpcCall('getUsers');
export const deleteUser = createIpcCall('deleteUser');
export const clearAllData = createIpcCall('clearAllData');

// Dashboard channels
export const getDashboardStats = createIpcCall('getDashboardStats');

// Employees channels
export const getEmployees = createIpcCall('getEmployees');
export const getEmployeeCategories = createIpcCall('getEmployeeCategories');
export const saveEmployeeCategory = createIpcCall('saveEmployeeCategory');
export const deleteEmployeeCategory = createIpcCall('deleteEmployeeCategory');
export const getEmployeePhoto = createIpcCall('getEmployeePhoto');
export const getAllEmployeesStatement = createIpcCall('getAllEmployeesStatement');
export const saveEmployee = createIpcCall('saveEmployee');
export const getEmployeeSalaryHistory = createIpcCall('getEmployeeSalaryHistory');
export const addEmployeeSalaryChange = createIpcCall('addEmployeeSalaryChange');
export const deleteEmployeeSalaryChange = createIpcCall('deleteEmployeeSalaryChange');
export const deleteEmployee = createIpcCall('deleteEmployee');
export const getEmployeeTransactions = createIpcCall('getEmployeeTransactions');
export const saveEmployeeTransaction = createIpcCall('saveEmployeeTransaction');
export const deleteEmployeeTransaction = createIpcCall('deleteEmployeeTransaction');
export const canDisburseSalaryOnDate = createIpcCall('canDisburseSalaryOnDate');
export const getSalaryAccrualDay = createIpcCall('getSalaryAccrualDay');

// Suppliers channels
export const getSuppliers = createIpcCall('getSuppliers');
export const getAllSuppliersStatement = createIpcCall('getAllSuppliersStatement');
export const saveSupplier = createIpcCall('saveSupplier');
export const deleteSupplier = createIpcCall('deleteSupplier');
export const getSupplierTransactions = createIpcCall('getSupplierTransactions');
export const saveSupplierTransaction = createIpcCall('saveSupplierTransaction');
export const deleteSupplierTransaction = createIpcCall('deleteSupplierTransaction');

// Archiving channels
export const archiveItem = createIpcCall('archiveItem');
export const getArchivedEmployees = createIpcCall('getArchivedEmployees');
export const getArchivedSuppliers = createIpcCall('getArchivedSuppliers');
export const getArchivedEmployeeTransactions = createIpcCall('getArchivedEmployeeTransactions');
export const getArchivedSupplierTransactions = createIpcCall('getArchivedSupplierTransactions');

// Expenses channels
export const getExpensesLedger = createIpcCall('getExpensesLedger');
export const deleteDailyExpenses = createIpcCall('deleteDailyExpenses');
export const getExpensesByDateRange = createIpcCall('getExpensesByDateRange');

// App Settings channels
export const getAppSettings = createIpcCall('getAppSettings');
export const saveAppSettings = createIpcCall('saveAppSettings');

// Dialogs channels
export const confirmDialog = createIpcCall('confirmDialog');

// Bank Accounts & sales mapping channels
export const getBankAccounts = createIpcCall('getBankAccounts');
export const saveBankAccount = createIpcCall('saveBankAccount');
export const deleteBankAccount = createIpcCall('deleteBankAccount');
export const getBankSalesMappings = createIpcCall('getBankSalesMappings');
export const saveBankSalesMappings = createIpcCall('saveBankSalesMappings');
export const getBankTransactions = createIpcCall('getBankTransactions');
export const saveBankTransaction = createIpcCall('saveBankTransaction');
export const deleteBankTransaction = createIpcCall('deleteBankTransaction');

// Financial Years channels
export const reopenFinancialYear = createIpcCall('reopenFinancialYear');
export const saveClosingPartners = createIpcCall('saveClosingPartners');
export const getClosingPartners = createIpcCall('getClosingPartners');
export const getFinancialYears = createIpcCall('getFinancialYears');
export const createFinancialYear = createIpcCall('createFinancialYear');
export const closeFinancialYear = createIpcCall('closeFinancialYear');
export const getGeneralVouchers = createIpcCall('getGeneralVouchers');
export const saveGeneralVoucher = createIpcCall('saveGeneralVoucher');
export const updateGeneralVoucher = createIpcCall('updateGeneralVoucher');
export const printGeneralVoucherIPC = createIpcCall('printGeneralVoucherIPC');
export const deleteGeneralVoucher = createIpcCall('deleteGeneralVoucher');
export const calculateClosingFigures = createIpcCall('calculateClosingFigures');
export const saveClosingReport = createIpcCall('saveClosingReport');
export const getClosingReport = createIpcCall('getClosingReport');
export const getAccountingPeriods = createIpcCall('getAccountingPeriods');
export const closeAccountingPeriod = createIpcCall('closeAccountingPeriod');
export const reopenAccountingPeriod = createIpcCall('reopenAccountingPeriod');
export const getAccountingPeriodAudit = createIpcCall('getAccountingPeriodAudit');

// Audit Logs & External Backup channels
export const getAuditLogs = createIpcCall('getAuditLogs');
export const getTrashItems = createIpcCall('getTrashItems');
export const restoreTrashItem = createIpcCall('restoreTrashItem');
export const permanentlyDeleteTrashItem = createIpcCall('permanentlyDeleteTrashItem');
export const selectBackupDirectory = createIpcCall('selectBackupDirectory');
export const getAppVersion = createIpcCall('getAppVersion');
export const checkAppUpdates = createIpcCall('checkAppUpdates');
export const downloadAndInstallUpdate = createIpcCall('downloadAndInstallUpdate');

// Default export for dynamic calls
export default { call: createIpcCall };
