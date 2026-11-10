// Print Templates for Employees
async function printEmployeeStatement() {
  if(!currentEmployeeId) return;
  const fromDate = document.getElementById('emp-print-from') ? document.getElementById('emp-print-from').value : '';
  const toDate = document.getElementById('emp-print-to') ? document.getElementById('emp-print-to').value : '';

  const statement = await window.api.getDetailedEmployeeStatement(
    currentEmployeeId,
    fromDate,
    toDate,
    window.currentYearId
  );
  const emp = statement.employee || allEmployees.find(e => e.id == currentEmployeeId);
  if (!emp) return;
  
  const cName = appSettings.companyName || 'مطعم حضرموت اليمن';
  const cAddress = appSettings.address || '';
  const cPhone = appSettings.phone || '';
  const cTax = appSettings.taxNumber || '';
  const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px; margin-bottom: 10px;">` : '';

  const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
  let dateRangeText = '';
  if (fromDate && toDate) dateRangeText = `${t('period_from') || 'Period:'} ${isEn ? `From ${fromDate} to ${toDate}` : `من ${fromDate} إلى ${toDate}`}`;
  else if (fromDate) dateRangeText = `${t('period_from') || 'Period:'} ${isEn ? `From ${fromDate} onwards` : `من ${fromDate} فصاعداً`}`;
  else if (toDate) dateRangeText = `${t('period_from') || 'Period:'} ${isEn ? `Up to ${toDate}` : `حتى ${toDate}`}`;
  else dateRangeText = `${t('period_from') || 'Period:'} ${t('all_transactions') || 'All Financial Transactions'}`;

  const previousBalance = Number(statement.previousBalance) || 0;
  const archivedBalanceValue = Number(statement.archivedBalanceValue) || 0;
  const filteredTxs = Array.isArray(statement.transactions) ? statement.transactions : [];

  let balance = previousBalance;
  let totalDebit = previousBalance < 0 ? Math.abs(previousBalance) : 0;
  let totalCredit = previousBalance >= 0 ? previousBalance : 0;

  let prevBalanceText = fromDate 
    ? (isEn ? `Opening balance (carried to ${fromDate})` : `رصيد افتتاحي (مرحل إلى تاريخ ${fromDate})`) 
    : (isEn ? `Starting Balance (for previous period)` : `الرصيد الافتتاحي (عن الفترة السابقة)`);
  if (archivedBalanceValue !== 0) {
    prevBalanceText += (isEn 
      ? ` [Includes archived transactions: ${window.appSettings?.currency || ''}${archivedBalanceValue.toLocaleString('en-US', {minimumFractionDigits:2})}]` 
      : ` [يتضمن حركات مؤرشفة بقيمة: ${window.appSettings?.currency || ''}${archivedBalanceValue.toLocaleString('en-US', {minimumFractionDigits:2})}]`);
  }

  let html = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>${isEn ? 'Employee Statement' : 'كشف حساب موظف'}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        body { font-family: 'Cairo', Tahoma, sans-serif; direction: ${isEn ? 'ltr' : 'rtl'}; text-align: ${isEn ? 'left' : 'right'}; margin: 0; padding: 15px; color: #1e293b; box-sizing: border-box; }
        .voucher-container, .voucher-box { border: 2px solid #7A1A22; padding: 15px; border-radius: 8px; margin: 0 auto; background: #fff; box-sizing: border-box; height: 130mm; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; }
        .header-container, .header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom:10px; margin-bottom: 10px;}
        .header-text h1 { margin: 0; font-size: 20px; color: #7A1A22; }
        .header-text p { margin: 3px 0; font-size: 12px; color: #64748b; }
        .voucher-title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #fff; background: #7A1A22; display: inline-block; padding: 4px 20px; border-radius: 5px; position:relative; left: 50%; transform: translateX(-50%); }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 13px; }
        .info-item { background: #f8fafc; padding: 8px 12px; border-radius: 6px; border-${isEn ? 'left' : 'right'}: 4px solid #7A1A22; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 10px; }
        .details-table th, .details-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 13px; }
        .details-table th { background: #f1f5f9; color: #334155; }
        .notes-box { background: #f1f5f9; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 10px; font-size: 12px; }
        .signatures { display: flex; justify-content: space-between; margin-top: auto; }
        .sig-box { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #94a3b8; padding-top: 5px; color: #475569; font-size: 14px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
        .amount-box { background: #f1f5f9; border: 1px solid #94a3b8; padding: 8px; font-size: 18px; font-weight: bold; display: inline-block; border-radius: 5px; }
        .title { color: #7A1A22; font-size: 20px; font-weight: bold; margin-bottom: 5px; }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="header-text" style="text-align: ${isEn ? 'left' : 'right'};">
            <h1 style="margin:0; font-size: 22px; color: #7A1A22;">${cName}</h1>
            <p style="margin:3px 0; font-size: 12px;">${cAddress ? (isEn ? 'Address' : t('address')) + ': ' + cAddress : ''} ${cPhone ? ' | ' + (isEn ? 'Phone' : t('phone')) + ': ' + cPhone : ''}</p>
            ${cTax ? '<p style="margin:3px 0; font-weight:bold; font-size: 13px;">' + (isEn ? 'Tax No' : t('tax_number')) + ': ' + cTax + '</p>' : ''}
          </div>
          <div style="text-align: ${isEn ? 'right' : 'left'};">
            ${logoHtml}
          </div>
        </div>
      
      <h2>${t('detailed_emp_statement') || 'Detailed Employee Statement'}</h2>
      
      <div class="info-grid">
        <div class="info-item">
          <p><strong>${t('name_label') || 'Name'}:</strong> ${emp.name}</p>
          ${emp.category_name ? `<p><strong>${t('employee_category_label')}:</strong> ${emp.category_name}</p>` : ''}
          <p><strong>${t('phone_label') || 'Phone'}:</strong> ${emp.phone || '-'}</p>
        </div>
        <div class="info-item">
          <p style="color:#7A1A22; font-weight:bold;">${dateRangeText}</p>
          <p><strong>${t('print_date') || 'Print Date'}:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </div>
      
      <table class="details-table">
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

  html += `
    <tr style="background-color: #e0f2fe; font-weight: bold;">
      <td>-</td>
      <td style="text-align: right;">${prevBalanceText}</td>
      <td style="color: #dc2626;">${previousBalance < 0 ? (window.appSettings?.currency || '') + Math.abs(previousBalance).toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
      <td style="color: #16a34a;">${previousBalance >= 0 ? (window.appSettings?.currency || '') + previousBalance.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
      <td dir="ltr" style="${previousBalance >= 0 ? 'color:#16a34a;' : 'color:#dc2626;'}">${window.appSettings?.currency || ''}${previousBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
    </tr>
  `;

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
        if(tx.amount > 0) desc += isEn ? `Cash Payment. ` : `دفعة نقدية. `;

        if(tx.deductions > 0) desc += isEn ? `Deduction (${window.appSettings?.currency || ''}${tx.deductions}). ` : `خصم (${window.appSettings?.currency || ''}${tx.deductions}). `;
        if(tx.allowances > 0) desc += isEn ? `Allowances (${window.appSettings?.currency || ''}${tx.allowances}). ` : `بدلات (${window.appSettings?.currency || ''}${tx.allowances}). `;
        if(tx.attendance_days > 0 || tx.absence_days > 0) desc += isEn ? `[Present: ${tx.attendance_days} | Absent: ${tx.absence_days}]. ` : `[حضور: ${tx.attendance_days} | غياب: ${tx.absence_days}]. `;
        if(tx.notes) desc += ` <span style="color:#64748b; font-size:11px;">${isEn ? 'Note:' : 'ملاحظة:'} ${tx.notes}</span>`;
        if(!desc) desc = isEn ? 'Financial Transaction' : 'حركة مالية';
    }

    html += `
      <tr ${isSalaryRow ? 'style="background-color:#f0fdf4;"' : ''}>
        <td style="white-space: nowrap;">${formatDateString(tx.tx_date)}</td>
        <td style="text-align: right; line-height: 1.2;">${desc}</td>
        <td style="color: #dc2626;">${txDebit > 0 ? (window.appSettings?.currency || '') + txDebit.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td style="color: #16a34a;">${txCredit > 0 ? (window.appSettings?.currency || '') + txCredit.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td dir="ltr" style="font-weight: bold; ${balance >= 0 ? 'color:#16a34a;' : 'color:#dc2626;'}">${window.appSettings?.currency || ''}${balance.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
      </tr>
    `;
  });
  
  let finalStatusText = balance >= 0 ? (t('remaining_for_emp') || 'Remaining for Employee') : (t('remaining_on_emp') || 'Remaining on Employee');
  
  html += `
        </tbody>
      </table>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px;">
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center;">
          <h3 style="margin: 0 0 5px 0; font-size: 14px; color: #475569;">${t('total_dues_credit') || 'Total Dues (Credit)'}</h3>
          <strong style="color: #16a34a; font-size:20px;">${window.appSettings?.currency || ''}${totalCredit.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center;">
          <h3 style="margin: 0 0 5px 0; font-size: 14px; color: #475569;">${t('total_withdrawals_debit') || 'Total Withdrawals (Debit)'}</h3>
          <strong style="color: #dc2626; font-size:20px;">${window.appSettings?.currency || ''}${totalDebit.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
        <div style="background: #7A1A22; color: #fff; padding: 10px; border-radius: 6px; text-align: center;">
          <h3 style="margin: 0 0 5px 0; font-size: 14px; color: #ffffff;">${finalStatusText}</h3>
          <strong style="font-size:22px; color: ${balance < 0 ? '#fca5a5' : '#86efac'}">${window.appSettings?.currency || ''}${Math.abs(balance).toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
      </div>
      
      <div class="signatures">
        <div class="sig-box"><div class="sig-line">${t('sig_employee')}</div></div>
        <div class="sig-box"><div class="sig-line">${t('sig_financial_mgr') || 'Financial Manager / Accountant'}</div></div>
      </div>

    </body>
    </html>
  `;
  
  await window.api.printHtmlToPDF(html, 'A4');
}
