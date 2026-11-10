function openPartnerStatementModal() {
  document.getElementById('partner-statement-modal').style.display = 'flex';
  
  // Set default dates
  const today = window.getLocalDateString();
  const firstDay = new Date();
  firstDay.setDate(1);
  document.getElementById('partner-statement-start-date').value = window.getLocalDateString(firstDay);
  document.getElementById('partner-statement-end-date').value = today;
  
  // Populate datalist with unique partner names from general vouchers
  const select = document.getElementById('partner-statement-name');
    if (select) {
      window.api.getAllPartners(window.currentYearId).then(names => {
        select.innerHTML = `<option value="">${t('partner_select_placeholder')}</option>` + names.map(name => `<option value="${window.escapeHTML(name)}">${window.escapeHTML(name)}</option>`).join('');
      });
    }
}

function closePartnerStatementModal() {
  document.getElementById('partner-statement-modal').style.display = 'none';
}

async function printPartnerStatement() {
  const name = document.getElementById('partner-statement-name').value.trim();
  const start = document.getElementById('partner-statement-start-date').value;
  const end = document.getElementById('partner-statement-end-date').value;
  
  if (!name) return alert(t('err_partner_name_req'));
  if (!start || !end) return alert(t('err_date_period_req'));
  
  try {
    // Fetch all general vouchers for this year
    const vouchers = await window.api.getGeneralVouchers(window.currentYearId);
    
    // Filter by name and date range
    const filtered = vouchers.filter(v => 
      v.partner_name && v.partner_name.trim().toLowerCase() === name.toLowerCase() &&
      v.voucher_date >= start && v.voucher_date <= end
    ).sort((a, b) => a.voucher_date.localeCompare(b.voucher_date));
    
    if (filtered.length === 0) {
      alert(t('err_no_partner_txs'));
      return;
    }
    
    const cName = appSettings.companyName || t('company_default_name');
    const cPhone = appSettings.phone || '';
    const cAddress = appSettings.address || '';
    const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';
    
    let totalWithdrawals = 0;
    let totalDistributions = 0;
    
    let tableRows = filtered.map((v, index) => {
      let debit = 0; // Withdrawal
      let credit = 0; // Profit Distribution
      
      if (v.category === 'Partner Withdrawal') {
        debit = v.amount;
        totalWithdrawals += v.amount;
      } else if (v.category === 'Profit Distribution') {
        credit = v.amount;
        totalDistributions += v.amount;
      } else {
        debit = v.amount; // fallback
        totalWithdrawals += v.amount;
      }
      
      let catText = v.category === 'Partner Withdrawal' ? t('cat_partner_withdrawal') : t('cat_profit_dist');
      
      return `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; text-align:center;">${index + 1}</td>
          <td style="padding: 10px; text-align:center;">${v.voucher_date}</td>
          <td style="padding: 10px; text-align:center;">#${v.id}</td>
          <td style="padding: 10px; text-align:right;">${catText}</td>
          <td style="padding: 10px; text-align:right; color:#555;">${v.description || ''}</td>
          <td style="padding: 10px; text-align:left; color:#c62828; font-weight:bold;">${debit > 0 ? (window.appSettings?.currency || '') + debit.toLocaleString('en-US') : '-'}</td>
          <td style="padding: 10px; text-align:left; color:#2e7d32; font-weight:bold;">${credit > 0 ? (window.appSettings?.currency || '') + credit.toLocaleString('en-US') : '-'}</td>
        </tr>
      `;
    }).join('');
    
    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Cairo', sans-serif; direction: ${typeof window.currentLang === 'function' && window.currentLang() === 'en' ? 'ltr' : 'rtl'}; padding: 20px; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7A1A22; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background: #f5f5f5; color: #333; }
          .sum-container { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 25px; }
          .sum-box { border: 1px solid #ccc; padding: 12px; border-radius: 6px; text-align: center; background: #fafafa; }
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
        
        <h2 style="text-align:center; text-decoration: underline; color: #1e293b;">${t('partner_statement_title')}</h2>
        
        <div style="margin: 15px 0; font-size:14px; line-height: 1.5; background: #f8fafc; padding: 10px; border-radius: 6px; border-right: 4px solid #7A1A22;">
          <strong>${t('closing_partner_name')}:</strong> ${name}<br>
          <strong>${t('financial_period')}</strong> ${t('from_date')} ${start} ${t('to_date')} ${end}<br>
          <strong>${t('bank_statement_print_date')}</strong> ${new Date().toLocaleDateString('en-GB')}
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 12%;">${t('col_date')}</th>
              <th style="width: 10%;">${t('voucher_no').replace(':', '')}</th>
              <th style="width: 15%;">${t('col_tx_type')}</th>
              <th style="width: 33%;">${t('col_description')}</th>
              <th style="width: 12.5%;">${t('col_debit_withdrawals')}</th>
              <th style="width: 12.5%;">${t('col_credit_profits')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="sum-container">
          <div class="sum-box">
            <h4 style="margin:0 0 5px 0; color:#2e7d32;">${t('total_profit_dist')}</h4>
            <strong style="font-size: 18px; color:#2e7d32;">${window.appSettings?.currency || ''}${totalDistributions.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
          </div>
          <div class="sum-box">
            <h4 style="margin:0 0 5px 0; color:#c62828;">${t('total_partner_withdrawals')}</h4>
            <strong style="font-size: 18px; color:#c62828;">${window.appSettings?.currency || ''}${totalWithdrawals.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
          </div>
          <div class="sum-box" style="background:#7A1A22; color:white;">
            <h4 style="margin:0 0 5px 0; color:white;">${t('net_remaining_balance')}</h4>
            <strong style="font-size: 20px; color:#86efac;">${window.appSettings?.currency || ''}${(totalDistributions - totalWithdrawals).toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
          </div>
        </div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 13px; font-weight: bold;">
          <div><p>${t('partner_sign')}</p><p style="margin-top: 40px;">___________________</p></div>
          <div><p>${t('finance_accountant_sign')}</p><p style="margin-top: 40px;">___________________</p></div>
        </div>
      </body>
      </html>
    `;
    
    await window.api.printHtmlToPDF(html, 'A4');
    closePartnerStatementModal();
  } catch (err) {
    console.error(err);
    alert(t('err_prepare_statement') + err.message);
  }
}

async function exportPartnerStatementExcel() {
  const name = document.getElementById('partner-statement-name').value.trim();
  const start = document.getElementById('partner-statement-start-date').value;
  const end = document.getElementById('partner-statement-end-date').value;
  if (!name) return alert(t('err_partner_name_req'));
  if (!start || !end) return alert(t('err_date_period_req'));
  const vouchers = await window.api.getGeneralVouchers(window.currentYearId);
  const rows = vouchers.filter(v => v.partner_name?.trim().toLowerCase() === name.toLowerCase() && v.voucher_date >= start && v.voucher_date <= end)
    .sort((a,b) => a.voucher_date.localeCompare(b.voucher_date)).map((v, index) => {
      const profit = v.category === 'Profit Distribution';
      return { serial: index + 1, date: v.voucher_date, voucher: `#${v.id}`, type: profit ? 'توزيع أرباح' : 'مسحوبات شريك',
        details: v.description || '', debit: profit ? 0 : Number(v.amount) || 0, credit: profit ? Number(v.amount) || 0 : 0 };
    });
  const result = await window.api.exportExcelReport({
    rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency,
    fileName: `كشف شريك ${name} ${start} ${end}`, sheetName: 'كشف الشريك', title: 'كشف حساب شريك تفصيلي',
    subtitle: `الشريك: ${name} | من: ${start} | إلى: ${end}`,
    columns: [
      { key: 'serial', header: '#', type: 'number', width: 8 }, { key: 'date', header: 'التاريخ', type: 'date', width: 15 },
      { key: 'voucher', header: 'رقم السند', width: 14 }, { key: 'type', header: 'نوع الحركة', width: 20 },
      { key: 'details', header: 'البيان', width: 36 }, { key: 'debit', header: 'مدين (مسحوبات)', type: 'currency', width: 19 },
      { key: 'credit', header: 'دائن (أرباح)', type: 'currency', width: 19 }
    ], rows
  });
  if (result?.success) closePartnerStatementModal();
}
