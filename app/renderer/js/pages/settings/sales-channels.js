import { showToast } from '../../core/notifications.js';

const DEFAULT_CHANNELS = [
  { key: 'kbank', nameAr: 'شبكة - KBank', nameEn: 'Network - KBank', active: true, system: true },
  { key: 'grab', nameAr: 'جراب فود', nameEn: 'GrabFood', active: true, system: true },
  { key: 'lineman', nameAr: 'لاين مان', nameEn: 'LineMan', active: true, system: true },
  { key: 'krungsri', nameAr: 'كرونغسري أونلاين', nameEn: 'Krungsri Online', active: true, system: true }
];

let channels = [];
let banks = [];

function normalizeChannels(value) {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_CHANNELS.map(item => ({ ...item, bankAccountId: '' }));
  return value.map((item, index) => ({
    key: String(item.key || `custom_${Date.now()}_${index}`).replace(/[^a-zA-Z0-9_-]/g, '_'),
    nameAr: String(item.nameAr || ''),
    nameEn: String(item.nameEn || ''),
    active: item.active !== false,
    system: item.system === true,
    deleted: item.deleted === true,
    bankAccountId: item.bankAccountId || ''
  }));
}

function bankOptions(selected) {
  return `<option value="">${t('no_bank_link')}</option>` + banks.map(bank =>
    `<option value="${bank.id}" ${String(selected) === String(bank.id) ? 'selected' : ''}>${window.escapeHTML(bank.bank_name)}</option>`
  ).join('');
}

function renderChannels() {
  const list = document.getElementById('sales-channels-list');
  if (!list) return;
  if (channels.filter(channel => !channel.deleted).length === 0) {
    list.innerHTML = `<div class="settings-table-message">${t('sales_channels_empty')}</div>`;
    return;
  }
  list.innerHTML = channels.map((channel, index) => ({ channel, index })).filter(item => !item.channel.deleted).map(({ channel, index }) => `
    <div class="sales-channel-card ${channel.active ? '' : 'is-disabled'}" data-index="${index}">
      <div class="channel-head">
        <span class="channel-badge">${t(channel.system ? 'default_channel_badge' : 'custom_channel_badge')}</span>
        <div class="channel-toggle-wrap">
          <span>${t(channel.active ? 'channel_active' : 'channel_inactive')}</span>
          <label class="switch"><input type="checkbox" class="channel-active" ${channel.active ? 'checked' : ''}><span class="slider"></span></label>
        </div>
      </div>
      <div class="form-group"><label>${t('channel_name_ar')}</label><input class="form-control channel-name-ar" value="${window.escapeHTML(channel.nameAr)}" placeholder="${t('channel_name_ar_placeholder')}"></div>
      <div class="form-group"><label>${t('channel_name_en')}</label><input class="form-control channel-name-en" value="${window.escapeHTML(channel.nameEn)}" placeholder="${t('channel_name_en_placeholder')}"></div>
      <div class="form-group"><label>${t('linked_bank_account')}</label><select class="form-control channel-bank">${bankOptions(channel.bankAccountId)}</select></div>
      <button type="button" class="btn-danger channel-delete" title="${t('delete_channel_button')}">🗑️ ${t('delete_title')}</button>
    </div>`).join('');
}

function syncFromDom() {
  document.querySelectorAll('.sales-channel-card').forEach(card => {
    const channel = channels[Number(card.dataset.index)];
    if (!channel) return;
    channel.nameAr = card.querySelector('.channel-name-ar').value.trim();
    channel.nameEn = card.querySelector('.channel-name-en').value.trim();
    channel.active = card.querySelector('.channel-active').checked;
    channel.bankAccountId = card.querySelector('.channel-bank').value || '';
  });
}

async function saveChannels() {
  syncFromDom();
  if (channels.some(channel => !channel.nameAr && !channel.nameEn)) {
    showToast(t('channel_name_required'), 'warning');
    return;
  }
  try {
    const settings = await window.api.getAppSettings();
    settings.salesChannels = channels;
    await window.api.saveAppSettings(settings);
    const yearId = window.currentYearId || 1;
    const existingMappings = await window.api.getBankSalesMappings(yearId).catch(() => []);
    const configuredKeys = new Set(channels.map(channel => channel.key));
    const protectedKeys = new Set(channels.filter(channel => channel.deleted || !channel.active).map(channel => channel.key));
    const mappings = existingMappings.filter(mapping => !configuredKeys.has(mapping.channel_name) || protectedKeys.has(mapping.channel_name));
    channels.filter(channel => !channel.deleted && channel.active && channel.bankAccountId).forEach(channel => {
      mappings.push({ channel_name: channel.key, bank_account_id: Number(channel.bankAccountId), year_id: yearId });
    });
    await window.api.saveBankSalesMappings(mappings, yearId);
    window.appSettings = settings;
    window.dispatchEvent(new CustomEvent('salesChannelsChanged', { detail: channels }));
    showToast(t('sales_channels_saved'), 'success');
    renderChannels();
  } catch (error) {
    showToast(`${t('sales_channels_save_error')}: ${error.message}`, 'error');
  }
}

export async function loadSalesChannels() {
  const settings = await window.api.getAppSettings();
  channels = normalizeChannels(settings.salesChannels);
  const yearId = window.currentYearId || 1;
  banks = await window.api.getBankAccounts(yearId).catch(() => []);
  const mappings = await window.api.getBankSalesMappings(yearId).catch(() => []);
  channels.forEach(channel => {
    const mapping = mappings.find(item => item.channel_name === channel.key);
    if (mapping) channel.bankAccountId = mapping.bank_account_id;
  });
  renderChannels();
}

export function bindSalesChannels() {
  const list = document.getElementById('sales-channels-list');
  const addButton = document.getElementById('btn-add-sales-channel');
  const saveButton = document.getElementById('btn-save-sales-channels');
  if (!list || !addButton || !saveButton || list.dataset.eventsBound === 'true') return;
  list.dataset.eventsBound = 'true';
  addButton.addEventListener('click', () => {
    syncFromDom();
    channels.push({ key: `custom_${Date.now()}`, nameAr: '', nameEn: '', active: true, system: false, bankAccountId: '' });
    renderChannels();
    const newCard = list?.querySelector(`.sales-channel-card[data-index="${channels.length - 1}"]`);
    newCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    requestAnimationFrame(() => newCard?.querySelector('.channel-name-ar')?.focus());
  });
  saveButton.addEventListener('click', saveChannels);
  list.addEventListener('change', event => {
    if (!event.target.classList.contains('channel-active')) return;
    syncFromDom();
    renderChannels();
  });
  list.addEventListener('click', async event => {
    const button = event.target.closest('.channel-delete');
    if (!button) return;
    if (!(await window.api.confirmDialog(t('confirm_delete_sales_channel')))) return;
    syncFromDom();
    const card = button.closest('.sales-channel-card');
    channels[Number(card.dataset.index)].active = false;
    channels[Number(card.dataset.index)].deleted = true;
    renderChannels();
  });
}
