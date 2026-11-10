function refreshVaultCategorySelect(selectedValue) {
  const select = document.getElementById('voucher-category');
  if (!select) return;
  const currentVal = selectedValue !== undefined ? selectedValue : select.value;

  const customCats = Array.isArray(window.appSettings?.vaultCustomCategories)
    ? window.appSettings.vaultCustomCategories
      .map(item => (typeof item === 'string' ? item.trim() : String(item?.name || '').trim()))
      .filter(Boolean)
    : [];

  let html = '';
  customCats.forEach(catName => {
    const escaped = window.escapeHTML ? window.escapeHTML(catName) : catName;
    html += `<option value="${escaped}">${escaped}</option>`;
  });
  html += `
    <option value="Zakat" data-i18n="cat_zakat">${window.t ? window.t('cat_zakat') : 'زكاة'}</option>
    <option value="Profit Distribution" data-i18n="cat_profit_distribution">${window.t ? window.t('cat_profit_distribution') : 'توزيع أرباح'}</option>
    <option value="Partner Withdrawal" data-i18n="cat_partner_withdrawal">${window.t ? window.t('cat_partner_withdrawal') : 'مسحوبات شركاء'}</option>
    <option value="General Expense" data-i18n="cat_general_expense">${window.t ? window.t('cat_general_expense') : 'مصاريف عمومية'}</option>
    <option value="Other" data-i18n="cat_other">${window.t ? window.t('cat_other') : 'أخرى'}</option>
  `;

  select.innerHTML = html;
  if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
    select.value = currentVal;
  } else if (select.options.length > 0) {
    select.selectedIndex = 0;
  }
}

window.refreshVaultCategorySelect = refreshVaultCategorySelect;
window.addEventListener('vaultCategoriesChanged', () => refreshVaultCategorySelect());
if (window.api && typeof window.api.onAppDataUpdated === 'function') {
  window.api.onAppDataUpdated(async (info) => {
    if (info && info.type === 'vault-categories') {
      try {
        const latestSettings = await window.api.getAppSettings();
        if (latestSettings) window.appSettings = { ...(window.appSettings || {}), ...latestSettings };
      } catch (_) {}
      refreshVaultCategorySelect();
    }
  });
}

