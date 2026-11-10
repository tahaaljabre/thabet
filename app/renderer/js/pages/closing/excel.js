async function exportClosingReportExcel() {
  const figures = await window.api.calculateClosingFigures(window.currentYearId);
  const distributable = Number(figures.distributable) || 0;
  const liquidity = (figures.bankBalances || []).reduce((sum, account) => sum + (Number(account.current_balance) || 0), 0);
  const currentWithdrawals = Object.fromEntries((figures.withdrawals || []).map(item => [item.partner_name, Number(item.total) || 0]));
  const rows = [
    { section: 'الملخص المالي', label: 'إجمالي المبيعات', percentage: '', gross: Number(figures.totalSales) || 0, withdrawals: 0, net: Number(figures.totalSales) || 0 },
    { section: 'الملخص المالي', label: 'إجمالي المشتريات المسددة', percentage: '', gross: Number(figures.totalPurchases) || 0, withdrawals: 0, net: -(Number(figures.totalPurchases) || 0) },
    { section: 'الملخص المالي', label: 'مصروفات الموظفين', percentage: '', gross: Number(figures.employeeExpenses) || 0, withdrawals: 0, net: -(Number(figures.employeeExpenses) || 0) },
    { section: 'الملخص المالي', label: 'المصروفات التشغيلية', percentage: '', gross: Number(figures.operatingExpenses) || 0, withdrawals: 0, net: -(Number(figures.operatingExpenses) || 0) },
    { section: 'الملخص المالي', label: 'عمولات التطبيقات', percentage: '', gross: Number(figures.appCommissions) || 0, withdrawals: 0, net: -(Number(figures.appCommissions) || 0) },
    { section: 'الملخص المالي', label: 'صافي الربح', percentage: '', gross: Number(figures.netProfit) || 0, withdrawals: 0, net: Number(figures.netProfit) || 0 },
    { section: 'الملخص المالي', label: 'الزكاة المستحقة', percentage: '', gross: Number(figures.zakat) || 0, withdrawals: 0, net: -(Number(figures.zakat) || 0) },
    { section: 'الملخص المالي', label: 'القابل للتوزيع', percentage: '', gross: distributable, withdrawals: 0, net: distributable }
  ];
  rows.push({ section: 'السيولة', label: 'إجمالي أرصدة البنوك والصندوق', percentage: '', gross: liquidity, withdrawals: 0, net: liquidity });
  rows.push({ section: t('closing_supplier_debts_section'), label: t('closing_supplier_debts'), percentage: '', gross: Number(figures.supplierDebts) || 0, withdrawals: 0, net: -(Number(figures.supplierDebts) || 0) });
  partnersList.forEach(partner => {
    const percentage = Number(partner.percentage) || 0;
    const gross = distributable * percentage / 100;
    const withdrawals = currentWithdrawals[partner.name] ?? (Number(partnerWithdrawalsMap[partner.name]) || 0);
    rows.push({ section: 'توزيع الشركاء', label: partner.name, percentage: `${percentage}%`, gross, withdrawals, net: gross - withdrawals });
  });
  return window.api.exportExcelReport({
    rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency,
    fileName: `تقرير الإقفال المالي ${window.currentYearName || ''}`, sheetName: 'الإقفال المالي', title: `تقرير الإقفال المالي ${window.currentYearName || ''}`,
    subtitle: 'الملخص المالي ثم توزيع حصص الشركاء',
    columns: [
      { key: 'section', header: 'القسم', width: 22 }, { key: 'label', header: 'البيان / اسم الشريك', width: 32 },
      { key: 'percentage', header: 'النسبة %', width: 14 }, { key: 'gross', header: 'الإجمالي / الحصة', type: 'currency', width: 20, total: false },
      { key: 'withdrawals', header: 'المسحوبات', type: 'currency', width: 18, total: false }, { key: 'net', header: 'الصافي', type: 'currency', width: 20, total: false }
    ], rows, showTotals: false
  });
}
