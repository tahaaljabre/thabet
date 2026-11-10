async function exportBankStatementExcel() {
  const bankId = Number(document.getElementById('bank-statement-account-id')?.value);
  const start = document.getElementById('bank-statement-start-date')?.value;
  const end = document.getElementById('bank-statement-end-date')?.value;
  if (!bankId) return alert(t('err_choose_bank'));
  if (!start || !end) return alert(t('err_report_period'));
  const account = bankAccounts.find(item => Number(item.id) === bankId);
  if (!account) return alert(t('err_bank_not_found'));

  const [transactionResult, mappings, dailyReports] = await Promise.all([
    window.api.getBankTransactions(window.currentYearId),
    window.api.getBankSalesMappings(window.currentYearId),
    window.api.getCashierReports('', window.currentYearId)
  ]);
  const transactions = Array.isArray(transactionResult) ? transactionResult : (transactionResult?.items || []);
  const channels = mappings.filter(item => Number(item.bank_account_id) === bankId).map(item => item.channel_name);
  if ((account.is_cash_vault === 1 || account.is_cash_vault === true) && !channels.includes('cash_sales') && !mappings.some(item => item.channel_name === 'cash_sales')) channels.push('cash_sales');
  const bankStart = account.start_date || '2000-01-01';
  let salesBefore = 0;
  let incomingBefore = 0;
  let outgoingBefore = 0;
  const ledger = [];
  const channelNames = { grab: 'مبيعات GrabFood', lineman: 'مبيعات LineMan', kbank: 'مبيعات K-Bank', krungsri: 'مبيعات Krungsri', cash_sales: 'مبيعات نقدية' };

  (Array.isArray(dailyReports) ? dailyReports : []).forEach(report => {
    channels.forEach(channel => {
      const amount = Number(report[channel]) || 0;
      if (amount <= 0 || report.report_date < bankStart) return;
      if (report.report_date < start) salesBefore += amount;
      else if (report.report_date <= end) ledger.push({ date: report.report_date, type: 'إيداع مبيعات', details: channelNames[channel] || `مبيعات قناة ${channel}`, debit: 0, credit: amount });
    });
  });

  transactions.forEach(tx => {
    const incoming = Number(tx.to_account_id) === bankId;
    const outgoing = Number(tx.from_account_id) === bankId;
    if ((!incoming && !outgoing) || tx.tx_date < bankStart) return;
    const amount = Number(tx.amount) || 0;
    let debit = 0, credit = 0;
    if (tx.tx_type === 'Transfer') { if (incoming) credit = amount; if (outgoing) debit = amount; }
    else if (tx.tx_type === 'Deposit' || tx.tx_type === 'Receipt') credit = amount;
    else if (tx.tx_type === 'Withdrawal' || tx.tx_type === 'Payment') debit = amount;
    if (tx.tx_date < start) { incomingBefore += credit; outgoingBefore += debit; return; }
    if (tx.tx_date > end) return;
    const labels = { Payment: 'سند دفع بنكي', Receipt: 'سند قبض بنكي', Deposit: 'إيداع نقدي', Withdrawal: 'سحب نقدي' };
    const type = tx.tx_type === 'Transfer' ? (incoming ? 'تحويل وارد' : 'تحويل صادر') : (labels[tx.tx_type] || tx.tx_type);
    const partner = tx.partner_name ? ` (الشريك: ${tx.partner_name})` : '';
    ledger.push({ date: tx.tx_date, type, details: `${tx.description || ''}${partner}`, debit, credit });
  });

  ledger.sort((a,b) => a.date.localeCompare(b.date));
  let balance = (Number(account.opening_balance) || 0) + salesBefore + incomingBefore - outgoingBefore;
  const rows = [{ date: '', type: 'رصيد افتتاحي مرحل', details: `قبل تاريخ ${start}`, debit: 0, credit: 0, balance }];
  ledger.forEach(item => { balance += item.credit - item.debit; rows.push({ ...item, balance }); });

  const result = await window.api.exportExcelReport({
    rtl: window.currentLang?.() !== 'en', companyName: appSettings.companyName, address: appSettings.address,
    phone: appSettings.phone, logo: appSettings.logo, currency: appSettings.currency,
    fileName: `كشف بنك ${account.bank_name} ${start} ${end}`, sheetName: 'كشف البنك', title: 'كشف حركة الحساب البنكي التفصيلي',
    subtitle: `الحساب: ${account.bank_name} | رقم الحساب: ${account.account_number || 'غير محدد'} | من: ${start} | إلى: ${end}`,
    columns: [
      { key: 'date', header: 'التاريخ', type: 'date', width: 15 }, { key: 'type', header: 'نوع الحركة', width: 20 },
      { key: 'details', header: 'البيان / تفاصيل القناة', width: 38 }, { key: 'debit', header: 'مدين (سحب/مصروفات)', type: 'currency', width: 21 },
      { key: 'credit', header: 'دائن (إيداع/مبيعات)', type: 'currency', width: 21 }, { key: 'balance', header: 'الرصيد الجاري', type: 'currency', width: 19, total: false }
    ], rows, totalLabel: 'الإجماليات'
  });
  if (result?.success) closeBankStatementModal();
  return result;
}
