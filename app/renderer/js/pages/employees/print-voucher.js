async function printEmployeeVoucher(txId) {
  const tx = currentEmployeeTxs.find(t => t.id === txId);
  if(!tx) return;
  const emp = allEmployees.find(e => e.id == currentEmployeeId);
  if(!emp) return;

    const cName = appSettings.companyName || 'مطعم حضرموت اليمن';
  const cPhone = appSettings.phone || '7�88& 7�88!7�7�8~';
  const cAddress = appSettings.address || '7�87�8 8�7�8 ';
  const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 50px;">` : '';
  const isEn = typeof window.currentLang === 'function' && window.currentLang() === 'en';
  const voucherTitle = isEn ? 'Payment Voucher' : (t('voucher_payment') + ' / 87�7�');

  const html = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>${voucherTitle}</title>
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
        .v-info-row { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 15px; border-radius: 6px; margin-bottom: 15px; font-size: 13px; font-weight: bold; border-${isEn ? 'left' : 'right'}: 4px solid #7A1A22; }
        .v-amount-row { margin-bottom: 10px; font-size: 15px; font-weight: bold; display: flex; align-items: center; }
        .v-amount-box { border: 1px solid #94a3b8; background: #f1f5f9; padding: 5px 20px; border-radius: 5px; font-size: 18px; margin-${isEn ? 'right' : 'left'}: 15px; color: #1e293b; }
        .v-reason-row { margin-bottom: 10px; font-size: 13px; font-weight: normal; background: #f8fafc; padding: 10px; border-radius: 5px; }
        .v-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; }
        .v-table th, .v-table td { border: 1px solid #cbd5e1; padding: 6px; text-align: center; }
        .v-table th { background: #f1f5f9; color: #334155; }
        .v-signatures { display: flex; justify-content: space-between; margin-top: auto; padding: 0 40px; font-size: 14px; font-weight: bold; }
        .v-sig-box { text-align: center; width: 150px; }
        .v-sig-line { border-top: 1px solid #000; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="voucher-container">
        <div class="v-header">
          <div class="v-header-right">
            <h1>${appSettings.companyName || 'مطعم حضرموت اليمن'}</h1>
            <p>${appSettings.address ? (isEn ? 'Address: ' : 'العنوان: ') + appSettings.address : ''} ${appSettings.phone ? ' | ' + (isEn ? 'Phone: ' : 'هاتف: ') + appSettings.phone : ''}</p>
            ${appSettings.taxNumber ? `<p>${t('tax_number') || (isEn ? 'Tax No' : 'الرقم الضريبي')}: ${appSettings.taxNumber}</p>` : ''}
          </div>
          <div class="v-header-center">
            ${logoHtml}
          </div>
          <div class="v-header-left">
            <div class="v-title">${t('emp_voucher_title') || (isEn ? 'Employee Voucher' : '7�8 7� 8&8�7�8~')}</div>
          </div>
        </div>

        <div class="v-info-row">
          <div style="width: 50%;">${t('beneficiary')} ${emp.name}</div>
          <div style="width: 25%; text-align: center;">${t('date')}: ${formatDateString(tx.tx_date)}</div>
          <div style="width: 25%; text-align: left;">${t('ref_no')}: #${tx.id}</div>
        </div>

        <div class="v-amount-row">
          ${t('amount_paid')} <div class="v-amount-box">${window.appSettings?.currency || ''}${parseFloat(tx.amount).toLocaleString('en-US', {minimumFractionDigits:2})}</div>
        </div>

        <table class="v-table">
          <thead>
            <tr>
              <th>${t('attendance_days')}</th>
              <th>${t('absence_days')}</th>
              <th>${t('deduction_value')}</th>
              <th>${t('allowances_value')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${tx.attendance_days}</td>
              <td>${tx.absence_days}</td>
              <td style="color:#dc2626; font-weight:bold;">${window.appSettings?.currency || ''}${tx.deductions}</td>
              <td style="color:#16a34a; font-weight:bold;">${window.appSettings?.currency || ''}${tx.allowances}</td>
            </tr>
          </tbody>
        </table>

        <div class="v-reason-row">
          <strong>${t('notes_statement')}</strong> ${tx.notes || ''}
        </div>

        <div class="v-signatures">
          <div class="v-sig-box">${t('sig_receiver')} ${t('employee_word')}<div class="v-sig-line"></div></div>
          <div class="v-sig-box">${t('management_sig')}${t('sig_accountant')}<div class="v-sig-line"></div></div>
        </div>
      </div>
    </body>
    </html>
  `;
  await window.api.printHtmlToPDF(html, 'A5');
}
