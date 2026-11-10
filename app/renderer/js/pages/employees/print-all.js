async function openAllEmployeesReportModal() {
  document.getElementById('all-employees-report-modal').style.display = 'flex';
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date();
  firstDay.setDate(1);
  document.getElementById('all-emp-start-date').value = firstDay.toISOString().split('T')[0];
  document.getElementById('all-emp-end-date').value = today;

  const categorySelect = document.getElementById('all-emp-category');
  if (categorySelect) {
    let categories = [];
    try {
      if (window.api && typeof window.api.getEmployeeCategories === 'function') {
        categories = await window.api.getEmployeeCategories();
      }
    } catch (err) {
      console.error('Failed to load employee categories for report filter:', err);
    }
    const escape = typeof window.escapeHTML === 'function' ? window.escapeHTML : (v => String(v ?? ''));
    categorySelect.innerHTML =
      `<option value="all">${escape(window.t('all_employee_categories'))}</option>` +
      (Array.isArray(categories) ? categories : []).map(cat =>
        `<option value="${cat.id}">${escape(cat.name)}</option>`
      ).join('') +
      `<option value="uncategorized">${escape(window.t('uncategorized_employees'))}</option>`;
    categorySelect.value = 'all';
  }
}

function closeAllEmployeesReportModal() {
  document.getElementById('all-employees-report-modal').style.display = 'none';
}

