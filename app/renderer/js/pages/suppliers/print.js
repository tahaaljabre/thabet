// Print Templates for Suppliers
async function printSupplierVoucher(txId) {
  const tx = currentSupplierTxs.find(t => t.id == txId);
  const sup = allSuppliers.find(s => s.id == currentSupplierId);
  if(!tx || !sup) return;
  
  const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
  const cName = appSettings.companyName || 'اسم الشركة';
  const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 80px; margin-bottom:15px;">` : '';
  const discountTitle = isEn ? 'Discount / Settlement Voucher' : 'سند خصم / تسوية';
  const typeTitle = tx.tx_type === 'عليه' ? `${t('voucher_payment')}` : (tx.tx_type === 'خصم' ? discountTitle : t('voucher_invoice'));
  
  let html = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>${typeTitle}</title>
      <style>
        @page { size: A5 landscape; margin: 0; }
        body { font-family: 'Cairo', Tahoma, sans-serif; direction: ${isEn ? 'ltr' : 'rtl'}; margin: 0; padding: 15px; box-sizing: border-box; background: #fff; color: #1e293b; }
        .voucher-container { border: 2px solid #7A1A22; border-radius: 8px; height: 130mm; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; background: #fff; overflow: hidden; margin: 0 auto; }
        .v-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 15px; }
        .v-header-right { width: 33%; text-align: ${isEn ? 'left' : 'right'}; }
        .v-header-right h1 { margin: 0; font-size: 20px; color: #7A1A22; font-weight: bold; }
        .v-header-right p { margin: 3px 0; font-size: 11px; color: #475569; }
        .v-header-center { width: 33%; text-align: center; }
        .v-header-center img { max-height: 50px; }
        .v-header-left { width: 33%; text-align: ${isEn ? 'right' : 'left'}; }
        .v-title { display: inline-block; border: 1px solid #e2e8f0; background: #f8fafc; color: #7A1A22; font-size: 18px; font-weight: bold; padding: 5px 25px; border-radius: 6px; }
        .v-info-row { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 15px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; font-weight: bold; border-${isEn ? 'left' : 'right'}: 4px solid #7A1A22; }
        .v-amount-row { margin-bottom: 20px; font-size: 15px; font-weight: bold; display: flex; align-items: center; }
        .v-amount-box { border: 1px solid #94a3b8; background: #f1f5f9; padding: 8px 20px; border-radius: 5px; font-size: 18px; margin-${isEn ? 'right' : 'left'}: 15px; color: #1e293b; }
        .v-reason-row { margin-bottom: 15px; font-size: 14px; font-weight: normal; }
        .v-signatures { display: flex; justify-content: space-between; margin-top: auto; padding: 0 40px; font-size: 14px; font-weight: bold; }
        .v-sig-box { text-align: center; width: 150px; }
        .v-sig-line { border-top: 1px dashed #000; margin-top: 40px; }
      </style>
    </head>
    <body>
      <div class="voucher-container">
        <div class="v-header">
          <div class="v-header-right">
            <h1>${appSettings.companyName || 'اسم الشركة'}</h1>
            <p>${appSettings.address ? (isEn ? 'Address: ' : t('address') + ': ') + appSettings.address : ''} ${appSettings.phone ? ' | ' + (isEn ? 'Phone: ' : t('phone') + ': ') + appSettings.phone : ''}</p>
            ${appSettings.taxNumber ? `<p>${t('tax_number') || (isEn ? 'Tax No' : 'الرقم الضريبي')}: ${appSettings.taxNumber}</p>` : ''}
          </div>
          <div class="v-header-center">
            ${logoHtml}
          </div>
          <div class="v-header-left">
            <div class="v-title">${typeTitle}</div>
          </div>
        </div>

        <div class="v-info-row">
          <div style="width: 50%;">${t('pay_to') || (isEn ? 'Pay to' : 'يصرف لـ')}: ${sup.name}</div>
          <div style="width: 25%; text-align: center;">${t('date') || (isEn ? 'Date' : 'التاريخ')}: ${formatDateString(tx.tx_date)}</div>
          <div style="width: 25%; text-align: ${isEn ? 'right' : 'left'};">${t('ref_no') || (isEn ? 'Ref No' : 'رقم المرجع')}: #${tx.id}</div>
        </div>

        <div class="v-amount-row">
          ${t('amount') || (isEn ? 'Amount' : 'المبلغ')}: <div class="v-amount-box">${window.appSettings?.currency || ''}${parseFloat(tx.amount).toLocaleString('en-US', {minimumFractionDigits:2})}</div>
        </div>

        <div class="v-reason-row">
          <strong>${t('for_reason') || (isEn ? 'For Reason' : 'وذلك عن')}:</strong> ${tx.notes || ''}
        </div>

        <div class="v-signatures">
          <div class="v-sig-box">${t('sig_receiver') || (isEn ? 'Receiver Signature' : 'توقيع المستلم')}<div class="v-sig-line"></div></div>
          <div class="v-sig-box">${t('sig_accountant') || (isEn ? 'Accountant Signature' : 'توقيع المحاسب')}<div class="v-sig-line"></div></div>
        </div>
      </div>
    </body>
    </html>
  `;
  await window.api.printHtmlToPDF(html, 'A5');
}
