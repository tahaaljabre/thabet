import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getCashiers,
  saveCashier,
  deleteCashier,
  getSettingsPartners,
  updatePartner,
  deletePartner,
  getEmployeeCategories,
  saveEmployeeCategory,
  deleteEmployeeCategory,
  getAppSettings,
  saveAppSettings,
  backupDB,
  restoreDB,
  uploadCloudBackup,
  listCloudBackups,
  restoreCloudBackup,
  clearAllData
} from '../../core/ipc.js';

export async function fetchUsers() {
  return await getUsers();
}

export async function createNewUser(username, password, role, permissions) {
  return await createUser(username, password, role, permissions);
}

export async function updateExistingUser(id, username, password, permissions) {
  return await updateUser(id, username, password, permissions);
}

export async function removeUser(id) {
  return await deleteUser(id);
}

export async function fetchCashiers() {
  return await getCashiers();
}

export async function createOrUpdateCashier(cashier) {
  return await saveCashier(cashier);
}

export async function removeCashier(id) {
  return await deleteCashier(id);
}

export async function fetchPartners() {
  return await getSettingsPartners();
}

export async function updateExistingPartner(data) {
  return await updatePartner(data);
}

export async function removePartner(id) {
  return await deletePartner(id);
}

export async function fetchEmployeeCategories() {
  return await getEmployeeCategories();
}

export async function createOrUpdateEmployeeCategory(category) {
  return await saveEmployeeCategory(category);
}

export async function removeEmployeeCategory(id) {
  return await deleteEmployeeCategory(id);
}

export async function fetchSettings() {
  return await getAppSettings();
}

export async function saveSettings(settings) {
  return await saveAppSettings(settings);
}

export async function triggerBackup() {
  return await backupDB();
}

export async function triggerRestore() {
  return await restoreDB();
}

export async function triggerCloudBackup() {
  return await uploadCloudBackup();
}

export async function fetchCloudBackups() {
  return await listCloudBackups();
}

export async function triggerCloudRestore(fileId) {
  return await restoreCloudBackup(fileId);
}

export async function resetDatabase() {
  return await clearAllData();
}
