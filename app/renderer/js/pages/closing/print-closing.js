async function printClosingReportPreview() {
  const rawProfit = window.safeParseFloat(document.getElementById('closing-netprofit').getAttribute('data-raw')) || 0;
  const rawZakat = window.safeParseFloat(document.getElementById('closing-zakat').getAttribute('data-raw')) || 0;
  const rawDistributable = window.safeParseFloat(document.getElementById('closing-distributable').getAttribute('data-raw')) || 0;
  const rawLiquidity = window.safeParseFloat(document.getElementById('closing-total-liquidity')?.getAttribute('data-raw')) || 0;
  const rawSupplierDebts = window.safeParseFloat(document.getElementById('closing-supplier-debts')?.getAttribute('data-raw')) || 0;

  const closingSales = document.getElementById('closing-sales').value;
  const closingTotalExpenses = document.getElementById('closing-total-expenses').value;
  const closingPurchases = document.getElementById('closing-purchases-detail').innerText;
  const closingEmployees = document.getElementById('closing-employees-detail').innerText;
  const closingOperating = document.getElementById('closing-operating-detail').innerText;
  const closingCommissions = document.getElementById('closing-commissions-detail')?.innerText || '';

  let partnersRows = partnersList.map(p => {
    const grossShare = rawDistributable * (p.percentage / 100);
    const withdrawals = partnerWithdrawalsMap[p.name] || 0;
    const netShare = grossShare - withdrawals;
    return `
      <tr style="border-bottom:1px solid #ccc;">
        <td style="padding:10px;">${p.name}</td>
        <td style="padding:10px;">${p.percentage}%</td>
        <td style="padding:10px; text-align:left;">${window.appSettings?.currency || ''}${grossShare.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
        <td style="padding:10px; text-align:left; color:#c62828;">${window.appSettings?.currency || ''}${withdrawals.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
        <td style="padding:10px; text-align:left; font-weight:bold; color:#2e7d32;">${window.appSettings?.currency || ''}${netShare.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: ${typeof window.currentLang === 'function' && window.currentLang() === 'en' ? 'ltr' : 'rtl'}; padding: 20px;">
      <h2 style="text-align:center; color:#7A1A22; border-bottom: 2px solid #7A1A22; padding-bottom: 10px;">${t('closing_report_title')} ${window.currentYearName}</h2>
      <table style="width:100%; border-collapse: collapse; margin-top:20px; font-size:15px;">
        <tr style="background:#f9f9f9; border-bottom: 1px solid #ddd;"><td style="padding:10px;">${t('lbl_closing_sales')}</td><td style="text-align:left; font-weight:bold; padding:10px;">${closingSales}</td></tr>
        <tr style="border-bottom: 1px solid #ddd;"><td style="padding:10px;">${window.t('lbl_closing_expenses')}</td><td style="text-align:left; font-weight:bold; padding:10px;">${closingTotalExpenses}</td></tr>
        <tr style="background:#f9f9f9; border-bottom: 1px solid #ddd;"><td style="padding:10px; font-size:12px; color:#666;"> - ${t('closing_paid_purchases')}</td><td style="text-align:left; padding:10px; font-size:12px; color:#666;">${closingPurchases}</td></tr>
        <tr style="background:#f9f9f9; border-bottom: 1px solid #ddd;"><td style="padding:10px; font-size:12px; color:#666;"> - ${t('lbl_closing_employees')}</td><td style="text-align:left; padding:10px; font-size:12px; color:#666;">${closingEmployees}</td></tr>
        <tr style="background:#f9f9f9; border-bottom: 1px solid #ddd;"><td style="padding:10px; font-size:12px; color:#666;"> - ${t('lbl_closing_operating')}</td><td style="text-align:left; padding:10px; font-size:12px; color:#666;">${closingOperating}</td></tr>
        <tr style="background:#f9f9f9; border-bottom: 1px solid #ddd;"><td style="padding:10px; font-size:12px; color:#666;"> - ${t('closing_expense_commissions')}</td><td style="text-align:left; padding:10px; font-size:12px; color:#666;">${closingCommissions}</td></tr>
        <tr style="background:#e8f5e9; border-bottom: 2px solid #2e7d32; font-size: 16px;"><td style="padding:10px; font-weight:bold;">${t('closing_net_profit')}</td><td style="text-align:left; font-weight:bold; color:#2e7d32; padding:10px;">${window.appSettings?.currency || ''}${rawProfit.toLocaleString('en-US', {minimumFractionDigits:2})}</td></tr>
        <tr style="border-bottom: 1px solid #ddd;"><td style="padding:10px; color:#c62828;">${t('closing_zakat_due')}</td><td style="text-align:left; font-weight:bold; color:#c62828; padding:10px;">${window.appSettings?.currency || ''}${rawZakat.toLocaleString('en-US', {minimumFractionDigits:2})}</td></tr>
        <tr style="background:#fff3e0; border-bottom: 2px solid #ef6c00; font-size: 16px;"><td style="padding:10px; font-weight:bold;">${t('lbl_closing_distributable')}</td><td style="text-align:left; font-weight:bold; color:#ef6c00; padding:10px;">${window.appSettings?.currency || ''}${rawDistributable.toLocaleString('en-US', {minimumFractionDigits:2})}</td></tr>
        <tr style="background:#eff6ff; border-bottom: 2px solid #2563eb; font-size: 16px;"><td style="padding:10px; font-weight:bold;">إجمالي السيولة في البنوك والصندوق</td><td style="text-align:left; font-weight:bold; color:#2563eb; padding:10px;">${window.appSettings?.currency || ''}${rawLiquidity.toLocaleString('en-US', {minimumFractionDigits:2})}</td></tr>
        <tr style="background:#fef2f2; border-bottom: 2px solid #dc2626; font-size: 16px;"><td style="padding:10px; font-weight:bold;">${t('closing_supplier_debts')}</td><td style="text-align:left; font-weight:bold; color:#dc2626; padding:10px;">${window.appSettings?.currency || ''}${rawSupplierDebts.toLocaleString('en-US', {minimumFractionDigits:2})}</td></tr>
      </table>
      <div style="margin-top:12px;padding:10px;background:#f8fafc;border:1px solid #cbd5e1;font-size:12px;line-height:1.7;">
        ${t('closing_supplier_debts_carry_note')}
      </div>
      
      <h3 style="margin-top:30px; border-bottom: 1px solid #aaa; padding-bottom:5px;">${t('partner_shares_dist')}</h3>
      <table style="width:100%; border-collapse: collapse; font-size:14px;">
        <thead>
          <tr style="background:#7A1A22; color:white;"><th style="padding:10px; text-align:right;">${t('col_partner_name')}</th><th style="padding:10px; text-align:right;">${t('col_partner_pct')}</th><th style="padding:10px; text-align:left;">${t('col_partner_gross')}</th><th style="padding:10px; text-align:left;">${t('col_partner_withdraw')}</th><th style="padding:10px; text-align:left;">${t('col_partner_net')}</th></tr>
        </thead>
        <tbody>
          ${partnersRows}
        </tbody>
      </table>
      
      <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 14px; font-weight: bold;">
        <div><p>${t('finance_accountant_sign')}</p><p style="margin-top: 40px;">___________________</p></div>
        <div><p>${t('manager_in_charge_sign')}</p><p style="margin-top: 40px;">___________________</p></div>
      </div>
    </div>
  `;
  
  await window.api.printHtmlToPDF(html, 'A4');
}
