document.addEventListener('DOMContentLoaded', () => {
  const typeSelect = document.getElementById('bank-tx-type');
  if (typeSelect) {
    typeSelect.addEventListener('change', toggleBankTxFields);
  }
  const txDate = document.getElementById('bank-tx-date');
  if (txDate) {
    txDate.value = new Date().toISOString().split('T')[0];
  }
  const bankStartDate = document.getElementById('bank-start-date-input');
  if (bankStartDate) {
    bankStartDate.value = new Date().toISOString().split('T')[0];
  }
});

// Compatibility facade for legacy onclick handlers.
window.openBankStatementModal = openBankStatementModal;
window.closeBankStatementModal = closeBankStatementModal;
window.printBankStatementReport = printBankStatementReport;
