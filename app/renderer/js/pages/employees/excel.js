async function exportEmployeeStatementExcel() {
  if (!currentEmployeeId) return;
  const from = document.getElementById('emp-print-from')?.value || '';
  const to = document.getElementById('emp-print-to')?.value || '';
  const statement = await window.api.getDetailedEmployeeStatement(
    currentEmployeeId,
    from,
    to,
    window.currentYearId
  );
  const employee = statement.employee || allEmployees.find(item => item.id == currentEmployeeId);
  if (!employee) return;
  const opening = Number(statement.previousBalance) || 0;
  const filtered = Array.isArray(statement.transactions) ? statement.transactions : [];
  let balance = opening;
  const rows = [{ date: '', details: from ? `رصيد افتتاحي مرحل إلى ${from}` : 'الرصيد الافتتاحي', debit: opening < 0 ? Math.abs(opening) : 0, credit: opening > 0 ? opening : 0, balance }];
  filtered.forEach(tx => {
    const isSalaryRow = Boolean(tx.is_salary_row || tx.is_virtual);
    const debit = (Number(tx.amount) || 0) + (Number(tx.deductions) || 0);
    const credit = Number(tx.allowances) || 0;
    balance += credit - debit;
    const details = isSalaryRow ? tx.notes : [`${tx.amount > 0 ? 'دفعة نقدية' : ''}`, tx.deductions > 0 ? `خصم (${tx.deductions})` : '', tx.allowances > 0 ? `بدلات (${tx.allowances})` : '', tx.notes || ''].filter(Boolean).join(' - ') || 'حركة مالية';
    rows.push({ date: tx.tx_date, details, debit, credit, balance });
  });
  return window.api.exportExcelReport({
    rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency,
    fileName: `كشف موظف ${employee.name} ${from} ${to}`, sheetName: 'كشف الموظف', title: 'كشف حساب موظف تفصيلي',
    subtitle: `الموظف: ${employee.name}${employee.category_name ? ` (${employee.category_name})` : ''} | من: ${from || 'البداية'} | إلى: ${to || 'النهاية'}`,
    columns: [
      { key: 'date', header: 'التاريخ', type: 'date', width: 15 }, { key: 'details', header: 'البيان', width: 40 },
      { key: 'debit', header: 'مدين', type: 'currency', width: 17 }, { key: 'credit', header: 'دائن', type: 'currency', width: 17 },
      { key: 'balance', header: 'الرصيد الختامي', type: 'currency', width: 18, total: false }
    ], rows, totalLabel: 'الإجماليات'
  });
}
