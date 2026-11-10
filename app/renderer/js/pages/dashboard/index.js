let dashboardLoadSequence = 0;

async function loadDashboardData() {
  const loadSequence = ++dashboardLoadSequence;
  const refreshButton = document.getElementById('dashboard-refresh-button');
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = t('loading');
  }
  try {
  if (!window.api || !window.api.getDashboardStats) {
      alert(t('dashboard_api_unavailable'));
      return;
    }
  const startDate = document.getElementById('dash-start-date').value;
  const endDate = document.getElementById('dash-end-date').value;
  const activeYearId = window.currentYearId || 1;
  const res = await window.api.getDashboardStats(startDate, endDate, activeYearId, '');
  if (loadSequence !== dashboardLoadSequence) return;
  if (!res.success) {
    alert(`${t('dashboard_load_error')}: ${res.error}`);
    console.error('Error loading dashboard stats:', res.error);
    return;
  }

  const stats = res.stats;

  // 1. Update summary cards
  const salesEl = document.getElementById('dash-val-totalsales');
  if (salesEl) salesEl.textContent = (window.appSettings?.currency || '') + stats.totalSales.toLocaleString('en-US', {minimumFractionDigits: 2});
  const currency = window.appSettings?.currency || '';
  const setMoney = (id, value) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = currency + (Number(value) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  setMoney('dash-val-deficit', stats.totalFinancialDeficit);
  setMoney('dash-val-debts', stats.totalSupplierDebts);
  setMoney('dash-val-salaries', stats.totalSalaries);
  setMoney('dash-val-supplier-payments', stats.totalSupplierPayments);

  const totalAllExpenses = stats.totalCashExpenses || 0;
  const totalExpEl = document.getElementById('dash-val-total-expenses');
  if (totalExpEl) totalExpEl.textContent = (window.appSettings?.currency || '') + totalAllExpenses.toLocaleString('en-US', {minimumFractionDigits: 2});
  const cashNetFlowEl = document.getElementById('dash-val-cash-net-flow');
  if (cashNetFlowEl) {
    const cashNetFlow = Number(stats.cashNetFlow) || 0;
    cashNetFlowEl.textContent = (window.appSettings?.currency || '') + cashNetFlow.toLocaleString('en-US', { minimumFractionDigits: 2 });
    cashNetFlowEl.style.color = cashNetFlow < 0 ? '#dc2626' : '#15803d';
  }
  const totalCommissions = stats.totalAppCommissions || 0;
  const commissionsEl = document.getElementById('dash-val-app-commissions');
  if (commissionsEl) commissionsEl.textContent = (window.appSettings?.currency || '') + totalCommissions.toLocaleString('en-US', {minimumFractionDigits: 2});

  renderDashboardCharts(stats);
  await loadAccountingLedger(startDate, endDate, activeYearId);
  await loadFinancialIntegrity(activeYearId);

  } catch (error) {
    console.error('Dashboard loading failed:', error);
    if (loadSequence === dashboardLoadSequence) alert(`${t('dashboard_load_error')}: ${error.message || error}`);
  } finally {
    if (loadSequence === dashboardLoadSequence && refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = t('dashboard_refresh');
    }
  }
}

function integrityStatusKey(status) {
  return `integrity_status_${status || 'critical'}`;
}

function renderIntegrityResult(result) {
  const status = document.getElementById('integrity-latest-status');
  const findings = document.getElementById('integrity-findings');
  if (status) {
    status.textContent = t(integrityStatusKey(result.status));
    status.style.color = result.status === 'healthy' ? '#15803d' : result.status === 'warning' ? '#b45309' : '#dc2626';
  }
  if (findings) {
    findings.innerHTML = result.findings?.length
      ? `<ul>${result.findings.map(item =>
        `<li>${t(`integrity_finding_${item.code}`)}: <b>${item.count}</b></li>`
      ).join('')}</ul>`
      : `<span style="color:#15803d">${t('integrity_no_findings')}</span>`;
  }
}

