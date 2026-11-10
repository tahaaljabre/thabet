import {
  fetchArchivedEmployees,
  fetchArchivedSuppliers,
  fetchArchivedEmployeeTxs,
  fetchArchivedSupplierTxs,
  restoreArchivedItem,
  fetchEmployeeTransactions,
  fetchEmployeeSalaryHistory,
  fetchSupplierTransactions,
  generatePDF,
  fetchSettings
} from './api.js';

import { showToast } from '../../core/notifications.js';
import { showModal, showConfirm } from '../../components/modal.js';
import { createElement, escapeHtml, clearElement } from '../../core/dom.js';
import { getState } from '../../core/state.js';

// Local state
let archivedEmployeesList = [];
let archivedSuppliersList = [];
let appSettings = {};
let currentYearId = 1;
let currentActiveTab = 'emp';

// Translation helper
const t = (key) => {
  if (typeof window.t === 'function') return window.t(key);
  return key;
};

// Date formatter helper
function formatDateString(dateStr) {
  if (!dateStr) return '';
  return dateStr;
}

export async function initEvents() {
  currentYearId = getState('currentFiscalYear') || 1;

  // Load settings
  try {
    appSettings = await fetchSettings();
  } catch (err) {
    console.error('Failed to load settings in archive:', err);
  }

  // Bind inner tab button listeners
  const tabs = ['emp', 'sup', 'emptx', 'suptx'];
  tabs.forEach(tab => {
    const btn = document.getElementById(`archive-tab-btn-${tab}`);
    if (btn) {
      btn.addEventListener('click', () => handleSwitchArchiveTab(tab));
    }
  });

  // Switch to default tab
  await handleSwitchArchiveTab('emp');
}

