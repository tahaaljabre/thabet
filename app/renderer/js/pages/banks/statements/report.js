async function printBankStatementReport() {
  const bankId = parseInt(document.getElementById('bank-statement-account-id').value);
  const start = document.getElementById('bank-statement-start-date').value;
  const end = document.getElementById('bank-statement-end-date').value;

  if (!bankId) return alert(t('err_choose_bank'));
  if (!start || !end) return alert(t('err_report_period'));

  const acc = bankAccounts.find(a => a.id === bankId);
  if (!acc) return alert(t('err_bank_not_found'));

  try {
    const allTxs = await window.api.getBankTransactions(window.currentYearId);
    const mappings = await window.api.getBankSalesMappings(window.currentYearId);
    let isMapped = mappings.filter(m => m.bank_account_id === bankId).map(m => m.channel_name);
    
    // Auto-map cash_sales to cash vault statement if missing
    if ((acc.is_cash_vault === 1 || acc.is_cash_vault === true) && !isMapped.includes('cash_sales')) {
      const isCashMappedElsewhere = mappings.some(m => m.channel_name === 'cash_sales');
      if (!isCashMappedElsewhere) {
        isMapped.push('cash_sales');
      }
    }
    
    const dailyReports = await window.api.getCashierReports('', window.currentYearId);
    const configuredChannels = Array.isArray(appSettings?.salesChannels) ? appSettings.salesChannels : [];
    const isEnglish = typeof window.currentLang === 'function' && window.currentLang() === 'en';
    const savedChannelName = (key) => {
      const channel = configuredChannels.find(item => item.key === key);
      if (!channel) return '';
      return (isEnglish ? channel.nameEn : channel.nameAr) || channel.nameEn || channel.nameAr || '';
    };
    
    const bankStartDate = acc.start_date || '2000-01-01';

    let mappingSalesBefore = 0;
    let mappingSalesDuring = [];
    
    dailyReports.forEach(r => {
      isMapped.forEach(channel => {
        const reportField = channel === 'cash_sales' ? 'cash_sales' : channel;
        const amt = Number(r[reportField] ?? r.channel_sales?.[channel]) || 0;
        if (amt > 0) {
          const channelNames = {
            grab: t('sales_grab') || 'مبيعات GrabFood',
            lineman: t('sales_lineman') || 'مبيعات LineMan',
            kbank: t('sales_kbank') || 'مبيعات K-Bank',
            krungsri: t('sales_krungsri') || 'مبيعات Krungsri',
            cash_sales: t('sales_cash') || 'مبيعات نقدية'
          };
          const desc = savedChannelName(channel) || channelNames[channel] || (`${t('channel_sales') || 'مبيعات قناة'} ${channel}`);

          if (r.report_date < start && r.report_date >= bankStartDate) {
            mappingSalesBefore += amt;
          } else if (r.report_date >= start && r.report_date <= end) {
            mappingSalesDuring.push({
              date: r.report_date,
              type: t('sales_deposit') || 'إيداع مبيعات',
              description: desc,
              credit: amt,
              debit: 0
            });
          }
        }
      });
    });

    let txBeforeIncoming = 0;
    let txBeforeOutgoing = 0;
    const txDuring = [];

    allTxs.forEach(txn => {
      const amt = txn.amount;
      const date = txn.tx_date;

      const isIncoming = (txn.to_account_id === bankId);
      const isOutgoing = (txn.from_account_id === bankId);

      if (isIncoming || isOutgoing) {
        if (date < start && date >= bankStartDate) {
          if (txn.tx_type === 'Transfer') {
            if (isIncoming) txBeforeIncoming += amt;
            if (isOutgoing) txBeforeOutgoing += amt;
          } else if (txn.tx_type === 'Deposit' || txn.tx_type === 'Receipt') {
            txBeforeIncoming += amt;
          } else if (txn.tx_type === 'Withdrawal' || txn.tx_type === 'Payment') {
            txBeforeOutgoing += amt;
          }
        } else if (date >= start && date <= end && date >= bankStartDate) {
          let debit = 0;
          let credit = 0;
          
          if (txn.tx_type === 'Transfer') {
            if (isIncoming) credit = amt;
            if (isOutgoing) debit = amt;
          } else if (txn.tx_type === 'Deposit' || txn.tx_type === 'Receipt') {
            credit = amt;
          } else if (txn.tx_type === 'Withdrawal' || txn.tx_type === 'Payment') {
            debit = amt;
          }

          let typeLabel = txn.tx_type;
          if (txn.tx_type === 'Payment') typeLabel = t('voucher_payment_bank');
          else if (txn.tx_type === 'Receipt') typeLabel = t('voucher_receipt_bank');
          else if (txn.tx_type === 'Transfer') typeLabel = isIncoming ? (t('transfer_in') || 'تحويل وارد') : (t('transfer_out') || 'تحويل صادر');
          else if (txn.tx_type === 'Deposit') typeLabel = t('cash_deposit') || 'إيداع نقدي';
          else if (txn.tx_type === 'Withdrawal') typeLabel = t('voucher_withdrawal_cash');

          let partnerInfo = txn.partner_name ? ` (${t('partner_label') || 'الشريك'}: ${txn.partner_name})` : '';

          txDuring.push({
            date: date,
            type: typeLabel,
            description: (txn.description || '') + partnerInfo,
            debit,
            credit
          });
        }
      }
    });

    const openingBalance = acc.opening_balance + mappingSalesBefore + txBeforeIncoming - txBeforeOutgoing;
    const ledger = [...mappingSalesDuring, ...txDuring].sort((a,b) => a.date.localeCompare(b.date));

    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    let ledgerHtml = ledger.map(item => {
      runningBalance = runningBalance + item.credit - item.debit;
      totalDebit += item.debit;
      totalCredit += item.credit;

      return `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; text-align:center;">${item.date}</td>
          <td style="padding: 8px; text-align:right; font-weight:bold;">${item.type}</td>
          <td style="padding: 8px; text-align:right; color:#555;">${(item.description || '').replace('عمولة مبيعات GrabFood', t('grab_commission_desc') || 'عمولة مبيعات GrabFood').replace('عمولة مبيعات LineMan', t('lineman_commission_desc') || 'عمولة مبيعات LineMan')}</td>
          <td style="padding: 8px; text-align:left; color:#c62828; font-weight:bold;">${item.debit > 0 ? (window.appSettings?.currency || '') + item.debit.toLocaleString() : '-'}</td>
          <td style="padding: 8px; text-align:left; color:#2e7d32; font-weight:bold;">${item.credit > 0 ? (window.appSettings?.currency || '') + item.credit.toLocaleString() : '-'}</td>
          <td style="padding: 8px; text-align:left; font-weight:bold;">${window.appSettings?.currency || ''}${runningBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        </tr>
      `;
    }).join('');

    const cName = appSettings.companyName || 'مطعم حضرموت اليمن';
    const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';

    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Cairo', sans-serif; direction: ${typeof window.currentLang === 'function' && window.currentLang() === 'en' ? 'ltr' : 'rtl'}; padding: 20px; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7A1A22; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background: #f5f5f5; color: #333; }
          .sum-container { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 25px; }
          .sum-box { border: 1px solid #ccc; padding: 12px; border-radius: 6px; text-align: center; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0; color:#7A1A22;">${cName}</h2>
            <p style="margin:4px 0; font-size:12px;">${appSettings.address || ''} | ${appSettings.phone || ''}</p>
          </div>
          <div>${logoHtml}</div>
        </div>
        
        <h2 style="text-align:center; color: #1e293b; text-decoration: underline;">${t('bank_statement_title_full') || 'كشف حركة الحساب البنكي التفصيلي'}</h2>
        
        <div style="margin: 15px 0; font-size:13px; line-height: 1.5; background: #f8fafc; padding: 10px; border-radius: 6px; border-right: 4px solid #7A1A22;">
          <strong>${t('bank_statement_acc_name')}</strong> ${acc.bank_name}<br>
          <strong>${t('bank_account_num')}</strong> ${acc.account_number || t('not_specified') || 'غير محدد'}<br>
          <strong>${t('time_period') || 'الفترة الزمنية:'}</strong> ${t('from_date') || 'من'} ${start} ${t('to_date') || 'إلى'} ${end}<br>
          <strong>${t('bank_statement_print_date')}</strong> ${new Date().toLocaleDateString('en-GB')}
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">${t('col_date')}</th>
              <th style="width: 18%;">${t('tx_type_col') || 'نوع الحركة'}</th>
              <th style="width: 32%;">${t('desc_channel_details') || 'البيان / تفاصيل القناة'}</th>
              <th style="width: 12.5%;">${t('debit_col') || 'مدين (سحب/مصروفات)'}</th>
              <th style="width: 12.5%;">${t('credit_col') || 'دائن (إيداع/مبيعات)'}</th>
              <th style="width: 13%;">${t('running_balance_col') || 'الرصيد الجاري'}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#e0f2fe; font-weight:bold;">
              <td>-</td>
              <td colspan="2">${t('opening_balance_fwd') || 'رصيد افتتاحي مرحل (قبل تاريخ'} ${start})</td>
              <td>-</td>
              <td>-</td>
              <td>${window.appSettings?.currency || ''}${openingBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
            </tr>
            ${ledgerHtml}
          </tbody>
        </table>
        
        <div class="sum-container">
          <div class="sum-box">
            <h4 style="margin:0 0 5px 0; color:#2e7d32;">${t('total_receipts_sales') || 'إجمالي المقبوضات/المبيعات (+)'}</h4>
            <strong style="font-size: 16px; color:#2e7d32;">${window.appSettings?.currency || ''}${totalCredit.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
          </div>
          <div class="sum-box">
            <h4 style="margin:0 0 5px 0; color:#c62828;">${t('total_payments_withdrawals') || 'إجمالي المدفوعات/المسحوبات (-)'}</h4>
            <strong style="font-size: 16px; color:#c62828;">${window.appSettings?.currency || ''}${totalDebit.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
          </div>
          <div class="sum-box" style="background:#7A1A22; color:white;">
            <h4 style="margin:0 0 5px 0; color:white;">${t('final_running_balance') || 'الرصيد النهائي الجاري'}</h4>
            <strong style="font-size: 18px; color:#86efac;">${window.appSettings?.currency || ''}${runningBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
          </div>
        </div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 13px; font-weight: bold;">
          <div><p>${t('finance_accountant_sign')}</p><p style="margin-top: 40px;">___________________</p></div>
          <div><p>${t('manager_in_charge_sign')}</p><p style="margin-top: 40px;">___________________</p></div>
        </div>
      </body>
      </html>
    `;
    await window.api.printHtmlToPDF(html, 'A4');
    closeBankStatementModal();
  } catch (err) {
    console.error(err);
    alert(t('report_prepare_error') + ': ' + err.message);
  }
}
