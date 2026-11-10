import { createElement, clearElement, escapeHtml } from '../../core/dom.js';
import { channelName, getActiveChannels } from './channels.js';

function safeParseFloat(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

const animatedNumberFrames = new WeakMap();
const animatedNumberValues = new WeakMap();

function animateCurrencyDisplay(el, targetValue, currencyHtml, fractionDigits = 0) {
  if (!el) return;
  const target = Number.isFinite(targetValue) ? targetValue : 0;
  const prev = animatedNumberValues.has(el) ? animatedNumberValues.get(el) : target;
  animatedNumberValues.set(el, target);

  const prevFrame = animatedNumberFrames.get(el);
  if (prevFrame) cancelAnimationFrame(prevFrame);

  const formatNum = (val) => val.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });

  if (Math.abs(target - prev) < 0.005) {
    el.innerHTML = `${currencyHtml}${formatNum(target)}`;
    return;
  }

  const startTime = performance.now();
  const duration = 340;

  const step = (now) => {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = prev + (target - prev) * eased;
    el.innerHTML = `${currencyHtml}${formatNum(current)}`;
    if (progress < 1) {
      animatedNumberFrames.set(el, requestAnimationFrame(step));
    } else {
      el.innerHTML = `${currencyHtml}${formatNum(target)}`;
      animatedNumberFrames.delete(el);
    }
  };

  animatedNumberFrames.set(el, requestAnimationFrame(step));
}

export function updateFormInputs(state) {
  document.getElementById('input-report-date').value = state.reportDate || '';
  document.getElementById('input-cashier-actual').value = state.cashierActual || '';
  document.getElementById('input-sales-cash').value = state.sales.cash || '';
  document.getElementById('input-sales-kbank').value = state.sales.kbank || '';
  document.getElementById('input-sales-grab').value = state.sales.grab || '';
  document.getElementById('input-sales-lineman').value = state.sales.lineman || '';
  document.getElementById('input-sales-krungsri').value = state.sales.krungsri || '';
  
  renderSalesHero(state);
  
  const userField = document.getElementById('input-cashier-user');
  if (userField) userField.value = state.cashierUser || '';
  
  const searchInput = document.getElementById('input-voucher-search');
  if (searchInput) searchInput.value = state.voucherNumber || '';
}

