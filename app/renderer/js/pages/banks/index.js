// ==========================================
// BANK MANAGEMENT SYSTEM
// ==========================================
let bankAccounts = [];
let bankMappings = [];
let bankTransactions = [];
const BANK_TRANSACTIONS_PAGE_SIZE = 150;
let bankTransactionsHasMore = false;

const defaultBankSalesChannels = [
  { key: 'kbank', nameAr: 'شبكة - KBank', nameEn: 'Network - KBank', active: true },
  { key: 'grab', nameAr: 'جراب فود', nameEn: 'GrabFood', active: true },
  { key: 'lineman', nameAr: 'لاين مان', nameEn: 'LineMan', active: true },
  { key: 'krungsri', nameAr: 'كرونغسري أونلاين', nameEn: 'Krungsri Online', active: true }
];

function getVisibleBankSalesChannels() {
  const configured = window.appSettings?.salesChannels;
  const channels = Array.isArray(configured) && configured.length ? configured : defaultBankSalesChannels;
  return channels.filter(channel => channel.active !== false && channel.deleted !== true);
}

function renderBankSalesMappings() {
  const list = document.getElementById('bank-sales-mappings-list');
  if (!list) return;
  const isEnglish = typeof window.currentLang === 'function' && window.currentLang() === 'en';
  const channels = getVisibleBankSalesChannels();
  list.innerHTML = channels.map(channel => {
    const label = (isEnglish ? channel.nameEn : channel.nameAr) || channel.nameEn || channel.nameAr || channel.key;
    return `<div class="form-group" style="margin-bottom:10px;">
      <label class="form-label">${window.escapeHTML(label)}</label>
      <select id="map-${window.escapeHTML(channel.key)}" data-channel-key="${window.escapeHTML(channel.key)}" class="form-control bank-select-map" style="padding:8px; height:38px;"></select>
    </div>`;
  }).join('');
}

async function loadBanksData() {
  try {
    const activeYearId = window.currentYearId || 1;
    [bankAccounts, bankMappings, bankTransactions] = await Promise.all([
      window.api.getBankAccounts(activeYearId),
      window.api.getBankSalesMappings(activeYearId),
      window.api.getBankTransactions(activeYearId, { limit: BANK_TRANSACTIONS_PAGE_SIZE, offset: 0 })
    ]);
    bankTransactionsHasMore = bankTransactions.length === BANK_TRANSACTIONS_PAGE_SIZE;

    renderBankAccountsGrid();
    renderBankSalesMappings();
    populateBankDropdowns();
    renderBankTransactionsTable();
    updateBankLoadMoreButton();
    if (typeof window.loadBankReconciliations === 'function') await window.loadBankReconciliations();
  } catch (err) {
    console.error(err);
    alert(t('err_load_banks') + err.message);
  }
}

function updateBankLoadMoreButton() {
  const button = document.getElementById('bank-load-more');
  if (!button) return;
  button.style.display = bankTransactionsHasMore ? '' : 'none';
  button.disabled = false;
    button.textContent = t('bank_show_older_transactions');
}

async function loadMoreBankTransactions() {
  const button = document.getElementById('bank-load-more');
  if (button) {
    button.disabled = true;
    button.textContent = t('loading');
  }
  try {
    const rows = await window.api.getBankTransactions(window.currentYearId || 1, {
      limit: BANK_TRANSACTIONS_PAGE_SIZE,
      offset: bankTransactions.length
    });
    bankTransactions.push(...rows);
    bankTransactionsHasMore = rows.length === BANK_TRANSACTIONS_PAGE_SIZE;
    renderBankTransactionsTable();
  } catch (error) {
    console.error('Failed to load older bank transactions:', error);
  } finally {
    updateBankLoadMoreButton();
  }
}
window.loadMoreBankTransactions = loadMoreBankTransactions;

function renderBankAccountsGrid() {
  const grid = document.getElementById('banks-grid');
  if (!grid) return;

  if (bankAccounts.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--muted);">${t('no_banks_msg')}</div>`;
    return;
  }

  grid.innerHTML = bankAccounts.map(acc => `
    <div class="mini-card" style="position:relative;">
      <div class="dot-ind" style="background:var(--primary-color);box-shadow:0 0 6px var(--primary-color)"></div>
      <div class="card-label" style="font-weight:bold; font-size:14px; color:var(--text-color)">${window.escapeHTML(acc.bank_name)}</div>
      <div class="card-sub" style="font-size:11px; margin-top:2px;">${t('bank_account_num')} ${acc.account_number || t('not_specified')}</div>
      <div class="card-amount" style="color:var(--green2); font-size:20px; margin-top:5px;">${window.appSettings?.currency || ''}${acc.current_balance.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
      <div class="card-sub" style="font-size:10px;">${t('bank_opening_balance')} ${window.appSettings?.currency || ''}${acc.opening_balance.toLocaleString('en-US')}</div>
      <div class="no-print" style="margin-top: 10px; display:flex; gap: 5px;">
        <button class="btn-primary" style="padding: 2px 8px; font-size:10px; flex:1;" onclick="editBankAccount(${acc.id})">${t('btn_edit')}</button>
        <button class="btn-danger" style="padding: 2px 8px; font-size:10px; flex:1;" onclick="deleteBankAccount(${acc.id})">${t('btn_delete')}</button>
      </div>
    </div>
  `).join('');
}

function populateBankDropdowns() {
  const mapSelects = document.querySelectorAll('.bank-select-map');
  const dropdownSelects = document.querySelectorAll('.bank-select-dropdown');

  const optionsHtml = `<option value="">${t('choose_bank')}</option>` + 
    bankAccounts.map(acc => `<option value="${acc.id}">${acc.bank_name} (${window.appSettings?.currency || ''}${acc.current_balance.toLocaleString()})</option>`).join('');

  mapSelects.forEach(sel => {
    sel.innerHTML = optionsHtml;
  });

  dropdownSelects.forEach(sel => {
    sel.innerHTML = optionsHtml;
  });

  bankMappings.forEach(m => {
    const el = document.getElementById('map-' + m.channel_name);
    if (el) el.value = m.bank_account_id;
  });
}
