import { showToast } from '../../core/notifications.js';

let latestUpdateInfo = null;
let isChecking = false;
let isDownloading = false;
let unsubscribeProgress = null;
let backgroundCheckDone = false;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function updateHeaderBellUI(info) {
  const bellBtn = document.getElementById('btn-update-bell');
  const bellBadge = document.getElementById('update-bell-badge');
  const versionPill = document.getElementById('header-version-pill');

  if (versionPill && info?.currentVersion) {
    versionPill.textContent = `v${info.currentVersion}`;
  }

  if (!bellBtn || !bellBadge) return;

  if (info?.updateAvailable) {
    bellBadge.style.display = 'flex';
    bellBadge.textContent = '1';
    bellBtn.style.borderColor = '#dc2626';
    bellBtn.style.background = '#fef2f2';
    bellBtn.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.18)';
  } else {
    bellBadge.style.display = 'none';
    bellBtn.style.borderColor = '#e6d5c3';
    bellBtn.style.background = '#fffaf5';
    bellBtn.style.boxShadow = 'none';
  }
}

function updateAssistantUpdaterUI(info) {
  const currentBadge = document.getElementById('app-current-version-badge');
  const latestBadge = document.getElementById('app-latest-version-badge');
  const statusText = document.getElementById('app-update-status-text');
  const installBtn = document.getElementById('btn-install-update');
  const checkBtn = document.getElementById('btn-check-updates');

  if (currentBadge && info?.currentVersion) {
    currentBadge.textContent = `v${info.currentVersion}`;
  }

  if (checkBtn) {
    checkBtn.disabled = isChecking || isDownloading;
    checkBtn.style.opacity = (isChecking || isDownloading) ? '0.65' : '1';
  }

  if (!statusText) return;

  if (isChecking) {
    statusText.textContent = t('update_status_checking');
    statusText.style.color = '#8a6b52';
    return;
  }

  if (!info) {
    statusText.textContent = t('update_status_idle');
    statusText.style.color = '#7a5c44';
    return;
  }

  if (!info.success) {
    statusText.textContent = t('update_status_error');
    statusText.style.color = '#dc2626';
    if (latestBadge) latestBadge.style.display = 'none';
    if (installBtn) installBtn.style.display = 'none';
    return;
  }

  if (info.message === 'NO_INSTALLER_IN_FOLDER') {
    statusText.textContent = t('update_status_no_installer');
    statusText.style.color = '#8a6b52';
    if (latestBadge) latestBadge.style.display = 'none';
    if (installBtn) installBtn.style.display = 'none';
    return;
  }

  if (latestBadge && info.latestVersion) {
    latestBadge.style.display = 'inline-flex';
    latestBadge.textContent = `${t('latest_version_label')}: v${info.latestVersion}`;
  }

  if (info.updateAvailable) {
    statusText.textContent = `${t('update_status_available')} (v${info.latestVersion})`;
    statusText.style.color = '#15803d';
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.disabled = isDownloading;
      installBtn.style.boxShadow = '0 0 0 4px rgba(22, 163, 74, 0.25)';
    }
  } else {
    statusText.textContent = t('update_status_up_to_date');
    statusText.style.color = '#15803d';
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }
}

export async function loadUpdaterStatus(forceCheck = false) {
  if (!window.api) return null;

  try {
    if (typeof window.api.getAppVersion === 'function') {
      const verRes = await window.api.getAppVersion();
      if (verRes?.version) {
        updateHeaderBellUI({
          currentVersion: verRes.version,
          updateAvailable: Boolean(latestUpdateInfo?.updateAvailable)
        });
        const currentBadge = document.getElementById('app-current-version-badge');
        if (currentBadge) currentBadge.textContent = `v${verRes.version}`;
      }
    }
  } catch (err) {
    console.warn('Failed to read app version:', err);
  }

  if (!forceCheck && latestUpdateInfo) {
    updateHeaderBellUI(latestUpdateInfo);
    updateAssistantUpdaterUI(latestUpdateInfo);
    return latestUpdateInfo;
  }

  if (isChecking) return latestUpdateInfo;
  if (typeof window.api.checkAppUpdates !== 'function') return null;

  isChecking = true;
  updateAssistantUpdaterUI(latestUpdateInfo);

  try {
    const res = await window.api.checkAppUpdates();
    latestUpdateInfo = res;
    isChecking = false;
    updateHeaderBellUI(res);
    updateAssistantUpdaterUI(res);
    return res;
  } catch (err) {
    isChecking = false;
    const fallback = { success: false, error: err?.message || 'Check failed' };
    updateAssistantUpdaterUI(fallback);
    return fallback;
  }
}

