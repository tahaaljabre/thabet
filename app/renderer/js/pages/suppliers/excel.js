async function exportSupplierStatementExcel() {
  if (!currentSupplierId) return;
  const supplier = allSuppliers.find(item => item.id == currentSupplierId);
  if (!supplier) return;
  const from = document.getElementById('sup-print-from')?.value || '';
  const to = document.getElementById('sup-print-to')?.value || '';
  const ledger = [...currentSupplierTxs].reverse();
  let opening = 0;
  let archived = 0;
  const filtered = [];
  ledger.forEach(tx => {
    const amount = Number(tx.amount) || 0;
    if (tx.is_archived) archived += tx.tx_type === 'له' ? amount : -amount;
    else if (from && tx.tx_date < from) opening += tx.tx_type === 'له' ? amount : -amount;
    else if (!to || tx.tx_date <= to) filtered.push(tx);
  });
  opening += archived;
  let balance = opening;
  const rows = [{ date: '', details: from ? `رصيد بداية المدة ${from}` : 'رصيد بداية المدة', credit: opening > 0 ? opening : 0, debit: opening < 0 ? Math.abs(opening) : 0, balance }];
  filtered.forEach(tx => {
    const amount = Number(tx.amount) || 0;
    const credit = tx.tx_type === 'له' ? amount : 0;
    const debit = tx.tx_type === 'عليه' || tx.tx_type === 'خصم' ? amount : 0;
    balance += credit - debit;
    const kind = tx.tx_type === 'له' ? 'فاتورة مشتريات' : tx.tx_type === 'خصم' ? 'خصم / تسوية' : 'سند دفع';
    rows.push({ date: tx.tx_date, details: `${kind} - ${tx.notes || '-'}`, credit, debit, balance });
  });
  return window.api.exportExcelReport({
    rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency,
    fileName: `كشف مورد ${supplier.name} ${from} ${to}`, sheetName: 'كشف المورد', title: 'كشف حساب مورد',
    subtitle: `المورد: ${supplier.name} | من: ${from || 'البداية'} | إلى: ${to || 'النهاية'}`,
    columns: [
      { key: 'date', header: 'التاريخ', type: 'date', width: 15 },
      { key: 'details', header: 'البيان', width: 38 },
      { key: 'credit', header: 'له', type: 'currency', width: 16 },
      { key: 'debit', header: 'عليه', type: 'currency', width: 16 },
      { key: 'balance', header: 'الرصيد', type: 'currency', width: 18, total: false }
    ], rows, totalLabel: 'الإجماليات'
  });
}