async function handleSwitchArchiveTab(tabName) {
  currentActiveTab = tabName;

  // Toggle active tab buttons
  const tabs = ['emp', 'sup', 'emptx', 'suptx'];
  tabs.forEach(t => {
    const btn = document.getElementById(`archive-tab-btn-${t}`);
    const panel = document.getElementById(`archive-panel-${t}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (panel) panel.style.display = t === tabName ? 'block' : 'none';
  });

  // Load tab data
  if (tabName === 'emp') await loadArchivedEmployees();
  else if (tabName === 'sup') await loadArchivedSuppliers();
  else if (tabName === 'emptx') await loadArchivedEmployeeTxs();
  else if (tabName === 'suptx') await loadArchivedSupplierTxs();
}

async function loadArchivedEmployees() {
  try {
    const list = await fetchArchivedEmployees();
    archivedEmployeesList = list;
    const tbody = document.getElementById('archive-emp-tbody');
    if (!tbody) return;
    clearElement(tbody);

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--muted);">لا توجد موظفين مؤرشفين</td></tr>';
      return;
    }

    list.forEach(emp => {
      const tr = createElement('tr');
      tr.appendChild(createElement('td', { textContent: emp.name }));
      tr.appendChild(createElement('td', { textContent: emp.phone || '-' }));
      
      const salaryTd = createElement('td');
      salaryTd.innerText = (window.appSettings?.currency || '฿') + (emp.salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      tr.appendChild(salaryTd);

      const actionTd = createElement('td', { class: 'no-print', style: 'display:flex; gap:5px; justify-content:center;' });
      
      const restoreBtn = createElement('button', { class: 'btn-primary', style: 'padding: 4px 8px; font-size: 11px;', textContent: 'استعادة' });
      restoreBtn.addEventListener('click', () => handleRestoreItem('employee', emp.id));

      const printBtn = createElement('button', { class: 'btn-secondary', style: 'padding: 4px 8px; font-size: 11px;', textContent: 'طباعة كشف' });
      printBtn.addEventListener('click', () => handlePrintArchivedEmployeeStatement(emp.id));

      actionTd.appendChild(restoreBtn);
      actionTd.appendChild(printBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء تحميل الموظفين مؤرشفين', 'error');
  }
}

async function loadArchivedSuppliers() {
  try {
    const list = await fetchArchivedSuppliers();
    archivedSuppliersList = list;
    const tbody = document.getElementById('archive-sup-tbody');
    if (!tbody) return;
    clearElement(tbody);

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--muted);">لا توجد موردين مؤرشفين</td></tr>';
      return;
    }

    list.forEach(sup => {
      const tr = createElement('tr');
      tr.appendChild(createElement('td', { textContent: sup.name }));
      tr.appendChild(createElement('td', { textContent: sup.phone || '-' }));
      tr.appendChild(createElement('td', { textContent: sup.address || '-' }));

      const actionTd = createElement('td', { class: 'no-print', style: 'display:flex; gap:5px; justify-content:center;' });
      
      const restoreBtn = createElement('button', { class: 'btn-primary', style: 'padding: 4px 8px; font-size: 11px;', textContent: 'استعادة' });
      restoreBtn.addEventListener('click', () => handleRestoreItem('supplier', sup.id));

      const printBtn = createElement('button', { class: 'btn-secondary', style: 'padding: 4px 8px; font-size: 11px;', textContent: 'طباعة كشف' });
      printBtn.addEventListener('click', () => handlePrintArchivedSupplierStatement(sup.id));

      actionTd.appendChild(restoreBtn);
      actionTd.appendChild(printBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء تحميل الموردين مؤرشفين', 'error');
  }
}

async function loadArchivedEmployeeTxs() {
  try {
    const list = await fetchArchivedEmployeeTxs();
    const tbody = document.getElementById('archive-emptx-tbody');
    if (!tbody) return;
    clearElement(tbody);

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted);">لا توجد حركات موظفين مؤرشفة</td></tr>';
      return;
    }

    list.forEach(tx => {
      const tr = createElement('tr');
      tr.appendChild(createElement('td', { textContent: tx.emp_name || '-' }));
      tr.appendChild(createElement('td', { textContent: tx.tx_date }));

      const amountTd = createElement('td');
      amountTd.innerText = (window.appSettings?.currency || '฿') + (tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      tr.appendChild(amountTd);

      tr.appendChild(createElement('td', { textContent: tx.notes || '-' }));

      const actionTd = createElement('td', { class: 'no-print', style: 'text-align:center;' });
      const restoreBtn = createElement('button', { class: 'btn-primary', style: 'padding: 4px 8px; font-size: 11px;', textContent: 'استعادة' });
      restoreBtn.addEventListener('click', () => handleRestoreItem('employee_tx', tx.id));
      
      actionTd.appendChild(restoreBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء تحميل حركات الموظفين المؤرشفة', 'error');
  }
}

async function loadArchivedSupplierTxs() {
  try {
    const list = await fetchArchivedSupplierTxs();
    const tbody = document.getElementById('archive-suptx-tbody');
    if (!tbody) return;
    clearElement(tbody);

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--muted);">لا توجد حركات موردين مؤرشفة</td></tr>';
      return;
    }

    list.forEach(tx => {
      const tr = createElement('tr');
      tr.appendChild(createElement('td', { textContent: tx.sup_name || '-' }));
      tr.appendChild(createElement('td', { textContent: tx.tx_date }));

      const typeText = tx.tx_type === 'له' ? 'له (دائن)' : 'عليه (مدين)';
      const typeTd = createElement('td', { textContent: typeText });
      if (tx.tx_type === 'له') {
        typeTd.style.color = 'var(--red)';
      } else {
        typeTd.style.color = 'var(--green2)';
      }
      tr.appendChild(typeTd);

      const amountTd = createElement('td');
      amountTd.innerText = (window.appSettings?.currency || '฿') + (tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      tr.appendChild(amountTd);

      tr.appendChild(createElement('td', { textContent: tx.notes || '-' }));

      const actionTd = createElement('td', { class: 'no-print', style: 'text-align:center;' });
      const restoreBtn = createElement('button', { class: 'btn-primary', style: 'padding: 4px 8px; font-size: 11px;', textContent: 'استعادة' });
      restoreBtn.addEventListener('click', () => handleRestoreItem('supplier_tx', tx.id));
      
      actionTd.appendChild(restoreBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء تحميل حركات الموردين المؤرشفة', 'error');
  }
}

async function handleRestoreItem(type, id) {
  const confirmed = await showConfirm('تأكيد الاستعادة', 'هل أنت متأكد من استعادة هذا العنصر إلى القوائم والعمليات النشطة؟');
  if (confirmed) {
    try {
      const res = await restoreArchivedItem(type, id);
      if (res.success) {
        showToast('تم استعادة العنصر بنجاح', 'success');
        // Refresh the current panel
        await handleSwitchArchiveTab(currentActiveTab);
      } else {
        showToast('فشل الاستعادة: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء استعادة العنصر', 'error');
    }
  }
}

async function handlePrintArchivedEmployeeStatement(id) {
  const emp = archivedEmployeesList.find(e => e.id == id);
  if (!emp) return;

  try {
    const txs = await fetchEmployeeTransactions(id);
    const history = await fetchEmployeeSalaryHistory(id);
    
    const cName = appSettings.companyName || 'اسم الشركة';
    const cAddress = appSettings.address || '';
    const cPhone = appSettings.phone || '';
    const cTax = appSettings.taxNumber || '';
    const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';

    const dateRangeText = `${t('period_from') || 'الفترة:'} ${t('all_transactions') || 'كافة المعاملات المالية'} (مؤرشف)`;

    // Generate virtual salary rows up to the last transaction date
    let virtualTxs = [];
    if (emp.monthly_accrual_start_date && txs.length > 0) {
      const SALARY_ACCRUAL_DAY = 28;
      const toLocalDateString = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      let current = new Date(emp.monthly_accrual_start_date);
      current.setDate(1);
      
      let maxDateStr = txs.reduce((max, tx) => tx.tx_date > max ? tx.tx_date : max, txs[0].tx_date);
      let limitDate = new Date(maxDateStr);
      if (isNaN(limitDate.getTime())) limitDate = new Date();
      
      while (true) {
        let monthStr = current.toISOString().slice(0, 7);
        let targetMonthStr = limitDate.toISOString().slice(0, 7);
        if (monthStr > targetMonthStr) break;
        
        let activeSalary = 0;
        let monthFirstDay = monthStr + "-01";
        let validHistory = history.filter(h => h.effective_date <= monthFirstDay).sort((a,b) => a.effective_date.localeCompare(b.effective_date));
        if (validHistory.length > 0) {
          activeSalary = validHistory[validHistory.length - 1].salary;
        }

        const accrualDate = new Date(current.getFullYear(), current.getMonth(), SALARY_ACCRUAL_DAY);
        const accrualDateStr = toLocalDateString(accrualDate);
        if (accrualDateStr > maxDateStr) break;

        virtualTxs.push({
          is_virtual: true,
          tx_date: accrualDateStr,
          amount: 0,
          deductions: 0,
          allowances: activeSalary,
          notes: `استحقاق راتب شهر ${monthStr}`,
          attendance_days: 0,
          absence_days: 0,
          is_archived: 1
        });
        
        current.setMonth(current.getMonth() + 1);
      }
    }

    let html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>كشف حساب موظف مؤرشف</title>
        <style>
          body { font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; text-align: right; margin: 20px; color: #1e293b; }
          .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #7A1A22; padding-bottom: 10px; margin-bottom: 15px;}
          .header-text h1 { margin: 0; font-size: 22px; color: #0f172a; }
          .header-text p { margin: 3px 0; color: #475569; font-size: 12px; }
          h2 { text-align: center; margin-top: 5px; color: #7A1A22; font-size: 18px; text-decoration: underline; margin-bottom: 15px; }
          
          .emp-info { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
          .emp-info p { margin: 3px 0; font-size: 13px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; }
          th { background: #7A1A22; color: #fff; font-weight: bold; }
          tr:nth-child(even) { background-color: #f1f5f9; }
          
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px; }
          .sum-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center; }
          .sum-box h3 { margin: 0 0 5px 0; font-size: 14px; color: #475569; }
          .sum-box.final { background: #7A1A22; color: #fff; border: none; }
          .sum-box.final h3 { color: #ffffff !important; }
          
          .text-red { color: #dc2626; }
          .text-green { color: #16a34a; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="header-text" style="text-align: right;">
            <h1 style="margin:0; font-size: 22px; color: #7A1A22;">${escapeHtml(cName)}</h1>
            <p style="margin:3px 0; font-size: 12px;">📍 ${escapeHtml(cAddress)} ${cPhone ? ' | 📞 ' + escapeHtml(cPhone) : ''}</p>
            ${cTax ? `<p style="margin:3px 0; font-weight:bold; font-size: 13px;">الرقم الضريبي: ${escapeHtml(cTax)}</p>` : ''}
          </div>
          <div style="text-align: left;">
            ${logoHtml}
          </div>
        </div>
        
        <h2>كشف حساب موظف (مؤرشف)</h2>
        
        <div class="emp-info">
          <div>
            <p><strong>اسم الموظف:</strong> ${escapeHtml(emp.name)}</p>
            <p><strong>الهاتف:</strong> ${escapeHtml(emp.phone || 'غير مسجل')}</p>
            <p style="color:#7A1A22; font-weight:bold;">${dateRangeText}</p>
          </div>
          <div>
            <p><strong>الرصيد المبدئي:</strong> ${window.appSettings?.currency || '฿'}${(emp.salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th style="width: 40%;">التفاصيل</th>
              <th>مدين (مسحوب/خصم)</th>
              <th>دائن (مستحقات/بدل)</th>
              <th>الرصيد المتراكم</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    const ledgerTxs = [...txs, ...virtualTxs].sort((a, b) => {
      if (a.tx_date === b.tx_date) {
        if (a.is_virtual && !b.is_virtual) return 1;
        if (!a.is_virtual && b.is_virtual) return -1;
      }
      return a.tx_date.localeCompare(b.tx_date);
    });
    
    let previousBalance = emp.salary || 0;
    let balance = previousBalance;
    let totalDebit = previousBalance < 0 ? Math.abs(previousBalance) : 0;
    let totalCredit = previousBalance >= 0 ? previousBalance : 0;

    html += `
      <tr style="background-color: #e0f2fe; font-weight: bold;">
        <td>-</td>
        <td style="text-align: right;">الراتب الأساسي المستحق المبدئي</td>
        <td class="text-red">${previousBalance < 0 ? (window.appSettings?.currency || '฿') + Math.abs(previousBalance).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td class="text-green">${previousBalance >= 0 ? (window.appSettings?.currency || '฿') + previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td dir="ltr" class="${previousBalance >= 0 ? 'text-green' : 'text-red'}">${window.appSettings?.currency || '฿'}${previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;

    ledgerTxs.forEach(tx => {
      let txDebit = tx.amount + tx.deductions;
      let txCredit = tx.allowances;
      
      totalDebit += txDebit;
      totalCredit += txCredit;
      balance = balance + txCredit - txDebit;
      
      let desc = '';
      if (tx.is_virtual) {
        desc = `<strong>${tx.notes}</strong>`;
      } else {
        if (tx.amount > 0) desc += `دفعة نقدية. `;
        if (tx.deductions > 0) desc += `خصم (${window.appSettings?.currency || '฿'}${tx.deductions}). `;
        if (tx.allowances > 0) desc += `بدلات (${window.appSettings?.currency || '฿'}${tx.allowances}). `;
        if (tx.attendance_days > 0 || tx.absence_days > 0) desc += `[حضور: ${tx.attendance_days} | غياب: ${tx.absence_days}]. `;
        if (tx.notes) desc += ` <span style="color:#64748b; font-size:11px;">ملاحظة: ${escapeHtml(tx.notes)}</span>`;
        if (!desc) desc = 'حركة قيد مالية';
      }

      html += `
        <tr ${tx.is_virtual ? 'style="background-color:#f0fdf4;"' : ''}>
          <td style="white-space: nowrap;">${formatDateString(tx.tx_date)}</td>
          <td style="text-align: right; line-height: 1.2;">${desc}</td>
          <td class="text-red">${txDebit > 0 ? (window.appSettings?.currency || '฿') + txDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
          <td class="text-green">${txCredit > 0 ? (window.appSettings?.currency || '฿') + txCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
          <td dir="ltr" style="font-weight: bold;" class="${balance >= 0 ? 'text-green' : 'text-red'}">${window.appSettings?.currency || '฿'}${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });
    
    let finalStatusText = balance >= 0 ? 'المتبقي للموظف' : 'المستحق على الموظف';
    
    html += `
          </tbody>
        </table>
        
        <div class="summary-grid">
          <div class="sum-box">
            <h3>إجمالي المستحقات (دائن)</h3>
            <strong class="text-green" style="font-size:20px;">${window.appSettings?.currency || '฿'}${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div class="sum-box">
            <h3>إجمالي السحوبات والخصومات (مدين)</h3>
            <strong class="text-red" style="font-size:20px;">${window.appSettings?.currency || '฿'}${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div class="sum-box final">
            <h3>${finalStatusText}</h3>
            <strong style="font-size:22px; color: ${balance < 0 ? '#fca5a5' : '#86efac'}">${window.appSettings?.currency || '฿'}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px; color: #475569;">
          <div style="text-align: center;">توقيع الموظف<br><br>____________________</div>
          <div style="text-align: center;">توقيع المحاسب المالي<br><br>____________________</div>
        </div>

      </body>
      </html>
    `;
    
    await generatePDF(html, 'A4');
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء طباعة كشف حساب الموظف المؤرشف', 'error');
  }
}

async function handlePrintArchivedSupplierStatement(id) {
  const sup = archivedSuppliersList.find(s => s.id == id);
  if (!sup) return;

  try {
    const txs = await fetchSupplierTransactions(id);
    
    const cName = appSettings.companyName || 'اسم الشركة';
    const cPhone = appSettings.phone || 'رقم الهاتف';
    const cAddress = appSettings.address || 'العنوان';
    const cTax = appSettings.taxNumber || '';
    const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';

    const dateRangeText = `كافة المعاملات المالية (مؤرشف)`;

    let html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>كشف حساب مورد مؤرشف</title>
        <style>
          body { font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; text-align: right; margin: 20px; color: #1e293b; }
          .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #7A1A22; padding-bottom: 10px; margin-bottom: 15px;}
          .header-text h1 { margin: 0; font-size: 22px; color: #0f172a; }
          .header-text p { margin: 3px 0; color: #475569; font-size: 12px; }
          h2 { text-align: center; margin-top: 5px; color: #7A1A22; font-size: 18px; text-decoration: underline; margin-bottom: 15px; }
          
          .sup-info { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
          .sup-info p { margin: 3px 0; font-size: 13px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; }
          th { background: #7A1A22; color: #fff; font-weight: bold; }
          tr:nth-child(even) { background-color: #f1f5f9; }
          
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px; }
          .sum-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center; }
          .sum-box h3 { margin: 0 0 5px 0; font-size: 14px; color: #475569; }
          .sum-box.final { background: #fff; border: 2px solid #7A1A22; color: #7A1A22; }
          .sum-box.final h3 { color: #7A1A22 !important; }
          
          .text-red { color: #dc2626; }
          .text-green { color: #16a34a; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="header-text" style="text-align: right;">
            <h1 style="margin:0; color:#7A1A22; font-size:22px;">${escapeHtml(cName)}</h1>
            <p>📞 ${escapeHtml(cPhone)} | 📍 ${escapeHtml(cAddress)}</p>
            ${cTax ? `<p style="margin:3px 0; font-weight:bold; font-size: 13px;">الرقم الضريبي: ${escapeHtml(cTax)}</p>` : ''}
          </div>
          <div>${logoHtml}</div>
        </div>
        
        <h2>كشف حساب مورد (مؤرشف)</h2>
        
        <div class="sup-info">
          <div>
            <p><strong>المورد:</strong> ${escapeHtml(sup.name)}</p>
            <p><strong>الهاتف:</strong> ${escapeHtml(sup.phone || '-')}</p>
            <p style="color:#7A1A22; font-weight:bold;">${dateRangeText}</p>
          </div>
          <div>
            <p><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th style="width: 40%;">التفاصيل</th>
              <th>دائن (له)</th>
              <th>مدين (عليه)</th>
              <th>الرصيد المتبقي</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    const ledgerTxs = [...txs].reverse();
    let previousBalance = 0; 
    let balance = previousBalance;
    let totalLahu = previousBalance > 0 ? previousBalance : 0;
    let totalAlayhi = previousBalance < 0 ? Math.abs(previousBalance) : 0;

    html += `
      <tr style="background-color: #e0f2fe; font-weight: bold;">
        <td>-</td>
        <td style="text-align: right;">رصيد بداية المدة</td>
        <td class="text-green">${previousBalance > 0 ? (window.appSettings?.currency || '฿') + previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td class="text-red">${previousBalance < 0 ? (window.appSettings?.currency || '฿') + Math.abs(previousBalance).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
        <td dir="ltr" class="${previousBalance >= 0 ? 'text-green' : 'text-red'}">${window.appSettings?.currency || '฿'}${Math.abs(previousBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;

    ledgerTxs.forEach(tx => {
      if (tx.tx_type === 'له') {
        balance += tx.amount;
        totalLahu += tx.amount;
      } else {
        balance -= tx.amount;
        totalAlayhi += tx.amount;
      }
      
      let desc = `<span style="color:#64748b; font-size:11px;">ملاحظة: ${escapeHtml(tx.notes || '-')}</span>`;
      if (tx.tx_type === 'له') desc = `فاتورة شراء - ` + desc;
      else desc = `سند دفع - ` + desc;

      html += `
        <tr>
          <td style="white-space: nowrap;">${formatDateString(tx.tx_date)}</td>
          <td style="text-align: right; line-height: 1.2;">${desc}</td>
          <td class="text-green">${tx.tx_type === 'له' ? (window.appSettings?.currency || '฿') + tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
          <td class="text-red">${tx.tx_type === 'عليه' ? (window.appSettings?.currency || '฿') + tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
          <td dir="ltr" style="font-weight: bold;" class="${balance >= 0 ? 'text-green' : 'text-red'}">${window.appSettings?.currency || '฿'}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });
    
    let finalStatusText = balance >= 0 ? 'المتبقي للمورد' : 'المستحق على المورد';
    
    html += `
          </tbody>
        </table>
        
        <div class="summary-grid">
          <div class="sum-box">
            <h3>إجمالي الفواتير (له)</h3>
            <strong class="text-green" style="font-size:18px;">${window.appSettings?.currency || '฿'}${totalLahu.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div class="sum-box">
            <h3>إجمالي المدفوعات (عليه)</h3>
            <strong class="text-red" style="font-size:18px;">${window.appSettings?.currency || '฿'}${totalAlayhi.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div class="sum-box final">
            <h3>${finalStatusText}</h3>
            <strong class="text-red" style="font-size:20px;">${window.appSettings?.currency || '฿'}${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px; color: #475569;">
          <div style="text-align: center;">توقيع المورد<br><br>____________________</div>
          <div style="text-align: center;">توقيع المحاسب المالي<br><br>____________________</div>
        </div>
      </body>
      </html>
    `;
    
    await generatePDF(html, 'A4');
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ أثناء طباعة كشف حساب المورد المؤرشف', 'error');
  }
}