async function loadFinancialIntegrity(yearId) {
  if (!window.api?.getFinancialIntegrityHistory) return;
  const history = await window.api.getFinancialIntegrityHistory(yearId);
  const body = document.getElementById('integrity-history-body');
  if (history[0]) {
    const latest = { ...history[0], findings: JSON.parse(history[0].findings_json || '[]') };
    renderIntegrityResult(latest);
  }
  if (body) {
    body.innerHTML = history.length ? history.map(row => `<tr>
      <td dir="ltr">${row.check_date}</td>
      <td>${t(integrityStatusKey(row.status))}</td>
      <td>${row.critical_count}</td>
      <td>${row.warning_count}</td>
      <td>${t(`integrity_trigger_${row.trigger_type}`)}</td>
    </tr>`).join('') : `<tr><td colspan="5">${t('integrity_no_history')}</td></tr>`;
  }
  const dateInput = document.getElementById('integrity-check-date');
  if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
  const button = document.getElementById('run-integrity-check');
  if (button && !button.dataset.bound) {
    button.dataset.bound = '1';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const result = await window.api.runFinancialIntegrityCheck(yearId, dateInput?.value);
        renderIntegrityResult(result);
        await loadFinancialIntegrity(yearId);
      } catch (error) {
        alert(`${t('integrity_run_failed')}: ${error.message || error}`);
      } finally {
        button.disabled = false;
      }
    });
  }
}

function dashboardMoneyFromMinor(value) {
  return (Number(value || 0) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

async function loadAccountingLedger(startDate, endDate, yearId) {
  const [trialBalance, ledgerRows] = await Promise.all([
    window.api.getTrialBalance({ yearId, startDate, endDate }),
    window.api.getGeneralLedger({ yearId, startDate, endDate })
  ]);
  const trialBody = document.getElementById('trial-balance-body');
  if (trialBody) {
    const visibleRows = trialBalance.rows.filter(row => row.debit_minor || row.credit_minor);
    trialBody.innerHTML = visibleRows.length
      ? visibleRows.map(row => {
        const balance = Number(row.debit_minor) - Number(row.credit_minor);
        const name = document.documentElement.lang === 'en' ? row.name_en : row.name_ar;
        return `<tr>
          <td dir="ltr">${row.account_code}</td>
          <td>${name}</td>
          <td dir="ltr">${dashboardMoneyFromMinor(row.debit_minor)}</td>
          <td dir="ltr">${dashboardMoneyFromMinor(row.credit_minor)}</td>
          <td dir="ltr">${dashboardMoneyFromMinor(balance)}</td>
        </tr>`;
      }).join('')
      : `<tr><td colspan="5">${t('accounting_no_posted_entries')}</td></tr>`;
  }
  const debitTotal = document.getElementById('trial-balance-debit-total');
  const creditTotal = document.getElementById('trial-balance-credit-total');
  const status = document.getElementById('trial-balance-status');
  if (debitTotal) debitTotal.textContent = dashboardMoneyFromMinor(trialBalance.debitMinor);
  if (creditTotal) creditTotal.textContent = dashboardMoneyFromMinor(trialBalance.creditMinor);
  if (status) {
    status.textContent = t(trialBalance.isBalanced ? 'accounting_balanced' : 'accounting_unbalanced');
    status.style.color = trialBalance.isBalanced ? '#15803d' : '#dc2626';
  }
  const ledgerBody = document.getElementById('general-ledger-body');
  if (ledgerBody) {
    ledgerBody.innerHTML = ledgerRows.length
      ? ledgerRows.map(row => {
        const name = document.documentElement.lang === 'en' ? row.name_en : row.name_ar;
        return `<tr>
          <td dir="ltr">${row.entry_number}</td>
          <td dir="ltr">${row.entry_date}</td>
          <td>${row.account_code} — ${name}</td>
          <td>${row.line_description || row.description}</td>
          <td dir="ltr">${dashboardMoneyFromMinor(row.debit_minor)}</td>
          <td dir="ltr">${dashboardMoneyFromMinor(row.credit_minor)}</td>
        </tr>`;
      }).join('')
      : `<tr><td colspan="6">${t('accounting_no_posted_entries')}</td></tr>`;
  }
}

// Hook into existing switchTab to set defaults when dashboard is opened
const originalSwitchTabDash = window.switchTab;
if (typeof originalSwitchTabDash === 'function' && !window.dashboardHooked) {
  window.dashboardHooked = true;
  window.switchTab = async function(tabId) {
    originalSwitchTabDash(tabId);
    if (tabId === 'dashboard') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const formatObj = (date) => {
        let month = '' + (date.getMonth() + 1),
            day = '' + date.getDate(),
            year = date.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
      };

      const startInput = document.getElementById('dash-start-date');
      const endInput = document.getElementById('dash-end-date');
      if (startInput && !startInput.value) startInput.value = formatObj(firstDay);
      if (endInput && !endInput.value) endInput.value = formatObj(today);

      loadDashboardData();
    }
  };
}
