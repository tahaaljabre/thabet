import * as print from '../print.js';

export async function printVoucher(dateStr) {
  if (typeof window.printDailyExpensesVoucher === 'function') {
    window.printDailyExpensesVoucher(dateStr);
  } else {
    await print.printDailyExpensesVoucher(dateStr);
  }
}

export async function printStatement() {
  const fromDate = document.getElementById('expenses-print-from')?.value;
  const toDate = document.getElementById('expenses-print-to')?.value;
  
  if (typeof window.printExpensesStatement === 'function') {
    window.printExpensesStatement(fromDate, toDate);
  } else {
    await print.printExpensesStatement(fromDate, toDate);
  }
}
