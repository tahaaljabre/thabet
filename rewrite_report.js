const fs = require('fs');
const path = require('path');

const filePath = path.resolve('app/renderer/js/pages/vault/reports.js');
let code = fs.readFileSync(filePath, 'utf8');

// Find the start and end of printVaultDetailed
const startIdx = code.indexOf('async function printVaultDetailed() {');
if (startIdx === -1) throw new Error('printVaultDetailed not found');

// Find the end of the function by matching braces (approximate, since we know it ends right before `module.exports` or another function)
const nextFuncIdx = code.indexOf('function printVaultSummary()', startIdx);
let endIdx = -1;
if (nextFuncIdx !== -1) {
    endIdx = code.lastIndexOf('}', nextFuncIdx);
} else {
    // just use the last brace
    endIdx = code.lastIndexOf('}');
}

if (endIdx === -1) throw new Error('End of printVaultDetailed not found');

const newFunctionCode = `async function printVaultDetailed() {
  if(!vaultData) return alert('الرجاء عرض البيانات أولاً');
  const start = document.getElementById('vault-start-date').value;
  const end = document.getElementById('vault-end-date').value;
  const isEn = typeof currentLang !== 'undefined' && currentLang === 'en';
  
  let daysHtml = ''; 
  let totalNet = 0;
  let grandTotalCash = 0;
  let grandTotalOnline = 0;
  let grandTotalExpenses = 0;
  let grandTotalEmpTxs = 0;
  let grandTotalSupTxs = 0;

  const allDatesSet = new Set();
  vaultData.reports.forEach(r => { if (r.report_date) allDatesSet.add(r.report_date); });
  vaultData.expenses.forEach(e => { if (e.report_date) allDatesSet.add(e.report_date); });
  if (vaultData.employeeTxs) {
    vaultData.employeeTxs.forEach(tx => { if (tx.tx_date) allDatesSet.add(tx.tx_date); });
  }
  if (vaultData.supplierTxs) {
    vaultData.supplierTxs.forEach(tx => { if (tx.tx_date) allDatesSet.add(tx.tx_date); });
  }
  const allDates = Array.from(allDatesSet).sort();
  const validDates = allDates.filter(date => {
    const dateReports = vaultData.reports.filter(rep => rep.report_date === date);
    const cash = dateReports.reduce((sum, rep) => sum + (rep.cash_sales || 0), 0);
    const online = dateReports.reduce((sum, rep) => sum + ((rep.kbank || 0) + (rep.grab || 0) + (rep.lineman || 0) + (rep.krungsri || 0)), 0);
    const dayExpTotal = vaultData.expenses.filter(e => e.report_date === date).reduce((sum, e) => sum + e.amount, 0);
    const dayEmpTotal = vaultData.employeeTxs ? vaultData.employeeTxs.filter(tx => tx.tx_date === date).reduce((sum, tx) => sum + (tx.amount || 0), 0) : 0;
    const daySupTotal = vaultData.supplierTxs ? vaultData.supplierTxs.filter(tx => tx.tx_date === date && tx.tx_type === 'عليه').reduce((sum, tx) => sum + (tx.amount || 0), 0) : 0;
    return !(cash === 0 && online === 0 && dayExpTotal === 0 && dayEmpTotal === 0 && daySupTotal === 0);
  });

  validDates.forEach((date, index) => {
    const dayReports = vaultData.reports.filter(rep => rep.report_date === date);
    
    const dayExpenses = vaultData.expenses.filter(e => e.report_date === date);
    const dayExpTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const dayEmpTxs = vaultData.employeeTxs ? vaultData.employeeTxs.filter(tx => tx.tx_date === date) : [];
    const dayEmpTotal = dayEmpTxs.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : (tx.allowances || 0)), 0);
  
    const daySupTxs = vaultData.supplierTxs ? vaultData.supplierTxs.filter(tx => tx.tx_date === date && tx.tx_type === 'عليه') : [];
    const daySupTotal = daySupTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    let daySalesHtml = '';
    let dayCashTotal = 0;
    let dayOnlineTotal = 0;
    let dayActualTotal = 0;
    
    if (dayReports.length === 0) {
      dayReports.push({
        cashier_name: isEn ? 'First Floor' : 'الدور الأول',
        cashier_user: isEn ? 'Responsible Employee' : 'الموظف المسؤول',
        cash_sales: 0, kbank: 0, grab: 0, lineman: 0, krungsri: 0, cashier_actual: 0
      });
    }

    dayReports.forEach((r, idx) => {
      const cash = r.cash_sales || 0;
      const kbank = r.kbank || 0;
      const grab = r.grab || 0;
      const lineman = r.lineman || 0;
      const krungsri = r.krungsri || 0;
      const online = kbank + grab + lineman + krungsri;
      const total = cash + online;
      const actual = r.cashier_actual || 0;
      
      const dayExpToDeduct = (idx === 0) ? (dayExpTotal + dayEmpTotal + daySupTotal) : 0;
      const expectedCash = Math.max(0, cash - dayExpToDeduct);
      const diff = actual - expectedCash;
      
      dayCashTotal += cash;
      dayOnlineTotal += online;
      dayActualTotal += actual;
      
      grandTotalCash += cash;
      grandTotalOnline += online;
      
      const _c = window.appSettings?.currency || '฿';
      daySalesHtml += \`
        <div style="margin-bottom:12px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#ffffff;">
          <div style="background-color:#1e3a8a; padding:10px 14px; display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; border-radius:50%; background-color:#eab308; display:flex; align-items:center; justify-content:center; font-size:16px; color:#fff; flex-shrink:0;">💰</div>
            <div style="flex:1;">
              <div style="font-size:13px; font-weight:700; color:#ffffff;">\${r.cashier_name}</div>
              <div style="font-size:11px; color:#bfdbfe;">\${t('employee_word') || 'الموظف'}: \${r.cashier_user}</div>
            </div>
            \${diff !== 0 ? \`<div style="font-size:11px; font-weight:bold; padding:4px 8px; border-radius:6px; background:\${diff < 0 ? '#fee2e2' : '#dcfce7'}; color:\${diff < 0 ? '#b91c1c' : '#15803d'}; direction:ltr;">\${diff > 0 ? '+' : ''}\${_c}\${Math.abs(diff).toLocaleString('en-US')}</div>\` : ''}
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 14px; color:#475569; font-weight:600;">\${t('cash_sales') || 'مبيعات نقد'}</td><td style="padding:8px 14px; text-align:left; font-weight:bold; color:#1e293b; direction:ltr;">\${_c}\${cash.toLocaleString('en-US')}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 14px; color:#475569; font-weight:600;">\${t('cards_kbank') || 'بطاقات KBank'}</td><td style="padding:8px 14px; text-align:left; font-weight:bold; color:#1e293b; direction:ltr;">\${_c}\${kbank.toLocaleString('en-US')}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 14px; color:#475569; font-weight:600;">GrabFood</td><td style="padding:8px 14px; text-align:left; font-weight:bold; color:#1e293b; direction:ltr;">\${_c}\${grab.toLocaleString('en-US')}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 14px; color:#475569; font-weight:600;">LineMan</td><td style="padding:8px 14px; text-align:left; font-weight:bold; color:#1e293b; direction:ltr;">\${_c}\${lineman.toLocaleString('en-US')}</td></tr>
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 14px; color:#475569; font-weight:600;">Krungsri Online</td><td style="padding:8px 14px; text-align:left; font-weight:bold; color:#1e293b; direction:ltr;">\${_c}\${krungsri.toLocaleString('en-US')}</td></tr>
            <tr style="background-color:#eff6ff; border-top:2px solid #bfdbfe;"><td style="padding:10px 14px; color:#1e3a8a; font-weight:bold; font-size:13px;">\${t('total_sales') || 'إجمالي المبيعات'}</td><td style="padding:10px 14px; text-align:left; font-weight:900; color:#1e3a8a; font-size:14px; direction:ltr;">\${_c}\${total.toLocaleString('en-US')}</td></tr>
            <tr style="background:#f8fafc; border-top:1px dashed #cbd5e1;"><td style="padding:8px 14px; color:#64748b; font-size:11px;">🏧 \${t('cashier_avail') || 'المتوفر بالكاشير'}</td><td style="padding:8px 14px; text-align:left; color:#64748b; font-size:11px; direction:ltr; font-weight:bold;">\${_c}\${actual.toLocaleString('en-US')}</td></tr>
          </table>
        </div>
      \`;
    });

    const isClosedDate = dayReports.some(rep => rep.is_closed === 1);

    grandTotalExpenses += dayExpTotal;
    grandTotalEmpTxs += dayEmpTotal;
    grandTotalSupTxs += daySupTotal;

    const dayVouchers = vaultData.generalVouchers ? vaultData.generalVouchers.filter(v => v.voucher_date === date) : [];
    const dayVoucherTotal = dayVouchers.reduce((sum, v) => sum + v.amount, 0);
    const dayNet = (dayCashTotal + dayOnlineTotal) - dayExpTotal - dayEmpTotal - daySupTotal - dayVoucherTotal;
    totalNet += dayNet;

    let salesHtml = \`
      <div style="flex: 1; padding-left: 15px; border-left: 1px solid #e2e8f0;">
        <h4 style="margin: 0 0 15px 0; color: #1e3a8a; font-size:15px; border-bottom: 2px solid #bfdbfe; padding-bottom: 8px;">
          📊 \${t('sales_channels_details') || 'تفاصيل قنوات المبيعات'}
        </h4>
        \${daySalesHtml}
      </div>
    \`;

    let expensesListHtml = dayExpenses.map(e => \`
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 6px; color:#334155; font-weight:600;">\${e.name} \${e.qty ? '('+e.qty+')' : ''}</td>
        <td style="text-align: left; padding: 10px 6px; font-weight:bold; color:#dc2626; direction:ltr;">\${window.appSettings?.currency || '฿'}\${(e.amount || 0).toLocaleString('en-US')}</td>
      </tr>
    \`).join('');

    let empTxsListHtml = dayEmpTxs.map(tx => {
      const displayAmount = tx.amount > 0 ? tx.amount : (tx.allowances || 0);
      return \`
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 6px; color: #ea580c; font-weight:600;">\${t('emp_expense_prefix') || 'سلف الموظفين:'} \${tx.employee_name} \${tx.notes ? '('+tx.notes+')' : ''}</td>
          <td style="text-align: left; padding: 10px 6px; font-weight:bold; color: #ea580c; direction:ltr;">\${window.appSettings?.currency || '฿'}\${displayAmount.toLocaleString('en-US')}</td>
        </tr>
      \`;
    }).join('');
    
    let supTxsListHtml = daySupTxs.map(tx => \`
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 6px; color: #7e22ce; font-weight:600;">\${t('sup_expense_prefix') || 'مدفوعات الموردين:'} \${tx.supplier_name} \${tx.notes ? '('+tx.notes+')' : ''}</td>
        <td style="text-align: left; padding: 10px 6px; font-weight:bold; color: #7e22ce; direction:ltr;">\${window.appSettings?.currency || '฿'}\${(tx.amount || 0).toLocaleString('en-US')}</td>
      </tr>
    \`).join('');

    let genTxsListHtml = dayVouchers.map(tx => \`
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 6px; color: #0284c7; font-weight:600;">\${tx.category || (isEn ? 'General Payment Voucher' : 'سند صرف عام')} \${tx.description ? '('+tx.description+')' : ''} \${tx.partner_name ? '['+tx.partner_name+']' : ''}</td>
        <td style="text-align: left; padding: 10px 6px; font-weight:bold; color: #0284c7; direction:ltr;">\${window.appSettings?.currency || '฿'}\${(tx.amount || 0).toLocaleString('en-US')}</td>
      </tr>
    \`).join('');

    if (dayExpenses.length === 0 && dayEmpTxs.length === 0 && daySupTxs.length === 0 && dayVouchers.length === 0) {
      expensesListHtml = \`<tr><td colspan="2" style="padding: 12px 6px; color: #94a3b8; text-align:center;">\${t('no_expenses_today') || 'لا توجد مشتريات أو مصروفات لهذا اليوم'}</td></tr>\`;
    }

    let expensesHtml = \`
      <div style="flex: 1; padding-right: 15px;">
        <h4 style="margin: 0 0 15px 0; color: #b91c1c; font-size:15px; border-bottom: 2px solid #fecaca; padding-bottom: 8px;">
          🛒 \${t('print_purchases_details') || 'تفاصيل المشتريات والمصروفات'}
        </h4>
        <table style="width:100%; font-size:13px; border-collapse: collapse;">
          \${expensesListHtml}
          \${empTxsListHtml}
          \${supTxsListHtml}
          \${genTxsListHtml}
          <tr style="background:#fef2f2; border-top: 2px solid #fca5a5;">
            <td style="padding: 12px 6px; font-weight: bold; color:#b91c1c; font-size:14px;">\${t('print_total_expenses') || 'إجمالي المصاريف الكلي'}</td>
            <td style="text-align: left; padding: 12px 6px; font-weight: bold; color:#b91c1c; font-size:15px; direction:ltr;">\${window.appSettings?.currency || '฿'}\${(dayExpTotal + dayEmpTotal + daySupTotal + dayVoucherTotal).toLocaleString('en-US')}</td>
          </tr>
        </table>
      </div>
    \`;

    const isLast = index === validDates.length - 1;
    daysHtml += \`
      <div style="margin:20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); \${isLast ? '' : ' page-break-after: always; break-after: page;'}">
        <div style="background-color: #1e3a8a; display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; color: #ffffff;">
          <div style="background-color: \${dayNet < 0 ? '#991b1b' : '#166534'}; padding: 6px 16px; border-radius: 8px; font-weight: bold; font-size: 15px; border: 1px solid rgba(255,255,255,0.2);">
            \${t('net_total') || 'صافي اليوم'}: \${window.appSettings?.currency || '฿'}\${dayNet.toLocaleString('en-US')}
          </div>
          <div style="font-weight: bold; font-size: 16px; display: flex; align-items: center; gap: 8px; flex-direction: row-reverse;">
            📅 \${date} \${isClosedDate ? (isEn ? '<span style="color:#fca5a5; font-size:12px;">(Closed🔒)</span>' : '<span style="color:#fca5a5; font-size:12px;">(مقفلة🔒)</span>') : ''}
          </div>
        </div>
        <div style="display: flex; padding: 15px;">
          \${salesHtml}
          \${expensesHtml}
        </div>
      </div>
    \`;
  });

  const _grandVoucherTotal = vaultData.generalVouchers ? vaultData.generalVouchers.reduce((s, v) => s + v.amount, 0) : 0;
  const _gCur = window.appSettings?.currency || '฿';
  const _grandAllExp = grandTotalExpenses + grandTotalEmpTxs + grandTotalSupTxs + _grandVoucherTotal;

  const html = \`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  @page { size:A4; margin:8mm; }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  body {
    background:#ffffff !important;
    font-family:'Segoe UI',Tahoma,Arial,sans-serif;
    color:#1e293b;
    padding:0;
    direction:rtl;
  }
</style>
</head>
<body>
<div class="pr-wrapper" style="max-width:900px; margin:0 auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
  
  <div class="pr-hdr" style="background-color:#1e3a8a; padding:30px 28px; text-align:center; position:relative; border-bottom:4px solid #facc15;">
    <div style="position:absolute; top:16px; left:20px; background-color:#ffffff; color:#1e3a8a; font-weight:bold; font-size:11px; padding:6px 14px; border:2px solid #facc15; border-radius:16px;" dir="ltr">
      REPORT PERIOD<br><span style="color:#475569; font-size:10px;">\${start}\${start !== end ? ' &rarr; ' + end : ''}</span>
    </div>
    \${window.appSettings?.logo ? \`<img src="\${window.appSettings.logo}" style="height:70px; position:absolute; right:24px; top:16px; filter: drop-shadow(0 0 6px rgba(255,255,255,0.4));">\` : ''}
    <div style="font-size:24px; font-weight:900; color:#ffffff; letter-spacing:1px; margin-bottom:8px; text-shadow:0 2px 4px rgba(0,0,0,0.3);">\${window.appSettings?.companyName || ''}\${window.appSettings?.branchName ? ' — ' + window.appSettings.branchName : ''}</div>
    <div style="font-size:14px; color:#93c5fd; letter-spacing:2px;">◈ \${t('vault_report') || 'التقرير المالي التفصيلي'} ◈</div>
  </div>

  \${daysHtml}

  <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:24px;">
    <div style="text-align:center; margin-bottom:20px;">
      <span style="font-size:16px; font-weight:bold; color:#1e3a8a; background:#e0e7ff; padding:8px 24px; border-radius:24px; border:1px solid #c7d2fe;">📊 \${t('grand_total_period') || 'الملخص المالي الإجمالي للفترة'}</span>
    </div>
    <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:12px;">
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11px; color:#166534; font-weight:bold; margin-bottom:8px;">\${t('total_sales') || 'إجمالي المبيعات'}</div>
        <div style="font-size:18px; font-weight:900; color:#15803d; direction:ltr;">\${_gCur}\${(grandTotalCash + grandTotalOnline).toLocaleString('en-US')}</div>
      </div>
      <div style="background:#fef2f2; border:1px solid #fecaca; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11px; color:#991b1b; font-weight:bold; margin-bottom:8px;">\${t('total_expenses') || 'إجمالي المشتريات'}</div>
        <div style="font-size:16px; font-weight:bold; color:#dc2626; direction:ltr;">\${_gCur}\${grandTotalExpenses.toLocaleString('en-US')}</div>
      </div>
      <div style="background:#fef2f2; border:1px solid #fecaca; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11px; color:#991b1b; font-weight:bold; margin-bottom:8px;">\${t('total_emp_advances') || 'سلف الموظفين'}</div>
        <div style="font-size:16px; font-weight:bold; color:#f87171; direction:ltr;">\${_gCur}\${grandTotalEmpTxs.toLocaleString('en-US')}</div>
      </div>
      <div style="background:#fef2f2; border:1px solid #fecaca; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11px; color:#991b1b; font-weight:bold; margin-bottom:8px;">\${t('total_sup_payments') || 'مدفوعات الموردين'}</div>
        <div style="font-size:16px; font-weight:bold; color:#a855f7; direction:ltr;">\${_gCur}\${grandTotalSupTxs.toLocaleString('en-US')}</div>
      </div>
      <div style="background:\${totalNet < 0 ? '#fef2f2' : '#f0fdf4'}; border:2px solid \${totalNet < 0 ? '#fca5a5' : '#86efac'}; padding:16px 10px; border-radius:10px; text-align:center; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="font-size:12px; color:\${totalNet < 0 ? '#991b1b' : '#166534'}; font-weight:bold; margin-bottom:8px;">\${t('net_profit') || 'صافي الربح'}</div>
        <div style="font-size:20px; font-weight:900; color:\${totalNet < 0 ? '#dc2626' : '#15803d'}; direction:ltr;">\${_gCur}\${totalNet.toLocaleString('en-US')}</div>
      </div>
    </div>
    
    <div style="display:flex; justify-content:space-between; margin-top:40px; padding:0 40px;">
      <div style="text-align:center; width:200px;">
        <div style="font-weight:bold; color:#1e3a8a; margin-bottom:40px;">\${t('accountant_signature') || 'توقيع المحاسب'}</div>
        <div style="border-bottom:1px solid #cbd5e1;"></div>
      </div>
      <div style="text-align:center; width:200px;">
        <div style="font-weight:bold; color:#1e3a8a; margin-bottom:40px;">\${t('manager_signature') || 'توقيع المدير'}</div>
        <div style="border-bottom:1px solid #cbd5e1;"></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>\`;

  window.api.send('print-html', html);
}`;

const finalCode = code.slice(0, startIdx) + newFunctionCode + code.slice(endIdx + 1);
fs.writeFileSync(filePath, finalCode);
console.log('printVaultDetailed has been replaced successfully!');
