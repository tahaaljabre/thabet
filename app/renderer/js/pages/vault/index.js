import { unlockPeriod } from './api.js';
import { showConfirm } from '../../components/modal.js';
import { showToast } from '../../core/notifications.js';

function assertVaultPeriodResult(result) {
  if (result?.success === false) {
    throw new Error(result.error || 'VAULT_PERIOD_UNLOCK_FAILED');
  }
  return result;
}

async function unlockVaultPeriodUI() {
  const start = document.getElementById('vault-start-date')?.value;
  const end = document.getElementById('vault-end-date')?.value;
  if (!start || !end) {
    showToast(window.t('date_range_required'), 'warning');
    return;
  }
  if (start > end) {
    showToast(window.t('date_order_error'), 'warning');
    return;
  }

  const confirmed = await showConfirm(
    window.t('vault_unlock_confirm_title'),
    window.t('vault_unlock_confirm_message')
  );
  if (!confirmed) return;

  const button = document.getElementById('btn-unlock-vault');
  if (button) button.disabled = true;
  try {
    const yearId = window.currentYearId || 1;
    assertVaultPeriodResult(await unlockPeriod(start, end, yearId));
    showToast(window.t('vault_unlock_success'), 'success');
    if (typeof window.fetchVaultReports === 'function') {
      await window.fetchVaultReports();
    }
  } catch (error) {
    console.error('Failed to reopen vault period:', error);
    showToast(`${window.t('vault_unlock_failed')}: ${error.message || error}`, 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

window.unlockVaultPeriodUI = unlockVaultPeriodUI;
