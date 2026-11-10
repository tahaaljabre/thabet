function initializeBankTransactionDateFilter() {
  const fromInput = document.getElementById('bank-tx-filter-from');
  const toInput = document.getElementById('bank-tx-filter-to');
  if (!fromInput || !toInput) return;
  // Keep the filters optional. Defaulting both fields to today hid valid
  // backdated transfers immediately after opening the banks page.
}

function applyBankTransactionDateFilter() {
  const from = document.getElementById('bank-tx-filter-from')?.value || '';
  const to = document.getElementById('bank-tx-filter-to')?.value || '';
  if (from && to && from > to) {
    alert(t('date_order_error'));
    return;
  }
  renderBankTransactionsTable();
}

function renderBankTransactionsTable() {
  const tbody = document.getElementById('bank-tx-tbody');
  if (!tbody) return;

  initializeBankTransactionDateFilter();
  const from = document.getElementById('bank-tx-filter-from')?.value || '';
  const to = document.getElementById('bank-tx-filter-to')?.value || '';
  const visibleTransactions = bankTransactions.filter(tx =>
    (!from || tx.tx_date >= from) && (!to || tx.tx_date <= to)
  );

  if (visibleTransactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--muted);">${t('no_bank_txs')}</td></tr>`;
    return;
  }

  tbody.innerHTML = visibleTransactions.map(tx => {
    let typeText = tx.tx_type;
    let typeColor = 'var(--text-color)';
    if (tx.tx_type === 'Payment') { typeText = t('tx_payment_bank'); typeColor = 'var(--red)'; }
    else if (tx.tx_type === 'Receipt') { typeText = t('tx_receipt_bank'); typeColor = 'var(--green2)'; }
    else if (tx.tx_type === 'Transfer') { typeText = t('tx_transfer_bank'); typeColor = 'var(--primary-color)'; }
    else if (tx.tx_type === 'Deposit') { typeText = t('tx_deposit_cash'); typeColor = 'var(--green2)'; }
    else if (tx.tx_type === 'Withdrawal') { typeText = t('tx_withdrawal_cash'); typeColor = 'var(--red)'; }

    const historicalAccounts = [];
    if (tx.from_start_date && tx.tx_date < tx.from_start_date) historicalAccounts.push(tx.from_bank_name);
    if (tx.to_start_date && tx.tx_date < tx.to_start_date) historicalAccounts.push(tx.to_bank_name);
    const historicalNote = historicalAccounts.length
      ? `<div style="font-size:10px;color:#b45309;margin-top:3px;">ضمن الرصيد الافتتاحي: ${historicalAccounts.map(name => window.escapeHTML(name || '-')).join('، ')}</div>`
      : '';

    return `
      <tr>
        <td>${tx.id}</td>
        <td>${tx.tx_date}</td>
        <td style="font-weight:bold; color:${typeColor}">${typeText}</td>
        <td>${tx.from_bank_name || '-'}</td>
        <td>${tx.to_bank_name || '-'}</td>
        <td style="font-weight:bold; color:var(--primary-color);">${tx.partner_name || '-'}</td>
        <td style="font-weight:bold; color:${(tx.tx_type==='Payment'||tx.tx_type==='Withdrawal') ? 'var(--red)' : 'var(--green2)'}">${window.appSettings?.currency || ''}${tx.amount.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
        <td>${window.escapeHTML((tx.description || '').replace('عمولة مبيعات GrabFood', t('grab_commission_desc') || 'عمولة مبيعات GrabFood').replace('عمولة مبيعات LineMan', t('lineman_commission_desc') || 'عمولة مبيعات LineMan'))}${historicalNote}</td>
        <td>${tx.created_by}</td>
        <td class="no-print" style="display:flex; gap:5px; justify-content:center;">
          <button class="btn-secondary" style="padding:2px 5px; font-size:11px;" onclick="printGeneralBankVoucher(${tx.id})">${t('btn_print')}</button>
          <button class="btn-primary" style="padding:2px 5px; font-size:11px;" onclick="editBankTransaction(${tx.id})">${t('btn_edit')}</button>
          <button class="btn-danger" style="padding:2px 5px; font-size:11px;" onclick="deleteBankTransaction(${tx.id})">${t('btn_delete')}</button>
        </td>
      </tr>
    `;
  }).join('');
}
