function archivedExcelSettings(spec) {
  return { rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency, ...spec };
}

async function exportArchivedSupplierExcel(id) {
  const supplier = archivedSuppliersList.find(item => item.id == id);
  if (!supplier) return;
  const transactions = await window.api.getSupplierTransactions(id);
  let balance = 0;
  const rows = [{ date: '', details: 'رصيد بداية المدة', credit: 0, debit: 0, balance: 0 }];
  [...transactions].reverse().forEach(tx => {
    const amount = Number(tx.amount) || 0;
    const credit = tx.tx_type === 'له' ? amount : 0;
    const debit = tx.tx_type === 'عليه' || tx.tx_type === 'خصم' ? amount : 0;
    balance += credit - debit;
    rows.push({ date: tx.tx_date, details: `${credit ? 'فاتورة مشتريات' : tx.tx_type === 'خصم' ? 'خصم / تسوية' : 'سند دفع'} - ${tx.notes || '-'}`, credit, debit, balance });
  });
  return window.api.exportExcelReport(archivedExcelSettings({
    fileName: `كشف المورد المؤرشف ${supplier.name}`, sheetName: 'مورد مؤرشف', title: 'كشف حساب مورد مؤرشف', subtitle: `المورد: ${supplier.name} | جميع الحركات`,
    columns: [{ key: 'date', header: 'التاريخ', type: 'date', width: 15 }, { key: 'details', header: 'البيان', width: 40 },
      { key: 'credit', header: 'له', type: 'currency', width: 17 }, { key: 'debit', header: 'عليه', type: 'currency', width: 17 },
      { key: 'balance', header: 'الرصيد', type: 'currency', width: 18, total: false }], rows
  }));
}

async function exportArchivedEmployeeExcel(id) {
  const cachedEmp = archivedEmployeesList.find(item => item.id == id);
  const statement = await window.api.getDetailedEmployeeStatement(
    id,
    '',
    '',
    cachedEmp?.year_id || window.currentYearId
  );
  const employee = statement?.employee || cachedEmp;
  if (!employee) return;
  let balance = Number(statement?.previousBalance) || 0;
  const rows = [];
  if (balance !== 0) {
    rows.push({ date: '', details: 'رصيد افتتاحي', debit: balance < 0 ? Math.abs(balance) : 0, credit: balance > 0 ? balance : 0, balance });
  }
  const transactions = Array.isArray(statement?.transactions) ? statement.transactions : [];
  transactions.forEach(tx => {
    const isSalaryRow = Boolean(tx.is_salary_row || tx.is_virtual);
    const debit = (Number(tx.amount) || 0) + (Number(tx.deductions) || 0);
    const credit = Number(tx.allowances) || 0;
    balance += credit - debit;
    const details = isSalaryRow ? tx.notes : [tx.amount > 0 ? 'دفعة نقدية' : '', tx.deductions > 0 ? `خصم (${tx.deductions})` : '', tx.allowances > 0 ? `بدلات (${tx.allowances})` : '', tx.notes || ''].filter(Boolean).join(' - ') || 'حركة مالية';
    rows.push({ date: tx.tx_date, details, debit, credit, balance });
  });
  return window.api.exportExcelReport(archivedExcelSettings({
    fileName: `كشف الموظف المؤرشف ${employee.name}`, sheetName: 'موظف مؤرشف', title: 'كشف حساب موظف مؤرشف', subtitle: `الموظف: ${employee.name}${employee.category_name ? ` (${employee.category_name})` : ''} | جميع الحركات`,
    columns: [{ key: 'date', header: 'التاريخ', type: 'date', width: 15 }, { key: 'details', header: 'البيان', width: 40 },
      { key: 'debit', header: 'مدين', type: 'currency', width: 17 }, { key: 'credit', header: 'دائن', type: 'currency', width: 17 },
      { key: 'balance', header: 'الرصيد الختامي', type: 'currency', width: 18, total: false }], rows
  }));
}
