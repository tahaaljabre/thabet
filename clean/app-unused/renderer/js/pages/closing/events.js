import * as ipc from '../../core/ipc.js';
import { showToast } from '../../core/notifications.js';
import { getState } from '../../core/state.js';

let partnersList = [];
let partnerWithdrawalsMap = {};
let hasNegativeBankBalance = false;

export function resetState() {
  partnersList = [];
  partnerWithdrawalsMap = {};
}

export async function calculateClosingFigures() {
  const btn = document.getElementById('btn-calc-closing');
  const originalHtml = btn ? btn.innerHTML : '🔄 حساب الأرقام التشغيلية';
  
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ جاري الحساب...';
    btn.style.opacity = '0.7';
  }

  try {
    const yearId = window.currentYearId;
    const yearName = window.currentYearName;
    
    // Check if closed
    const years = await ipc.getFinancialYears();
    const activeYearObj = years.find(y => (y.YearID || y.year_id || y.Id || y.id) == yearId);
    const isYearClosedVal = activeYearObj ? (activeYearObj.IsClosed === 1 || activeYearObj.is_closed === 1) : false;

    // Call IPC to get closing figures
    // Note: The original legacy app used api.calculateClosingFigures
    // Since we are migrating, we use ipc.call
    const figures = await ipc.call('calculateClosingFigures', yearId);
    
    document.getElementById('closing-sales').value = (window.appSettings?.currency || '฿') + figures.totalSales.toLocaleString('en-US');
    const totalExps = figures.totalPurchases + figures.employeeExpenses + figures.operatingExpenses;
    document.getElementById('closing-total-expenses').value = (window.appSettings?.currency || '฿') + totalExps.toLocaleString('en-US');
    document.getElementById('closing-purchases-detail').innerText = (window.appSettings?.currency || '฿') + figures.totalPurchases.toLocaleString('en-US');
    document.getElementById('closing-employees-detail').innerText = (window.appSettings?.currency || '฿') + figures.employeeExpenses.toLocaleString('en-US');
    document.getElementById('closing-operating-detail').innerText = (window.appSettings?.currency || '฿') + figures.operatingExpenses.toLocaleString('en-US');
    
    partnerWithdrawalsMap = {};
    if (figures.withdrawals) {
      figures.withdrawals.forEach(w => {
        partnerWithdrawalsMap[w.partner_name] = w.total;
      });
    }

    document.getElementById('closing-netprofit').value = (window.appSettings?.currency || '฿') + figures.netProfit.toLocaleString('en-US');
    document.getElementById('closing-zakat').value = (window.appSettings?.currency || '฿') + figures.zakat.toLocaleString('en-US');
    document.getElementById('closing-distributable').value = (window.appSettings?.currency || '฿') + figures.distributable.toLocaleString('en-US');
    
    document.getElementById('closing-netprofit').setAttribute('data-raw', figures.netProfit);
    document.getElementById('closing-zakat').setAttribute('data-raw', figures.zakat);
    document.getElementById('closing-distributable').setAttribute('data-raw', figures.distributable);
    
    if (isYearClosedVal) {
      const savedPartners = await ipc.call('getClosingPartners', yearId);
      partnersList = savedPartners || [];
    }
    
    // Render Bank Balances
    hasNegativeBankBalance = false;
    const banksContainer = document.getElementById('closing-banks-container');
    if (banksContainer && figures.bankBalances) {
      let html = '';
      figures.bankBalances.forEach(b => {
        const bal = parseFloat(b.current_balance) || 0;
        if (bal < 0) hasNegativeBankBalance = true;
        const color = bal < 0 ? 'var(--red)' : (bal > 0 ? 'var(--green2)' : 'var(--text-color)');
        html += `
          <div class="closing-card" style="padding: 10px;">
            <div style="font-size:12px; color:var(--muted); margin-bottom:5px; font-weight:bold;">${b.bank_name}</div>
            <div style="font-size:18px; font-weight:bold; color:${color};" dir="ltr">${(window.appSettings?.currency || '฿')} ${bal.toLocaleString('en-US', {maximumFractionDigits:2})}</div>
          </div>
        `;
      });
      if (html === '') html = '<div style="color:var(--muted);">لا توجد حسابات بنكية.</div>';
      banksContainer.innerHTML = html;
    }
    
    renderPartners();

    if (btn) {
      btn.innerHTML = '✅ تمت الحسبة!';
      btn.style.backgroundColor = '#10b981';
      btn.style.opacity = '1';
      
      const fields = ['closing-sales', 'closing-total-expenses', 'closing-netprofit'];
      fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.style.transition = 'background-color 0.5s ease';
          el.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
          setTimeout(() => { el.style.backgroundColor = ''; }, 800);
        }
      });

      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.style.backgroundColor = '';
        btn.disabled = false;
      }, 2000);
    }

  } catch (err) {
    if (btn) {
      btn.innerHTML = originalHtml;
      btn.style.opacity = '1';
      btn.disabled = false;
    }
    console.error(err);
    showToast('خطأ: ' + err.message, 'error');
  }
}

