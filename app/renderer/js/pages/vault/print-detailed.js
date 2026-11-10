async function printVaultDetailed() {
  if(!vaultData) return alert(t('show_data_first'));
  const start = document.getElementById('vault-start-date').value;
  const end = document.getElementById('vault-end-date').value;
  const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
  const reportDir = isEn ? 'ltr' : 'rtl';
  const textStart = isEn ? 'left' : 'right';
  const textEnd = isEn ? 'right' : 'left';
  const defaultChannels = [
    { key: 'kbank', nameAr: 'بطاقات KBank', nameEn: 'KBank Cards' },
    { key: 'grab', nameAr: 'جراب فود', nameEn: 'GrabFood' },
    { key: 'lineman', nameAr: 'لاين مان', nameEn: 'LineMan' },
    { key: 'krungsri', nameAr: 'كرونغسري أونلاين', nameEn: 'Krungsri Online' }
  ];
  const activeChannels = (Array.isArray(window.appSettings?.salesChannels) ? window.appSettings.salesChannels : defaultChannels)
    .filter(channel => !channel.deleted && channel.active !== false);
  const channelAmount = (report, key) => Number.parseFloat(Object.hasOwn(report, key) ? report[key] : report.channel_sales?.[key]) || 0;
  const onlineForReport = report => activeChannels.reduce((sum, channel) => sum + channelAmount(report, channel.key), 0);
  const printChannelName = channel => (isEn ? channel.nameEn : channel.nameAr) || channel.nameEn || channel.nameAr || channel.key;
  
  let daysHtml = ''; 
  let totalNet = 0;
  let grandTotalCash = 0;
  let grandTotalOnline = 0;
  let grandTotalExpenses = 0;
  let grandTotalEmpTxs = 0;
  let grandTotalSupTxs = 0;

  const allDatesSet = new Set();
  vaultData.reports.forEach(r => { if (r.report_date) allDatesSet.add(r.report_date); });
  vaultData.expenses.forEach(e => { if (e.report_date) allDatesSet.add(e.report_date); });
  if (vaultData.employeeTxs) {
    vaultData.employeeTxs.forEach(tx => { if (tx.tx_date) allDatesSet.add(tx.tx_date); });
  }
  if (vaultData.supplierTxs) {
    vaultData.supplierTxs.forEach(tx => { if (tx.tx_date) allDatesSet.add(tx.tx_date); });
  }
  if (vaultData.generalVouchers) {
    vaultData.generalVouchers.forEach(v => { if (v.voucher_date) allDatesSet.add(v.voucher_date); });
  }
  const allDates = Array.from(allDatesSet).sort();
  const validDates = allDates.filter(date => {
    const dateReports = vaultData.reports.filter(rep => rep.report_date === date);
    const cash = dateReports.reduce((sum, rep) => sum + (parseFloat(rep.cash_sales) || 0), 0);
    const online = dateReports.reduce((sum, rep) => sum + onlineForReport(rep), 0);
    const dayExpTotal = vaultData.expenses.filter(e => e.report_date === date).reduce((sum, e) => sum + e.amount, 0);
    const dayEmpTotal = vaultData.employeeTxs ? vaultData.employeeTxs.filter(tx => tx.tx_date === date).reduce((sum, tx) => sum + (tx.amount || 0), 0) : 0;
    const daySupTotal = vaultData.supplierTxs ? vaultData.supplierTxs.filter(tx => tx.tx_date === date && tx.tx_type === 'عليه').reduce((sum, tx) => sum + (tx.amount || 0), 0) : 0;
    const dayVoucherTotal = vaultData.generalVouchers ? vaultData.generalVouchers.filter(v => v.voucher_date === date).reduce((sum, v) => sum + (Number(v.amount) || 0), 0) : 0;
    return !(cash === 0 && online === 0 && dayExpTotal === 0 && dayEmpTotal === 0 && daySupTotal === 0 && dayVoucherTotal === 0);
  });

  validDates.forEach((date, index) => {
    const dayReports = vaultData.reports.filter(rep => rep.report_date === date);
    
    const dayExpenses = vaultData.expenses.filter(e => e.report_date === date);
    const dayExpTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const dayEmpTxs = vaultData.employeeTxs ? vaultData.employeeTxs.filter(tx => tx.tx_date === date) : [];
    const dayEmpTotal = dayEmpTxs.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : (tx.allowances || 0)), 0);
  
    const daySupTxs = vaultData.supplierTxs ? vaultData.supplierTxs.filter(tx => tx.tx_date === date && tx.tx_type === 'عليه') : [];
    const daySupTotal = daySupTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    let daySalesHtml = '';
    let dayCashTotal = 0;
    let dayOnlineTotal = 0;
    let dayActualTotal = 0;
    
    if (dayReports.length === 0) {
      dayReports.push({
        cashier_name: isEn ? 'First Floor' : 'الدور الأول',
        cashier_user: isEn ? 'Responsible Employee' : 'الموظف المسؤول',
        cash_sales: 0, kbank: 0, grab: 0, lineman: 0, krungsri: 0, cashier_actual: 0
      });
    }

    const activeCashiersCount = dayReports.filter(r => {
      const c = parseFloat(r.cash_sales) || 0;
      const o = onlineForReport(r);
      const a = parseFloat(r.cashier_actual) || 0;
      return (c + o + a) > 0;
    }).length;

    dayReports.forEach((r, idx) => {
      const cash = parseFloat(r.cash_sales) || 0;
      const channelRows = activeChannels.map(channel => ({ name: printChannelName(channel), amount: channelAmount(r, channel.key) }));
      const online = channelRows.reduce((sum, channel) => sum + channel.amount, 0);
      const total = cash + online;
      const actual = parseFloat(r.cashier_actual) || 0;
      
      const dayExpToDeduct = (idx === 0) ? (dayExpTotal + dayEmpTotal + daySupTotal) : 0;
      const expectedCash = Math.max(0, cash - dayExpToDeduct);
      const diff = actual - expectedCash;
      
      dayCashTotal += cash;
      dayOnlineTotal += online;
      dayActualTotal += actual;
      
      grandTotalCash += cash;
      grandTotalOnline += online;
      
      const isCompletelyEmpty = (total === 0 && actual === 0);
      
      if (!(isCompletelyEmpty && (activeCashiersCount > 0 || idx > 0))) {
        const _c = window.appSettings?.currency || '';
        daySalesHtml += `
          <div style="flex: 1 1 calc(50% - 8px); min-width: 280px; box-sizing: border-box; border:2px solid #eaddc5; border-radius:8px; overflow:hidden; background:#ffffff;">
            <div style="background-color:#fdf5e6; padding:10px 14px; display:flex; align-items:center; gap:10px; border-bottom:1px solid #eaddc5;">
              <div style="width:32px; height:32px; border-radius:50%; background-color:#eab308; display:flex; align-items:center; justify-content:center; font-size:16px; color:#fff; flex-shrink:0;">💰</div>
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:900; color:#800020;">${r.cashier_name}</div>
                <div style="font-size:11px; color:#475569; font-weight:600;">${t('employee_word') || 'الموظف'}: ${r.cashier_user}</div>
              </div>
              ${diff !== 0 ? `<div style="font-size:11px; font-weight:bold; padding:4px 8px; border-radius:6px; background:${diff < 0 ? '#fee2e2' : '#dcfce7'}; color:${diff < 0 ? '#b91c1c' : '#15803d'}; direction:ltr;">${diff > 0 ? '+' : ''}${_c}${Math.abs(diff).toLocaleString('en-US')}</div>` : ''}
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 14px; color:#475569; font-weight:600;">${t('cash_sales') || 'مبيعات نقد'}</td><td style="padding:8px 14px; text-align:${textEnd}; font-weight:bold; color:#1e293b; direction:ltr;">${_c}${cash.toLocaleString('en-US')}</td></tr>
              ${channelRows.map(channel => `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 14px; color:#475569; font-weight:600;">${window.escapeHTML(channel.name)}</td><td style="padding:8px 14px; text-align:${textEnd}; font-weight:bold; color:#1e293b; direction:ltr;">${_c}${channel.amount.toLocaleString('en-US')}</td></tr>`).join('')}
              <tr style="background-color:#eff6ff; border-top:2px solid #bfdbfe;"><td style="padding:10px 14px; color:#1e3a8a; font-weight:bold; font-size:13px;">${t('total_sales') || 'إجمالي المبيعات'}</td><td style="padding:10px 14px; text-align:${textEnd}; font-weight:900; color:#1e3a8a; font-size:14px; direction:ltr;">${_c}${total.toLocaleString('en-US')}</td></tr>
              <tr style="background:#f8fafc; border-top:1px dashed #cbd5e1;"><td style="padding:8px 14px; color:#64748b; font-size:11px;">🏧 ${t('cashier_avail') || 'المتوفر بالكاشير'}</td><td style="padding:8px 14px; text-align:${textEnd}; color:#64748b; font-size:11px; direction:ltr; font-weight:bold;">${_c}${actual.toLocaleString('en-US')}</td></tr>
            </table>
          </div>
        `;
      }
    });

    const isClosedDate = dayReports.some(rep => rep.is_closed === 1);

    grandTotalExpenses += dayExpTotal;
    grandTotalEmpTxs += dayEmpTotal;
    grandTotalSupTxs += daySupTotal;

    const dayVouchers = vaultData.generalVouchers ? vaultData.generalVouchers.filter(v => v.voucher_date === date) : [];
    const dayVoucherTotal = dayVouchers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
    const dayNet = (dayCashTotal + dayOnlineTotal) - dayExpTotal - dayEmpTotal - daySupTotal - dayVoucherTotal;
    totalNet += dayNet;

    let salesHtml = `
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 15px 0; color: #1e3a8a; font-size:15px; border-bottom: 2px solid #bfdbfe; padding-bottom: 8px;">
          📊 ${t('sales_channels_details') || 'تفاصيل قنوات المبيعات'}
        </h4>
        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
          ${daySalesHtml}
        </div>
        <div style="margin-top: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #166534; font-weight: bold; font-size: 14px;">${t('total_daily_sales') || 'إجمالي مبيعات اليوم'}</div>
          <div style="color: #15803d; font-weight: 900; font-size: 15px; direction: ltr;">${window.appSettings?.currency || ''}${(dayCashTotal + dayOnlineTotal).toLocaleString('en-US')}</div>
        </div>
      </div>
    `;

    let allExpensesItems = [];

    dayExpenses.forEach(e => {
      allExpensesItems.push({
        label: `${e.name} ${e.qty ? '('+e.qty+')' : ''}`,
        color: '#334155',
        amount: e.amount || 0
      });
    });

    dayEmpTxs.forEach(tx => {
      const displayAmount = tx.amount > 0 ? tx.amount : (tx.allowances || 0);
      allExpensesItems.push({
        label: `${t('emp_expense_prefix') || 'سلف الموظفين:'} ${tx.employee_name} ${tx.notes ? '('+tx.notes+')' : ''}`,
        color: '#ea580c',
        amount: displayAmount
      });
    });

    daySupTxs.forEach(tx => {
      allExpensesItems.push({
        label: `${t('sup_expense_prefix') || 'مدفوعات الموردين:'} ${tx.supplier_name} ${tx.notes ? '('+tx.notes+')' : ''}`,
        color: '#7e22ce',
        amount: tx.amount || 0
      });
    });

    dayVouchers.forEach(tx => {
      allExpensesItems.push({
        label: `${tx.category || (isEn ? 'General Payment Voucher' : 'سند صرف عام')} ${tx.description ? '('+tx.description+')' : ''} ${tx.partner_name ? '['+tx.partner_name+']' : ''}`,
        color: '#0284c7',
        amount: tx.amount || 0
      });
    });

    let expensesGridHtml = '';
    if (allExpensesItems.length === 0) {
      expensesGridHtml = `<tr><td colspan="2" style="padding: 12px 6px; color: #94a3b8; text-align:center;">${t('no_expenses_today') || 'لا توجد مشتريات أو مصروفات لهذا اليوم'}</td></tr>`;
    } else {
      const renderExpenseItem = (item, withDivider = false) => `
        <td style="width:50%; padding:0; vertical-align:middle; ${withDivider ? `border-${isEn ? 'right' : 'left'}:2px solid #e2e8f0;` : ''}">
          <div style="display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; padding:10px 8px; direction:${reportDir};">
            <span style="min-width:0; color:${item.color}; font-weight:600; overflow-wrap:anywhere;">${window.escapeHTML(item.label)}</span>
            <span style="color:${item.color}; font-weight:bold; direction:ltr; white-space:nowrap; text-align:${textEnd};">${window.appSettings?.currency || ''}${item.amount.toLocaleString('en-US')}</span>
          </div>
        </td>`;

      for (let i = 0; i < allExpensesItems.length; i += 2) {
        const item1 = allExpensesItems[i];
        const item2 = allExpensesItems[i + 1];

        expensesGridHtml += `
          <tr style="border-bottom:1px solid #f1f5f9; page-break-inside:avoid;">
            ${renderExpenseItem(item1, true)}
            ${item2 ? renderExpenseItem(item2) : '<td style="width:50%;"></td>'}
          </tr>`;
      }
    }

    let expensesHtml = `
      <div style="margin-top: 15px;">
        <table style="width:100%; font-size:13px; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: auto;">
          <thead style="display: table-header-group;">
            <tr>
              <th colspan="2" style="text-align:${textStart}; padding: 12px 10px; background-color: #ffffff; border-bottom: 2px solid #800020;">
                <span style="color: #800020; font-size:17px; font-weight: bold;">
                  🛒 ${t('print_purchases_details') || 'تفاصيل المشتريات والمصروفات'}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            ${expensesGridHtml}
          </tbody>
          <tfoot style="display: table-footer-group;">
            <tr style="background:#fef2f2; border-top: 2px solid #fca5a5; page-break-inside: avoid;">
              <td style="padding: 12px 6px; font-weight: bold; color:#b91c1c; font-size:14px;">${t('print_total_expenses') || 'إجمالي المصاريف الكلي'}</td>
              <td style="text-align:${textEnd}; padding: 12px 6px; font-weight: bold; color:#b91c1c; font-size:15px; direction:ltr;">${window.appSettings?.currency || ''}${(dayExpTotal + dayEmpTotal + daySupTotal + dayVoucherTotal).toLocaleString('en-US')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const isLast = index === validDates.length - 1;
    daysHtml += `
      <div style="margin:20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); ${isLast ? '' : ' page-break-after: always; break-after: page;'}">
        <div style="background-color: #1e3a8a; display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; color: #ffffff;">
          <div style="font-weight: bold; font-size: 16px;">
        ${t('day_details')}: ${date}
          </div>
          <div style="font-weight: bold; font-size: 16px; display: flex; align-items: center; gap: 8px;">
          📅 ${date} ${isClosedDate ? `<span style="color:#fca5a5; font-size:12px;">(${t('closed_status')})</span>` : ''}
          </div>
        </div>
        <div style="display: flex; flex-direction: column; padding: 15px;">
          ${salesHtml}
          ${expensesHtml}
        </div>
        <div style="background-color: ${dayNet < 0 ? '#fef2f2' : '#f0fdf4'}; border-top: 1px solid ${dayNet < 0 ? '#fecaca' : '#bbf7d0'}; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
          <div style="color: ${dayNet < 0 ? '#991b1b' : '#166534'}; font-weight: bold; font-size: 15px;">
            ${t('net_total') || 'صافي اليوم'}
          </div>
          <div style="color: ${dayNet < 0 ? '#b91c1c' : '#15803d'}; font-weight: 900; font-size: 16px; direction: ltr;">
            ${window.appSettings?.currency || ''}${dayNet.toLocaleString('en-US')}
          </div>
        </div>
      </div>
    `;
  });

  const _grandVoucherTotal = vaultData.generalVouchers ? vaultData.generalVouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0) : 0;
  const _gCur = window.appSettings?.currency || '';
  const _grandAllExp = grandTotalExpenses + grandTotalEmpTxs + grandTotalSupTxs + _grandVoucherTotal;

  const html = `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'ar'}" dir="${reportDir}">
<head>
<meta charset="UTF-8">
<style>
  @page { size:A4; margin:8mm; }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  body {
    background:#ffffff !important;
    font-family:'Segoe UI',Tahoma,Arial,sans-serif;
    color:#1e293b;
    padding:0;
    direction:${reportDir};
    text-align:${textStart};
    width:100%;
    overflow:visible;
  }
  .pr-wrapper { width:100% !important; max-width:100% !important; overflow:visible !important; }
  .grand-summary-grid { grid-template-columns:repeat(3, minmax(0, 1fr)) !important; gap:8px !important; }
  .grand-summary-grid > div { min-width:0; padding:12px 8px !important; break-inside:avoid; }
  .grand-summary-grid > div > div:last-child { font-size:14px !important; white-space:nowrap; }
  table { max-width:100%; table-layout:fixed; }
  td, th { overflow-wrap:anywhere; }
</style>
</head>
<body>
<div class="pr-wrapper" style="width:100%; max-width:100%; margin:0 auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; overflow:visible;">
  
  <div class="pr-hdr" style="background-color:#800020; padding:30px 28px; display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid #facc15;">
    <div style="background-color:#ffffff; color:#1e3a8a; font-weight:bold; font-size:11px; padding:6px 14px; border:2px solid #facc15; border-radius:16px; text-align:center;" dir="ltr">
      REPORT PERIOD<br><span style="color:#475569; font-size:10px;">${start}${start !== end ? ' &rarr; ' + end : ''}</span>
    </div>
    <div style="text-align:center; flex:1; padding:0 15px;">
      <div style="font-size:24px; font-weight:900; color:#ffffff; letter-spacing:1px; margin-bottom:8px; text-shadow:0 2px 4px rgba(0,0,0,0.3);">${window.appSettings?.companyName || ''}${window.appSettings?.branchName ? ' — ' + window.appSettings.branchName : ''}</div>
      <div style="font-size:14px; color:#93c5fd; letter-spacing:2px;">◈ ${t('vault_report') || 'التقرير المالي التفصيلي'} ◈</div>
    </div>
    ${window.appSettings?.logo ? `<div><img src="${window.appSettings.logo}" style="height:70px; filter: drop-shadow(0 0 6px rgba(255,255,255,0.4));"></div>` : '<div style="width:70px;"></div>'}
  </div>

  ${daysHtml}

  <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:24px; page-break-inside: avoid; break-inside: avoid;">
    <div style="text-align:center; margin-bottom:20px;">
      <span style="font-size:16px; font-weight:bold; color:#1e3a8a; background:#e0e7ff; padding:8px 24px; border-radius:24px; border:1px solid #c7d2fe;">📊 ${t('grand_total_period') || 'الملخص المالي الإجمالي للفترة'}</span>
    </div>
    <div class="grand-summary-grid" style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px;">
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11px; color:#166534; font-weight:bold; margin-bottom:8px;">${isEn ? 'Total Sales' : 'إجمالي المبيعات'}</div>
        <div style="font-size:18px; font-weight:900; color:#15803d; direction:ltr;">${_gCur}${(grandTotalCash + grandTotalOnline).toLocaleString('en-US')}</div>
      </div>
      <div style="background:#fef2f2; border:1px solid #fecaca; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11px; color:#991b1b; font-weight:bold; margin-bottom:8px;">${isEn ? 'Total Expenses' : 'إجمالي المصروفات التشغيلية'}</div>
        <div style="font-size:16px; font-weight:bold; color:#dc2626; direction:ltr;">${_gCur}${grandTotalExpenses.toLocaleString('en-US')}</div>
      </div>
      <div style="background:#fef2f2; border:1px solid #fecaca; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11px; color:#991b1b; font-weight:bold; margin-bottom:8px;">${isEn ? 'Employee Advances' : 'صرفيات الموظفين'}</div>
        <div style="font-size:16px; font-weight:bold; color:#f87171; direction:ltr;">${_gCur}${grandTotalEmpTxs.toLocaleString('en-US')}</div>
      </div>
      <div style="background:#fef2f2; border:1px solid #fecaca; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11px; color:#991b1b; font-weight:bold; margin-bottom:8px;">${isEn ? 'Supplier Payments' : 'صرفيات الموردين'}</div>
        <div style="font-size:16px; font-weight:bold; color:#a855f7; direction:ltr;">${_gCur}${grandTotalSupTxs.toLocaleString('en-US')}</div>
      </div>
      <div style="background:#e0f2fe; border:1px solid #bae6fd; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11px; color:#0369a1; font-weight:bold; margin-bottom:8px;">${isEn ? 'General Vouchers' : 'سندات الصرف العام'}</div>
        <div style="font-size:16px; font-weight:bold; color:#0284c7; direction:ltr;">${_gCur}${_grandVoucherTotal.toLocaleString('en-US')}</div>
      </div>
      <div style="background:${totalNet < 0 ? '#fef2f2' : '#f0fdf4'}; border:2px solid ${totalNet < 0 ? '#fca5a5' : '#86efac'}; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="font-size:12px; color:${totalNet < 0 ? '#991b1b' : '#166534'}; font-weight:bold; margin-bottom:8px;">${isEn ? 'Net Profit' : 'الصافي النهائي'}</div>
        <div style="font-size:20px; font-weight:900; color:${totalNet < 0 ? '#dc2626' : '#15803d'}; direction:ltr;">${_gCur}${totalNet.toLocaleString('en-US')}</div>
      </div>
    </div>
    
    <div style="display:flex; justify-content:space-between; margin-top:40px; padding:0 40px;">
      <div style="text-align:center; width:200px;">
        <div style="font-weight:bold; color:#1e3a8a; margin-bottom:40px;">${t('accountant_signature') || 'توقيع المحاسب'}</div>
        <div style="border-bottom:1px solid #cbd5e1;"></div>
      </div>
      <div style="text-align:center; width:200px;">
        <div style="font-weight:bold; color:#1e3a8a; margin-bottom:40px;">${t('manager_signature') || 'توقيع المدير'}</div>
        <div style="border-bottom:1px solid #cbd5e1;"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

  await window.api.printHtmlToPDF(html, 'A4');
}

window.printVaultDetailed = printVaultDetailed;
