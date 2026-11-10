import { fetchCashierReports } from '../api.js';
import { globals } from '../state.js';
import { exportExcelReport } from '../../../core/excel-export.js';

export async function handleExportCashierExcel() {
  const cashierName = document.getElementById('select-report-cashier')?.value;
  if (!cashierName) return;

  const fromDate = document.getElementById('sales-print-from')?.value || '';
  const toDate = document.getElementById('sales-print-to')?.value || '';
  const reports = await fetchCashierReports(cashierName, globals.currentYearId);
  const filtered = (Array.isArray(reports) ? reports : [])
    .filter(r => (!fromDate || r.report_date >= fromDate) && (!toDate || r.report_date <= toDate))
    .sort((a, b) => String(a.report_date).localeCompare(String(b.report_date)));

  const rows = filtered.map((r, index) => {
    const cash = Number(r.cash_sales) || 0;
    const expectedCash = Math.max(0, cash - (Number(r.total_expenses) || 0) - (Number(r.total_emp) || 0) - (Number(r.total_sup) || 0));
    const actual = Number(r.cashier_actual) || 0;
    return {
      serial: index + 1,
      date: r.report_date,
      cash,
      kbank: Number(r.kbank) || 0,
      grab: Number(r.grab) || 0,
      lineman: Number(r.lineman) || 0,
      krungsri: Number(r.krungsri) || 0,
      actual,
      difference: actual - expectedCash
    };
  });

  return exportExcelReport({
    fileName: `كشف مبيعات ${cashierName} ${fromDate || ''} ${toDate || ''}`,
    sheetName: 'كشف المبيعات',
    title: window.t?.('cashier_sales_statement') || 'كشف مبيعات الكاشير',
    subtitle: `الكاشير: ${cashierName} | من: ${fromDate || 'البداية'} | إلى: ${toDate || 'النهاية'}`,
    columns: [
      { key: 'serial', header: '#', type: 'number', width: 8 },
      { key: 'date', header: window.t?.('col_date') || 'التاريخ', type: 'date', width: 14 },
      { key: 'cash', header: window.t?.('system_cash_label') || 'نقد النظام', type: 'currency', width: 16 },
      { key: 'kbank', header: 'KBank', type: 'currency', width: 14 },
      { key: 'grab', header: 'Grab', type: 'currency', width: 14 },
      { key: 'lineman', header: 'Lineman', type: 'currency', width: 14 },
      { key: 'krungsri', header: 'Krungsri', type: 'currency', width: 14 },
      { key: 'actual', header: window.t?.('actual_drawer') || 'النقد الفعلي', type: 'currency', width: 16 },
      { key: 'difference', header: window.t?.('financial_difference') || 'الفرق المالي', type: 'currency', width: 16 }
    ],
    rows
  });
}
