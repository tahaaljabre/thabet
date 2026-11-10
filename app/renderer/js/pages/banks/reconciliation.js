let bankReconciliationPreview = null;

function initializeBankReconciliationMonths(forceRebuild = false) {
  const select = document.getElementById('recon-month');
  if (!select) return;
  if (select.options.length && !forceRebuild) return;
  const currentMonthVal = select.value || (new Date().getMonth() + 1);
  select.innerHTML = '';
  const locale = window.currentLang?.() === 'en' ? 'en-US' : 'ar-SA';
  for (let month = 1; month <= 12; month += 1) {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2020, month - 1, 1));
    select.appendChild(option);
  }
  select.value = currentMonthVal;
  if (!select.dataset.bound) {
    select.dataset.bound = '1';
    select.addEventListener('change', updateReconciliationDates);
  }
  updateReconciliationDates();
}
window.initializeBankReconciliationMonths = initializeBankReconciliationMonths;

function updateReconciliationDates() {
  const month = Number(document.getElementById('recon-month')?.value || 1);
  const year = Number(window.currentYearName) || new Date().getFullYear();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  const startInput = document.getElementById('recon-start-date');
  const endInput = document.getElementById('recon-end-date');
  if (startInput) startInput.value = start;
  if (endInput) endInput.value = end;
}

async function previewBankReconciliationFile() {
  try {
    initializeBankReconciliationMonths();
    const preview = await window.api.previewBankStatement();
    if (preview?.canceled) return;
    bankReconciliationPreview = preview;
    renderReconciliationMapping(preview);
  } catch (error) {
    alert(`${t('bank_reconciliation_import_failed')}: ${error.message}`);
  }
}

function renderReconciliationMapping(preview) {
  const panel = document.getElementById('recon-mapping-panel');
  const fields = ['date', 'description', 'reference', 'debit', 'credit', 'amount', 'balance'];
  panel.innerHTML = `<div class="cashier-card" style="padding:12px;">
    <strong>${t('bank_column_mapping')}</strong>
    <div class="form-grid">${fields.map(field => `
      <div class="form-group"><label>${t(`bank_column_${field}`)}</label>
        <select class="form-control recon-column-map" data-field="${field}">
          <option value="">${t('bank_column_not_used')}</option>
          ${preview.headers.map((header, index) => `<option value="${index}" ${preview.suggestedMapping[field] === index ? 'selected' : ''}>${window.escapeHTML(header)}</option>`).join('')}
        </select>
      </div>`).join('')}</div>
    <button class="btn-submit" onclick="commitBankReconciliationImport()">${t('bank_confirm_import')}</button>
  </div>`;
}

async function commitBankReconciliationImport() {
  const mapping = {};
  document.querySelectorAll('.recon-column-map').forEach(select => {
    if (select.value !== '') mapping[select.dataset.field] = Number(select.value);
  });
  try {
    const result = await window.api.importBankStatement({
      token: bankReconciliationPreview.token,
      mapping,
      bankAccountId: Number(document.getElementById('recon-bank-id').value),
      yearId: window.currentYearId || 1,
      month: Number(document.getElementById('recon-month').value),
      startDate: document.getElementById('recon-start-date').value,
      endDate: document.getElementById('recon-end-date').value,
      statementClosing: Number(document.getElementById('recon-closing-balance').value)
    });
    document.getElementById('recon-mapping-panel').innerHTML = '';
    showToast(`${t('bank_import_success')}: ${result.imported} · ${t('bank_import_duplicates')}: ${result.duplicates}`, 'success');
    await loadBankReconciliations();
    await openBankReconciliation(result.sessionId);
  } catch (error) {
    showToast(`${t('bank_reconciliation_import_failed')}: ${error.message}`, 'error');
  }
}

