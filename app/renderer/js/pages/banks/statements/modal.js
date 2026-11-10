function openBankStatementModal() {
  document.getElementById('bank-statement-modal').style.display = 'flex';
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date();
  firstDay.setDate(1);
  document.getElementById('bank-statement-start-date').value = firstDay.toISOString().split('T')[0];
  document.getElementById('bank-statement-end-date').value = today;
  
  const sel = document.getElementById('bank-statement-account-id');
  if (sel) {
    sel.innerHTML = bankAccounts.map(acc => `<option value="${acc.id}">${window.escapeHTML(acc.bank_name)}</option>`).join('');
  }
}

function closeBankStatementModal() {
  document.getElementById('bank-statement-modal').style.display = 'none';
}
