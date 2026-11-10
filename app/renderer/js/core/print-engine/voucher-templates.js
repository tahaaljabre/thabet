function renderVoucherPreview(data) {
  const formattedAmount = data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  return `
    <div class="voucher-preview">
      <div class="voucher-header">
        <div class="voucher-logo-placeholder">🏰</div>
        <div class="voucher-title">${data.title}</div>
        <div class="voucher-subtitle">${data.subTitle}</div>
      </div>
      <div class="voucher-row">
        <span class="label">${window.t('voucher_no')}</span>
        <span class="val" style="font-family: monospace; font-size: 14px;">${data.refNo}</span>
      </div>
      <div class="voucher-row">
        <span class="label">${window.t('voucher_date')}</span>
        <span class="val">${data.date}</span>
      </div>
      <div class="voucher-row">
        <span class="label">${data.type === 'purchase' ? t('paid_to_particulars') : t('revenue_source_channel')}</span>
        <span class="val">${data.name}</span>
      </div>
      ${data.details && data.details !== '—' ? `
      <div class="voucher-row">
        <span class="label">${t('details_quantity')}</span>
        <span class="val">${data.details}</span>
      </div>` : ''}
      <div class="voucher-row">
        <span class="label">${t('financial_category')}</span>
        <span class="val">${data.category}</span>
      </div>
      <div class="voucher-row amount-row">
        <span class="label">${window.t('voucher_amount')}</span>
        <span class="val">${window.appSettings?.currency || ''}${formattedAmount}</span>
      </div>
      <div class="voucher-row" style="border-bottom: none; font-size: 11px; margin-top: 10px;">
        <span class="label">${t('prepared_edited_by')}</span>
        <span class="val">${data.preparedBy}</span>
      </div>
      
      <div class="voucher-signatures">
        <div class="sig-line">
          <div class="line"></div>
          <span>${t('recipient_treasurer')}</span>
        </div>
        <div class="sig-line">
          <div class="line"></div>
          <span>${t('sig_accountant') || 'Accountant'}</span>
        </div>
        <div class="sig-line">
          <div class="line"></div>
          <span>${t('sig_manager') || 'General Manager'}</span>
        </div>
      </div>
    </div>
  `;
}

function renderVoucherPrint(data) {
  const formattedAmount = data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Copy logo src from page header
  const logoBoxImg = document.querySelector('.logo-box img');
  const logoHtml = logoBoxImg ? `<img class="print-voucher-logo" src="${logoBoxImg.src}" alt="${t('company_logo_alt')}">` : '';
  
  return `
    <div class="print-voucher">
      <div class="print-voucher-header" style="text-align: center; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7A1A22; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="text-align: right;">
            <div style="font-size: 22px; font-weight: bold; color: #7A1A22;">${appSettings.companyName || t('company_default_name')}</div>
            <div style="font-size: 12px; margin-top: 3px; color: #333;">${appSettings.address ? `${t('address')}: ${appSettings.address}` : ''} ${appSettings.phone ? ` | ${t('phone')}: ${appSettings.phone}` : ''}</div>
            ${appSettings.taxNumber ? `<div style="font-size: 13px; margin-top: 3px; font-weight: bold;">${t('tax_number')}: ${appSettings.taxNumber}</div>` : ''}
          </div>
          <div style="text-align: left;">
            ${appSettings.logo ? `<img class="print-voucher-logo" src="${appSettings.logo}" alt="${t('company_logo_alt')}" style="max-height: 60px;">` : ''}
          </div>
        </div>
        
        <div class="print-voucher-title" style="font-size: 18px; border: 1px solid #000; display: inline-block; padding: 4px 15px; background: #f8fafc;">${data.title}</div>
        <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${data.subTitle}</div>
      </div>
      
      <div class="print-voucher-row">
        <span class="lbl">${t('voucher_number_label')}</span>
        <span class="val" style="font-family: monospace; font-size: 15px; font-weight: bold;">${data.refNo}</span>
      </div>
      <div class="print-voucher-row">
        <span class="lbl">${t('voucher_date_label')}</span>
        <span class="val">${data.date}</span>
      </div>
      <div class="print-voucher-row">
        <span class="lbl">${data.type === 'purchase' ? t('paid_to_particulars') : t('revenue_source_channel')}</span>
        <span class="val" style="font-weight: bold;">${data.name}</span>
      </div>
      ${data.details && data.details !== '—' ? `
      <div class="print-voucher-row">
        <span class="lbl">${t('details_quantity')}</span>
        <span class="val">${data.details}</span>
      </div>` : ''}
      <div class="print-voucher-row">
        <span class="lbl">${t('financial_category')}</span>
        <span class="val">${data.category}</span>
      </div>
      <div class="print-voucher-row amount">
        <span class="lbl">${t('total_amount')}:</span>
        <span class="val">${window.appSettings?.currency || ''}${formattedAmount}</span>
      </div>
      
      <div class="print-voucher-row" style="border-bottom: none; font-size: 12px; padding-top: 15px;">
        <span class="lbl">${t('prepared_edited_by')}</span>
        <span class="val">${data.preparedBy}</span>
      </div>
      
      <div class="print-voucher-signatures">
        <div class="print-sig-line">
          <div class="line"></div>
          <span>${t('recipient_treasurer')}</span>
        </div>
        <div class="print-sig-line">
          <div class="line"></div>
          <span>${t('sig_accountant') || 'Accountant'}</span>
        </div>
        <div class="print-sig-line">
          <div class="line"></div>
          <span>${t('sig_manager') || 'General Manager'}</span>
        </div>
      </div>
    </div>
  `;
}