async function loadBankReconciliations() {
  initializeBankReconciliationMonths();
  const body = document.getElementById('bank-reconciliations-body');
  if (!body) return;
  const rows = await window.api.listBankReconciliations(window.currentYearId || 1, null);
  body.innerHTML = rows.length ? rows.map(row => {
    const bank = bankAccounts.find(item => item.id === row.bank_account_id);
    return `<tr><td>${row.period_month}</td><td>${window.escapeHTML(bank?.bank_name || '')}</td>
      <td>${t(`bank_recon_status_${row.status}`)}</td>
      <td dir="ltr">${(row.statement_closing_minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td><button class="btn-secondary" onclick="openBankReconciliation(${row.id})">${t('view_details')}</button></td></tr>`;
  }).join('') : `<tr><td colspan="5">${t('bank_reconciliation_empty')}</td></tr>`;
}

async function openBankReconciliation(id) {
  const data = await window.api.getBankReconciliation(id);
  const container = document.getElementById('bank-reconciliation-detail');
  container.innerHTML = `<h4>${t('bank_statement_lines')}</h4>
    <div class="table-container"><table class="report-table"><thead><tr>
      <th>${t('col_date')}</th><th>${t('description_label')}</th><th>${t('amount')}</th>
      <th>${t('monthly_period_status')}</th><th>${t('th_action')}</th>
    </tr></thead><tbody>${data.lines.map(line => `<tr>
      <td dir="ltr">${line.tx_date}</td><td>${window.escapeHTML(line.description || line.reference || '')}</td>
      <td dir="ltr">${(line.amount_minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td>${t(`bank_match_${line.match_status}`)}</td>
      <td>${['matched','adjusted','ignored'].includes(line.match_status) ? '—' : `
        <button class="btn-primary" onclick="chooseBankReconciliationMatch(${line.id},${id})">${t('bank_match_button')}</button>
        <button class="btn-secondary" onclick="adjustBankReconciliationLine(${line.id},${id})">${t('bank_adjust_button')}</button>
        <button class="btn-danger" onclick="ignoreBankReconciliationLine(${line.id},${id})">${t('bank_ignore_button')}</button>`}</td>
    </tr>`).join('')}</tbody></table></div>
    ${data.session.status === 'approved' ? '' : `<button class="btn-submit" onclick="approveBankReconciliationSession(${id})">${t('bank_approve_reconciliation')}</button>`}`;
}

async function chooseBankReconciliationMatch(lineId, sessionId) {
  const candidates = await window.api.getBankLineCandidates(lineId);
  if (!candidates.length) return showToast(t('bank_no_match_candidates'), 'error');
  const list = candidates.map((item, index) => `${index + 1}. ${item.tx_date} · ${item.description || ''}`).join('\n');
  const chosen = Number(window.prompt(`${t('bank_choose_match')}\n${list}`, '1')) - 1;
  if (!candidates[chosen]) return;
  await window.api.matchBankStatementLine(lineId, candidates[chosen].source_type, candidates[chosen].source_id);
  await openBankReconciliation(sessionId);
}

async function adjustBankReconciliationLine(lineId, sessionId) {
  const category = window.prompt(t('bank_adjustment_category_prompt'), t('bank_adjustment_default'));
  if (category === null) return;
  await window.api.adjustBankStatementLine(lineId, category);
  await openBankReconciliation(sessionId);
}

async function ignoreBankReconciliationLine(lineId, sessionId) {
  const note = window.prompt(t('bank_ignore_reason_prompt'), '');
  if (note === null) return;
  await window.api.ignoreBankStatementLine(lineId, note);
  await openBankReconciliation(sessionId);
}

async function approveBankReconciliationSession(id) {
  try {
    await window.api.approveBankReconciliation(id);
    showToast(t('bank_reconciliation_approved'), 'success');
    await loadBankReconciliations();
    await openBankReconciliation(id);
  } catch (error) {
    showToast(`${t('bank_reconciliation_approve_failed')}: ${error.message}`, 'error');
  }
}

window.previewBankReconciliationFile = previewBankReconciliationFile;
window.commitBankReconciliationImport = commitBankReconciliationImport;
window.loadBankReconciliations = loadBankReconciliations;
window.openBankReconciliation = openBankReconciliation;
window.chooseBankReconciliationMatch = chooseBankReconciliationMatch;
window.adjustBankReconciliationLine = adjustBankReconciliationLine;
window.ignoreBankReconciliationLine = ignoreBankReconciliationLine;
window.approveBankReconciliationSession = approveBankReconciliationSession;
