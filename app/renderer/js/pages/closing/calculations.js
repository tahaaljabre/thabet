async function calculateClosingFigures() {
  const btn = document.getElementById('btn-calc-closing');
  const originalHtml = btn ? btn.innerHTML : t('calculate_operating_figures');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>${t('calculating_figures')}</span>`;
    btn.style.opacity = '0.7';
  }

  try {
    if (!window.currentYearId || typeof window.currentYearId !== 'number') {
      if (window.api && typeof window.api.getSessionContext === 'function') {
        try {
          const session = await window.api.getSessionContext();
          if (session && session.yearId) {
            window.currentYearId = Number(session.yearId);
            window.currentYearName = session.yearName || '';
          }
        } catch (_) {}
      }
    }
    if (!window.financialYears || window.financialYears.length === 0) {
      if (window.api && typeof window.api.getFinancialYears === 'function') {
        try {
          window.financialYears = await window.api.getFinancialYears();
        } catch (_) {}
      }
    }
    const effectiveYearId = window.currentYearId || (window.financialYears && window.financialYears[0]?.YearID) || 1;
    window.currentYearId = effectiveYearId;

    const activeYearObj = (window.financialYears || []).find(y => y.YearID === effectiveYearId);
    const isYearClosedVal = activeYearObj ? activeYearObj.IsClosed === 1 : false;

    const figures = await window.api.calculateClosingFigures(effectiveYearId);
    const formatMoney = value => (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const employeeReceivables = Number(figures.employeeReceivables ?? figures.totalEmployeeReceivables ?? 0) || 0;
    const accountingNetProfit = Number(figures.accountingNetProfit ?? (Number(figures.netProfit || 0) + employeeReceivables)) || 0;
    document.getElementById('closing-sales').value = (window.appSettings?.currency || '') + formatMoney(figures.totalSales);
    const totalExps = figures.totalPurchases + figures.employeeExpenses + figures.operatingExpenses + figures.appCommissions + employeeReceivables;
    document.getElementById('closing-total-expenses').value = (window.appSettings?.currency || '') + formatMoney(totalExps);
    document.getElementById('closing-purchases-detail').innerText = (window.appSettings?.currency || '') + formatMoney(figures.totalPurchases);
    document.getElementById('closing-employees-detail').innerText = (window.appSettings?.currency || '') + formatMoney(figures.employeeExpenses);
    document.getElementById('closing-operating-detail').innerText = (window.appSettings?.currency || '') + formatMoney(figures.operatingExpenses);
    const commissionsDetail = document.getElementById('closing-commissions-detail');
    if (commissionsDetail) commissionsDetail.innerText = (window.appSettings?.currency || '') + formatMoney(figures.appCommissions);
    const accountingProfitEl = document.getElementById('closing-accounting-netprofit');
    if (accountingProfitEl) {
      accountingProfitEl.value = (window.appSettings?.currency || '') + formatMoney(accountingNetProfit);
      accountingProfitEl.setAttribute('data-raw', accountingNetProfit);
    }
    const employeeReceivablesEl = document.getElementById('closing-employee-receivables');
    if (employeeReceivablesEl) {
      employeeReceivablesEl.value = (window.appSettings?.currency || '') + formatMoney(employeeReceivables);
      employeeReceivablesEl.setAttribute('data-raw', employeeReceivables);
    }
    document.getElementById('closing-netprofit').value = figures.netProfit; // store raw number
    document.getElementById('closing-zakat').value = figures.zakat;
    document.getElementById('closing-distributable').value = figures.distributable;
    
    partnerWithdrawalsMap = {};
    if (figures.withdrawals) {
      figures.withdrawals.forEach(w => {
        partnerWithdrawalsMap[w.partner_name] = w.total;
      });
    }

    document.getElementById('closing-netprofit').type = 'text';
    document.getElementById('closing-netprofit').value = (window.appSettings?.currency || '') + formatMoney(figures.netProfit);
    document.getElementById('closing-zakat').type = 'text';
    document.getElementById('closing-zakat').value = (window.appSettings?.currency || '') + formatMoney(figures.zakat);
    document.getElementById('closing-distributable').type = 'text';
    document.getElementById('closing-distributable').value = (window.appSettings?.currency || '') + formatMoney(figures.distributable);
    
    document.getElementById('closing-netprofit').setAttribute('data-raw', figures.netProfit);
    document.getElementById('closing-zakat').setAttribute('data-raw', figures.zakat);
    document.getElementById('closing-distributable').setAttribute('data-raw', figures.distributable);

    const totalLiquidity = (figures.bankBalances || []).reduce((sum, account) => sum + (parseFloat(account.current_balance) || 0), 0);
    const liquidityEl = document.getElementById('closing-total-liquidity');
    if (liquidityEl) {
      liquidityEl.value = (window.appSettings?.currency || '') + totalLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2 });
      liquidityEl.setAttribute('data-raw', totalLiquidity);
    }
    const supplierDebtsEl = document.getElementById('closing-supplier-debts');
    if (supplierDebtsEl) {
      supplierDebtsEl.value = (window.appSettings?.currency || '') + formatMoney(figures.supplierDebts);
      supplierDebtsEl.setAttribute('data-raw', Number(figures.supplierDebts) || 0);
    }

    const commissionBreakdown = figures.commissionBreakdown || {};
    const setClosingCommission = (key, prefix) => {
      const item = commissionBreakdown[key] || {};
      const amountEl = document.getElementById(`${prefix}-amount`);
      const rateEl = document.getElementById(`${prefix}-rate`);
      if (amountEl) amountEl.value = (window.appSettings?.currency || '') + formatMoney(item.amount);
      if (rateEl) rateEl.textContent = `${(Number(item.rate) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    };
    setClosingCommission('grab', 'closing-grab-commission');
    setClosingCommission('lineman', 'closing-lineman-commission');
    const commissionsTotalCard = document.getElementById('closing-commissions-total-card');
    if (commissionsTotalCard) commissionsTotalCard.value = (window.appSettings?.currency || '') + formatMoney(figures.appCommissions);
    
    if (isYearClosedVal) {
      const savedPartners = await window.api.getClosingPartners(window.currentYearId);
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
            <div style="font-size:18px; font-weight:bold; color:${color};" dir="ltr">${(window.appSettings?.currency || '')} ${bal.toLocaleString('en-US', {maximumFractionDigits:2})}</div>
          </div>
        `;
      });
      if (html === '') html = `<div style="color:var(--muted);">${t('no_bank_accounts')}</div>`;
      banksContainer.innerHTML = html;
    }

    renderPartners();

    if (btn) {
      btn.innerHTML = `<i class="fas fa-check-circle"></i> <span>${t('figures_updated_success')}</span>`;
      btn.style.backgroundColor = '#10b981'; // Success green
      btn.style.opacity = '1';
      
      // Flash effect on the result fields to draw attention
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
    alert(t('err_prefix') + err.message);
  }
}
