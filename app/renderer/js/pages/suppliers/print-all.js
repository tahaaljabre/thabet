function openAllSuppliersReportModal() {
  document.getElementById('all-suppliers-report-modal').style.display = 'flex';
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date();
  firstDay.setDate(1);
  document.getElementById('all-sup-start-date').value = firstDay.toISOString().split('T')[0];
  document.getElementById('all-sup-end-date').value = today;
}

function closeAllSuppliersReportModal() {
  document.getElementById('all-suppliers-report-modal').style.display = 'none';
}

async function printAllSuppliersReport() {
  const start = document.getElementById('all-sup-start-date').value;
  const end = document.getElementById('all-sup-end-date').value;
  if(!start || !end) {
    alert(window.t('date_range_required'));
    return;
  }
  
  try {
    const stats = await window.api.getAllSuppliersStatement(start, end, window.currentYearId);
    
    // Filter out zero balance with no activity
    const filteredStats = stats.filter(s => s.openingBalance !== 0 || s.totalInvoices !== 0 || s.totalPayments !== 0 || s.closingBalance !== 0);
    
    if (filteredStats.length === 0) {
      alert(window.t('no_data_period'));
      return;
    }
    
    const cName = appSettings.companyName || 'اسم الشركة';
    const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';
    const dir = 'ltr';
    const alignLabel = 'left';
    
    let tableRows = '';
    let sumOpening = 0;
    let sumInvoices = 0;
    let sumPayments = 0;
    let sumClosing = 0;
    
    filteredStats.forEach(s => {
      sumOpening += s.openingBalance;
      sumInvoices += s.totalInvoices;
      sumPayments += s.totalPayments;
      sumClosing += s.closingBalance;
      
      tableRows += `
        <tr>
          <td style="text-align: ${alignLabel}; padding-right: 5px; padding-left: 5px;">${s.name}</td>
          <td>${window.appSettings?.currency || ''}${s.openingBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
          <td style="color:#2e7d32; font-weight:bold;">${window.appSettings?.currency || ''}${s.totalInvoices.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
          <td style="color:#d32f2f; font-weight:bold;">${window.appSettings?.currency || ''}${s.totalPayments.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
          <td style="font-weight:bold;">${window.appSettings?.currency || ''}${s.closingBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
        </tr>
      `;
    });
    
    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t('all_suppliers_report')}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: ${dir}; text-align: ${alignLabel}; margin:0; padding:20px; }
          .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7A1A22; padding-bottom: 10px; margin-bottom: 15px; }
          .report-title { text-align: center; margin-bottom: 15px; }
          .report-title h2 { margin: 0; font-size: 20px; text-decoration: underline; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          th { background-color: #f1f5f9; color: #334155; }
          .totals-row { background-color: #e2e8f0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div style="text-align: ${alignLabel};">
            <div style="font-size: 22px; font-weight: bold; color: #7A1A22;">${cName}</div>
            <div style="font-size: 13px; margin-top: 3px;">${appSettings.address ? t('address') + ': ' + appSettings.address : ''} ${appSettings.phone ? ' | ' + t('phone') + ': ' + appSettings.phone : ''}</div>
            ${appSettings.taxNumber ? `<div style="font-size: 14px; margin-top: 3px; font-weight: bold;">${t('tax_number')}: ${appSettings.taxNumber}</div>` : ''}
          </div>
          <div>${logoHtml}</div>
        </div>
        
        <div class="report-title">
          <h2>${t('all_suppliers_report')}</h2>
          <div style="font-size: 14px; margin-top: 5px;">${t('period_from') || 'Period: From'} ${start} ${t('period_to') || 'To'} ${end}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>${t('supplier_name') || 'Supplier Name'}</th>
              <th>${t('opening_balance')}</th>
              <th>${t('added_invoices')}</th>
              <th>${t('payments_made')}</th>
              <th>${t('closing_balance')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td style="text-align: ${alignLabel}; padding-right: 5px; padding-left: 5px;">${t('total_amount')}</td>
              <td>${window.appSettings?.currency || ''}${sumOpening.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td style="color:#2e7d32;">${window.appSettings?.currency || ''}${sumInvoices.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td style="color:#d32f2f;">${window.appSettings?.currency || ''}${sumPayments.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td>${window.appSettings?.currency || ''}${sumClosing.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 40px; display: flex; justify-content: space-around;">
          <div style="text-align: center;"><strong>${t('sig_accountant')}</strong><br><br>_________________</div>
          <div style="text-align: center;"><strong>${t('sig_manager')}</strong><br><br>_________________</div>
        </div>
      </body>
      </html>
    `;
    
    await window.api.printHtmlToPDF(html, 'A4');
    closeAllSuppliersReportModal();
  } catch (error) {
    console.error('Error printing all suppliers report:', error);
    alert(window.t('report_prepare_error'));
  }
}

async function exportAllSuppliersExcel() {
  const start = document.getElementById('all-sup-start-date').value;
  const end = document.getElementById('all-sup-end-date').value;
  if (!start || !end) return alert(window.t('date_range_required'));
  const stats = await window.api.getAllSuppliersStatement(start, end, window.currentYearId);
  const rows = stats.filter(s => Number(s.openingBalance) || Number(s.totalInvoices) || Number(s.totalPayments) || Number(s.closingBalance)).map(s => ({
    name: s.name, opening: Number(s.openingBalance) || 0, invoices: Number(s.totalInvoices) || 0,
    payments: Number(s.totalPayments) || 0, closing: Number(s.closingBalance) || 0
  }));
  const result = await window.api.exportExcelReport({
    rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency,
    fileName: `كشف عام للموردين ${start} ${end}`, sheetName: 'الموردون', title: 'كشف عام للموردين', subtitle: `من: ${start} | إلى: ${end}`,
    columns: [
      { key: 'name', header: 'اسم المورد', width: 28 }, { key: 'opening', header: 'الرصيد الافتتاحي', type: 'currency', width: 19 },
      { key: 'invoices', header: 'الفواتير المضافة', type: 'currency', width: 19 }, { key: 'payments', header: 'المدفوعات', type: 'currency', width: 19 },
      { key: 'closing', header: 'الرصيد الختامي', type: 'currency', width: 19 }
    ], rows
  });
  if (result?.success) closeAllSuppliersReportModal();
}
