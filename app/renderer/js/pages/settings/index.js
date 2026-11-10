import { initEvents, refreshManagementTab } from './events.js';
export { getTemplate } from './template.js';

async function switchTab(tabId) {
  document.querySelectorAll('.setting-section').forEach(section => {
    section.style.display = 'none';
  });
  document.querySelectorAll('.settings-tab-btn').forEach(tab => {
    tab.classList.remove('active');
  });

  const section = document.getElementById(`section-${tabId}`) || document.getElementById('section-company');
  const resolvedTabId = section ? section.id.replace('section-', '') : 'company';
  const tab = document.querySelector(`.settings-tab-btn[data-tab="${resolvedTabId}"]`);
  if (section) section.style.display = 'block';
  if (tab) tab.classList.add('active');

  await refreshManagementTab(resolvedTabId);
}

export async function init(params = {}) {
  await initEvents();

  document.querySelectorAll('.settings-tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      if (tabId) void switchTab(tabId);
    });
  });

  await switchTab(params.tab || 'company');
}

export function cleanup() {
  // The modal content is replaced on the next open, removing its listeners.
}