async function fetchVaultReports() {
  try {
    const latestSettings = await window.api.getAppSettings();
    if (latestSettings) window.appSettings = { ...(window.appSettings || {}), ...latestSettings };
  } catch (_) {}
  refreshVaultCategorySelect();
  let start = document.getElementById('vault-start-date').value;
  let end = document.getElementById('vault-end-date').value;
  
  if (!start || !end) {
    const today = new Date().toISOString().split('T')[0];
    if (!start) { start = today; document.getElementById('vault-start-date').value = today; }
    if (!end) { end = today; document.getElementById('vault-end-date').value = today; }
  }

  const vouchersFrom = document.getElementById('vault-vouchers-from');
  const vouchersTo = document.getElementById('vault-vouchers-to');
  if (vouchersFrom) vouchersFrom.value = start;
  if (vouchersTo) vouchersTo.value = end;
  
  if (start > end) return alert(window.t('date_order_error'));
  try {
    const activeYearId = window.currentYearId || 1;
    vaultData = await window.api.getVaultReports(start, end, activeYearId);
    const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
    const defaultChannels = [
      { key: 'kbank', nameAr: 'شبكة - KBank', nameEn: 'KBank Network' },
      { key: 'grab', nameAr: 'جراب فود', nameEn: 'GrabFood' },
      { key: 'lineman', nameAr: 'لاين مان', nameEn: 'LineMan' },
      { key: 'krungsri', nameAr: 'كرونغسري أونلاين', nameEn: 'Krungsri Online' }
    ];
    const activeChannels = (Array.isArray(window.appSettings?.salesChannels) && window.appSettings.salesChannels.length > 0
      ? window.appSettings.salesChannels
      : defaultChannels
    ).filter(ch => !ch.deleted && ch.active !== false);

    const getChannelRate = key => {
      if (key === 'grab') return parseFloat(window.appSettings?.grabCommission) || 0;
      if (key === 'lineman') return parseFloat(window.appSettings?.linemanCommission) || 0;
      return 0;
    };

    const channelTotals = {};
    activeChannels.forEach(ch => { channelTotals[ch.key] = { gross: 0, comm: 0, net: 0 }; });

    let sumCash = 0;
    let sumOnline = 0;
    let sumExpenses = 0;
    let sumEmployeeTxs = 0;
    let sumSupplierTxs = 0;

    vaultData.reports.forEach(r => {
      sumCash += (parseFloat(r.cash_sales) || 0);
      activeChannels.forEach(ch => {
        const raw = Object.hasOwn(r, ch.key) ? r[ch.key] : r.channel_sales?.[ch.key];
        const gross = parseFloat(raw) || 0;
        const rate = getChannelRate(ch.key);
        const comm = gross * (rate / 100);
        const net = gross - comm;
        channelTotals[ch.key].gross += gross;
        channelTotals[ch.key].comm += comm;
        channelTotals[ch.key].net += net;
        sumOnline += net;
      });
    });

    let breakdownContainer = document.getElementById('vault-online-channels-breakdown');
    if (!breakdownContainer) {
      const onlineEl = document.getElementById('vault-sum-online');
      const onlineRow = onlineEl ? onlineEl.closest('.cashier-row') : null;
      if (onlineRow && onlineRow.parentNode) {
        breakdownContainer = document.createElement('div');
        breakdownContainer.id = 'vault-online-channels-breakdown';
        breakdownContainer.style.display = 'contents';
        onlineRow.parentNode.insertBefore(breakdownContainer, onlineRow);
      }
    }
    if (breakdownContainer) {
      const currency = window.appSettings?.currency || '';
      breakdownContainer.innerHTML = activeChannels.map(ch => {
        const def = defaultChannels.find(d => d.key === ch.key);
        const label = (isEn ? (ch.nameEn || def?.nameEn) : (ch.nameAr || def?.nameAr)) || ch.nameAr || ch.nameEn || ch.key;
        const tObj = channelTotals[ch.key] || { gross: 0, comm: 0, net: 0 };
        const rate = getChannelRate(ch.key);
        const rateBadge = (rate > 0 && tObj.gross > 0)
          ? ` <small style="color:var(--muted); font-size:11px;">(${window.t('comm_rate_short')} ${rate}%)</small>`
          : '';
        return `
          <div class="cashier-row">
            <span class="c-key">💳 ${window.escapeHTML(label)}${rateBadge}</span>
            <span class="c-val" style="color:var(--beige3)">${currency}${tObj.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        `;
      }).join('');
    }

    vaultData.expenses.forEach(e => sumExpenses += (parseFloat(e.amount) || 0));
    if (vaultData.employeeTxs) {
      vaultData.employeeTxs.forEach(tx => sumEmployeeTxs += (parseFloat(tx.amount) || 0));
    }
    if (vaultData.supplierTxs) {
      vaultData.supplierTxs.forEach(tx => {
        if (tx.tx_type === 'عليه') sumSupplierTxs += (parseFloat(tx.amount) || 0);
      });
    }

    // General cash vouchers
    let sumVouchers = 0;
    let vouchers = [];
    try {
      vouchers = await window.api.getGeneralVouchers(activeYearId);
    } catch (e) {
      console.error(e);
    }
    const periodVouchers = vouchers.filter(v => v.voucher_date >= start && v.voucher_date <= end);
    periodVouchers.forEach(v => {
      if (!v.account_id || v.is_cash_vault === 1) sumVouchers += (v.amount || 0);
    });
    vaultData.generalVouchers = periodVouchers;

    // Display list
    const tbody = document.getElementById('general-vouchers-tbody');
    if (tbody) {
      tbody.innerHTML = periodVouchers.map(v => {
        const categoryKeys = {
          Zakat: 'cat_zakat',
          'Profit Distribution': 'cat_profit_distribution',
          'Partner Withdrawal': 'cat_partner_withdrawal',
          'General Expense': 'cat_general_expense',
          Other: 'cat_other'
        };
        const catTranslated = categoryKeys[v.category] ? window.t(categoryKeys[v.category]) : v.category;

        return `
          <tr>
            <td>${v.id}</td>
            <td>${v.voucher_date}</td>
            <td>${window.escapeHTML(catTranslated)}</td>
            <td>${window.escapeHTML(v.partner_name || '-')}</td>
            <td style="color:var(--red); font-weight:bold;">${window.appSettings?.currency || ''}${v.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>${window.escapeHTML(v.description || '')}</td>
            <td>${window.escapeHTML(v.created_by || '')}</td>
            <td class="no-print" style="display:flex; gap:5px; justify-content:center;">
              <button class="btn-secondary" style="padding:2px 5px; font-size:11px;" onclick="printGeneralVoucher(${v.id})">🖨️ ${window.t('print_button')}</button>
              <button class="btn-primary" style="padding:2px 5px; font-size:11px;" onclick="editGeneralVoucher(${v.id})">✏️ ${window.t('edit_button')}</button>
              <button class="btn-danger" style="padding:2px 5px; font-size:11px;" onclick="deleteGeneralVoucher(${v.id})">🗑️ ${window.t('delete_button')}</button>
            </td>
          </tr>
        `;
      }).join('');
      if (periodVouchers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--muted);">${window.t('no_general_vouchers_period')}</td></tr>`;
      }
    }

    let sumDeposits = 0;
    let sumWithdrawals = 0;
    if (vaultData.bankTxs) {
      vaultData.bankTxs.forEach(bt => {
        if (bt.tx_type === 'Deposit') sumDeposits += bt.amount;
        else if (bt.tx_type === 'Withdrawal') sumWithdrawals += bt.amount;
      });
    }

    const currency = window.appSettings?.currency || '';
    document.getElementById('vault-sum-cash').innerText = currency + sumCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('vault-sum-online').innerText = currency + sumOnline.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('vault-sum-expenses').innerText = currency + sumExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('vault-sum-employees').innerText = currency + sumEmployeeTxs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('vault-sum-suppliers').innerText = currency + sumSupplierTxs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('vault-sum-vouchers').innerText = currency + sumVouchers.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // CashBalance = (Sales Cash + Bank Withdrawals) - (Cash Payments + General Cash Vouchers + Bank Deposits)
    const netBalance = (sumCash + sumWithdrawals) - sumExpenses - sumEmployeeTxs - sumSupplierTxs - sumVouchers - sumDeposits;
    document.getElementById('vault-sum-net').innerText = currency + netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (error) {
    console.error(error);
    alert(window.t('vault_data_load_error'));
  }
}

