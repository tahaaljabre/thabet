async function printSupplierStatement() {
  if(!currentSupplierId) return;
  const sup = allSuppliers.find(s => s.id == currentSupplierId);
  
  const fromDate = document.getElementById('sup-print-from') ? document.getElementById('sup-print-from').value : '';
  const toDate = document.getElementById('sup-print-to') ? document.getElementById('sup-print-to').value : '';
  
  const cName = appSettings.companyName || 'اسم الشركة';
  const cPhone = appSettings.phone || 'رقم الهاتف';
  const cAddress = appSettings.address || 'العنوان';
  const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';

  const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
  let dateRangeText = '';
  if (fromDate && toDate) dateRangeText = `${t('period_from') || (isEn ? 'From' : 'من')} ${fromDate} ${t('period_to') || (isEn ? 'To' : 'إلى')} ${toDate}`;
  else if (fromDate) dateRangeText = `${t('period_from') || (isEn ? 'From' : 'من')} ${fromDate} ${isEn ? 'onwards' : 'فصاعداً'}`;
  else if (toDate) dateRangeText = `${isEn ? 'Period: until' : 'الفترة: حتى'} ${toDate}`;
  else dateRangeText = `${t('all_transactions') || (isEn ? 'All Transactions' : 'كل الحركات')}`;

  let html = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t('supplier_statement') || (isEn ? 'Supplier Statement' : 'كشف حساب مورد')}</title>
      <style>
        body { font-family: 'Cairo', Tahoma, sans-serif; direction: ${isEn ? 'ltr' : 'rtl'}; text-align: ${isEn ? 'left' : 'right'}; margin: 20px; color: #1e293b; }
        .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #7A1A22; padding-bottom: 10px; margin-bottom: 15px;}
        .header-text h1 { margin: 0; font-size: 22px; color: #0f172a; }
        .header-text p { margin: 3px 0; color: #475569; font-size: 12px; }
        h2 { text-align: center; margin-top: 5px; color: #7A1A22; font-size: 18px; text-decoration: underline; margin-bottom: 15px; }
        
        .sup-info { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
        .sup-info p { margin: 3px 0; font-size: 13px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; }
        th { background: #7A1A22; color: #fff; font-weight: bold; }
        tr:nth-child(even) { background-color: #f1f5f9; }
        
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px; }
        .sum-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center; }
        .sum-box h3 { margin: 0 0 5px 0; font-size: 14px; color: #475569; }
        .sum-box.final { background: #fff; border: 2px solid #7A1A22; color: #7A1A22; }
        .sum-box.final h3 { color: #7A1A22 !important; }
        
        .text-red { color: #dc2626; }
        .text-green { color: #16a34a; }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="header-text">
          <h1>${cName}</h1>
          <p>📞 ${cPhone} | 📍 ${cAddress}</p>
          ${appSettings.taxNumber ? `<p style="margin:3px 0; font-weight:bold; font-size: 13px;">${t('tax_number') || (isEn ? 'Tax No' : 'الرقم الضريبي')}: ${appSettings.taxNumber}</p>` : ''}
        </div>
        <div>${logoHtml}</div>
      </div>
      
      <h2>${t('supplier_statement') || (isEn ? 'Supplier Statement' : 'كشف حساب مورد')}</h2>
      
      <div class="sup-info">
        <div>
          <p><strong>${t('supplier') || (isEn ? 'Supplier' : 'المورد')}:</strong> ${sup.name}</p>
          <p><strong>${t('phone') || (isEn ? 'Phone' : 'الجوال')}:</strong> ${sup.phone || '-'}</p>
          <p style="color:#7A1A22; font-weight:bold;">${dateRangeText}</p>
        </div>
        <div style="text-align: ${isEn ? 'right' : 'left'}">
          <p><strong>${t('print_date') || (isEn ? 'Print Date' : 'تاريخ الطباعة')}:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>${t('date') || (isEn ? 'Date' : 'التاريخ')}</th>
            <th style="width: 40%;">${t('details') || (isEn ? 'Details' : 'البيان')}</th>
            <th>${t('credit') || (isEn ? 'Credit (Theirs)' : 'له')}</th>
            <th>${t('debit') || (isEn ? 'Debit (Ours)' : 'عليه')}</th>
            <th>${t('balance') || (isEn ? 'Balance' : 'الرصيد')}</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Sort oldest to newest
  const ledgerTxs = [...currentSupplierTxs].reverse();

  let previousBalance = 0; // Positive means we owe him (له), Negative means he owes us (عليه)
  let archivedBalanceValue = 0;
  let filteredTxs = [];

  ledgerTxs.forEach(tx => {
    let isBefore = fromDate && tx.tx_date < fromDate;
    let isAfter = toDate && tx.tx_date > toDate;
    
    if (tx.is_archived) {
      if(tx.tx_type === 'له') archivedBalanceValue += tx.amount;
      else archivedBalanceValue -= tx.amount;
    } else if (isBefore) {
      if(tx.tx_type === 'له') previousBalance += tx.amount;
      else previousBalance -= tx.amount;
    } else if (!isAfter) {
      filteredTxs.push(tx);
    }
  });

  previousBalance = previousBalance + archivedBalanceValue;

  let balance = previousBalance;
  let totalLahu = previousBalance > 0 ? previousBalance : 0;
  let totalAlayhi = previousBalance < 0 ? Math.abs(previousBalance) : 0;

  let displayText = fromDate ? `${t('brought_forward') || (isEn ? 'Brought Forward' : 'رصيد بداية المدة')} ${fromDate}` : (isEn ? `Starting Balance` : `رصيد بداية المدة`);
  if (archivedBalanceValue !== 0) {
    displayText += isEn 
      ? ` [Includes archived transactions: ${window.appSettings?.currency || ''}${archivedBalanceValue.toLocaleString('en-US', {minimumFractionDigits:2})}]`
      : ` [يشمل حركات مؤرشفة سابقة بقيمة: ${window.appSettings?.currency || ''}${archivedBalanceValue.toLocaleString('en-US', {minimumFractionDigits:2})}]`;
  }

  html += `
    <tr style="background-color: #e0f2fe; font-weight: bold;">
      <td>-</td>
      <td style="text-align: right;">${displayText}</td>
      <td class="text-green">${previousBalance > 0 ? (window.appSettings?.currency || '')+previousBalance.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
      <td class="text-red">${previousBalance < 0 ? (window.appSettings?.currency || '')+Math.abs(previousBalance).toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
      <td dir="ltr" class="${previousBalance >= 0 ? 'text-green' : 'text-red'}">${window.appSettings?.currency || ''}${Math.abs(previousBalance).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
    </tr>
  `;

  filteredTxs.forEach(tx => {
    if(tx.tx_type === 'له') {
      balance += tx.amount;
      totalLahu += tx.amount;
    } else {
      balance -= tx.amount;
      totalAlayhi += tx.amount;
    }
    
    let desc = `<span style="color:#64748b; font-size:11px;">${t('note')} ${tx.notes || '-'}</span>`;
    if(tx.tx_type === 'له') desc = `${t('purchase_invoice')} - ` + desc;
    else if (tx.tx_type === 'خصم') desc = `خصم / تسوية - ` + desc;
    else desc = `${t('voucher_payment')} - ` + desc;

    html += `
      <tr>
        <td style="white-space: nowrap;">${formatDateString(tx.tx_date)}</td>
        <td style="text-align: right; line-height: 1.2;">${desc}</td>
        <td class="text-green">${tx.tx_type === 'له' ? (window.appSettings?.currency || '')+tx.amount.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td class="text-red">${(tx.tx_type === 'عليه' || tx.tx_type === 'خصم') ? (window.appSettings?.currency || '')+tx.amount.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td dir="ltr" style="font-weight: bold;" class="${balance >= 0 ? 'text-green' : 'text-red'}">${window.appSettings?.currency || ''}${Math.abs(balance).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
      </tr>
    `;
  });
  
  let finalStatusText = balance >= 0 ? t('remaining_for_supplier') : t('remaining_on_supplier');
  
  html += `
        </tbody>
      </table>
      
      <div class="summary-grid">
        <div class="sum-box">
          <h3>${t('total_invoices')}</h3>
          <strong class="text-green" style="font-size:18px;">${window.appSettings?.currency || ''}${totalLahu.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
        <div class="sum-box">
          <h3>${t('total_payments')}</h3>
          <strong class="text-red" style="font-size:18px;">${window.appSettings?.currency || ''}${totalAlayhi.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
        <div class="sum-box final">
          <h3>${finalStatusText}</h3>
          <strong class="text-red" style="font-size:20px;">${window.appSettings?.currency || ''}${Math.abs(balance).toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
      </div>
      
      <div style="margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px; color: #475569;">
        <div style="text-align: center;">${t('sig_supplier')}<br><br>____________________</div>
        <div style="text-align: center;">${t('sig_accountant')}<br><br>____________________</div>
      </div>
    </body>
    </html>
  `;
  
  await window.api.printHtmlToPDF(html, 'A4');
}
