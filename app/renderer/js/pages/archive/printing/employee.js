async function printArchivedEmployeeStatement(id) {
  const cachedEmp = archivedEmployeesList.find(e => e.id == id);
  const statement = await window.api.getDetailedEmployeeStatement(
    id,
    '',
    '',
    cachedEmp?.year_id || window.currentYearId
  );
  const emp = statement?.employee || cachedEmp;
  if(!emp) return;
  
  const cName = appSettings.companyName || t('company_default_name');
  const cAddress = appSettings.address || '';
  const cPhone = appSettings.phone || '';
  const cTax = appSettings.taxNumber || '';
  const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';

  let dateRangeText = `${t('period_from')} ${t('all_transactions')} (${t('archived_status')})`;

  const previousBalance = Number(statement?.previousBalance) || 0;
  const filteredTxs = Array.isArray(statement?.transactions) ? statement.transactions : [];

  let balance = previousBalance;
  let totalDebit = previousBalance < 0 ? Math.abs(previousBalance) : 0;
  let totalCredit = previousBalance >= 0 ? previousBalance : 0;

  let html = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t('archived_employee_statement')}</title>
      <style>
        body { font-family: 'Cairo', Tahoma, sans-serif; direction: ${typeof window.currentLang === 'function' && window.currentLang() === 'en' ? 'ltr' : 'rtl'}; text-align: right; margin: 20px; color: #1e293b; }
        .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #7A1A22; padding-bottom: 10px; margin-bottom: 15px;}
        .header-text h1 { margin: 0; font-size: 22px; color: #0f172a; }
        .header-text p { margin: 3px 0; color: #475569; font-size: 12px; }
        .header-logo { text-align: left; }
        h2 { text-align: center; margin-top: 5px; color: #7A1A22; font-size: 18px; text-decoration: underline; margin-bottom: 15px; }
        
        .emp-info { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
        .emp-info p { margin: 3px 0; font-size: 13px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; }
        th { background: #7A1A22; color: #fff; font-weight: bold; }
        tr:nth-child(even) { background-color: #f1f5f9; }
        
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px; }
        .sum-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center; }
        .sum-box h3 { margin: 0 0 5px 0; font-size: 14px; color: #475569; }
        .sum-box.final { background: #7A1A22; color: #fff; border: none; }
        .sum-box.final h3 { color: #ffffff !important; }
        
        .text-red { color: #dc2626; }
        .text-green { color: #16a34a; }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="header-text" style="text-align: right;">
            <h1 style="margin:0; font-size: 22px; color: #7A1A22;">${cName}</h1>
            <p style="margin:3px 0; font-size: 12px;">${cAddress ? `${t('address') || 'Address'}: ` + cAddress : ''} ${cPhone ? ' | ' + (t('phone') || 'Phone') + ': ' + cPhone : ''}</p>
            ${cTax ? `<p style="margin:3px 0; font-weight:bold; font-size: 13px;">${t('tax_number') || 'Tax No'}: ${cTax}</p>` : ''}
          </div>
          <div style="text-align: left;">
            ${logoHtml}
          </div>
        </div>
      
      <h2>${t('archived_employee_statement')}</h2>
      
      <div class="emp-info">
        <div>
          <p><strong>${t('name_label') || 'Name'}:</strong> ${emp.name}</p>
          ${emp.category_name ? `<p><strong>${t('employee_category_label')}:</strong> ${emp.category_name}</p>` : ''}
          <p><strong>${t('phone_label') || t('phone')}:</strong> ${emp.phone || t('not_registered')}</p>
          <p style="color:#7A1A22; font-weight:bold;">${dateRangeText}</p>
        </div>
        <div>
          <p><strong>${t('basic_salary') || 'Basic Salary'}:</strong> ${window.appSettings?.currency || ''}${(emp.salary || 0).toLocaleString('en-US', {minimumFractionDigits:2})}</p>
          <p><strong>${t('print_date') || 'Print Date'}:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>${t('date') || 'Date'}</th>
            <th style="width: 40%;">${t('details') || 'Details'}</th>
            <th>${t('debit') || 'Debit'}</th>
            <th>${t('credit') || 'Credit'}</th>
            <th>${t('closing_balance') || 'Closing Balance'}</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (previousBalance !== 0) {
    let prevBalanceText = `${t('basic_salary_dues') || 'Basic Salary (Dues)'}`;
    html += `
      <tr style="background-color: #e0f2fe; font-weight: bold;">
        <td>-</td>
        <td style="text-align: right;">${prevBalanceText}</td>
        <td class="text-red">${previousBalance < 0 ? (window.appSettings?.currency || '') + Math.abs(previousBalance).toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td class="text-green">${previousBalance >= 0 ? (window.appSettings?.currency || '') + previousBalance.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td dir="ltr" class="${previousBalance >= 0 ? 'text-green' : 'text-red'}">${window.appSettings?.currency || ''}${previousBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
      </tr>
    `;
  }

  filteredTxs.forEach(tx => {
    const isSalaryRow = Boolean(tx.is_salary_row || tx.is_virtual);
    let txDebit = (Number(tx.amount) || 0) + (Number(tx.deductions) || 0);
    let txCredit = Number(tx.allowances) || 0;
    
    totalDebit += txDebit;
    totalCredit += txCredit;
    balance = balance + txCredit - txDebit;
    
    let desc = '';
    if (isSalaryRow) {
        desc = `<strong>${tx.notes}</strong>`;
    } else {
        if(tx.amount > 0) desc += `${t('cash_payment_desc')} `;
        if(tx.deductions > 0) desc += `${t('deduction_desc')} (${window.appSettings?.currency || ''}${tx.deductions}). `;
        if(tx.allowances > 0) desc += `${t('allowances_desc')} (${window.appSettings?.currency || ''}${tx.allowances}). `;
        if(tx.attendance_days > 0 || tx.absence_days > 0) desc += `[${t('attendance_desc')}: ${tx.attendance_days} | ${t('absence_desc')}: ${tx.absence_days}]. `;
        if(tx.notes) desc += ` <span style="color:#64748b; font-size:11px;">${t('note_label')} ${tx.notes}</span>`;
        if(!desc) desc = t('financial_entry_desc');
    }

    html += `
      <tr ${isSalaryRow ? 'style="background-color:#f0fdf4;"' : ''}>
        <td style="white-space: nowrap;">${formatDateString(tx.tx_date)}</td>
        <td style="text-align: right; line-height: 1.2;">${desc}</td>
        <td class="text-red">${txDebit > 0 ? (window.appSettings?.currency || '') + txDebit.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td class="text-green">${txCredit > 0 ? (window.appSettings?.currency || '') + txCredit.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td dir="ltr" style="font-weight: bold;" class="${balance >= 0 ? 'text-green' : 'text-red'}">${window.appSettings?.currency || ''}${balance.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
      </tr>
    `;
  });
  
  let finalStatusText = balance >= 0 ? (t('remaining_for_emp') || 'Remaining for Employee') : (t('remaining_on_emp') || 'Remaining on Employee');
  
  html += `
        </tbody>
      </table>
      
      <div class="summary-grid">
        <div class="sum-box">
          <h3>${t('total_dues_credit') || 'Total Dues (Credit)'}</h3>
          <strong class="text-green" style="font-size:20px;">${window.appSettings?.currency || ''}${totalCredit.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
        <div class="sum-box">
          <h3>${t('total_withdrawals_debit') || 'Total Withdrawals (Debit)'}</h3>
          <strong class="text-red" style="font-size:20px;">${window.appSettings?.currency || ''}${totalDebit.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
        <div class="sum-box final">
          <h3>${finalStatusText}</h3>
          <strong style="font-size:22px; color: ${balance < 0 ? '#fca5a5' : '#86efac'}">${window.appSettings?.currency || ''}${Math.abs(balance).toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
      </div>
      
      <div style="margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px; color: #475569;">
        <div style="text-align: center;">${t('sig_employee') || 'توقيع الموظف'}<br><br>____________________</div>
        <div style="text-align: center;">${t('sig_financial_mgr') || 'المحاسب'}<br><br>____________________</div>
      </div>

    </body>
    </html>
  `;
  
  await window.api.printHtmlToPDF(html, 'A4');
}