async function handleInstallUpdate() {
  if (isDownloading || !window.api || typeof window.api.downloadAndInstallUpdate !== 'function') return;

  isDownloading = true;
  const progressWrap = document.getElementById('app-update-progress-wrap');
  const progressBar = document.getElementById('app-update-progress-bar');
  const progressPercent = document.getElementById('app-update-progress-percent');
  const progressStage = document.getElementById('app-update-progress-stage');
  const installBtn = document.getElementById('btn-install-update');
  const checkBtn = document.getElementById('btn-check-updates');

  if (installBtn) installBtn.disabled = true;
  if (checkBtn) checkBtn.disabled = true;
  if (progressWrap) progressWrap.style.display = 'block';
  if (progressBar) progressBar.style.width = '2%';
  if (progressPercent) progressPercent.textContent = '0%';
  if (progressStage) progressStage.textContent = t('update_downloading_label');

  if (unsubscribeProgress) {
    unsubscribeProgress();
    unsubscribeProgress = null;
  }

  if (typeof window.api.onAppUpdateProgress === 'function') {
    unsubscribeProgress = window.api.onAppUpdateProgress((progress) => {
      if (!progress) return;
      const pct = Number.isFinite(progress.percent) ? Math.min(100, Math.max(0, progress.percent)) : 0;
      if (progressBar && progress.percent !== null) {
        progressBar.style.width = `${Math.max(4, pct)}%`;
      }
      if (progressPercent) {
        if (progress.percent !== null && progress.totalBytes > 0) {
          progressPercent.textContent = `${pct}% (${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)})`;
        } else if (progress.downloadedBytes > 0) {
          progressPercent.textContent = formatBytes(progress.downloadedBytes);
        }
      }
      if (progressStage) {
        if (progress.stage === 'installing') {
          progressStage.textContent = t('update_installing_restarting');
        } else {
          progressStage.textContent = t('update_downloading_label');
        }
      }
    });
  }

  try {
    const res = await window.api.downloadAndInstallUpdate({
      fileId: latestUpdateInfo?.fileId || null,
      version: latestUpdateInfo?.latestVersion || null
    });

    if (!res || !res.success) {
      isDownloading = false;
      if (installBtn) installBtn.disabled = false;
      if (checkBtn) checkBtn.disabled = false;
      const errMsg = res?.error ? `${t('update_failed_prefix')}: ${res.error}` : t('update_failed_prefix');
      showToast(errMsg, 'error');
    } else {
      if (progressStage) progressStage.textContent = t('update_installing_restarting');
      if (progressBar) progressBar.style.width = '100%';
    }
  } catch (err) {
    isDownloading = false;
    if (installBtn) installBtn.disabled = false;
    if (checkBtn) checkBtn.disabled = false;
    showToast(`${t('update_failed_prefix')}: ${err?.message || ''}`, 'error');
  }
}

export function bindUpdaterEvents() {
  const checkBtn = document.getElementById('btn-check-updates');
  if (checkBtn && !checkBtn.dataset.bound) {
    checkBtn.dataset.bound = 'true';
    checkBtn.addEventListener('click', async () => {
      await loadUpdaterStatus(true);
    });
  }

  const installBtn = document.getElementById('btn-install-update');
  if (installBtn && !installBtn.dataset.bound) {
    installBtn.dataset.bound = 'true';
    installBtn.addEventListener('click', handleInstallUpdate);
  }
}

export function initBackgroundUpdateCheck() {
  if (backgroundCheckDone) return;
  backgroundCheckDone = true;

  setTimeout(async () => {
    const res = await loadUpdaterStatus(true);
    if (res?.updateAvailable) {
      showToast(t('update_toast_available'), 'info', 6000);
    }
  }, 3000);
}

