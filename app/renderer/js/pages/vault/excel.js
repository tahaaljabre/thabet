function getVaultExcelChannels() {
  const defaultChannels = [
    { key: 'kbank', nameAr: 'شبكة - KBank', nameEn: 'KBank Network' },
    { key: 'grab', nameAr: 'جراب فود', nameEn: 'GrabFood' },
    { key: 'lineman', nameAr: 'لاين مان', nameEn: 'LineMan' },
    { key: 'krungsri', nameAr: 'كرونغسري أونلاين', nameEn: 'Krungsri Online' }
  ];
  const raw = Array.isArray(window.appSettings?.salesChannels) && window.appSettings.salesChannels.length > 0
    ? window.appSettings.salesChannels
    : defaultChannels;
  return raw.filter(c => !c.deleted && c.active !== false).map(c => {
    const def = defaultChannels.find(d => d.key === c.key);
    return {
      ...c,
      label: c.nameAr || def?.nameAr || c.nameEn || c.key
    };
  });
}

function getVaultChannelRate(key) {
  if (key === 'grab') return Number(window.appSettings?.grabCommission) || 0;
  if (key === 'lineman') return Number(window.appSettings?.linemanCommission) || 0;
  return 0;
}

function buildVaultExcelRows(groupByMonth) {
  const channels = getVaultExcelChannels();
  const buckets = new Map();
  const keyFor = date => groupByMonth ? String(date).slice(0, 7) : date;
  const bucket = date => {
    const key = keyFor(date);
    if (!buckets.has(key)) {
      const init = {
        period: key, cash: 0, onlineGross: 0, onlineComm: 0, online: 0, purchases: 0, operating: 0,
        employees: 0, suppliers: 0, vouchers: 0, bankDeposits: 0, bankWithdrawals: 0
      };
      channels.forEach(ch => { init[`ch_${ch.key}`] = 0; });
      buckets.set(key, init);
    }
    return buckets.get(key);
  };
  (vaultData.reports || []).forEach(report => {
    if (!report.report_date) return;
    const row = bucket(report.report_date);
    row.cash += Number(report.cash_sales) || 0;
    channels.forEach(channel => {
      const gross = Number(Object.hasOwn(report, channel.key) ? report[channel.key] : report.channel_sales?.[channel.key]) || 0;
      const rate = getVaultChannelRate(channel.key);
      const comm = gross * (rate / 100);
      const net = gross - comm;
      row[`ch_${channel.key}`] = (row[`ch_${channel.key}`] || 0) + net;
      row.onlineGross += gross;
      row.onlineComm += comm;
      row.online += net;
    });
  });
  (vaultData.expenses || []).forEach(item => {
    if (!item.report_date) return;
    const row = bucket(item.report_date), amount = Number(item.amount) || 0;
    if (['maintenance', 'other'].includes(item.category)) row.operating += amount;
    else if (item.category === 'salaries') row.employees += amount;
    else row.purchases += amount;
  });
  (vaultData.employeeTxs || []).forEach(tx => { if (tx.tx_date) bucket(tx.tx_date).employees += Number(tx.amount > 0 ? tx.amount : tx.allowances) || 0; });
  (vaultData.supplierTxs || []).forEach(tx => { if (tx.tx_date && tx.tx_type === 'عليه') bucket(tx.tx_date).suppliers += Number(tx.amount) || 0; });
  (vaultData.generalVouchers || []).forEach(v => {
    if (v.voucher_date && (!v.account_id || v.is_cash_vault === 1)) {
      bucket(v.voucher_date).vouchers += Number(v.amount) || 0;
    }
  });
  (vaultData.bankTxs || []).forEach(tx => {
    if (!tx.tx_date) return;
    if (tx.tx_type === 'Deposit') bucket(tx.tx_date).bankDeposits += Number(tx.amount) || 0;
    if (tx.tx_type === 'Withdrawal') bucket(tx.tx_date).bankWithdrawals += Number(tx.amount) || 0;
  });
  return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period)).map(row => {
    row.sales = row.cash + row.online;
    row.expenses = row.purchases + row.operating + row.employees + row.suppliers + row.vouchers;
    row.net = row.sales + row.bankWithdrawals - row.expenses - row.bankDeposits;
    return row;
  });
}

function vaultExcelSpec(rows, detailed) {
  const start = document.getElementById('vault-start-date').value;
  const end = document.getElementById('vault-end-date').value;
  const channels = getVaultExcelChannels();
  const channelColumns = channels.map(ch => ({
    key: `ch_${ch.key}`,
    header: ch.label,
    type: 'currency',
    width: 18
  }));
  return {
    rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency,
    fileName: `${detailed ? 'تقرير الصندوق التفصيلي' : 'ملخص الصندوق'} ${start} ${end}`,
    sheetName: detailed ? 'الصندوق اليومي' : 'ملخص الصندوق', title: detailed ? 'تقرير الصندوق التفصيلي' : 'ملخص الصندوق',
    subtitle: `من: ${start} | إلى: ${end}`,
    columns: [
      { key: 'period', header: detailed ? 'التاريخ' : 'الشهر', type: detailed ? 'date' : undefined, width: 15 },
      { key: 'cash', header: 'مبيعات نقد', type: 'currency', width: 17 },
      ...channelColumns,
      { key: 'online', header: 'إجمالي الأونلاين (بعد العمولات)', type: 'currency', width: 22 },
      { key: 'sales', header: 'إجمالي المبيعات', type: 'currency', width: 19 },
      { key: 'purchases', header: 'المشتريات النقدية', type: 'currency', width: 19 },
      { key: 'operating', header: 'المصروفات التشغيلية', type: 'currency', width: 21 },
      { key: 'employees', header: 'صرفيات الموظفين', type: 'currency', width: 19 },
      { key: 'suppliers', header: 'مدفوعات الموردين', type: 'currency', width: 19 },
      { key: 'vouchers', header: 'سندات الصرف العام', type: 'currency', width: 20 },
      { key: 'bankWithdrawals', header: t('vault_bank_withdrawals'), type: 'currency', width: 19 },
      { key: 'bankDeposits', header: t('vault_bank_deposits'), type: 'currency', width: 19 },
      { key: 'expenses', header: 'إجمالي المصروفات', type: 'currency', width: 20 },
      { key: 'net', header: 'الصافي', type: 'currency', width: 18 }
    ], rows
  };
}

async function exportVaultSummaryExcel() {
  if (!vaultData) return alert(t('show_data_first'));
  return window.api.exportExcelReport(vaultExcelSpec(buildVaultExcelRows(true), false));
}

async function exportVaultDetailedExcel() {
  if (!vaultData) return alert(t('show_data_first'));
  return window.api.exportExcelReport(vaultExcelSpec(buildVaultExcelRows(false), true));
}
