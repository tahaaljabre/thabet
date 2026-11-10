import { fetchCashierReports, generatePDF } from '../api.js';
import { globals } from '../state.js';
import { escapeHtml } from '../../../core/dom.js';
import { channelName, getActiveChannels } from '../channels.js';

export async function handlePrintCashierStatement() {
  const select = document.getElementById('select-report-cashier');
  if (!select) return;
  const cashierName = select.value;
  if (!cashierName) return;

  try {
    const reports = await fetchCashierReports(cashierName, globals.currentYearId);
    const fromDate = document.getElementById('sales-print-from').value;
    const toDate = document.getElementById('sales-print-to').value;

    const cName = globals.appSettings?.companyName || t('company_default_name');
    const cAddress = globals.appSettings?.address || '';
    const cPhone = globals.appSettings?.phone || '';
    const cTax = globals.appSettings?.taxNumber || '';
    const logoHtml = globals.appSettings?.logo ? `<img src="${globals.appSettings.logo}" style="max-height: 60px; margin-bottom: 10px;">` : '';

    let dateRangeText = '';
    if (fromDate && toDate) dateRangeText = `${t('date_from')} ${fromDate} ${t('date_to')} ${toDate}`;
    else if (fromDate) dateRangeText = `${t('date_from')} ${fromDate} ${t('from_date_onward')}`;
    else if (toDate) dateRangeText = `${t('until_date')} ${toDate}`;
    else dateRangeText = t('all_financial_periods');

    let filteredReports = reports;
    if (fromDate) {
      filteredReports = filteredReports.filter(r => r.report_date >= fromDate);
    }
    if (toDate) {
      filteredReports = filteredReports.filter(r => r.report_date <= toDate);
    }

    filteredReports.sort((a, b) => a.report_date.localeCompare(b.report_date));

    let totalCash = 0;
    const channels = getActiveChannels(globals.appSettings);
    const channelTotals = Object.fromEntries(channels.map(channel => [channel.key, 0]));
    let totalActual = 0;

    let rowsHtml = '';
    filteredReports.forEach((r, idx) => {
      const cash = r.cash_sales || 0;
      const kbank = r.kbank || 0;
      const grab = r.grab || 0;
      const lineman = r.lineman || 0;
      const krungsri = r.krungsri || 0;
      const actual = r.cashier_actual || 0;
      const expectedCash = Math.max(0, cash - (r.total_expenses || 0) - (r.total_emp || 0) - (r.total_sup || 0));
      const diff = actual - expectedCash;

      totalCash += cash;
      const systemAmounts = { kbank, grab, lineman, krungsri };
      const channelAmounts = channels.map(channel => {
        const amount = Number(systemAmounts[channel.key] ?? r.channel_sales?.[channel.key]) || 0;
        channelTotals[channel.key] += amount;
        return amount;
      });
      totalActual += actual;

      let diffText = '—';
      let diffStyle = 'color: #64748b;';
      if (diff > 0) {
        diffText = `+${globals.appSettings?.currency || ''}${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        diffStyle = 'color: #10b981; font-weight: bold;';
      } else if (diff < 0) {
        diffText = `-${globals.appSettings?.currency || ''}${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        diffStyle = 'color: #ef4444; font-weight: bold;';
      }

      rowsHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.report_date}</td>
          <td>${globals.appSettings?.currency || ''}${cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          ${channelAmounts.map(amount => `<td>${globals.appSettings?.currency || ''}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>`).join('')}
          <td>${globals.appSettings?.currency || ''}${actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td style="${diffStyle}">${diffText}</td>
        </tr>
      `;
    });

    const totalDiff = totalActual - totalCash;
    let totalDiffText = '—';
    let totalDiffStyle = 'color: #64748b;';
    if (totalDiff > 0) {
      totalDiffText = `+${globals.appSettings?.currency || ''}${totalDiff.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      totalDiffStyle = 'color: #10b981; font-weight: bold;';
    } else if (totalDiff < 0) {
      totalDiffText = `-${globals.appSettings?.currency || ''}${Math.abs(totalDiff).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      totalDiffStyle = 'color: #ef4444; font-weight: bold;';
    }

    const html = `
      <!DOCTYPE html>
      <html dir="${window.currentLang() === 'en' ? 'ltr' : 'rtl'}">
      <head>
        <meta charset="utf-8">
        <title>${t('cashier_sales_statement')} - ${cashierName}</title>
        <style>
          body { font-family: 'Cairo', Tahoma, sans-serif; padding: 20px; color: #1e293b; direction: ${window.currentLang() === 'en' ? 'ltr' : 'rtl'}; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .header-table td { border: none; text-align: right; }
          .title-box { text-align: center; margin: 20px 0; }
          .title { font-size: 22px; font-weight: bold; color: #7A1A22; border-bottom: 2px solid #7A1A22; display: inline-block; padding-bottom: 5px; }
          .info-grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; margin-bottom: 20px; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          .details-table th { background-color: #7A1A22; color: white; padding: 10px 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: bold; }
          .details-table td { padding: 8px; text-align: center; border: 1px solid #e2e8f0; }
          .total-row { background-color: #f1f5f9; font-weight: bold; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <h2 style="margin: 0; color: #7A1A22;">${escapeHtml(cName)}</h2>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #475569;">📍 ${escapeHtml(cAddress)} ${cPhone ? ' | 📞 ' + escapeHtml(cPhone) : ''}</p>
            </td>
            <td style="text-align: left;">${logoHtml}</td>
          </tr>
        </table>

        <div class="title-box">
          <div class="title">${t('cashier_sales_statement')}</div>
        </div>

        <div class="info-grid">
          <div><strong>${t('cashier_pos_colon')}</strong> ${escapeHtml(cashierName)}</div>
          <div><strong>${t('selected_period')}</strong> ${escapeHtml(dateRangeText)}</div>
        </div>

        <table class="details-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${window.t('col_date')}</th>
              <th>${window.t('system_cash_label')}</th>
              ${channels.map(channel => `<th>${escapeHtml(channelName(channel))}</th>`).join('')}
              <th>${t('actual_drawer')}</th>
              <th>${t('financial_difference')}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="2">${t('grand_totals')}</td>
              <td>${globals.appSettings?.currency || ''}${totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              ${channels.map(channel => `<td>${globals.appSettings?.currency || ''}${channelTotals[channel.key].toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>`).join('')}
              <td>${globals.appSettings?.currency || ''}${totalActual.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="${totalDiffStyle}">${totalDiffText}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    await generatePDF(html, 'A4');
    // NOTE: showToast isn't imported in service.js, it's a UI thing. I should use console.log or fire an event, 
    // but the original code had it, I'll let it be for now and fix imports.
  } catch (err) {
    console.error(err);
  }
}
