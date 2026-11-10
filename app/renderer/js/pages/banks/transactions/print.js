async function printGeneralBankVoucher(id) {
  const tx = bankTransactions.find(t => t.id === id);
  if (!tx) return;

  const cName = appSettings.companyName || 'مطعم حضرموت اليمن';
  const cPhone = appSettings.phone || '';
  const cAddress = appSettings.address || '';
  const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 50px;">` : '';

  let typeText = tx.tx_type;
  if (tx.tx_type === 'Payment') typeText = t('bank_payment') || 'صرف من البنك';
  else if (tx.tx_type === 'Receipt') typeText = t('bank_receipt') || 'قبض إلى البنك';
  else if (tx.tx_type === 'Transfer') typeText = t('bank_transfer') || 'تحويل بين الحسابات';
  else if (tx.tx_type === 'Deposit') typeText = t('voucher_deposit_cash');
  else if (tx.tx_type === 'Withdrawal') typeText = t('voucher_withdrawal_cash');

  let partnerRow = tx.partner_name ? `<div class="v-row"><span>${t('partner_involved') || 'الشريك المعني:'}</span><span>${tx.partner_name}</span></div>` : '';
  let bankDetailsRow = '';
  if (tx.tx_type === 'Transfer') {
    bankDetailsRow = `<div class="v-row"><span>${t('from_account') || 'من حساب:'}</span><span>${tx.from_bank_name}</span></div>
                      <div class="v-row"><span>${t('to_account') || 'إلى حساب:'}</span><span>${tx.to_bank_name}</span></div>`;
  } else if (tx.tx_type === 'Payment' || tx.tx_type === 'Withdrawal') {
    bankDetailsRow = `<div class="v-row"><span>${t('source_bank_name') || 'اسم البنك المصدر:'}</span><span>${tx.from_bank_name}</span></div>`;
  } else if (tx.tx_type === 'Receipt' || tx.tx_type === 'Deposit') {
    bankDetailsRow = `<div class="v-row"><span>${t('receiving_bank_name') || 'اسم البنك المستلم:'}</span><span>${tx.to_bank_name}</span></div>`;
  }

  const html = `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: A5 landscape; margin: 0; }
        body { font-family: 'Cairo', sans-serif; direction: ${typeof window.currentLang === 'function' && window.currentLang() === 'en' ? 'ltr' : 'rtl'}; padding: 15px; background: white; color: black; }
        .v-box { border: 2px solid #7A1A22; border-radius: 8px; padding: 15px; height: 120mm; display: flex; flex-direction: column; justify-content: space-between; }
        .v-row { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 5px 0; font-size: 13px; }
        .v-amount { font-size: 20px; font-weight: bold; border: 1px solid #000; padding: 5px 15px; background: #eee; display: inline-block; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="v-box">
        <div style="display:flex; justify-content:space-between; border-bottom:2px solid #7A1A22; padding-bottom:5px;">
          <div>
            <h2 style="margin:0; color:#7A1A22;">${cName}</h2>
            <p style="margin:2px 0; font-size:11px;">${cAddress} | ${cPhone}</p>
          </div>
          <div>${logoHtml}</div>
        </div>
        
        <div style="text-align:center; font-size:18px; font-weight:bold; margin-top: 5px;">${t('voucher_bank_title')} ${t('official_voucher') || 'رسمي'} - ${typeText}</div>
        
        <div class="v-row"><span>${t('voucher_no')}</span><span>#${tx.id}</span></div>
        <div class="v-row"><span>${t('voucher_date_label') || 'تاريخ السند:'}</span><span>${tx.tx_date}</span></div>
        ${bankDetailsRow}
        ${partnerRow}
        <div class="v-row"><span>${t('voucher_desc_label') || 'البيان / الوصف:'}</span><span>${tx.description || ''}</span></div>
        
        <div style="margin-top: 10px;">
          <span>${t('voucher_amount')}</span>
          <div class="v-amount">${window.appSettings?.currency || ''}${tx.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
          ${window.currentLang() === 'ar' ? `<div style="font-size: 13px; margin-top: 5px; font-weight: bold; color: #555;">${t('only_amount') || 'فقط وقدره:'} ${tafqeet(tx.amount)} ${t('no_more') || 'لا غير'}</div>` : ''}
        </div>
        
        <div style="display:flex; justify-content:space-around; margin-top:15px; font-size: 13px; font-weight: bold;">
          <div><span>${t('manager_signature') || 'توقيع المسؤول:'}</span><br><br>__________________</div>
          <div><span>${t('receiver_signature') || 'توقيع المستلم/المراجع:'}</span><br><br>__________________</div>
        </div>
      </div>
    </body>
    </html>
  `;
  await window.api.printHtmlToPDF(html, 'A5');
}
