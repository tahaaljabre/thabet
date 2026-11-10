import { exportExcelReport } from '../../core/excel-export.js';

export async function exportPurchasesExcel() {
  const fromDate = document.getElementById('expenses-print-from')?.value || '';
  const toDate = document.getElementById('expenses-print-to')?.value || '';
  const ledger = await window.api.getExpensesLedger(fromDate, toDate, window.currentYearId);
  const rows = (Array.isArray(ledger) ? ledger : []).map((item, index) => ({
    serial: index + 1,
    voucherNumber: item.voucherNumber || '-',
    date: item.report_date,
    count: Number(item.items_count) || 0,
    amount: Number(item.total_amount) || 0
  }));

  return exportExcelReport({
    fileName: `كشف المصروفات والمشتريات ${fromDate || ''} ${toDate || ''}`,
    sheetName: 'المصروفات والمشتريات',
    title: window.t?.('purchases_statement_title') || 'كشف حساب المصروفات والمشتريات',
    subtitle: `من: ${fromDate || 'البداية'} | إلى: ${toDate || 'النهاية'}`,
    columns: [
      { key: 'serial', header: '#', type: 'number', width: 8 },
      { key: 'voucherNumber', header: window.t?.('voucher_number') || 'رقم السند', width: 18 },
      { key: 'date', header: window.t?.('col_date') || 'التاريخ', type: 'date', width: 16 },
      { key: 'count', header: window.t?.('expense_count') || 'عدد المصروفات', type: 'number', width: 18 },
      { key: 'amount', header: window.t?.('th_amount') || 'إجمالي المبلغ', type: 'currency', width: 20 }
    ],
    rows
  });
}
