async function printArchivedSupplierStatement(id) {
  const sup = archivedSuppliersList.find(s => s.id == id);
  if(!sup) return;
  const txs = await window.api.getSupplierTransactions(id);
  
  const cName = appSettings.companyName || t('company_default_name');
  const cPhone = appSettings.phone || t('company_phone');
  const cAddress = appSettings.address || t('company_address');
  const cTax = appSettings.taxNumber || '';
  const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';

  let dateRangeText = `${t('all_transactions')} (${t('archived_status')})`;

  let html = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t('archived_supplier_statement')}</title>
      <style>
        body { font-family: 'Cairo', Tahoma, sans-serif; direction: ${typeof window.currentLang === 'function' && window.currentLang() === 'en' ? 'ltr' : 'rtl'}; text-align: right; margin: 20px; color: #1e293b; }
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
          ${cTax ? `<p style="margin:3px 0; font-weight:bold; font-size: 13px;">${t('tax_number') || 'Tax No'}: ${cTax}</p>` : ''}
        </div>
        <div>${logoHtml}</div>
      </div>
      
      <h2>${t('archived_supplier_statement')}</h2>
      
      <div class="sup-info">
        <div>
          <p><strong>${t('supplier') || 'Supplier'}:</strong> ${sup.name}</p>
          <p><strong>${t('phone') || 'Phone'}:</strong> ${sup.phone || '-'}</p>
          <p style="color:#7A1A22; font-weight:bold;">${dateRangeText}</p>
        </div>
        <div>
          <p><strong>${t('print_date') || 'Print Date'}:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>${t('date') || 'Date'}</th>
            <th style="width: 40%;">${t('details') || 'Details'}</th>
            <th>${t('credit') || 'Credit'}</th>
            <th>${t('debit') || 'Debit'}</th>
            <th>${t('balance') || 'Balance'}</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  const ledgerTxs = [...txs].reverse();
  let previousBalance = 0; 
  let filteredTxs = ledgerTxs;

  let balance = previousBalance;
  let totalLahu = previousBalance > 0 ? previousBalance : 0;
  let totalAlayhi = previousBalance < 0 ? Math.abs(previousBalance) : 0;

  let displayText = t('opening_period_balance');

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
    
    let desc = `<span style="color:#64748b; font-size:11px;">${t('note') || 'Note:'} ${tx.notes || '-'}</span>`;
    if(tx.tx_type === 'له') desc = `${t('purchase_invoice') || 'Purchase Invoice'} - ` + desc;
    else desc = `${t('voucher_payment') || 'Payment Voucher'} - ` + desc;

    html += `
      <tr>
        <td style="white-space: nowrap;">${formatDateString(tx.tx_date)}</td>
        <td style="text-align: right; line-height: 1.2;">${desc}</td>
        <td class="text-green">${tx.tx_type === 'له' ? (window.appSettings?.currency || '')+tx.amount.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td class="text-red">${tx.tx_type === 'عليه' ? (window.appSettings?.currency || '')+tx.amount.toLocaleString('en-US', {minimumFractionDigits:2}) : '-'}</td>
        <td dir="ltr" style="font-weight: bold;" class="${balance >= 0 ? 'text-green' : 'text-red'}">${window.appSettings?.currency || ''}${Math.abs(balance).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
      </tr>
    `;
  });
  
  let finalStatusText = balance >= 0 ? (t('remaining_for_supplier') || 'Remaining for Supplier') : (t('remaining_on_supplier') || 'Remaining on Supplier');
  
  html += `
        </tbody>
      </table>
      
      <div class="summary-grid">
        <div class="sum-box">
          <h3>${t('total_invoices') || 'Total Invoices'}</h3>
          <strong class="text-green" style="font-size:18px;">${window.appSettings?.currency || ''}${totalLahu.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
        <div class="sum-box">
          <h3>${t('total_payments') || 'Total Payments'}</h3>
          <strong class="text-red" style="font-size:18px;">${window.appSettings?.currency || ''}${totalAlayhi.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
        <div class="sum-box final">
          <h3>${finalStatusText}</h3>
          <strong class="text-red" style="font-size:20px;">${window.appSettings?.currency || ''}${Math.abs(balance).toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
        </div>
      </div>
      
      <div style="margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px; color: #475569;">
        <div style="text-align: center;">${t('sig_supplier') || 'توقيع المورد'}<br><br>____________________</div>
        <div style="text-align: center;">${t('sig_accountant') || 'المحاسب'}<br><br>____________________</div>
      </div>
    </body>
    </html>
  `;
  
  await window.api.printHtmlToPDF(html, 'A4');
}
