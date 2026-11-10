const SYSTEM_KEYS = new Set(['kbank', 'grab', 'lineman', 'krungsri']);

export function getConfiguredChannels(settings) {
  if (Array.isArray(settings?.salesChannels)) return settings.salesChannels;
  return [
    { key: 'kbank', nameAr: 'شبكة - KBank', nameEn: 'Network - KBank', active: true, system: true },
    { key: 'grab', nameAr: 'جراب فود', nameEn: 'GrabFood', active: true, system: true },
    { key: 'lineman', nameAr: 'لاين مان', nameEn: 'LineMan', active: true, system: true },
    { key: 'krungsri', nameAr: 'كرونغسري أونلاين', nameEn: 'Krungsri Online', active: true, system: true }
  ];
}

export function channelName(channel) {
  const isEnglish = window.currentLang() === 'en';
  return (isEnglish ? channel.nameEn : channel.nameAr) || channel.nameEn || channel.nameAr || channel.key;
}

export function getActiveChannels(settings) {
  return getConfiguredChannels(settings).filter(channel => !channel.deleted && channel.active !== false);
}

export function renderSalesChannels(settings, values = {}) {
  const channels = getConfiguredChannels(settings);
  for (const key of SYSTEM_KEYS) {
    const input = document.getElementById(`input-sales-${key}`);
    const group = input?.closest('.form-group');
    const channel = channels.find(item => item.key === key);
    if (!group) continue;
    group.style.display = channel && !channel.deleted && channel.active !== false ? '' : 'none';
    if (channel) {
      const label = group.querySelector('label');
      if (label) {
        label.removeAttribute('data-i18n');
        label.textContent = channelName(channel);
      }
    }
  }

  const customRoot = document.getElementById('custom-sales-channels');
  if (!customRoot) return;
  customRoot.innerHTML = channels.filter(channel => !channel.deleted && !SYSTEM_KEYS.has(channel.key) && channel.active !== false).map(channel => `
    <div class="form-group custom-sales-channel" data-channel-key="${window.escapeHTML(channel.key)}">
      <label class="form-label" for="input-sales-channel-${window.escapeHTML(channel.key)}">${window.escapeHTML(channelName(channel))}</label>
      <input type="number" id="input-sales-channel-${window.escapeHTML(channel.key)}" class="form-control custom-sales-channel-input" step="any" placeholder="0.00" value="${Number(values[channel.key] || 0) || ''}">
    </div>`).join('');
}

export function readCustomChannelSales() {
  const result = {};
  document.querySelectorAll('.custom-sales-channel').forEach(group => {
    const input = group.querySelector('.custom-sales-channel-input');
    result[group.dataset.channelKey] = Number.parseFloat(input?.value) || 0;
  });
  return result;
}