export function renderPartners() {
  const tbody = document.getElementById('partners-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  let totalPct = 0;
  
  const rawDistributableAttr = document.getElementById('closing-distributable')?.getAttribute('data-raw');
  const rawDistributable = parseFloat(rawDistributableAttr) || 0;
  
  partnersList.forEach((p, index) => {
    totalPct += p.percentage;
    const grossShare = rawDistributable * (p.percentage / 100);
    const withdrawals = partnerWithdrawalsMap[p.name] || 0;
    const netShare = grossShare - withdrawals;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.percentage}%</td>
      <td style="color:var(--primary); font-weight:bold;">${window.appSettings?.currency || '฿'}${grossShare.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
      <td style="color:var(--red);">${window.appSettings?.currency || '฿'}${withdrawals.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
      <td style="color:var(--green2); font-weight:bold; font-size:16px;">${window.appSettings?.currency || '฿'}${netShare.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
      <td>
        <button class="btn-cancel" style="padding: 4px 8px; font-size: 12px; margin:0;" onclick="window.removePartner(${index})">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  const totalDiv = document.getElementById('distribution-total-pct');
  if (totalDiv) {
    totalDiv.innerText = `إجمالي النسب الموزعة: ${totalPct}%`;
    totalDiv.style.color = totalPct === 100 ? 'var(--green2)' : 'var(--red)';
  }
}

// Global hook for inline onclick from the string HTML above
window.removePartner = function(index) {
  partnersList.splice(index, 1);
  renderPartners();
};

export function addPartner() {
  const nameInput = document.getElementById('partner-name');
  const pctInput = document.getElementById('partner-percentage');
  const name = nameInput.value.trim();
  const pct = parseFloat(pctInput.value);
  
  if (!name || isNaN(pct) || pct <= 0) {
    return showToast('الرجاء إدخال اسم الشريك ونسبة صحيحة', 'error');
  }
  
  const currentTotal = partnersList.reduce((sum, p) => sum + p.percentage, 0);
  if (currentTotal + pct > 100) {
    return showToast('إجمالي النسب يتجاوز 100%!', 'error');
  }
  
  partnersList.push({ name, percentage: pct });
  nameInput.value = '';
  pctInput.value = '';
  renderPartners();
}

export async function executeYearEndClosing() {
  const rawProfit = parseFloat(document.getElementById('closing-netprofit').getAttribute('data-raw')) || 0;
  const rawZakat = parseFloat(document.getElementById('closing-zakat').getAttribute('data-raw')) || 0;
  const rawDistributable = parseFloat(document.getElementById('closing-distributable').getAttribute('data-raw')) || 0;
  
  if (rawProfit <= 0) return showToast('لا توجد أرباح قابلة للإقفال', 'error');
  if (hasNegativeBankBalance) return showToast('لا يمكن الإقفال لوجود رصيد بنكي أو كاش بالسالب. يرجى مراجعة الحسابات.', 'error');
  
  const totalPct = partnersList.reduce((sum, p) => sum + p.percentage, 0);
  if (totalPct !== 100) return showToast('يجب أن يكون إجمالي نسب الشركاء 100%', 'error');
  
  if (confirm('هل أنت متأكد من تنفيذ الإقفال؟ هذه العملية لا رجعة فيها وسيتم تجميد حسابات السنة.')) {
    try {
      const yearId = window.currentYearId;
      const todayStr = new Date().toISOString().split('T')[0];
      const currentUser = window.currentUser ? window.currentUser.username : 'النظام';
      const nextYearName = (parseInt(window.currentYearName) + 1).toString();

      // 1. Create Zakat General Cash Payment Voucher
      await ipc.call('saveGeneralVoucher', {
        voucher_date: todayStr,
        amount: rawZakat,
        category: 'Zakat',
        description: 'زكاة مالية بنسبة 2.5%',
        created_by: currentUser,
        year_id: yearId
      });
      
      // 2. Create Profit Distribution Vouchers for Partners
      for (const p of partnersList) {
        const grossShare = rawDistributable * (p.percentage / 100);
        const withdrawals = partnerWithdrawalsMap[p.name] || 0;
        const netShare = grossShare - withdrawals;
        
        await ipc.call('saveGeneralVoucher', {
          voucher_date: todayStr,
          amount: netShare,
          category: 'Profit Distribution',
          description: `توزيع أرباح الشريك ${p.name} (الإجمالي ${window.appSettings?.currency || '฿'}${grossShare.toLocaleString('en-US')} مسحوبات ${window.appSettings?.currency || '฿'}${withdrawals.toLocaleString('en-US')})`,
          created_by: currentUser,
          year_id: yearId,
          partner_name: p.name
        });
      }
      
      // 3. Save partners list to database for historical retrieval
      await ipc.call('saveClosingPartners', yearId, partnersList);
      
      // 4. Lock financial year and create next year
      const closeRes = await ipc.call('closeFinancialYear', yearId, nextYearName);
      if (closeRes.success) {
        showToast('تم إقفال السنة المالية بنجاح. الرجاء إعادة تشغيل التطبيق.', 'success');
        setTimeout(() => { window.location.reload(); }, 2000);
      }

    } catch (err) {
      console.error(err);
      showToast('خطأ أثناء الإقفال: ' + err.message, 'error');
    }
  }
}

export async function printClosingReportPreview() {
  const content = document.querySelector('.cashier-card').innerHTML;
  await ipc.call('generatePDF', {
    html: `<div style="font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px;">${content}</div>`,
    filename: 'Closing_Report.pdf',
    print: true
  });
}
