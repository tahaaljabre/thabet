function tafqeet(num) {
  if (num === 0) return 'صفر';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' و ' + ones[n % 10] : '');
    if (n < 1000) return hundreds[Math.floor(n / 100)] + (n % 100 !== 0 ? ' و ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' ألف' + (n % 1000 !== 0 ? ' و ' + convert(n % 1000) : '');
    return n.toString();
  }
  
  const parts = window.safeParseFloat(num).toFixed(2).split('.');
  const integerPart = parseInt(parts[0]);
  const decimalPart = parseInt(parts[1]);
  
  let result = convert(integerPart) + ' بات تايلاندي';
  if (decimalPart > 0) {
    result += ' و ' + convert(decimalPart) + ' ساتانغ';
  }
  return result;
}

async function printGeneralVoucher(id) {
  if (vaultData && vaultData.generalVouchers) {
    const v = vaultData.generalVouchers.find(item => item.id === id);
    if (v) {
      const cName = appSettings.companyName || t('company_default_name');
      const cPhone = appSettings.phone || '';
      const cAddress = appSettings.address || '';
      const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 50px;">` : '';
      
      let partnerLabelHtml = v.partner_name ? `<div style="font-size: 14px; margin-top: 5px;"><strong>${t('closing_partner_name')}:</strong> ${v.partner_name}</div>` : '';
      const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
      const categoryKeys = {
        Zakat: 'cat_zakat',
        'Profit Distribution': 'cat_profit_distribution',
        'Partner Withdrawal': 'cat_partner_withdrawal',
        'General Expense': 'cat_general_expense',
        Other: 'cat_other'
      };
      const catTranslated = categoryKeys[v.category] ? t(categoryKeys[v.category]) : v.category;

      const html = `
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: A5 landscape; margin: 0; }
            body { font-family: 'Cairo', sans-serif; direction: ${isEn ? 'ltr' : 'rtl'}; padding: 15px; background: white; color: black; }
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
            
            <div style="text-align:center; font-size:18px; font-weight:bold; margin-top: 5px;">${t('general_cash_voucher_title')}</div>
            
            <div class="v-row"><span>${t('voucher_number_label')}</span><span>#${v.id}</span></div>
            <div class="v-row"><span>${t('voucher_date_label')}</span><span>${v.voucher_date}</span></div>
            <div class="v-row"><span>${t('category_label_colon')}</span><span>${catTranslated}</span></div>
            ${partnerLabelHtml}
            <div class="v-row"><span>${t('voucher_desc_label')}</span><span>${v.description || ''}</span></div>
            
            <div style="margin-top: 10px;">
              <span>${t('amount_paid')}</span>
              <div class="v-amount">${window.appSettings?.currency || ''}${v.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
            </div>
            
            <div style="display:flex; justify-content:space-around; margin-top:15px; font-size: 13px; font-weight: bold;">
              <div><span>${t('receiver_label')}</span><br><br>__________________</div>
              <div><span>${t('cashier_label')}</span><br><br>__________________</div>
              <div><span>${t('general_manager_label')}</span><br><br>__________________</div>
            </div>
          </div>
        </body>
        </html>
      `;
      await window.api.printHtmlToPDF(html, 'A5');
    }
  }
}
