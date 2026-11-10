import { generatePDF } from './api.js';
import { showToast } from '../../core/notifications.js';

export async function printClosingReportPreview({ partnersList, partnerWithdrawalsMap, currentYearName, appSettings, t, safeParseFloat }) {
  try {
    const rawProfit = safeParseFloat(document.getElementById('closing-netprofit').getAttribute('data-raw')) || 0;
    const rawZakat = safeParseFloat(document.getElementById('closing-zakat').getAttribute('data-raw')) || 0;
    const rawDistributable = safeParseFloat(document.getElementById('closing-distributable').getAttribute('data-raw')) || 0;

    const closingSales = document.getElementById('closing-sales').value;
    const closingTotalExpenses = document.getElementById('closing-total-expenses').value;
    const closingPurchases = document.getElementById('closing-purchases-detail').innerText;
    const closingEmployees = document.getElementById('closing-employees-detail').innerText;
    const closingOperating = document.getElementById('closing-operating-detail').innerText;
    const closingEmployeeReceivables = document.getElementById('closing-employee-receivables')?.value || '0.00';

    let partnersRows = partnersList.map(p => {
      const grossShare = rawDistributable * (p.percentage / 100);
      const withdrawals = partnerWithdrawalsMap[p.name] || 0;
      const netShare = grossShare - withdrawals;
      return `
        <tr style="border-bottom:1px solid #ccc;">
          <td style="padding:10px;">${escapeHtml(p.name)}</td>
          <td style="padding:10px;">${p.percentage}%</td>
          <td style="padding:10px; text-align:left;">${window.appSettings?.currency || ''}${grossShare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td style="padding:10px; text-align:left; color:#c62828;">${window.appSettings?.currency || ''}${withdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td style="padding:10px; text-align:left; font-weight:bold; color:#2e7d32;">${window.appSettings?.currency || ''}${netShare.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; text-align: right; padding: 20px; color:#1e293b; }
          table { width:100%; border-collapse: collapse; margin-top:20px; font-size:14px; }
          th, td { padding:10px; border-bottom: 1px solid #cbd5e1; }
          th { background:#7A1A22; color:white; font-weight:bold; text-align:right; }
        </style>
      </head>
      <body>
        <h2 style="text-align:center; color:#7A1A22; border-bottom: 3px solid #7A1A22; padding-bottom: 10px;">${t('closing_report_title')} ${currentYearName}</h2>
        
        <table style="width:100%; border-collapse: collapse; margin-top:20px; font-size:15px;">
          <tr style="background:#f9f9f9; border-bottom: 1px solid #ddd;">
            <td style="padding:10px;">${t('lbl_closing_sales')}</td>
            <td style="text-align:left; font-weight:bold; padding:10px;">${closingSales}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding:10px;">إجمالي المصروفات تشمل:</td>
            <td style="text-align:left; font-weight:bold; padding:10px;">${closingTotalExpenses}</td>
          </tr>
          <tr style="background:#f9f9f9; border-bottom: 1px solid #ddd;">
            <td style="padding:10px; font-size:12px; color:#666; padding-right: 25px;">- المشتريات والموردين</td>
            <td style="text-align:left; padding:10px; font-size:12px; color:#666;">${closingPurchases}</td>
          </tr>
          <tr style="background:#f9f9f9; border-bottom: 1px solid #ddd;">
            <td style="padding:10px; font-size:12px; color:#666; padding-right: 25px;">- مصروفات الموظفين والرواتب</td>
            <td style="text-align:left; padding:10px; font-size:12px; color:#666;">${closingEmployees}</td>
          </tr>
          <tr style="background:#f9f9f9; border-bottom: 1px solid #ddd;">
            <td style="padding:10px; font-size:12px; color:#666; padding-right: 25px;">- المصروفات النثرية والتشغيلية</td>
            <td style="text-align:left; padding:10px; font-size:12px; color:#666;">${closingOperating}</td>
          </tr>
          <tr style="background:#e8f5e9; border-bottom: 2px solid #2e7d32; font-size: 16px;">
            <td style="padding:10px;">${t('closing_employee_receivables')}</td>
            <td style="text-align:left; padding:10px;">${closingEmployeeReceivables}</td>
          </tr>
          <tr style="background:#e8f5e9; border-bottom: 2px solid #2e7d32; font-size: 16px;">
            <td style="padding:10px; font-weight:bold; color: #2e7d32;">${t('closing_net_profit')}</td>
            <td style="text-align:left; font-weight:bold; color:#2e7d32; padding:10px;">${window.appSettings?.currency || ''}${rawProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding:10px; color:#c62828;">${t('closing_zakat_due')} (2.5%)</td>
            <td style="text-align:left; font-weight:bold; color:#c62828; padding:10px;">${window.appSettings?.currency || ''}${rawZakat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background:#fff3e0; border-bottom: 2px solid #ef6c00; font-size: 16px;">
            <td style="padding:10px; font-weight:bold; color: #ef6c00;">${t('lbl_closing_distributable')}</td>
            <td style="text-align:left; font-weight:bold; color:#ef6c00; padding:10px;">${window.appSettings?.currency || ''}${rawDistributable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
        
        <h3 style="margin-top:30px; border-bottom: 2px solid #cbd5e1; padding-bottom:5px; color:#7A1A22;">${t('partner_shares_dist')}</h3>
        <table style="width:100%; border-collapse: collapse; font-size:14px;">
          <thead>
            <tr style="background:#7A1A22; color:white;">
              <th style="padding:10px; text-align:right;">${t('col_partner_name')}</th>
              <th style="padding:10px; text-align:right;">${t('col_partner_pct')}</th>
              <th style="padding:10px; text-align:left;">${t('col_partner_gross')}</th>
              <th style="padding:10px; text-align:left;">${t('col_partner_withdraw')}</th>
              <th style="padding:10px; text-align:left;">${t('col_partner_net')}</th>
            </tr>
          </thead>
          <tbody>
            ${partnersRows}
          </tbody>
        </table>
        
        <div style="margin-top: 60px; display: flex; justify-content: space-around; text-align: center; font-size: 14px; font-weight: bold; color:#475569;">
          <div>
            <p>${t('finance_accountant_sign')}</p>
            <p style="margin-top: 45px;">___________________</p>
          </div>
          <div>
            <p>${t('manager_in_charge_sign')}</p>
            <p style="margin-top: 45px;">___________________</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await generatePDF(html, 'A4');
    showToast(t('closing_export_success'), 'success');
  } catch (err) {
    console.error(err);
    showToast(t('err_prepare_statement') + err.message, 'error');
  }
}