async function printAllEmployeesReport() {
  const start = document.getElementById('all-emp-start-date').value;
  const end = document.getElementById('all-emp-end-date').value;
  const categorySelect = document.getElementById('all-emp-category');
  const categoryValue = categorySelect ? categorySelect.value : 'all';
  const selectedCategoryLabel = categorySelect && categorySelect.selectedIndex >= 0
    ? categorySelect.options[categorySelect.selectedIndex].textContent
    : window.t('all_employee_categories');

  if(!start || !end) {
    alert(window.t('date_range_required'));
    return;
  }
  
  try {
    const stats = await window.api.getAllEmployeesStatement(start, end, window.currentYearId, categoryValue);
    
    if (stats.length === 0) {
      alert(window.t('no_employees_in_selected_category'));
      return;
    }
    
    const cName = appSettings.companyName || 'مطعم حضرموت اليمن';
    const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';
    const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
    const dir = isEn ? 'ltr' : 'rtl';
    const alignLabel = isEn ? 'left' : 'right';
    const escape = typeof window.escapeHTML === 'function' ? window.escapeHTML : (v => String(v ?? ''));
    
    let tableRows = '';
    let sumSalary = 0;
    let sumDeductions = 0;
    let sumAllowances = 0;
    let sumRemaining = 0;
    
    let index = 1;
    stats.forEach(s => {
      sumSalary += s.salary;
      sumDeductions += s.totalDeductions;
      sumAllowances += s.totalAllowances;
      sumRemaining += s.closingBalance;
      const catLabel = s.category_name || window.t('uncategorized_label');
      
      tableRows += `
        <tr>
          <td>${index++}</td>
          <td style="text-align: ${alignLabel}; padding-right: 8px; padding-left: 8px; font-weight: bold; color: #1e293b;">${escape(s.name)}</td>
          <td>${escape(catLabel)}</td>
          <td>${window.appSettings?.currency || ''}${s.salary.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
          <td style="color:#d32f2f;">${window.appSettings?.currency || ''}${s.totalDeductions.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
          <td style="color:#2e7d32;">${window.appSettings?.currency || ''}${s.totalAllowances.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
          <td style="font-weight:bold; color: ${s.closingBalance < 0 ? '#dc2626' : '#1e293b'};">${window.appSettings?.currency || ''}${s.closingBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
        </tr>
      `;
    });
    
    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t('all_employees_report')}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: ${dir}; text-align: ${alignLabel}; margin:0; padding:20px; }
          .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7A1A22; padding-bottom: 10px; margin-bottom: 15px; }
          .report-title { text-align: center; margin-bottom: 15px; }
          .report-title h2 { margin: 0; font-size: 20px; color: #7A1A22; text-decoration: underline; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center; }
          th { background-color: #f1f5f9; color: #334155; border-bottom: 2px solid #94a3b8; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .totals-row { background-color: #e2e8f0; font-weight: bold; }
          .totals-row td { border-top: 2px solid #94a3b8; }
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
          <h2>${t('all_employees_report')}</h2>
          <div style="font-size: 14px; margin-top: 5px; color: #7A1A22; font-weight: bold;">${t('employee_category_label')}: ${escape(selectedCategoryLabel)}</div>
          <div style="font-size: 14px; margin-top: 5px; color: #475569;">${t('period_from') || 'Period From'} ${start} ${t('period_to') || 'To'} ${end}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">${t('serial_no') || 'م'}</th>
              <th style="width: 24%;">${t('employee_name_col')}</th>
              <th style="width: 15%;">${t('employee_category_label')}</th>
              <th>${t('basic_salary_col')}</th>
              <th>${t('total_deductions_col')}</th>
              <th>${t('total_allowances_col')}</th>
              <th>${t('remaining_balance_col')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="3" style="text-align: ${alignLabel}; padding-right: 15px; padding-left: 15px;">${isEn ? 'Total' : 'الإجمالي'}</td>
              <td>${window.appSettings?.currency || ''}${sumSalary.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td style="color:#d32f2f;">${window.appSettings?.currency || ''}${sumDeductions.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td style="color:#2e7d32;">${window.appSettings?.currency || ''}${sumAllowances.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
              <td>${window.appSettings?.currency || ''}${sumRemaining.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 40px; display: flex; justify-content: space-around; color: #475569;">
          <div style="text-align: center;"><strong>${t('sig_accountant')}</strong><br><br>_________________</div>
          <div style="text-align: center;"><strong>${t('sig_manager')}</strong><br><br>_________________</div>
        </div>
      </body>
      </html>
    `;
    
    await window.api.printHtmlToPDF(html, 'A4');
    closeAllEmployeesReportModal();
  } catch (error) {
    console.error('Error printing all employees report:', error);
    alert(window.t('report_prepare_error'));
  }
}

async function exportAllEmployeesExcel() {
  const start = document.getElementById('all-emp-start-date').value;
  const end = document.getElementById('all-emp-end-date').value;
  const categorySelect = document.getElementById('all-emp-category');
  const categoryValue = categorySelect ? categorySelect.value : 'all';
  const selectedCategoryLabel = categorySelect && categorySelect.selectedIndex >= 0
    ? categorySelect.options[categorySelect.selectedIndex].textContent
    : window.t('all_employee_categories');

  if (!start || !end) return alert(window.t('date_range_required'));
  const stats = await window.api.getAllEmployeesStatement(start, end, window.currentYearId, categoryValue);
  if (stats.length === 0) return alert(window.t('no_employees_in_selected_category'));
  const rows = stats.map((s, index) => ({
    serial: index + 1,
    name: s.name,
    category: s.category_name || window.t('uncategorized_label'),
    salary: Number(s.salary) || 0,
    deductions: Number(s.totalDeductions) || 0,
    allowances: Number(s.totalAllowances) || 0,
    remaining: Number(s.closingBalance) || 0
  }));
  const result = await window.api.exportExcelReport({
    rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency,
    fileName: `كشف عام للموظفين ${start} ${end}`, sheetName: 'الموظفون', title: 'كشف عام للموظفين',
    subtitle: `الفئة: ${selectedCategoryLabel} | من: ${start} | إلى: ${end}`,
    columns: [
      { key: 'serial', header: '#', type: 'number', width: 8 },
      { key: 'name', header: 'اسم الموظف', width: 28 },
      { key: 'category', header: 'الفئة', width: 18 },
      { key: 'salary', header: 'الراتب الأساسي', type: 'currency', width: 18 },
      { key: 'deductions', header: 'إجمالي الخصومات', type: 'currency', width: 19 },
      { key: 'allowances', header: 'إجمالي البدلات', type: 'currency', width: 19 },
      { key: 'remaining', header: 'الرصيد المتبقي', type: 'currency', width: 19 }
    ], rows
  });
  if (result?.success) closeAllEmployeesReportModal();
}
