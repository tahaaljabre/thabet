import { showToast } from '../../../core/notifications.js';

export async function handlePrintStatement() {
  const fromDate = document.getElementById('expenses-print-from').value;
  const toDate = document.getElementById('expenses-print-to').value;
  
  if (typeof window.printExpensesStatement === 'function') {
    // Falls back to the original printing function already in the global namespace if needed
    window.printExpensesStatement(fromDate, toDate);
  } else {
  showToast(t('printing_not_ready'), 'info');
  }
}
