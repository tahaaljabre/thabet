import { initBackgroundUpdateCheck } from '../pages/settings/updater.js';
import { sanitizeTemplate } from '../core/dom.js';

export async function openSettingsModal(tabId = 'company') {
  try {
    const module = await import('../pages/settings/index.js');
    let modalContainer = document.getElementById('settings-modal-overlay');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'settings-modal-overlay';
      modalContainer.className = 'modal no-print';
      modalContainer.style.display = 'flex';
      modalContainer.style.zIndex = '99999';
      document.body.appendChild(modalContainer);
    } else {
      modalContainer.className = 'modal no-print';
      modalContainer.style.display = 'flex';
      modalContainer.style.zIndex = '99999';
    }
    modalContainer.innerHTML = sanitizeTemplate(`
      <div class="modal-content settings-modal-shell" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
        <div class="settings-modal-header">
          <div class="settings-modal-heading">
            <span class="settings-modal-icon" aria-hidden="true">⚙</span>
            <div>
              <h3 id="settings-modal-title" data-i18n="settings_title">الإعدادات</h3>
              <p data-i18n="settings_modal_description">خصّص البرنامج وأدر بيانات المنشأة من مكان واحد</p>
            </div>
          </div>
          <button type="button" class="settings-modal-close" aria-label="إغلاق نافذة الإعدادات" data-i18n-aria-label="close_settings" onclick="document.getElementById('settings-modal-overlay').style.display='none'">×</button>
        </div>
        <div class="modal-body settings-modal-body" id="settings-modal-body">
          ${module.getTemplate()}
        </div>
      </div>
    `);
    if (module.init) await module.init({ tab: tabId, isModal: true });
    if (typeof window.applyTranslations === 'function') window.applyTranslations(modalContainer);
  } catch (error) {
    console.error('Failed to open settings modal:', error);
    alert((typeof window.currentLang === 'function' && window.currentLang() === 'en')
      ? 'Unable to open settings. Please try again.'
      : 'تعذر فتح نافذة الإعدادات، يرجى المحاولة مرة أخرى.');
  }
}

export function setupSettingsMenu() {
  window.openSettingsModal = openSettingsModal;

  const updateBellBtn = document.getElementById('btn-update-bell');
  if (updateBellBtn) {
    updateBellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      void openSettingsModal('assistant');
    });
  }

  if (!window.isStandaloneWindow) {
    initBackgroundUpdateCheck();
  }

  // Initialize Header Settings Menu Dropdown
  const settingsBtn = document.getElementById('btn-open-settings');
  const dropdown = document.getElementById('settings-dropdown');

  if (settingsBtn && dropdown) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      dropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('active');
    });

    dropdown.addEventListener('click', async (e) => {
      const link = e.target.closest('a');
      if (link) {
        e.preventDefault();
        dropdown.classList.remove('active');
        const action = link.getAttribute('data-action');
        if (action === 'logout') {
          try {
            if (window.api && typeof window.api.logoutUser === 'function') {
              await window.api.logoutUser();
            }
          } finally {
            window.location.reload();
          }
        } else if (action === 'archive') {
          try {
            if (typeof window.openArchiveModal !== 'function') throw new Error('Archive window is unavailable');
            await window.openArchiveModal();
          } catch (error) {
            console.error('Failed to open archive:', error);
            alert(t('archive_open_failed'));
          }
        } else if (action === 'settings') {
          const tabId = link.getAttribute('data-tab');
          await openSettingsModal(tabId);
        }
      }
    });
  }
}