export function renderSalesHero(state) {
  const cashSalesSystem = safeParseFloat(state.sales.cash) || 0;
  const kbank = safeParseFloat(state.sales.kbank) || 0;
  const grab = safeParseFloat(state.sales.grab) || 0;
  const lineman = safeParseFloat(state.sales.lineman) || 0;
  const krungsri = safeParseFloat(state.sales.krungsri) || 0;

  const customChannelTotal = Object.values(state.channelSales || {}).reduce((sum, value) => sum + (safeParseFloat(value) || 0), 0);
  const totalOnline = kbank + grab + lineman + krungsri + customChannelTotal;
  const actualCashSales = cashSalesSystem;
  const totalSales = cashSalesSystem + totalOnline;

  const totalPurchases = (state.purchases || []).reduce((sum, item) => sum + (safeParseFloat(item.amount) || 0), 0);
  const totalEmp = (state.empTxs || []).reduce((sum, item) => sum + (safeParseFloat(item.amount) || safeParseFloat(item.allowances) || 0), 0);
  const totalSup = (state.supTxs || []).reduce((sum, item) => sum + (safeParseFloat(item.amount) || 0), 0);

  const cashAvailable = actualCashSales - totalPurchases - totalEmp - totalSup;
  const totalAvailable = cashAvailable + totalOnline;
  const currency = window.appSettings?.currency || '';

  const homeMoney = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    const next = `${currency}${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (el.textContent !== next) {
      el.textContent = next;
      el.classList.remove('home-value-updated');
      void el.offsetWidth;
      el.classList.add('home-value-updated');
    }
  };
  homeMoney('home-sales-total', totalSales);
  homeMoney('home-purchases-total', totalPurchases);
  homeMoney('home-net-total', totalAvailable);
  window.__homeDaySnapshot = {
    reportDate: state.reportDate,
    sales: totalSales,
    cashSales: cashSalesSystem,
    cardSales: kbank,
    onlineSales: grab + lineman + krungsri + customChannelTotal,
    purchases: totalPurchases,
    employees: totalEmp,
    suppliers: totalSup,
    net: totalAvailable,
    cashExpected: cashAvailable,
    cashActual: safeParseFloat(state.cashierActual),
    cashEntered: state.cashierActual !== '' && state.cashierActual != null,
    currency
  };
  window.__homeCloseSnapshot = {
    reportDate: state.reportDate,
    hasReport: Boolean(state.voucherNumber),
    cashMatched: state.cashierActual !== '' && state.cashierActual != null && Math.abs(safeParseFloat(state.cashierActual) - cashAvailable) < 0.01,
    isClosed: Boolean(state.isClosed)
  };
  window.renderHomeClosing?.();
  window.renderHomeActionCenter?.();
  window.refreshHomeActivity?.();
  updateHomeSalesChart(state);

  const heroTotalSalesEl = document.getElementById('hero-total-sales');
  if (heroTotalSalesEl) {
    animateCurrencyDisplay(heroTotalSalesEl, totalAvailable, `<span class="card-currency">${currency}</span>`, 2);
  }
  
  const heroTotalSalesFill = document.getElementById('hero-total-sales-fill');
  if (heroTotalSalesFill) {
    const pctProfit = totalSales > 0 ? Math.max(0, Math.min(100, (totalAvailable / totalSales * 100))).toFixed(1) : 0;
    heroTotalSalesFill.style.width = pctProfit + '%';
  }

  const onlineAppsTotal = grab + lineman + krungsri + customChannelTotal;
  const grossMixTotal = actualCashSales + kbank + onlineAppsTotal;
  const cashPct = grossMixTotal > 0 ? Math.round((actualCashSales / grossMixTotal) * 100) : 0;
  const netPct = grossMixTotal > 0 ? Math.round((kbank / grossMixTotal) * 100) : 0;
  const onlinePct = grossMixTotal > 0 ? Math.max(0, 100 - cashPct - netPct) : 0;

  const mixBarCash = document.getElementById('mix-bar-cash');
  const mixBarNet = document.getElementById('mix-bar-network');
  const mixBarOnline = document.getElementById('mix-bar-online');
  if (mixBarCash && mixBarNet && mixBarOnline) {
    if (grossMixTotal > 0) {
      mixBarCash.style.width = `${cashPct}%`;
      mixBarNet.style.width = `${netPct}%`;
      mixBarOnline.style.width = `${onlinePct}%`;
    } else {
      mixBarCash.style.width = '33.3%';
      mixBarNet.style.width = '33.3%';
      mixBarOnline.style.width = '33.4%';
    }
  }
  const mixPctCash = document.getElementById('mix-pct-cash');
  const mixPctNet = document.getElementById('mix-pct-network');
  const mixPctOnline = document.getElementById('mix-pct-online');
  if (mixPctCash) mixPctCash.textContent = `${cashPct}%`;
  if (mixPctNet) mixPctNet.textContent = `${netPct}%`;
  if (mixPctOnline) mixPctOnline.textContent = `${onlinePct}%`;
  const homeCashShare = document.getElementById('home-cash-share');
  const homeNetworkShare = document.getElementById('home-network-share');
  const homeOnlineShare = document.getElementById('home-online-share');
  if (homeCashShare) homeCashShare.textContent = `${cashPct}%`;
  if (homeNetworkShare) homeNetworkShare.textContent = `${netPct}%`;
  if (homeOnlineShare) homeOnlineShare.textContent = `${onlinePct}%`;

  const displayCashSalesEl = document.getElementById('display-cash-sales');
  if (displayCashSalesEl) {
    animateCurrencyDisplay(displayCashSalesEl, actualCashSales, `<span style="font-size:11px;color:var(--muted)">${currency}</span>`, 0);
  }
  const displayNetworkSalesEl = document.getElementById('display-network-sales');
  if (displayNetworkSalesEl) {
    animateCurrencyDisplay(displayNetworkSalesEl, kbank, `<span style="font-size:11px;color:var(--muted)">${currency}</span>`, 0);
  }
  const displayOnlineSalesEl = document.getElementById('display-online-sales');
  if (displayOnlineSalesEl) {
    animateCurrencyDisplay(displayOnlineSalesEl, onlineAppsTotal, `<span style="font-size:11px;color:var(--muted)">${currency}</span>`, 0);
  }
  const footerTotalSalesEl = document.getElementById('footer-total-sales');
  if (footerTotalSalesEl) {
    animateCurrencyDisplay(footerTotalSalesEl, totalSales, `<span class="sys-currency">${currency}</span>`, 0);
  }
  const footerTotalPurchasesEl = document.getElementById('footer-total-purchases');
  if (footerTotalPurchasesEl) {
    animateCurrencyDisplay(footerTotalPurchasesEl, totalPurchases, `<span class="sys-currency">${currency}</span>`, 0);
  }
  const footerTotalAvailableEl = document.getElementById('footer-total-available');
  if (footerTotalAvailableEl) {
    animateCurrencyDisplay(footerTotalAvailableEl, totalAvailable, `<span class="sys-currency">${currency}</span>`, 2);
  }

  updateHeroDayOverDayTrend(state, totalAvailable);
  updateHeroDailySalesTarget(grossMixTotal, currency, state.reportDate);
  updateSmartCashierVarianceBadge(state, actualCashSales, totalPurchases, totalEmp, totalSup, currency);
}

function updateHeroDailySalesTarget(grossSales, currency, reportDate) {
  let targetAmt = 15000;
  try {
    const saved = parseFloat(localStorage.getItem('thabit_daily_sales_target') || '15000');
    if (Number.isFinite(saved) && saved > 0) targetAmt = saved;
  } catch (_) {}
  window.__homeSalesSnapshot = { grossSales, targetAmt, reportDate };
  window.renderHomeAlerts?.();

  window.__lastHeroGrossSales = grossSales;
  const valEl = document.getElementById('hero-target-val');
  const statusEl = document.getElementById('hero-target-status');
  const fillEl = document.getElementById('hero-target-fill');
  const tr = typeof t === 'function' ? t : (k) => k;

  if (valEl) {
    valEl.textContent = `${currency}${targetAmt.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  const pct = targetAmt > 0 ? Math.min(100, Math.round((grossSales / targetAmt) * 100)) : 0;
  const homeRing = document.getElementById('home-target-ring');
  const homePercent = document.getElementById('home-target-percent');
  const homeAmount = document.getElementById('home-target-amount');
  const homeAchieved = document.getElementById('home-target-achieved');
  const homeRemaining = document.getElementById('home-target-remaining');
  if (homeRing) homeRing.style.setProperty('--target-progress', `${pct}%`);
  if (homePercent) homePercent.textContent = `${targetAmt > 0 ? Math.round(grossSales / targetAmt * 100) : 0}%`;
  if (homeAmount) homeAmount.textContent = `${currency}${targetAmt.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (homeAchieved) homeAchieved.textContent = `${currency}${grossSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (homeRemaining) homeRemaining.textContent = `${currency}${Math.max(0, targetAmt - grossSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (fillEl) {
    fillEl.style.width = `${pct}%`;
    fillEl.classList.toggle('achieved', grossSales >= targetAmt);
  }
  if (statusEl) {
    if (grossSales >= targetAmt) {
      statusEl.textContent = `${tr('daily_target_achieved')} (${pct}%)`;
      statusEl.className = 'target-gauge-status achieved';
    } else {
      const rem = Math.max(0, targetAmt - grossSales);
      statusEl.textContent = `${pct}% • ${tr('daily_target_remaining')} ${currency}${rem.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      statusEl.className = 'target-gauge-status';
    }
  }
}

function updateSmartCashierVarianceBadge(state, cashSales, totalPurchases, totalEmp, totalSup, currency) {
  const actualEl = document.getElementById('input-cashier-actual');
  if (!actualEl || !actualEl.parentElement) return;
  let badge = document.getElementById('smart-cashier-variance-pill');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'smart-cashier-variance-pill';
    badge.className = 'smart-cashier-variance-pill no-print';
    actualEl.parentElement.appendChild(badge);
  }

  const rawActual = actualEl.value !== '' ? safeParseFloat(actualEl.value) : safeParseFloat(state?.cashierActual);
  const expectedCash = Math.max(0, cashSales - totalPurchases - totalEmp - totalSup);

  if (!rawActual && !cashSales) {
    badge.style.display = 'none';
    return;
  }

  const diff = rawActual - expectedCash;
  const tr = typeof t === 'function' ? t : (k) => k;
  const fmt = (n) => `${currency}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  badge.style.display = 'block';
  badge.classList.remove('var-balanced', 'var-surplus', 'var-deficit');
  if (Math.abs(diff) < 0.01) {
    badge.classList.add('var-balanced');
    badge.textContent = tr('cashier_var_balanced');
  } else if (diff > 0) {
    badge.classList.add('var-surplus');
    badge.textContent = `${tr('cashier_var_surplus')} +${fmt(diff)}`;
  } else {
    badge.classList.add('var-deficit');
    badge.textContent = `${tr('cashier_var_deficit')} -${fmt(diff)}`;
  }
}

let dodFetchSeq = 0;
let homeChartSeq = 0;
const homeChartCache = new Map();

async function updateHomeSalesChart(state) {
  const chart = document.getElementById('home-sales-sparkline');
  const dateStr = state?.reportDate || document.getElementById('input-report-date')?.value;
  if (!chart || !dateStr || !window.api?.getReportState) return;
  const seq = ++homeChartSeq;
  const cashier = state?.cashierName || document.getElementById('select-report-cashier')?.value || null;
  const yearId = state?.year_id || window.currentYearId || 1;
  const days = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() - (7 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  try {
    const values = await Promise.all(days.map(async day => {
      const cacheKey = `${yearId}|${cashier}|${day}`;
      const cached = homeChartCache.get(cacheKey);
      if (day !== dateStr && cached && Date.now() - cached.at < 30000) return cached.value;
      const report = day === dateStr ? state : await window.api.getReportState(day, cashier, yearId);
      const sales = report?.sales || {};
      const value = ['cash', 'kbank', 'grab', 'lineman', 'krungsri'].reduce((sum, key) => sum + safeParseFloat(sales[key]), 0)
        + Object.values(report?.channelSales || {}).reduce((sum, amount) => sum + safeParseFloat(amount), 0);
      if (day !== dateStr) homeChartCache.set(cacheKey, { value, at: Date.now() });
      return value;
    }));
    if (seq !== homeChartSeq) return;
    window.renderHomeComparison?.(values);
    const sparkValues = values.slice(1);
    const max = Math.max(1, ...sparkValues);
    const points = sparkValues.map((value, i) => `${i * 40},${33 - (value / max) * 27}`).join(' ');
    const svgNs = 'http://www.w3.org/2000/svg';
    const area = document.createElementNS(svgNs, 'polygon');
    area.setAttribute('points', `0,36 ${points} 240,36`);
    area.setAttribute('class', 'home-sparkline-area');
    const line = document.createElementNS(svgNs, 'polyline');
    line.setAttribute('points', points);
    line.setAttribute('class', 'home-sparkline-line');
    const last = document.createElementNS(svgNs, 'circle');
    last.setAttribute('cx', '240');
    last.setAttribute('cy', String(33 - (values[7] / max) * 27));
    last.setAttribute('r', '3');
    last.setAttribute('class', 'home-sparkline-dot');
    chart.replaceChildren();
    chart.append(area, line, last);
  } catch (error) {
    if (seq === homeChartSeq) chart.replaceChildren();
    console.error('Failed to load home sales chart:', error);
  }
}

function computeNetAvailableFromReportState(repState) {
  if (!repState || !repState.sales) return 0;
  const cashSys = safeParseFloat(repState.sales.cash) || 0;
  const kb = safeParseFloat(repState.sales.kbank) || 0;
  const gr = safeParseFloat(repState.sales.grab) || 0;
  const lm = safeParseFloat(repState.sales.lineman) || 0;
  const kr = safeParseFloat(repState.sales.krungsri) || 0;
  const customTotal = Object.values(repState.channelSales || {}).reduce((s, v) => s + (safeParseFloat(v) || 0), 0);
  const onlineAll = kb + gr + lm + kr + customTotal;
  const purch = (repState.purchases || []).reduce((s, it) => s + (safeParseFloat(it.amount) || 0), 0);
  const emp = (repState.empTxs || []).reduce((s, it) => s + (safeParseFloat(it.amount) || safeParseFloat(it.allowances) || 0), 0);
  const sup = (repState.supTxs || []).reduce((s, it) => s + (safeParseFloat(it.amount) || 0), 0);
  return (cashSys - purch - emp - sup) + onlineAll;
}

async function updateHeroDayOverDayTrend(state, todayAvailable) {
  const badgeEl = document.getElementById('hero-dod-badge');
  const homeTrend = document.getElementById('home-net-trend');
  if ((!badgeEl && !homeTrend) || !window.api?.getReportState) return;
  const dateStr = state?.reportDate || document.getElementById('input-report-date')?.value || '';
  if (!dateStr) return;

  const seq = ++dodFetchSeq;
  try {
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return;
    dt.setDate(dt.getDate() - 1);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const prevDateStr = `${yyyy}-${mm}-${dd}`;

    const cashierName = state?.cashierName || document.getElementById('select-report-cashier')?.value || null;
    const yearId = state?.year_id || window.currentYearId || 1;
    const prevState = await window.api.getReportState(prevDateStr, cashierName, yearId);
    if (seq !== dodFetchSeq) return;

    const prevNet = computeNetAvailableFromReportState(prevState);
    const tr = typeof t === 'function' ? t : (k) => k;

    badgeEl?.classList.remove('dod-up', 'dod-down', 'dod-flat');
    homeTrend?.classList.remove('dod-up', 'dod-down', 'dod-flat');
    if (Math.abs(prevNet) < 0.01) {
      if (badgeEl) { badgeEl.classList.add('dod-flat'); badgeEl.textContent = `• ${tr('dod_no_yesterday_data')}`; }
      if (homeTrend) { homeTrend.classList.add('dod-flat'); homeTrend.textContent = `• ${tr('dod_no_yesterday_data')}`; }
      return;
    }

    const diffPct = ((todayAvailable - prevNet) / Math.abs(prevNet)) * 100;
    const rounded = Math.round(diffPct * 10) / 10;

    if (rounded > 0.2) {
      if (badgeEl) { badgeEl.classList.add('dod-up'); badgeEl.textContent = `▲ +${rounded}% ${tr('dod_vs_yesterday_up')}`; }
      if (homeTrend) { homeTrend.classList.add('dod-up'); homeTrend.textContent = `▲ +${rounded}% ${tr('dod_vs_yesterday_up')}`; }
    } else if (rounded < -0.2) {
      if (badgeEl) { badgeEl.classList.add('dod-down'); badgeEl.textContent = `▼ ${rounded}% ${tr('dod_vs_yesterday_down')}`; }
      if (homeTrend) { homeTrend.classList.add('dod-down'); homeTrend.textContent = `▼ ${rounded}% ${tr('dod_vs_yesterday_down')}`; }
    } else {
      if (badgeEl) { badgeEl.classList.add('dod-flat'); badgeEl.textContent = `• ${tr('dod_vs_yesterday_flat')}`; }
      if (homeTrend) { homeTrend.classList.add('dod-flat'); homeTrend.textContent = `• ${tr('dod_vs_yesterday_flat')}`; }
    }
  } catch (_) {}
}

export function renderLockState(isClosed) {
  document.querySelectorAll('.page-sales input, .page-sales select').forEach(el => {
    if (el.id !== 'input-report-date' && el.id !== 'sales-print-from' && el.id !== 'sales-print-to' && el.id !== 'select-report-cashier') {
      el.disabled = isClosed;
    }
  });

  const btnSave = document.getElementById('btn-save-income');
  if (btnSave) {
    btnSave.disabled = isClosed;
    btnSave.style.opacity = isClosed ? '0.5' : '1';
    btnSave.innerHTML = isClosed ? `<span>${t('closed_movement_no_edit')}</span>` : `<span>${t('save_sales')}</span>`;
  }
}

export function populateCashierDropdown(cashiersList) {
  const select = document.getElementById('select-report-cashier');
  if (!select) return;
  clearElement(select);
  if (!Array.isArray(cashiersList) || cashiersList.length === 0) {
    select.appendChild(createElement('option', {
      value: '',
      textContent: t('no_registered_cashier')
    }));
    const userField = document.getElementById('input-cashier-user');
    if (userField) userField.value = '';
    return;
  }
  cashiersList.forEach(c => {
    const opt = createElement('option', { value: c.name, textContent: c.name });
    select.appendChild(opt);
  });
  
  if (cashiersList.length > 0) {
    select.value = cashiersList[0].name;
    const userField = document.getElementById('input-cashier-user');
    if (userField) userField.value = cashiersList[0].active_user;
  }
}

export function renderCashierReportsTable(reports, currentSelectedDate, currencySymbol, settings = {}) {
  const tbody = document.getElementById('sales-tx-tbody');
  if (!tbody) return;
  clearElement(tbody);

  const channels = getActiveChannels(settings);
  const table = tbody.closest('table');
  const headerRow = table?.querySelector('thead tr');
  if (headerRow) {
    headerRow.innerHTML = '';
    [t('row_number_short'), t('voucher_number'), t('col_date'), t('sales_cash_sys_short')].forEach(label => {
      headerRow.appendChild(createElement('th', { class: 'table-header', textContent: label }));
    });
    channels.forEach(channel => headerRow.appendChild(createElement('th', {
      class: 'table-header',
      textContent: channelName(channel)
    })));
    [t('actual_short'), t('diff_short')].forEach(label => {
      headerRow.appendChild(createElement('th', { class: 'table-header', textContent: label }));
    });
    headerRow.appendChild(createElement('th', { class: 'table-header no-print', textContent: t('th_options') }));
  }

  if (!reports || reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${7 + channels.length}" style="text-align:center; color:var(--muted);">${t('no_sales_entries_period')}</td></tr>`;
    return;
  }

  reports.forEach((r, idx) => {
    const cash = r.cash_sales || 0;
    const kbank = r.kbank || 0;
    const grab = r.grab || 0;
    const lineman = r.lineman || 0;
    const krungsri = r.krungsri || 0;
    const actual = r.cashier_actual || 0;
    const expectedCash = Math.max(0, cash - (r.total_expenses || 0) - (r.total_emp || 0) - (r.total_sup || 0));
    const diff = actual - expectedCash;

    let diffHtml = '<span style="color:var(--muted)">—</span>';
    if (diff > 0) {
      diffHtml = `<span style="color:var(--green2)">+${currencySymbol}${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`;
    } else if (diff < 0) {
      diffHtml = `<span style="color:var(--red)">-${currencySymbol}${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`;
    }

    const isSelected = r.report_date === currentSelectedDate;
    const tr = createElement('tr');
    if (isSelected) {
      tr.style.backgroundColor = 'rgba(122, 26, 34, 0.08)';
      tr.style.fontWeight = 'bold';
    }

    tr.appendChild(createElement('td', { textContent: idx + 1 }));
    tr.appendChild(createElement('td', { textContent: r.voucher_number || '-' }));
    tr.appendChild(createElement('td', { textContent: r.report_date }));
    tr.appendChild(createElement('td', { textContent: currencySymbol + cash.toLocaleString('en-US', { minimumFractionDigits: 2 }) }));
    const systemAmounts = { kbank, grab, lineman, krungsri };
    channels.forEach(channel => {
      const amount = Number(systemAmounts[channel.key] ?? r.channel_sales?.[channel.key]) || 0;
      tr.appendChild(createElement('td', { textContent: currencySymbol + amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) }));
    });
    tr.appendChild(createElement('td', { textContent: currencySymbol + actual.toLocaleString('en-US', { minimumFractionDigits: 2 }) }));

    const diffTd = createElement('td');
    diffTd.innerHTML = diffHtml;
    tr.appendChild(diffTd);

    const actionTd = createElement('td', { class: 'no-print', style: 'white-space: nowrap; text-align: center;' });
    const actionsWrapper = createElement('div', { style: 'display: inline-flex; gap: 4px; justify-content: center; align-items: center;' });
    
    // We add specific classes and data attributes for event delegation
    const printBtn = createElement('button', { 
      class: 'btn-secondary print-report-btn', 
      'data-date': r.report_date, 
      'data-cashier': r.cashier_name,
      style: 'padding: 4px 8px; font-size: 12px; border-radius: 4px;', 
      textContent: '🖨️', 
      title: t('print_voucher_title') 
    });

    const editBtn = createElement('button', { 
      class: 'btn-submit edit-report-btn', 
      'data-date': r.report_date, 
      'data-cashier': r.cashier_name,
      style: 'padding: 4px 8px; font-size: 12px; border-radius: 4px;', 
      textContent: '✏️', 
      title: t('edit_voucher_title') 
    });

    const deleteBtn = createElement('button', { 
      class: 'btn-danger delete-report-btn', 
      'data-date': r.report_date, 
      'data-cashier': r.cashier_name,
      style: 'padding: 4px 8px; font-size: 12px; border-radius: 4px;', 
      textContent: '🗑️', 
      title: t('delete_voucher_title') 
    });

    actionsWrapper.appendChild(printBtn);
    actionsWrapper.appendChild(editBtn);
    actionsWrapper.appendChild(deleteBtn);
    actionTd.appendChild(actionsWrapper);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
}
