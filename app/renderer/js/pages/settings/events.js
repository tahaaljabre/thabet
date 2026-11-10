import { getState } from '../../core/state.js';
import { bindUserManagement, loadUsersList } from './management/users.js';
import { bindCashierManagement, loadCashiersList } from './management/cashiers.js';
import { bindPartnerManagement, loadPartnersList } from './management/partners.js';
import { bindEmployeeCategoriesManagement, loadEmployeeCategoriesList } from './management/employee-categories.js';
import { loadConfigurations, bindConfigurationEvents } from './configuration.js';
import { bindSalesChannels, loadSalesChannels } from './sales-channels.js';
import { bindVaultCustomCategories, loadVaultCustomCategories } from './vault-custom.js';
import { bindAuditLog, loadAuditLogs } from './audit.js';
import { bindTrash, loadTrashItems } from './trash.js';
import { bindUpdaterEvents, loadUpdaterStatus } from './updater.js';

let managerStateListenerAttached = false;

export async function refreshManagementTab(tabId) {
  if (tabId === 'cashiers') await loadCashiersList();
  if (tabId === 'partners') await loadPartnersList();
  if (tabId === 'employee-categories') await loadEmployeeCategoriesList();
  if (tabId === 'users') await loadUsersList();
  if (tabId === 'sales-channels') await loadSalesChannels();
  if (tabId === 'vault-custom') await loadVaultCustomCategories();
  if (tabId === 'audit') await loadAuditLogs();
  if (tabId === 'archive' && typeof window.switchArchiveTab === 'function') await window.switchArchiveTab('emp');
  if (tabId === 'trash') await loadTrashItems();
  if (tabId === 'assistant') await loadUpdaterStatus(false);
}

async function loadManagerData() {
  const currentUser = getState('currentUser') || window.currentUser;
  const isManager = currentUser && currentUser.role === 'manager';
  const managementTabs = ['users', 'cashiers', 'partners', 'employee-categories', 'sales-channels', 'audit', 'trash'];

  managementTabs.forEach((tabId) => {
    const tab = document.getElementById(`setting-${tabId}-tab`);
    if (tab) tab.style.display = isManager ? 'block' : 'none';
  });

  if (isManager) {
    await Promise.all([loadUsersList(), loadCashiersList(), loadPartnersList(), loadEmployeeCategoriesList()]);
  }
}

export async function initEvents() {
  await loadConfigurations();
  await loadManagerData();

  if (!managerStateListenerAttached) {
    window.addEventListener('stateChanged', loadManagerData);
    managerStateListenerAttached = true;
  }

  bindConfigurationEvents();
  bindUserManagement();
  bindCashierManagement();
  bindPartnerManagement();
  bindEmployeeCategoriesManagement();
  bindSalesChannels();
  bindVaultCustomCategories();
  bindAuditLog();
  bindTrash();
  bindUpdaterEvents();
  void loadUpdaterStatus(false);
}
