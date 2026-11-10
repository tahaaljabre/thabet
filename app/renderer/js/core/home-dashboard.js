(function initHomeDashboard() {
  const panelKeys = ['overview', 'channels', 'balances', 'activity', 'closing'];
  const tr = key => typeof t === 'function' ? t(key) : key;
  const panel = key => document.querySelector(`[data-home-panel="${key}"]`);
  const storageKey = 'thabit_home_panel_preferences';
  let lastActivityRefresh = 0;
  let activitySequence = 0;
  let comparisonValues = null;
  const money = value => `${window.appSettings?.currency || ''}${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function renderHomeActionCenter() {
    const root = document.getElementById('home-action-items');
    if (!root) return;
    const day = window.__homeDaySnapshot;
    const close = window.__homeCloseSnapshot;
    const banks = window.__homeBankSnapshot;
    if (!day || !close) { root.textContent = tr('home_action_waiting'); return; }
    const items = [];
    if (!close.hasReport) items.push(['home_action_save_report', () => window.switchTab?.('sales')]);
    if (close.hasReport && !close.cashMatched) items.push(['home_action_match_cash', () => window.switchTab?.('sales')]);
    if (close.hasReport && !close.isClosed) items.push(['home_action_close_report', () => window.switchTab?.('sales')]);
    if (banks?.hasCashVault && banks.cashVaultBal < 0) items.push(['home_action_negative_cash', () => window.switchTab?.('vault')]);
    (banks?.banks || []).filter(bank => bank.balance < 0).forEach(bank => items.push([tr('home_alert_negative_bank').replace('{name}', bank.name), () => window.switchTab?.('banks', { accountId: bank.id }), true]));
    root.replaceChildren();
    if (!items.length) { root.textContent = tr('home_action_all_clear'); return; }
    items.slice(0, 4).forEach(([key, action, translated]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'home-action-item';
      button.textContent = translated ? key : tr(key);
      button.addEventListener('click', action);
      root.appendChild(button);
    });
  }

  function openHomeSheet(title, rows, { summary = false } = {}) {
    document.getElementById('home-sheet-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'home-sheet-overlay';
    overlay.className = 'home-customize-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'home-customize-dialog home-sheet-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'home-sheet-title');
    const heading = document.createElement('h3');
    heading.id = 'home-sheet-title';
    heading.textContent = title;
    const date = document.createElement('p');
    date.textContent = window.__homeDaySnapshot?.reportDate || tr('home_selected_day');
    const content = document.createElement('div');
    content.className = 'home-sheet-rows';
    rows.forEach(([label, value, accent]) => {
      const row = document.createElement('div');
      row.className = `home-sheet-row${accent ? ' is-accent' : ''}`;
      const name = document.createElement('span');
      name.textContent = label;
      const amount = document.createElement('strong');
      amount.dir = 'ltr';
      amount.textContent = value;
      row.append(name, amount);
      content.appendChild(row);
    });
    const actions = document.createElement('div');
    actions.className = 'home-customize-actions';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = tr('home_close_sheet');
    const priorFocus = document.activeElement;
    const dismiss = () => { overlay.remove(); priorFocus?.focus?.(); };
    close.addEventListener('click', dismiss);
    actions.appendChild(close);
    if (summary) {
      const print = document.createElement('button');
      print.type = 'button';
      print.textContent = tr('home_print_summary');
      print.addEventListener('click', async () => {
        if (document.body.classList.contains('vip-privacy-blur')) { window.alert(tr('home_print_privacy')); return; }
        const dir = document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl';
        const table = rows.map(([label, value, accent]) => `<tr><td>${escape(label)}</td><td${accent ? ' class="accent"' : ''}>${escape(value)}</td></tr>`).join('');
        const html = `<!doctype html><html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#32151b;padding:30px}header{border-bottom:3px solid #71152b;padding-bottom:16px;margin-bottom:22px}h1{font-size:24px;color:#71152b}p{color:#6e6265}table{width:100%;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #e7dedb}td:last-child{text-align:end;direction:ltr;font-weight:bold}.accent{color:#087445;background:#edf8f0}footer{margin-top:30px;color:#777;font-size:12px}</style></head><body><header><h1>${escape(title)}</h1><p>${escape(date.textContent)}</p></header><table>${table}</table><footer>${escape(tr('home_summary_generated'))}</footer></body></html>`;
        try { await window.api.printHtmlToPDF(html, 'A4'); } catch (error) { console.error(error); window.alert(tr('home_print_failed')); }
      });
      actions.appendChild(print);
    }
    dialog.append(heading, date, content, actions);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => { if (event.target === overlay) dismiss(); });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
      if (event.key !== 'Tab') return;
      const buttons = [...dialog.querySelectorAll('button')];
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
    });
    document.body.appendChild(overlay);
    close.focus();
  }

  function openHomeDetail(type) {
    const day = window.__homeDaySnapshot;
    const banks = window.__homeBankSnapshot;
    if (type !== 'liquidity' && !day) return window.alert(tr('home_action_waiting'));
    if (type === 'liquidity' && !banks) return window.alert(tr('home_action_waiting'));
    const sets = {
      sales: [tr('home_daily_sales'), [[tr('cash_sales'), money(day?.cashSales)], [tr('cards_kbank'), money(day?.cardSales)], [tr('online_sales'), money(day?.onlineSales)], [tr('home_total_sales'), money(day?.sales), true]]],
      net: [tr('home_daily_net'), [[tr('home_total_sales'), money(day?.sales)], [tr('home_total_purchases'), money(day?.purchases)], [tr('home_detail_employees'), money(day?.employees)], [tr('home_detail_suppliers'), money(day?.suppliers)], [tr('home_daily_net'), money(day?.net), true]]],
      liquidity: [tr('home_available_liquidity'), [[tr('liquidity_cash_vault'), money(banks?.cashVaultBal)], ...(banks?.banks || []).map(bank => [bank.name, money(bank.balance)]), [tr('liquidity_net_total'), money((banks?.cashVaultBal || 0) + (banks?.banks || []).reduce((sum, bank) => sum + bank.balance, 0)), true]]]
    };
    openHomeSheet(...sets[type]);
  }

  function openHomeDaySummary() {
    const day = window.__homeDaySnapshot;
    const close = window.__homeCloseSnapshot;
    if (!day || !close) return window.alert(tr('home_action_waiting'));
    const diff = day.cashActual - day.cashExpected;
    openHomeSheet(tr('home_day_summary_title'), [
      [tr('home_total_sales'), money(day.sales)],
      [tr('cash_sales'), money(day.cashSales)],
      [tr('cards_kbank'), money(day.cardSales)],
      [tr('online_sales'), money(day.onlineSales)],
      [tr('home_total_purchases'), money(day.purchases)],
      [tr('home_detail_employees'), money(day.employees)],
      [tr('home_detail_suppliers'), money(day.suppliers)],
      [tr('home_daily_net'), money(day.net), true],
      [tr('home_summary_cash_difference'), day.cashEntered ? money(diff) : tr('home_not_entered')],
      [tr('home_close_report'), tr(close.hasReport ? 'home_close_done' : 'home_close_pending')],
      [tr('home_close_locked'), tr(close.isClosed ? 'home_close_done' : 'home_close_pending')]
    ], { summary: true });
  }

  function readPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const order = Array.isArray(saved.order) ? saved.order.filter(key => panelKeys.includes(key)) : [];
      const hidden = Array.isArray(saved.hidden) ? saved.hidden.filter(key => panelKeys.includes(key)) : [];
      return { order: [...new Set([...order, ...panelKeys])], hidden: [...new Set(hidden)] };
    } catch (_) {
      return { order: [...panelKeys], hidden: [] };
    }
  }

  function applyPreferences(preferences = readPreferences()) {
    preferences.order.forEach((key, index) => {
      const element = panel(key);
      if (!element) return;
      element.style.order = String(index + 1);
      element.style.display = preferences.hidden.includes(key) ? 'none' : '';
    });
  }

  function openHomeCustomization() {
    document.getElementById('home-customize-overlay')?.remove();
    const draft = readPreferences();
    const overlay = document.createElement('div');
    overlay.id = 'home-customize-overlay';
    overlay.className = 'home-customize-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'home-customize-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const heading = document.createElement('h3');
    heading.id = 'home-customize-title';
    heading.textContent = tr('home_customize_title');
    dialog.setAttribute('aria-labelledby', heading.id);
    const hint = document.createElement('p');
    hint.textContent = tr('home_customize_hint');
    const list = document.createElement('div');
    list.className = 'home-customize-list';
    const actions = document.createElement('div');
    actions.className = 'home-customize-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = tr('btn_cancel');
    const close = () => { overlay.remove(); document.querySelector('.home-customize-button')?.focus(); };
    cancel.addEventListener('click', close);
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = tr('home_customize_save');
    save.addEventListener('click', () => {
      try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch (_) {}
      applyPreferences(draft);
      close();
    });
    actions.append(cancel, save);

    function renderList() {
      list.replaceChildren();
      draft.order.forEach((key, index) => {
        const row = document.createElement('div');
        row.className = 'home-customize-row';
        const label = document.createElement('label');
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.checked = !draft.hidden.includes(key);
        check.addEventListener('change', () => {
          draft.hidden = check.checked ? draft.hidden.filter(item => item !== key) : [...draft.hidden, key];
        });
        const name = document.createElement('span');
        name.textContent = tr(`home_panel_${key}`);
        label.append(check, name);
        const up = document.createElement('button');
        up.type = 'button';
        up.textContent = '↑';
        up.title = tr('home_move_up');
        up.disabled = index === 0;
        up.addEventListener('click', () => {
          [draft.order[index - 1], draft.order[index]] = [draft.order[index], draft.order[index - 1]];
          renderList();
        });
        const down = document.createElement('button');
        down.type = 'button';
        down.textContent = '↓';
        down.title = tr('home_move_down');
        down.disabled = index === draft.order.length - 1;
        down.addEventListener('click', () => {
          [draft.order[index + 1], draft.order[index]] = [draft.order[index], draft.order[index + 1]];
          renderList();
        });
        row.append(label, up, down);
        list.appendChild(row);
      });
    }
    renderList();
    dialog.append(heading, hint, list, actions);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button, input:not([disabled])')].filter(el => !el.disabled);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    });
    document.body.appendChild(overlay);
    cancel.focus();
  }

  function renderHomeClosing() {
    const root = document.getElementById('home-closing-status');
    const state = window.__homeCloseSnapshot;
    if (!root || !state) return;
    root.replaceChildren();
    const steps = [
      ['home_close_report', state.hasReport],
      ['home_close_cash', state.hasReport && state.cashMatched],
      ['home_close_locked', state.isClosed]
    ];
    steps.forEach(([key, done]) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `home-close-row ${done ? 'is-done' : 'needs-review'}`;
      const name = document.createElement('span');
      name.textContent = tr(key);
      const status = document.createElement('strong');
      status.textContent = done ? tr('home_close_done') : tr('home_close_pending');
      row.append(name, status);
      row.addEventListener('click', () => window.switchTab?.('sales'));
      root.appendChild(row);
    });
    renderHomeActionCenter();
  }

  function renderHomeComparison(values) {
    comparisonValues = values;
    const result = document.getElementById('home-sales-comparison');
    const selector = document.getElementById('home-compare-range');
    if (!result || !selector || !Array.isArray(values) || values.length !== 8) return;
    const baseline = selector.value === 'average'
      ? values.slice(0, 7).reduce((sum, value) => sum + value, 0) / 7
      : values[6];
    result.classList.remove('positive', 'negative');
    if (baseline <= 0) {
      result.textContent = tr('home_compare_no_data');
      return;
    }
    const change = (values[7] - baseline) / baseline * 100;
    result.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
    result.classList.add(change >= 0 ? 'positive' : 'negative');
  }

  async function refreshHomeActivity(force = false) {
    const root = document.getElementById('home-activity-list');
    if (!root || window.isStandaloneWindow || !window.currentUser || !window.api?.getHomeActivity) return;
    if (window.currentUser.role !== 'manager') {
      root.textContent = tr('home_activity_unavailable');
      return;
    }
    if (!force && Date.now() - lastActivityRefresh < 10000) return;
    const sequence = ++activitySequence;
    root.setAttribute('aria-busy', 'true');
    if (!root.children.length) root.textContent = tr('loading');
    try {
      const rows = await window.api.getHomeActivity(window.currentYearId || 1);
      if (sequence !== activitySequence) return;
      root.removeAttribute('aria-busy');
      lastActivityRefresh = Date.now();
      root.replaceChildren();
      if (!rows.length) {
        root.textContent = tr('home_activity_empty');
        return;
      }
      rows.forEach(item => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'home-activity-row';
        const description = document.createElement('span');
        description.className = 'home-activity-description';
        const title = document.createElement('strong');
        title.textContent = tr(`home_activity_${item.type}`);
        const detail = document.createElement('small');
        detail.textContent = `${item.date} · ${item.detail || ''}`;
        description.append(title, detail);
        const amount = document.createElement('b');
        amount.dir = 'ltr';
        amount.textContent = `${window.appSettings?.currency || ''}${Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        row.append(description, amount);
        row.addEventListener('click', () => {
          if (item.type === 'sales') window.switchTab?.('sales', item.id ? { voucherNumber: item.id } : {});
          else if (item.type === 'vault') window.switchTab?.('vault', { voucherNumber: item.id });
          else window.switchTab?.('banks', item.accountId ? { accountId: item.accountId } : {});
        });
        root.appendChild(row);
      });
    } catch (_) {
      if (sequence === activitySequence) {
        root.removeAttribute('aria-busy');
        root.textContent = tr('home_activity_load_error');
      }
    }
  }

  window.openHomeCustomization = openHomeCustomization;
  window.renderHomeActionCenter = renderHomeActionCenter;
  window.openHomeDaySummary = openHomeDaySummary;
  window.renderHomeClosing = renderHomeClosing;
  window.renderHomeComparison = renderHomeComparison;
  window.refreshHomeActivity = refreshHomeActivity;
  applyPreferences();
  document.querySelectorAll('[data-home-detail]').forEach(button => button.addEventListener('click', () => openHomeDetail(button.dataset.homeDetail)));
  renderHomeActionCenter();
  document.getElementById('home-compare-range')?.addEventListener('change', event => {
    try { localStorage.setItem('thabit_home_compare_range', event.target.value); } catch (_) {}
    if (comparisonValues) renderHomeComparison(comparisonValues);
  });
  try {
    const saved = localStorage.getItem('thabit_home_compare_range');
    if (saved === 'average') document.getElementById('home-compare-range').value = saved;
  } catch (_) {}
  window.addEventListener('focus', () => refreshHomeActivity(true));
  window.addEventListener('stateChanged', () => refreshHomeActivity());
  window.addEventListener('languageChanged', () => {
    renderHomeClosing();
    renderHomeActionCenter();
    if (comparisonValues) renderHomeComparison(comparisonValues);
    refreshHomeActivity(true);
  });
  window.api?.onAppDataUpdated?.(() => refreshHomeActivity(true));
})();
