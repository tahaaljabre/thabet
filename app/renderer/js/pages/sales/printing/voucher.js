import { fetchReportState, generatePDF } from '../api.js';
import { globals } from '../state.js';
import { escapeHtml } from '../../../core/dom.js';
import { showToast } from '../../../core/notifications.js';
import { getActiveChannels, channelName } from '../channels.js';

export async function handlePrintDailyReportVoucher(reportDate, cashierName) {
  try {
    const report = await fetchReportState(reportDate, cashierName, globals.currentYearId);
    if (!report) {
      showToast(t('voucher_data_not_found'), 'error');
      return;
    }

    const cName = globals.appSettings?.companyName || t('company_default_name');
    const cAddress = globals.appSettings?.address || '';
    const cPhone = globals.appSettings?.phone || '';
    const cTax = globals.appSettings?.taxNumber || '';
    const logoHtml = globals.appSettings?.logo ? `<img src="${globals.appSettings.logo}" style="max-height: 60px; margin-bottom: 10px;">` : '';

    const cash = report.sales.cash || 0;
    const kbank = report.sales.kbank || 0;
    const grab = report.sales.grab || 0;
    const lineman = report.sales.lineman || 0;
    const krungsri = report.sales.krungsri || 0;
    const actual = report.cashierActual || 0;
    const activeChannels = getActiveChannels(globals.appSettings);
    const systemAmounts = { kbank, grab, lineman, krungsri };
    const systemChannelRows = activeChannels.filter(channel => Object.hasOwn(systemAmounts, channel.key)).map(channel => ({
      name: channelName(channel), amount: systemAmounts[channel.key]
    }));
    const totalOnline = systemChannelRows.reduce((sum, channel) => sum + channel.amount, 0);
    const customChannelRows = Object.entries(report.channelSales || {}).filter(([key]) =>
      activeChannels.some(channel => channel.key === key)
    ).map(([key, rawAmount]) => {
      const channel = activeChannels.find(item => item.key === key) || {};
      const amount = Number(rawAmount) || 0;
      const name = channelName({ ...channel, key });
      return { name, amount };
    });
    const customChannelsTotal = customChannelRows.reduce((sum, channel) => sum + channel.amount, 0);
    const totalSales = cash + totalOnline + customChannelsTotal;
    
    // In print voucher, difference is ActualDrawer minus CashSales (since online goes straight to bank accounts)
    const diff = actual - cash;

    let diffText = '—';
    let diffStyle = 'color: #64748b;';
    if (diff > 0) {
      diffText = `+${globals.appSettings?.currency || ''}${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      diffStyle = 'color: #10b981; font-weight: bold;';
    } else if (diff < 0) {
      diffText = `-${globals.appSettings?.currency || ''}${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      diffStyle = 'color: #ef4444; font-weight: bold;';
    }

    const html = `
      <!DOCTYPE html>
      <html dir="${window.currentLang() === 'en' ? 'ltr' : 'rtl'}">
      <head>
        <meta charset="utf-8">
        <title>${t('daily_sales_reconciliation_voucher')} - ${reportDate}</title>
        <style>
          body { font-family: 'Cairo', Tahoma, sans-serif; margin: 0; padding: 30px; color: #1e293b; direction: ${window.currentLang() === 'en' ? 'ltr' : 'rtl'}; font-size: 14px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7A1A22; padding-bottom: 10px; margin-bottom: 20px; }
          .title-box { text-align: center; margin: 20px 0; }
          .title { font-size: 20px; font-weight: bold; color: #7A1A22; border: 1px solid #7A1A22; padding: 5px 20px; background: #f8fafc; display: inline-block; }
          .voucher-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; }
          .voucher-row.total { border-top: 1px solid #7A1A22; border-bottom: 2px solid #7A1A22; font-weight: bold; font-size: 16px; margin-top: 10px; }
          .lbl { color: #475569; }
          .val { font-weight: bold; }
          .signatures { margin-top: 60px; display: flex; justify-content: space-between; font-size: 13px; }
          .sig-box { width: 180px; text-align: center; }
          .sig-line { margin-top: 35px; border-top: 1px dashed #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin: 0; color: #7A1A22;">${escapeHtml(cName)}</h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #475569;">📍 ${escapeHtml(cAddress)} ${cPhone ? ' | 📞 ' + escapeHtml(cPhone) : ''}</p>
            ${cTax ? `<p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold;">${t('tax_number')}: ${escapeHtml(cTax)}</p>` : ''}
          </div>
          <div>${logoHtml}</div>
        </div>

        <div class="title-box">
          <div class="title">${t('daily_sales_reconciliation_voucher')}</div>
        </div>

        <div class="voucher-row"><span class="lbl">${t('voucher_number_label')}</span><span class="val" style="color: #7A1A22; font-size: 16px;">${report.voucherNumber || '-'}</span></div>
        <div class="voucher-row"><span class="lbl">${t('voucher_date_label')}</span><span class="val">${reportDate}</span></div>
        <div class="voucher-row"><span class="lbl">${t('cashier_pos_colon')}</span><span class="val">${cashierName}</span></div>
        <div class="voucher-row"><span class="lbl">${t('responsible_receiver')}</span><span class="val">${report.cashierUser || '—'}</span></div>
        <div class="voucher-row" style="margin-top: 15px; font-weight: bold; color: #7A1A22;"><span class="lbl" style="color: #7A1A22;">${t('cashier_cash_sales')}</span><span class="val">${globals.appSettings?.currency || ''}${cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
        ${systemChannelRows.map(channel => `<div class="voucher-row"><span class="lbl">${escapeHtml(channel.name)}:</span><span class="val">${globals.appSettings?.currency || ''}${channel.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`).join('')}
        ${customChannelRows.map(channel => `<div class="voucher-row"><span class="lbl">${escapeHtml(channel.name)}:</span><span class="val">${globals.appSettings?.currency || ''}${channel.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`).join('')}
        <div class="voucher-row"><span class="lbl">${t('total_online_network_sales')}</span><span class="val">${globals.appSettings?.currency || ''}${(totalOnline + customChannelsTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
        
        <div class="voucher-row total"><span class="lbl">${t('grand_total_sales')}</span><span class="val">${globals.appSettings?.currency || ''}${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
        
        <div class="voucher-row" style="margin-top: 15px;"><span class="lbl">${t('actual_drawer_available')}</span><span class="val">${globals.appSettings?.currency || ''}${actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
        <div class="voucher-row"><span class="lbl">${t('drawer_financial_difference')}</span><span class="val" style="${diffStyle}">${diffText}</span></div>

        <div class="signatures">
          <div class="sig-box"><span>${t('responsible_cashier_signature')}</span><div class="sig-line"></div></div>
          <div class="sig-box"><span>${t('financial_accountant_signature')}</span><div class="sig-line"></div></div>
          <div class="sig-box"><span>${t('branch_manager_signature')}</span><div class="sig-line"></div></div>
        </div>
      </body>
      </html>
    `;
    await generatePDF(html, 'A4');
  } catch (err) {
    console.error(err);
    showToast(t('financial_voucher_print_error'), 'error');
  }
}