async function applyVaultVoucherPeriod() {
  const from = document.getElementById('vault-vouchers-from')?.value;
  const to = document.getElementById('vault-vouchers-to')?.value;
  if (!from || !to) return alert(window.t('date_range_required'));
  if (from > to) return alert(window.t('date_order_error'));

  document.getElementById('vault-start-date').value = from;
  document.getElementById('vault-end-date').value = to;
  await fetchVaultReports();
}

async function closeVaultPeriod() {
  const start = document.getElementById('vault-start-date').value;
  const end = document.getElementById('vault-end-date').value;
  if (!start || !end) return alert(window.t('date_range_required'));
  if (await window.api.confirmDialog(window.t('confirm_close_period'))) {
    try {
      const activeYearId = window.currentYearId || 1;
      await window.api.closeVaultPeriod(start, end, activeYearId);
      alert(window.t('period_closed_success'));
      loadState(state.reportDate);
      fetchVaultReports();
    } catch (e) {
      alert(window.t('period_close_error'));
    }
  }
}

// Preserve the existing global API used by the page and other modules.
window.currentUser = window.currentUser || null;
window.fetchVaultReports = fetchVaultReports;
window.closeVaultPeriod = closeVaultPeriod;
window.applyVaultVoucherPeriod = applyVaultVoucherPeriod;
