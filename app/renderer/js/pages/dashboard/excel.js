async function exportDashboardExcel() {
  const start = document.getElementById('dash-start-date')?.value || '';
  const end = document.getElementById('dash-end-date')?.value || '';
  const response = await window.api.getDashboardStats(start, end, window.currentYearId || 1, '');
  if (!response?.success) return alert(`${t('dashboard_load_error')}: ${response?.error || ''}`);
  const s = response.stats;
  const rows = [
    ['المبيعات', 'إجمالي المبيعات', s.totalSales],
    ['المصروفات المدفوعة', 'إجمالي المصروفات المدفوعة من الصندوق والبنوك', s.totalCashExpenses],
    ['الرقابة النقدية', 'العجز المالي', s.totalFinancialDeficit],
    ['المصروفات المدفوعة', 'إجمالي عمولات التطبيقات', s.totalAppCommissions],
    ['الالتزامات', 'إجمالي ديون الموردين', s.totalSupplierDebts],
    ['التدفقات النقدية', 'مبالغ مسددة للموردين', s.totalSupplierPayments],
    ['التدفقات النقدية', 'مبالغ مدفوعة للموظفين', s.totalSalaries],
    ['التدفقات النقدية', 'صافي التدفق النقدي', s.cashNetFlow]
  ].map(([section, label, value]) => ({ section, label, value: Number(value) || 0 }));
  return window.api.exportExcelReport({
    rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency,
    fileName: `الشاشة التفاعلية ${start} ${end}`, sheetName: 'الإحصائيات', title: 'الشاشة التفاعلية والإحصائيات',
    subtitle: `من: ${start || 'البداية'} | إلى: ${end || 'النهاية'}`,
    columns: [{ key: 'section', header: 'القسم', width: 28 }, { key: 'label', header: 'البيان', width: 38 }, { key: 'value', header: 'المبلغ', type: 'currency', width: 22, total: false }],
    rows, showTotals: false
  });
}
