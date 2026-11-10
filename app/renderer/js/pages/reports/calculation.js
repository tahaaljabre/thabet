import { fetchClosingFigures, fetchClosingPartners } from './api.js';
import { showToast } from '../../core/notifications.js';

export async function runClosingCalculation({ currentYearId, isYearClosed, t, setPartnerWithdrawals, setPartners, renderPartners }) {
  const btn = document.getElementById('btn-calc-closing');
  const originalHtml = btn ? btn.innerHTML : '🔄 حساب الأرقام التشغيلية';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ جاري حساب التقارير...</span>';
    btn.style.opacity = '0.7';
  }

  try {
    const figures = await fetchClosingFigures(currentYearId);
    const employeeReceivables = Number(figures.employeeReceivables ?? figures.totalEmployeeReceivables ?? 0) || 0;
    const accountingNetProfit = Number(figures.accountingNetProfit ?? (Number(figures.netProfit || 0) + employeeReceivables)) || 0;

    document.getElementById('closing-sales').value = (window.appSettings?.currency || '') + figures.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 });
    const totalExps = figures.totalPurchases + figures.employeeExpenses + figures.operatingExpenses + employeeReceivables;
    document.getElementById('closing-total-expenses').value = (window.appSettings?.currency || '') + totalExps.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('closing-purchases-detail').innerText = (window.appSettings?.currency || '') + figures.totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('closing-employees-detail').innerText = (window.appSettings?.currency || '') + figures.employeeExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('closing-operating-detail').innerText = (window.appSettings?.currency || '') + figures.operatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 });
    const employeeReceivablesField = document.getElementById('closing-employee-receivables');
    if (employeeReceivablesField) {
      employeeReceivablesField.value = (window.appSettings?.currency || '') + employeeReceivables.toLocaleString('en-US', { minimumFractionDigits: 2 });
    }
    const accountingProfitField = document.getElementById('closing-accounting-netprofit');
    if (accountingProfitField) {
      accountingProfitField.value = (window.appSettings?.currency || '') + accountingNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2 });
    }
    
    // Store raw numbers in attributes
    const netProfitField = document.getElementById('closing-netprofit');
    const zakatField = document.getElementById('closing-zakat');
    const distributableField = document.getElementById('closing-distributable');

    netProfitField.setAttribute('data-raw', figures.netProfit);
    netProfitField.value = (window.appSettings?.currency || '') + figures.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 });

    zakatField.setAttribute('data-raw', figures.zakat);
    zakatField.value = (window.appSettings?.currency || '') + figures.zakat.toLocaleString('en-US', { minimumFractionDigits: 2 });

    distributableField.setAttribute('data-raw', figures.distributable);
    distributableField.value = (window.appSettings?.currency || '') + figures.distributable.toLocaleString('en-US', { minimumFractionDigits: 2 });

    // Populate withdrawals
    const partnerWithdrawalsMap = {};
    if (figures.withdrawals) {
      figures.withdrawals.forEach(w => {
        partnerWithdrawalsMap[w.partner_name] = w.total;
      });
    }
    setPartnerWithdrawals(partnerWithdrawalsMap);

    // If year is closed, fetch the saved partners at time of closing
    if (isYearClosed) {
      const savedPartners = await fetchClosingPartners(currentYearId);
      setPartners(savedPartners || []);
    }

    renderPartners();

    if (btn) {
      btn.innerHTML = '<span>✅ تم التحديث!</span>';
      btn.style.backgroundColor = 'var(--green2)';
      btn.style.opacity = '1';
      
      // Flash fields
      const fields = ['closing-sales', 'closing-total-expenses', 'closing-netprofit'];
      fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.style.transition = 'background-color 0.5s ease';
          el.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
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
    showToast(t('err_prefix') + err.message, 'error');
  }
}
