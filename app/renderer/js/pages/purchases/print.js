export async function printExpensesStatement(fromDate, toDate) {
  try {
    const isEn = window.currentLang?.() === 'en';
    const ledgerData = await window.api.getExpensesLedger(fromDate, toDate, window.currentYearId);
    
    if (!ledgerData || ledgerData.length === 0) {
      alert(window.t('no_reports_period'));
      return;
    }

    const cName = window.appSettings?.companyName || '';
    const cPhone = window.appSettings?.phone || '';
    const cAddress = window.appSettings?.address || '';
    const logoHtml = window.appSettings?.logo ? `<img src="${window.appSettings.logo}" style="max-height: 60px;">` : '';

    let totalAmount = 0;
    
    const tableRows = ledgerData.map((r, index) => {
      totalAmount += (r.total_amount || 0);
      return `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; text-align:center;">${index + 1}</td>
          <td style="padding: 10px; text-align:center; font-weight:bold;">${window.escapeHTML(r.voucherNumber || '-')}</td>
          <td style="padding: 10px; text-align:center;">${window.formatDateString(r.report_date)}</td>
          <td style="padding: 10px; text-align:center;">${r.items_count}</td>
          <td style="padding: 10px; text-align:left; color:#c62828; font-weight:bold;">${window.appSettings?.currency || ''}${(r.total_amount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Cairo', sans-serif; direction: ${isEn ? 'ltr' : 'rtl'}; padding: 20px; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7A1A22; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background: #f5f5f5; color: #333; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0; color:#7A1A22;">${cName}</h2>
            <p style="margin:4px 0; font-size:12px;">${cAddress} | ${cPhone}</p>
          </div>
          <div>${logoHtml}</div>
        </div>
        
        <h2 style="text-align:center; text-decoration: underline; color: #1e293b;">${window.t('purchases_statement_title')}</h2>
        
        <div style="margin: 15px 0; font-size:14px; line-height: 1.5; background: #f8fafc; padding: 10px; border-radius: 6px; border-right: 4px solid #7A1A22;">
          <strong>${window.t('period_label')}:</strong> ${window.t('from_word')} ${fromDate || window.t('start_word')} ${window.t('to_word')} ${toDate || window.t('end_word')}<br>
          <strong>${window.t('bank_statement_print_date')}</strong> ${new Date().toLocaleDateString('en-GB')}
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">${window.t('serial_no')}</th>
              <th style="width: 20%;">${window.t('voucher_number')}</th>
              <th style="width: 25%;">${window.t('col_date')}</th>
              <th style="width: 20%;">${window.t('expense_count')}</th>
              <th style="width: 30%;">${window.t('th_amount')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr style="background:#f5f5f5; font-weight:bold;">
              <td colspan="4" style="text-align:left; padding:10px;">${window.t('grand_total')}:</td>
              <td style="text-align:left; padding:10px; color:#c62828;">${window.appSettings?.currency || ''}${totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 13px; font-weight: bold;">
          <div><p>${window.t('sig_accountant')}</p><p style="margin-top: 40px;">___________________</p></div>
          <div><p>${window.t('manager_in_charge_sign')}</p><p style="margin-top: 40px;">___________________</p></div>
        </div>
      </body>
      </html>
    `;
    
    await window.api.printHtmlToPDF(html, 'A4');
  } catch (err) {
    console.error(err);
    alert(window.t('error_occurred') + ': ' + err.message);
  }
}

export async function printDailyExpensesVoucher(dateStr) {
  try {
    const isEn = window.currentLang?.() === 'en';
    const yearId = window.getState ? (window.getState('currentFiscalYear') || 1) : 1;
    const state = await window.api.getExpensesByDate(dateStr, yearId);
    
    if (!state || !state.purchases || state.purchases.length === 0) {
      alert(window.t('no_expenses_today'));
      return;
    }

    const cName = window.appSettings?.companyName || '';
    const cPhone = window.appSettings?.phone || '';
    const cAddress = window.appSettings?.address || '';
    const logoHtml = window.appSettings?.logo ? `<img src="${window.appSettings.logo}" style="max-height: 60px;">` : '';

    let totalAmount = 0;
    const itemsHtml = state.purchases.map((p, index) => {
      const amount = parseFloat(p.amount) || 0;
      totalAmount += amount;
      return `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #ccc; font-size:14px;">
          <span>${index + 1}. ${p.name} ${p.qty ? '(' + p.qty + ')' : ''}</span>
          <span style="font-weight:bold;">${window.appSettings?.currency || ''}${amount.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
        </div>
      `;
    }).join('');

    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Cairo', sans-serif; direction: ${isEn ? 'ltr' : 'rtl'}; padding: 20px; color: #111; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0; color:#b71c1c;">${cName}</h2>
            <p style="margin:4px 0; font-size:12px;">${cAddress} | ${cPhone}</p>
          </div>
          <div>${logoHtml}</div>
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 18px; font-weight: bold; border: 1px solid #333; display: inline-block; padding: 4px 20px; background-color: #f9f9f9; border-radius: 5px;">${window.t('daily_expense_voucher')}</div>
        </div>
        
        <div style="display:flex; justify-content:space-between; margin-bottom: 20px; font-size:14px;">
          <div><strong>${window.t('voucher_no')}</strong> ${state.expenseVoucherNumber || '-'}</div>
          <div><strong>${window.t('voucher_date')}</strong> ${window.formatDateString(dateStr)}</div>
        </div>
        
        <h3 style="border-bottom: 1px solid #000; padding-bottom: 5px; font-size: 16px;">${window.t('voucher_details')}</h3>
        
        <div style="margin-bottom: 20px;">
          ${itemsHtml}
        </div>
        
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-top:2px solid #000; font-size:16px; font-weight:bold;">
          <span>${window.t('grand_total')}:</span>
          <span>${window.appSettings?.currency || ''}${totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</span>
        </div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 14px; font-weight: bold;">
          <div><p>${window.t('sig_accountant')}</p><p style="margin-top: 40px;">___________________</p></div>
          <div><p>${window.t('accountant_manager')}</p><p style="margin-top: 40px;">___________________</p></div>
        </div>
      </body>
      </html>
    `;
    
    await window.api.printHtmlToPDF(html, 'A4');
  } catch (err) {
    console.error(err);
    alert(window.t('error_occurred') + ': ' + err.message);
  }
}
