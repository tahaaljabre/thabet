async function printVaultSummary() {
  if (!vaultData) return alert(t('show_data_first'));
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
  ).filter(channel => !channel.deleted && channel.active !== false);

  const getChannelName = channel => {
    const def = defaultChannels.find(d => d.key === channel.key);
    return (isEn ? (channel.nameEn || def?.nameEn) : (channel.nameAr || def?.nameAr))
      || channel.nameAr || channel.nameEn || def?.nameAr || channel.key;
  };

  const getChannelCommissionRate = key => {
    if (key === 'grab') return Number.parseFloat(window.appSettings?.grabCommission) || 0;
    if (key === 'lineman') return Number.parseFloat(window.appSettings?.linemanCommission) || 0;
    return 0;
  };

  const getReportChannelGross = (report, key) => {
    const raw = Object.hasOwn(report, key) ? report[key] : report.channel_sales?.[key];
    return Number.parseFloat(raw) || 0;
  };

  const translateVoucherCategory = cat => {
    const categoryKeys = {
      Zakat: 'cat_zakat',
      'Profit Distribution': 'cat_profit_distribution',
      'Partner Withdrawal': 'cat_partner_withdrawal',
      'General Expense': 'cat_general_expense',
      Other: 'cat_other'
    };
    return categoryKeys[cat] ? window.t(categoryKeys[cat]) : cat;
  };

  const start = document.getElementById('vault-start-date').value;
  const end = document.getElementById('vault-end-date').value;
  const currency = window.appSettings?.currency || '';
  const fmt = val => `${currency}${(Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let grandTotalCash = 0;
  let grandTotalOnlineGross = 0;
  let grandTotalOnlineCommission = 0;
  let grandTotalOnlineNet = 0;
  let grandTotalExpenses = 0;
  const grandChannelsGross = {};
  activeChannels.forEach(ch => { grandChannelsGross[ch.key] = 0; });

  const ensureMonth = (map, month) => {
    if (!map[month]) {
      const channels = {};
      activeChannels.forEach(ch => { channels[ch.key] = 0; });
      map[month] = {
        cash: 0,
        channels,
        onlineGross: 0,
        onlineComm: 0,
        onlineNet: 0,
        expenses: 0,
        opExp: 0,
        empTxs: 0,
        supTxs: 0,
        generalVouchers: 0,
        voucherByCat: {}
      };
    }
    return map[month];
  };

  const monthlyData = {};

  vaultData.reports.forEach(r => {
    if (!r.report_date) return;
    const month = r.report_date.substring(0, 7);
    const m = ensureMonth(monthlyData, month);

    const cash = Number.parseFloat(r.cash_sales) || 0;
    m.cash += cash;
    grandTotalCash += cash;

    activeChannels.forEach(ch => {
      const gross = getReportChannelGross(r, ch.key);
      const rate = getChannelCommissionRate(ch.key);
      const comm = gross * (rate / 100);
      const net = gross - comm;

      m.channels[ch.key] = (m.channels[ch.key] || 0) + gross;
      m.onlineGross += gross;
      m.onlineComm += comm;
      m.onlineNet += net;

      grandChannelsGross[ch.key] = (grandChannelsGross[ch.key] || 0) + gross;
      grandTotalOnlineGross += gross;
      grandTotalOnlineCommission += comm;
      grandTotalOnlineNet += net;
    });
  });

  vaultData.expenses.forEach(e => {
    if (!e.report_date) return;
    const month = e.report_date.substring(0, 7);
    const m = ensureMonth(monthlyData, month);
    const exp = Number(e.amount) || 0;
    m.opExp += exp;
    m.expenses += exp;
    grandTotalExpenses += exp;
  });

  let grandTotalEmpTxs = 0;
  let grandTotalSupTxs = 0;
  if (vaultData.employeeTxs) {
    vaultData.employeeTxs.forEach(tx => {
      if (!tx.tx_date) return;
      const month = tx.tx_date.substring(0, 7);
      const m = ensureMonth(monthlyData, month);
      const empAmount = tx.amount > 0 ? tx.amount : (tx.allowances || 0);
      m.empTxs += empAmount;
      grandTotalEmpTxs += empAmount;
    });
  }

  if (vaultData.supplierTxs) {
    vaultData.supplierTxs.forEach(tx => {
      if (!tx.tx_date || tx.tx_type !== 'عليه') return;
      const month = tx.tx_date.substring(0, 7);
      const m = ensureMonth(monthlyData, month);
      const supAmount = Number(tx.amount) || 0;
      m.supTxs += supAmount;
      grandTotalSupTxs += supAmount;
    });
  }

  let grandTotalVouchers = 0;
  if (vaultData.generalVouchers) {
    vaultData.generalVouchers.forEach(v => {
      if (!v.voucher_date) return;
      const month = v.voucher_date.substring(0, 7);
      const m = ensureMonth(monthlyData, month);
      const amount = Number(v.amount) || 0;
      m.generalVouchers += amount;
      const catLabel = translateVoucherCategory(v.category || 'Other');
      m.voucherByCat[catLabel] = (m.voucherByCat[catLabel] || 0) + amount;
      grandTotalVouchers += amount;
    });
  }

  const sortedMonths = Object.keys(monthlyData).sort();
  let monthsHtml = '';

  sortedMonths.forEach(month => {
    const data = monthlyData[month];
    const totalSales = data.cash + data.onlineNet;
    const totalExp = data.expenses;
    const totalEmpTxs = data.empTxs || 0;
    const totalSupTxs = data.supTxs || 0;
    const totalGenVouchers = data.generalVouchers || 0;
    const net = totalSales - totalExp - totalEmpTxs - totalSupTxs - totalGenVouchers;

    let netStyle = 'font-weight: bold;';
    let netLabel = `${t('net_total')} (${isEn ? 'Month' : 'الشهر'})`;
    if (net < 0) {
      netStyle = 'color: #d32f2f !important; font-weight: bold;';
      netLabel = `${t('net_total')} (${t('net_deficit')})`;
    } else if (net > 0) {
      netStyle = 'color: #2e7d32 !important; font-weight: bold;';
      netLabel = `${t('net_total')} (${t('net_surplus')})`;
    }

    const channelsHtml = activeChannels.map(ch => {
      const gross = data.channels[ch.key] || 0;
      const rate = getChannelCommissionRate(ch.key);
      const comm = gross * (rate / 100);
      const netCh = gross - comm;
      const chName = window.escapeHTML(getChannelName(ch));
      if (rate > 0 && gross > 0) {
        return `
          <div class="print-voucher-row" style="border-bottom: none; padding: 1px 6px; font-size: 12.5px; color: #334155;">
            <span>• ${chName} <small style="color:#b45309;">(${t('comm_rate_short')} ${rate}%: -${fmt(comm)})</small></span>
            <span dir="ltr" style="font-weight:600;">${fmt(netCh)}</span>
          </div>`;
      }
      return `
        <div class="print-voucher-row" style="border-bottom: none; padding: 1px 6px; font-size: 12.5px; color: #334155;">
          <span>• ${chName}</span>
          <span dir="ltr" style="font-weight:600;">${fmt(gross)}</span>
        </div>`;
    }).join('');

    const voucherCatsEntries = Object.entries(data.voucherByCat || {});
    const voucherBreakdownHtml = voucherCatsEntries.length > 0
      ? `<div style="margin: 2px 0; padding: 3px 6px; background: #f8fafc; border-right: 2px solid #0277bd; border-radius: 4px;">
          ${voucherCatsEntries.map(([catName, amt]) => `
            <div class="print-voucher-row" style="border-bottom: none; padding: 1px 0; font-size: 11.5px; color: #475569;">
              <span>▫ ${window.escapeHTML(catName)}</span>
              <span dir="ltr" style="color:#0277bd;">${fmt(amt)}</span>
            </div>
          `).join('')}
        </div>`
      : '';

    monthsHtml += `
      <div style="margin-top: 10px; border: 1px solid #ccc; border-radius: 8px; padding: 11px 14px; background-color: #fdfdfd; page-break-inside: avoid;">
        <h3 style="border-bottom: 2px solid #555; padding-bottom: 4px; margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #7A1A22;">🗓️ ${t('month') || (isEn ? 'Month' : 'الشهر')}: ${month}</h3>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; gap: 14px;">
          <div style="flex: 1; padding-left: 12px; border-left: 1px solid #eee;">
            <h4 style="margin: 0 0 6px 0; color: #333; font-size: 14px;">${t('sales_header') || (isEn ? 'Sales' : 'المبيعات')}</h4>
            <div class="print-voucher-row" style="border-bottom: 1px solid #f1f5f9; padding: 3px 0; font-weight: bold;">
              <span>${t('total_cash')}</span>
              <span dir="ltr">${fmt(data.cash)}</span>
            </div>
            <div style="margin: 4px 0; padding: 5px 7px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              <div style="font-size: 11.5px; font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">🌐 ${t('online_sales_detailed_header')}</div>
              ${channelsHtml}
              ${data.onlineComm > 0 ? `
                <div class="print-voucher-row" style="border-bottom: none; padding: 1px 6px; font-size: 11.5px; color: #64748b; border-top: 1px dotted #cbd5e1; margin-top: 2px;">
                  <span>${t('online_gross_before_comm')}</span>
                  <span dir="ltr">${fmt(data.onlineGross)}</span>
                </div>
                <div class="print-voucher-row" style="border-bottom: none; padding: 1px 6px; font-size: 11.5px; color: #dc2626;">
                  <span>${t('online_commissions_deducted')}</span>
                  <span dir="ltr">-${fmt(data.onlineComm)}</span>
                </div>
              ` : ''}
              <div class="print-voucher-row" style="border-bottom: none; padding: 3px 6px 1px 6px; font-weight: bold; color: #15803d; border-top: 1px solid #cbd5e1; margin-top: 2px; font-size: 12.5px;">
                <span>${t('online_net_after_comm')}</span>
                <span dir="ltr">${fmt(data.onlineNet)}</span>
              </div>
            </div>
            <div class="print-voucher-row amount" style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ccc;">
              <span class="lbl">${t('total_sales')}</span>
              <span dir="ltr">${fmt(totalSales)}</span>
            </div>
          </div>
          <div style="flex: 1; padding-right: 12px;">
            <h4 style="margin: 0 0 6px 0; color: #333; font-size: 14px;">${t('expenses_header') || (isEn ? 'Expenses & Advances' : 'المصروفات والسلف')}</h4>
            <div class="print-voucher-row" style="border-bottom: none; padding: 2px 0;"><span>${t('purchases_and_operating_expenses')}</span><span style="color:#d32f2f" dir="ltr">${fmt(data.opExp || 0)}</span></div>
            <div class="print-voucher-row" style="border-bottom: none; padding: 2px 0;"><span>${t('total_emp_txs')}</span><span style="color:#d84315" dir="ltr">${fmt(totalEmpTxs + (data.salaries || 0))}</span></div>
            <div class="print-voucher-row" style="border-bottom: none; padding: 2px 0;"><span>${t('total_sup_txs')}</span><span style="color:#8e24aa" dir="ltr">${fmt(totalSupTxs)}</span></div>
            <div class="print-voucher-row" style="border-bottom: none; padding: 2px 0;"><span>${t('general_vouchers_payment')}</span><span style="color:#0277bd" dir="ltr">${fmt(totalGenVouchers)}</span></div>
            ${voucherBreakdownHtml}
            <div class="print-voucher-row amount" style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ccc;">
              <span class="lbl">${t('total_monthly_expenses') || (isEn ? 'Total Monthly Expenses' : 'إجمالي مصروفات الشهر')}</span>
              <span style="color:#b71c1c" dir="ltr">${fmt(totalExp + totalEmpTxs + totalSupTxs + totalGenVouchers)}</span>
            </div>
          </div>
        </div>
        
        <div class="print-voucher-row amount" style="margin-top: 4px; padding: 7px 10px; background-color: #f0f0f0; border-radius: 5px; border-bottom: none; ${netStyle}">
          <span class="lbl" style="${netStyle}">${netLabel}</span>
          <span style="${netStyle}" dir="ltr">${fmt(net)}</span>
        </div>
      </div>
    `;
  });

  if (sortedMonths.length === 0) {
    monthsHtml = `<div style="text-align: center; margin-top: 20px; color: #777;">${t('no_data_period')}</div>`;
  }

  const grandNet = (grandTotalCash + grandTotalOnlineNet) - grandTotalExpenses - grandTotalEmpTxs - grandTotalSupTxs - grandTotalVouchers;
  let grandNetStyle = 'font-weight: bold;';
  let grandNetLabel = `${t('net_total')}`;
  if (grandNet < 0) {
    grandNetStyle = 'color: #d32f2f !important; font-weight: bold;';
    grandNetLabel = `${t('net_total')} (${t('net_deficit')})`;
  } else if (grandNet > 0) {
    grandNetStyle = 'color: #2e7d32 !important; font-weight: bold;';
    grandNetLabel = `${t('net_total')} (${t('net_surplus')})`;
  }

  const html = `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'ar'}" dir="${isEn ? 'ltr' : 'rtl'}">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 6px 12px; background: white; color: black; }
    .print-voucher-row { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 3px 0; font-size: 13px; }
    .print-voucher-row.amount { font-weight: bold; font-size: 15px; border-bottom: 2px solid #000; margin-top: 6px; }
  </style>
</head>
<body>
    <div class="print-voucher" style="padding: 0 8px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl;">
      <div style="width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7A1A22; padding-bottom: 6px; margin-bottom: 8px;">
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: bold; color: #7A1A22;">${appSettings.companyName || t('company_default_name')}</div>
            <div style="font-size: 12px; margin-top: 2px;">${appSettings.address ? `${t('address')}: ` + appSettings.address : ''} ${appSettings.phone ? ' | ' + t('phone') + ': ' + appSettings.phone : ''}</div>
            ${appSettings.taxNumber ? `<div style="font-size: 12.5px; margin-top: 2px; font-weight: bold;">${t('tax_number')}: ${appSettings.taxNumber}</div>` : ''}
          </div>
          <div style="text-align: left;">
            ${appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 50px;">` : ''}
          </div>
        </div>
        <div style="text-align: center; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: 18px; text-decoration: underline;">${t('vault_summary') || (isEn ? 'Vault Summary' : 'ملخص الصندوق')}</h2>
          <div style="font-size: 13px; margin-top: 3px; font-weight: 600;">${t('period_from') || (isEn ? 'From' : 'من')} <span dir="ltr">${start}</span> ${t('period_to') || (isEn ? 'To' : 'إلى')} <span dir="ltr">${end}</span></div>
        </div>
      </div>
      
      ${monthsHtml}
      
      <div style="page-break-inside: avoid; margin-top: 12px;">
        <div style="border: 2px solid #333; border-radius: 8px; padding: 10px 14px; background-color: #fff3e0;">
          <h3 style="text-align: center; margin: 0 0 8px 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-size: 16px;">${t('grand_total_period') || (isEn ? 'Grand Total For Period' : 'الإجمالي للفترة')}</h3>
          <div style="display: flex; justify-content: space-around; font-size: 15px;">
            <div style="text-align: center;">
              <p style="margin: 2px 0; color: #555;">${t('total_sales')}</p>
              <p style="margin: 2px 0; font-weight: bold; color: #7A1A22;" dir="ltr">${fmt(grandTotalCash + grandTotalOnlineNet)}</p>
            </div>
            <div style="text-align: center; border-right: 1px solid #ccc; padding-right: 15px;">
              <p style="margin: 2px 0; color: #555;">${t('total_monthly_expenses') || (isEn ? 'Total Monthly Expenses' : 'إجمالي المصروفات')}</p>
              <p style="margin: 2px 0; font-weight: bold; color: #c62828;" dir="ltr">${fmt(grandTotalExpenses + grandTotalEmpTxs + grandTotalSupTxs + grandTotalVouchers)}</p>
            </div>
            <div style="text-align: center; border-right: 1px solid #ccc; padding-right: 15px;">
              <p style="margin: 2px 0; color: #555;">${grandNetLabel}</p>
              <p style="margin: 2px 0; font-size: 17px; ${grandNetStyle}" dir="ltr">${fmt(grandNet)}</p>
            </div>
          </div>
        </div>
        <div style="margin-top: 16px; display: flex; justify-content: space-around; text-align: center; font-size: 14px; font-weight: bold;">
          <div>
            <p style="margin: 0;">${t('accountant_sig') || (isEn ? 'Accountant Signature' : 'توقيع المحاسب')}</p>
            <p style="margin-top: 24px; margin-bottom: 0;">_______________________</p>
          </div>
          <div>
            <p style="margin: 0;">${t('sig_manager') || (isEn ? 'Manager Signature' : 'توقيع المدير')}</p>
            <p style="margin-top: 24px; margin-bottom: 0;">_______________________</p>
          </div>
        </div>
      </div>
    </div>
</body>
</html>`;
  await window.api.printHtmlToPDF(html, 'A4');
}

window.printVaultSummary = printVaultSummary;
