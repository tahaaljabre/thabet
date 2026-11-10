function renderFullReportPrint() {
  const reportDateStr = state.reportDate || t('not_specified');
  const formattedDate = formatDateString(reportDateStr);
  const preparedBy = document.querySelector('.prepared span') ? document.querySelector('.prepared span').innerText : "ثابت صالح ثابت";
  
  const logoBoxImg = document.querySelector('.logo-box img');
  const logoHtml = logoBoxImg ? `<img class="print-voucher-logo" src="${logoBoxImg.src}" alt="${t('company_logo_alt')}">` : '';

  // Calculations
  const cashSalesSystem = window.safeParseFloat(state.sales.cash) || 0;
  const kbank = window.safeParseFloat(state.sales.kbank) || 0;
  const grab = window.safeParseFloat(state.sales.grab) || 0;
  const lineman = window.safeParseFloat(state.sales.lineman) || 0;
  const krungsri = window.safeParseFloat(state.sales.krungsri) || 0;

  const customChannelTotal = Object.values(state.channelSales || {}).reduce((sum, value) => sum + (window.safeParseFloat(value) || 0), 0);
  const totalOnline = kbank + grab + lineman + krungsri + customChannelTotal;
  const actualCashSales = cashSalesSystem;
  const totalSales = cashSalesSystem + kbank + grab + lineman + krungsri;

  const totalPurchases = state.purchases.reduce((sum, item) => sum + (window.safeParseFloat(item.amount) || 0), 0);
  const totalEmp = (state.empTxs || []).reduce((sum, item) => sum + (window.safeParseFloat(item.amount) || window.safeParseFloat(item.allowances) || 0), 0);
  const totalSup = (state.supTxs || []).reduce((sum, item) => sum + (window.safeParseFloat(item.amount) || 0), 0);
  
  const cashAvailable = actualCashSales - totalPurchases - totalEmp - totalSup;
  const totalAvailable = cashAvailable + totalOnline;
  const actualCashier = window.safeParseFloat(state.cashierActual) || 0;
  const cashierDiff = (actualCashier > (cashAvailable + totalOnline / 2))
    ? (actualCashier - totalAvailable)
    : (actualCashier - cashAvailable);

  let salesHtml = '';
  if (cashSalesSystem > 0) salesHtml += `<div class="print-voucher-row"><span>${t('cash_sales')}</span><span>${window.appSettings?.currency || ''}${cashSalesSystem.toLocaleString('en-US')}</span></div>`;
  if (kbank > 0) salesHtml += `<div class="print-voucher-row"><span>${t('cards_kbank')}</span><span>${window.appSettings?.currency || ''}${kbank.toLocaleString('en-US')}</span></div>`;
  if (grab > 0) salesHtml += `<div class="print-voucher-row"><span>Grab Food</span><span>${window.appSettings?.currency || ''}${grab.toLocaleString('en-US')}</span></div>`;
  if (lineman > 0) salesHtml += `<div class="print-voucher-row"><span>Lineman</span><span>${window.appSettings?.currency || ''}${lineman.toLocaleString('en-US')}</span></div>`;
  if (krungsri > 0) salesHtml += `<div class="print-voucher-row"><span>Krungsri Online</span><span>${window.appSettings?.currency || ''}${krungsri.toLocaleString('en-US')}</span></div>`;

  let purchasesHtml = '';
  if (state.purchases.length === 0) {
    purchasesHtml = `<div class="print-voucher-row"><span>${t('no_expenses_today')}</span><span>${window.appSettings?.currency || ''}0.00</span></div>`;
  } else {
    state.purchases.forEach(p => {
      purchasesHtml += `<div class="print-voucher-row"><span>${p.name} ${p.qty ? `(${p.qty})` : ''}</span><span>${window.appSettings?.currency || ''}${p.amount.toLocaleString('en-US')}</span></div>`;
    });
  }

  let diffHtml = '';
  if (cashierDiff > 0) {
    diffHtml = `<div class="print-voucher-row amount" style="border-bottom: 3px double #000; margin-top: 5px;"><span class="lbl">${t('cashier_overage')}</span><span style="color: green;">+${window.appSettings?.currency || ''}${cashierDiff.toLocaleString('en-US')}</span></div>`;
  } else if (cashierDiff < 0) {
    diffHtml = `<div class="print-voucher-row amount" style="border-bottom: 3px double #000; margin-top: 5px;"><span class="lbl">${t('cashier_shortage')}</span><span style="color: red;">-${window.appSettings?.currency || ''}${Math.abs(cashierDiff).toLocaleString('en-US')}</span></div>`;
  } else {
    diffHtml = `<div class="print-voucher-row amount" style="border-bottom: 3px double #000; margin-top: 5px;"><span class="lbl">${t('cashier_matched')}</span><span>${window.appSettings?.currency || ''}0.00</span></div>`;
  }

  return `
    <div class="print-voucher" style="padding: 0 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: ${typeof window.currentLang === 'function' && window.currentLang() === 'en' ? 'ltr' : 'rtl'};">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 10px; margin-top: 0;">
        <div style="text-align: right; flex: 1;">
          <div style="font-weight: bold; color: #b71c1c; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <span style="font-size: 22px;">${appSettings.companyName || ''}</span>
            <span style="font-size: 14px; color: #555;">${appSettings.branchName || ''}</span>
            <span style="font-size: 14px; color: #333;">📍 ${appSettings.address || ''}</span>
            <span style="font-size: 14px; color: #333;">📞 ${appSettings.phone || ''}</span>
          </div>
        </div>
        <div style="text-align: left; padding-right: 20px;">
          ${appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 50px;">` : logoHtml}
        </div>
      </div>
      <div style="text-align: center; margin-bottom: 15px;">
        <div style="font-size: 18px; font-weight: bold; border: 1px solid #333; display: inline-block; padding: 4px 20px; background-color: #f9f9f9; border-radius: 5px;">${t('z_report_title')} (Z-Report)</div>
        <div style="font-size: 14px; font-weight: bold; margin-top: 8px;">${t('date')}: ${formattedDate}</div>
      </div>
      
      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; font-size: 16px;">1. ${t('sales_revenue_details')}</h3>
        ${salesHtml}
        <div class="print-voucher-row amount" style="margin-top: 5px;"><span class="lbl">${t('total_sales')}</span><span>${window.appSettings?.currency || ''}${totalSales.toLocaleString('en-US')}</span></div>
      </div>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; font-size: 16px;">2. ${t('expense_purchase_details')}</h3>
        ${purchasesHtml}
        <div class="print-voucher-row amount" style="margin-top: 5px;"><span class="lbl">${t('total_expenses')}</span><span>${window.appSettings?.currency || ''}${totalPurchases.toLocaleString('en-US')}</span></div>
      </div>

      <div style="margin-top: 20px;">
        <h3 style="border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; font-size: 16px;">3. ${t('cashier_reconciliation')}</h3>
        <div class="print-voucher-row"><span>${t('total_cash')}</span><span>${window.appSettings?.currency || ''}${actualCashSales.toLocaleString('en-US')}</span></div>
        <div class="print-voucher-row"><span>${t('less_total_expenses')}</span><span>- ${window.appSettings?.currency || ''}${totalPurchases.toLocaleString('en-US')}</span></div>
        <div class="print-voucher-row" style="font-weight: bold; font-size: 16px; border-bottom: 1px dashed #000; padding: 12px 0;">
           <span>${t('expected_cash')}</span><span>${window.appSettings?.currency || ''}${cashAvailable.toLocaleString('en-US')}</span>
        </div>
        
        <div class="print-voucher-row" style="margin-top: 10px;"><span>${t('total_online_card_sales')}</span><span>${window.appSettings?.currency || ''}${totalOnline.toLocaleString('en-US')}</span></div>
        <div class="print-voucher-row amount" style="margin-top: 5px; padding-bottom: 10px; border-bottom: 1px solid #000;"><span class="lbl">${t('total_net_revenue')}</span><span>${window.appSettings?.currency || ''}${totalAvailable.toLocaleString('en-US')}</span></div>
        
        <div class="print-voucher-row" style="margin-top: 15px; font-size: 15px; font-weight: bold;"><span>${t('actual_cash_in_drawer')}</span><span>${window.appSettings?.currency || ''}${actualCashier.toLocaleString('en-US')}</span></div>
        ${diffHtml}
      </div>

      <div class="print-voucher-row" style="border-bottom: none; font-size: 12px; padding-top: 15px; margin-top: 10px;">
        <span class="lbl">${t('prepared_by')}:</span>
        <span class="val">${preparedBy}</span>
      </div>

      <div class="print-voucher-signatures">
        <div class="print-sig-line">
          <div class="line"></div>
          <span>${t('cashier_signature')}</span>
        </div>
        <div class="print-sig-line">
          <div class="line"></div>
          <span>${t('sig_accountant') || 'Accountant'}</span>
        </div>
        <div class="print-sig-line">
          <div class="line"></div>
          <span>${t('sig_manager') || 'Manager'}</span>
        </div>
      </div>
    </div>
  `;
}
