import {
  fetchAccounts,
  createOrUpdateAccount,
  removeAccount,
  fetchMappings,
  saveMappings,
  fetchTransactions,
  createOrUpdateTransaction,
  removeTransaction
} from './api.js';
import { showToast } from '../../core/notifications.js';
import { showModal, showConfirm } from '../../components/modal.js';
import { createElement, escapeHtml, clearElement } from '../../core/dom.js';
import { getState } from '../../core/state.js';
import { printHtmlToPDF, getCashierReports } from '../../core/ipc.js';

let bankAccounts = [];
let bankMappings = [];
let bankTransactions = [];
let currentYearId = 1;

// Translation helper fallback
const t = (key) => {
  if (typeof window.t === 'function') return window.t(key);
  return key;
};

export async function initEvents() {
  currentYearId = getState('currentFiscalYear') || 1;

  // Set default dates
  const today = new Date().toISOString().substring(0, 10);
  const txDate = document.getElementById('bank-tx-date');
  if (txDate) txDate.value = today;
  const startInput = document.getElementById('bank-start-date-input');
  if (startInput) startInput.value = today;

  // Form toggles on load
  const typeSelect = document.getElementById('bank-tx-type');
  if (typeSelect) {
    typeSelect.addEventListener('change', toggleBankTxFields);
  }

  // Account buttons
  document.getElementById('btn-save-bank-account').addEventListener('click', handleSaveAccount);
  document.getElementById('btn-reset-bank-form').addEventListener('click', resetBankAccountForm);

  // Mapping buttons
  document.getElementById('btn-save-bank-mappings').addEventListener('click', handleSaveMappings);

  // Transaction buttons
  document.getElementById('btn-save-bank-tx').addEventListener('click', handleSaveTransaction);
  document.getElementById('btn-reset-bank-tx-form').addEventListener('click', resetBankTxForm);
  document.getElementById('btn-open-bank-statement-modal').addEventListener('click', handleOpenStatementModal);

  // Load Initial Data
  await loadBanksData();
  toggleBankTxFields();
}

async function loadBanksData() {
  try {
    bankAccounts = await fetchAccounts(currentYearId);
    bankMappings = await fetchMappings(currentYearId);
    bankTransactions = await fetchTransactions(currentYearId);

    renderBankAccountsGrid();
    populateBankDropdowns();
    renderBankTransactionsTable();
  } catch (err) {
    console.error('Failed to load banks data:', err);
    showToast('خطأ في تحميل بيانات الحسابات البنكية', 'error');
  }
}

function renderBankAccountsGrid() {
  const grid = document.getElementById('banks-grid');
  if (!grid) return;
  clearElement(grid);

  if (bankAccounts.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--muted);">${t('no_banks_msg') || 'لا توجد حسابات بنكية مضافة بعد'}</div>`;
    return;
  }

  bankAccounts.forEach(acc => {
    const card = createElement('div', { class: 'mini-card', style: 'position:relative;' });
    card.innerHTML = `
      <div class="dot-ind" style="background:var(--primary-color);box-shadow:0 0 6px var(--primary-color)"></div>
      <div class="card-label" style="font-weight:bold; font-size:14px; color:var(--text-color)">${escapeHtml(acc.bank_name)}</div>
      <div class="card-sub" style="font-size:11px; margin-top:2px;">${t('bank_account_num') || 'رقم الحساب:'} ${escapeHtml(acc.account_number || 'غير محدد')}</div>
      <div class="card-amount" style="color:var(--green2); font-size:20px; margin-top:5px;">${window.appSettings?.currency || '฿'}${parseFloat(acc.current_balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
      <div class="card-sub" style="font-size:10px;">${t('bank_opening_balance') || 'الرصيد الافتتاحي:'} ${window.appSettings?.currency || '฿'}${parseFloat(acc.opening_balance || 0).toLocaleString('en-US')}</div>
    `;

    const btnRow = createElement('div', { class: 'no-print', style: 'margin-top: 10px; display:flex; gap: 5px;' });
    const editBtn = createElement('button', { class: 'btn-primary', style: 'padding: 2px 8px; font-size:10px; flex:1;', textContent: t('btn_edit') || 'تعديل' });
    editBtn.addEventListener('click', () => editBankAccount(acc.id));

    const deleteBtn = createElement('button', { class: 'btn-danger', style: 'padding: 2px 8px; font-size:10px; flex:1;', textContent: t('btn_delete') || 'حذف' });
    deleteBtn.addEventListener('click', () => handleDeleteAccount(acc.id));

    btnRow.appendChild(editBtn);
    btnRow.appendChild(deleteBtn);
    card.appendChild(btnRow);

    grid.appendChild(card);
  });
}

function populateBankDropdowns() {
  const mapSelects = document.querySelectorAll('.bank-select-map');
  const dropdownSelects = document.querySelectorAll('.bank-select-dropdown');

  const optionsHtml = `<option value="">${t('choose_bank') || '-- اختر الحساب البنكي --'}</option>` + 
    bankAccounts.map(acc => `<option value="${acc.id}">${acc.bank_name} (${window.appSettings?.currency || '฿'}${parseFloat(acc.current_balance || 0).toLocaleString()})</option>`).join('');

  mapSelects.forEach(sel => {
    sel.innerHTML = optionsHtml;
  });

  dropdownSelects.forEach(sel => {
    sel.innerHTML = optionsHtml;
  });

  // Apply mapping values
  bankMappings.forEach(m => {
    const el = document.getElementById('map-' + m.channel_name);
    if (el) el.value = m.bank_account_id || '';
  });
}

function renderBankTransactionsTable() {
  const tbody = document.getElementById('bank-tx-tbody');
  if (!tbody) return;
  clearElement(tbody);

  if (bankTransactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--muted);">${t('no_bank_txs') || 'لا توجد حركات بنكية مسجلة بعد'}</td></tr>`;
    return;
  }

  bankTransactions.forEach(tx => {
    const tr = createElement('tr');

    // ID
    tr.appendChild(createElement('td', { textContent: tx.id }));

    // Date
    tr.appendChild(createElement('td', { textContent: tx.tx_date }));

    // Type
    let typeText = tx.tx_type;
    let typeColor = 'var(--text-color)';
    if (tx.tx_type === 'Payment') { typeText = t('tx_payment_bank') || 'صرف من البنك'; typeColor = 'var(--red)'; }
    else if (tx.tx_type === 'Receipt') { typeText = t('tx_receipt_bank') || 'قبض إلى البنك'; typeColor = 'var(--green2)'; }
    else if (tx.tx_type === 'Transfer') { typeText = t('tx_transfer_bank') || 'تحويل بين الحسابات'; typeColor = 'var(--primary-color)'; }
    else if (tx.tx_type === 'Deposit') { typeText = t('tx_deposit_cash') || 'إيداع نقدي كاش'; typeColor = 'var(--green2)'; }
    else if (tx.tx_type === 'Withdrawal') { typeText = t('tx_withdrawal_cash') || 'سحب نقدي كاش'; typeColor = 'var(--red)'; }

    const tdType = createElement('td', { textContent: typeText });
    tdType.style.fontWeight = 'bold';
    tdType.style.color = typeColor;
    tr.appendChild(tdType);

    // From Bank
    tr.appendChild(createElement('td', { textContent: tx.from_bank_name || '-' }));

    // To Bank
    tr.appendChild(createElement('td', { textContent: tx.to_bank_name || '-' }));

    // Partner
    const tdPartner = createElement('td', { textContent: tx.partner_name || '-' });
    tdPartner.style.fontWeight = 'bold';
    tdPartner.style.color = 'var(--primary-color)';
    tr.appendChild(tdPartner);

    // Amount
    const tdAmount = createElement('td', { textContent: `${window.appSettings?.currency || (window.appSettings?.currency || '฿')}${parseFloat(tx.amount || 0).toLocaleString('en-US', {minimumFractionDigits:2})}` });
    tdAmount.style.fontWeight = 'bold';
    tdAmount.style.color = (tx.tx_type === 'Payment' || tx.tx_type === 'Withdrawal') ? 'var(--red)' : 'var(--green2)';
    tr.appendChild(tdAmount);

    // Description
    const descText = (tx.description || '')
      .replace('عمولة مبيعات GrabFood', t('grab_commission_desc') || 'عمولة مبيعات GrabFood')
      .replace('عمولة مبيعات LineMan', t('lineman_commission_desc') || 'عمولة مبيعات LineMan');
    tr.appendChild(createElement('td', { textContent: descText }));

    // Responsibility
    tr.appendChild(createElement('td', { textContent: tx.created_by || '-' }));

    // Actions
    const tdActions = createElement('td', { class: 'no-print' });
    tdActions.style.display = 'flex';
    tdActions.style.gap = '5px';
    tdActions.style.justifyContent = 'center';

    const printBtn = createElement('button', { class: 'btn-secondary', style: 'padding:2px 5px; font-size:11px;', textContent: t('btn_print') || '🖨️ طباعة' });
    printBtn.addEventListener('click', () => printGeneralBankVoucher(tx.id));

    const editBtn = createElement('button', { class: 'btn-primary', style: 'padding:2px 5px; font-size:11px;', textContent: t('btn_edit') || 'تعديل' });
    editBtn.addEventListener('click', () => editBankTransaction(tx.id));

    const deleteBtn = createElement('button', { class: 'btn-danger', style: 'padding:2px 5px; font-size:11px;', textContent: t('btn_delete') || 'حذف' });
    deleteBtn.addEventListener('click', () => handleDeleteTransaction(tx.id));

    tdActions.appendChild(printBtn);
    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function resetBankAccountForm() {
  document.getElementById('edit-bank-id').value = '';
  document.getElementById('bank-name-input').value = '';
  document.getElementById('bank-number-input').value = '';
  document.getElementById('bank-balance-input').value = '';
  document.getElementById('bank-start-date-input').value = new Date().toISOString().substring(0, 10);
  document.getElementById('bank-form-title').innerText = t('title_add_bank') || '➕ إضافة حساب بنكي جديد';
}

async function handleSaveAccount() {
  const id = document.getElementById('edit-bank-id').value || null;
  const name = document.getElementById('bank-name-input').value.trim();
  const num = document.getElementById('bank-number-input').value.trim();
  const balance = parseFloat(document.getElementById('bank-balance-input').value) || 0;
  const sDate = document.getElementById('bank-start-date-input').value || new Date().toISOString().substring(0, 10);

  if (!name) {
    showToast(t('err_enter_bank_name') || 'الرجاء إدخال اسم الحساب البنكي', 'error');
    return;
  }

  try {
    const acc = {
      id,
      bank_name: name,
      account_number: num,
      opening_balance: balance,
      start_date: sDate,
      year_id: currentYearId
    };

    await createOrUpdateAccount(acc);
    showToast('تم حفظ الحساب البنكي بنجاح', 'success');
    resetBankAccountForm();
    await loadBanksData();
  } catch (err) {
    showToast('خطأ: ' + err.message, 'error');
  }
}

function editBankAccount(id) {
  const acc = bankAccounts.find(a => a.id === id);
  if (acc) {
    document.getElementById('edit-bank-id').value = acc.id;
    document.getElementById('bank-name-input').value = acc.bank_name;
    document.getElementById('bank-number-input').value = acc.account_number || '';
    document.getElementById('bank-balance-input').value = acc.opening_balance;
    document.getElementById('bank-start-date-input').value = acc.start_date || '';
    document.getElementById('bank-form-title').innerText = t('title_edit_bank') || '✏️ تعديل بيانات الحساب';
    document.getElementById('bank-name-input').focus();
  }
}

async function handleDeleteAccount(id) {
  const confirmed = await showConfirm('تأكيد الحذف البنكي', 'هل أنت متأكد من حذف هذا الحساب البنكي نهائياً؟ كافة عملياته وسنداته ستحذف أيضاً.');
  if (!confirmed) return;

  try {
    await removeAccount(id);
    showToast('تم حذف الحساب بنجاح', 'success');
    resetBankAccountForm();
    await loadBanksData();
  } catch (err) {
    showToast('خطأ أثناء الحذف: ' + err.message, 'error');
  }
}

async function handleSaveMappings() {
  const mappingPayload = [
    { channel_name: 'kbank', bank_account_id: document.getElementById('map-kbank').value ? parseInt(document.getElementById('map-kbank').value) : null },
    { channel_name: 'grab', bank_account_id: document.getElementById('map-grab').value ? parseInt(document.getElementById('map-grab').value) : null },
    { channel_name: 'lineman', bank_account_id: document.getElementById('map-lineman').value ? parseInt(document.getElementById('map-lineman').value) : null },
    { channel_name: 'krungsri', bank_account_id: document.getElementById('map-krungsri').value ? parseInt(document.getElementById('map-krungsri').value) : null }
  ];

  try {
    await saveMappings({ mappings: mappingPayload, year_id: currentYearId });
    showToast('تم حفظ إعدادات ربط القنوات البنكية بنجاح', 'success');
    await loadBanksData();
  } catch (err) {
    showToast('فشل في حفظ الربط: ' + err.message, 'error');
  }
}

function toggleBankTxFields() {
  const type = document.getElementById('bank-tx-type').value;

  const fromGroup = document.getElementById('bank-tx-from-group');
  const toGroup = document.getElementById('bank-tx-to-group');
  const partnerGroup = document.getElementById('bank-tx-partner-group');

  if (type === 'Payment' || type === 'Withdrawal') {
    fromGroup.style.display = 'block';
    toGroup.style.display = 'none';
    partnerGroup.style.display = 'block';
  } else if (type === 'Receipt' || type === 'Deposit') {
    fromGroup.style.display = 'none';
    toGroup.style.display = 'block';
    partnerGroup.style.display = 'block';
  } else if (type === 'Transfer') {
    fromGroup.style.display = 'block';
    toGroup.style.display = 'block';
    partnerGroup.style.display = 'none';
  }
}

function resetBankTxForm() {
  document.getElementById('edit-bank-tx-id').value = '';
  document.getElementById('bank-tx-date').value = new Date().toISOString().substring(0, 10);
  document.getElementById('bank-tx-type').value = 'Payment';
  document.getElementById('bank-tx-from').value = '';
  document.getElementById('bank-tx-to').value = '';
  document.getElementById('bank-tx-amount').value = '';
  document.getElementById('bank-tx-partner-name').value = '';
  document.getElementById('bank-tx-description').value = '';
  document.getElementById('bank-tx-form-title').innerText = '📝 سند بنكي جديد (صرف / قبض / تحويل / إيداع / سحب)';
  toggleBankTxFields();
}

async function handleSaveTransaction() {
  const id = document.getElementById('edit-bank-tx-id').value || null;
  const date = document.getElementById('bank-tx-date').value;
  const type = document.getElementById('bank-tx-type').value;
  const amount = parseFloat(document.getElementById('bank-tx-amount').value) || 0;
  const from_id = document.getElementById('bank-tx-from').value;
  const to_id = document.getElementById('bank-tx-to').value;
  const partner = document.getElementById('bank-tx-partner-name').value.trim();
  const desc = document.getElementById('bank-tx-description').value.trim();

  if (!date) {
    showToast('الرجاء اختيار التاريخ', 'error');
    return;
  }
  if (amount <= 0) {
    showToast('الرجاء إدخال مبلغ أكبر من الصفر', 'error');
    return;
  }

  if ((type === 'Payment' || type === 'Transfer' || type === 'Withdrawal') && !from_id) {
    showToast('الرجاء تحديد البنك المصدر', 'error');
    return;
  }
  if ((type === 'Receipt' || type === 'Transfer' || type === 'Deposit') && !to_id) {
    showToast('الرجاء تحديد البنك المستلم', 'error');
    return;
  }

  const currentUser = getState('currentUser');

  const tx = {
    id,
    tx_date: date,
    tx_type: type,
    from_account_id: from_id ? parseInt(from_id) : null,
    to_account_id: to_id ? parseInt(to_id) : null,
    amount,
    partner_name: partner || null,
    description: desc,
    created_by: currentUser ? currentUser.username : 'النظام',
    year_id: currentYearId
  };

  try {
    await createOrUpdateTransaction(tx);
    showToast(t('msg_bank_tx_saved') || 'تم حفظ السند البنكي بنجاح', 'success');
    resetBankTxForm();
    await loadBanksData();
  } catch (err) {
    showToast('خطأ أثناء حفظ الحركة البنكية: ' + err.message, 'error');
  }
}

function editBankTransaction(id) {
  const tx = bankTransactions.find(t => t.id === id);
  if (tx) {
    document.getElementById('edit-bank-tx-id').value = tx.id;
    document.getElementById('bank-tx-date').value = tx.tx_date;
    document.getElementById('bank-tx-type').value = tx.tx_type;
    toggleBankTxFields();

    document.getElementById('bank-tx-from').value = tx.from_account_id || '';
    document.getElementById('bank-tx-to').value = tx.to_account_id || '';
    document.getElementById('bank-tx-amount').value = tx.amount;
    document.getElementById('bank-tx-partner-name').value = tx.partner_name || '';
    document.getElementById('bank-tx-description').value = tx.description || '';

    document.getElementById('bank-tx-form-title').innerText = '✏️ تعديل السند البنكي';
    document.getElementById('bank-tx-amount').focus();
  }
}

async function handleDeleteTransaction(id) {
  const confirmed = await showConfirm('حذف السند البنكي', 'هل تريد حذف هذا السند البنكي نهائياً؟');
  if (!confirmed) return;

  try {
    await removeTransaction(id);
    showToast('تم حذف السند بنجاح', 'success');
    await loadBanksData();
  } catch (err) {
    showToast('خطأ أثناء الحذف: ' + err.message, 'error');
  }
}

async function printGeneralBankVoucher(id) {
  const tx = bankTransactions.find(t => t.id === id);
  if (!tx) return;

  const appSettings = window.appSettings || {};
  const cName = appSettings.companyName || 'مؤسسة ثابت';
  const cPhone = appSettings.phone || '';
  const cAddress = appSettings.address || '';
  const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 50px;">` : '';

  let typeText = tx.tx_type;
  if (tx.tx_type === 'Payment') typeText = t('bank_payment') || 'صرف من البنك';
  else if (tx.tx_type === 'Receipt') typeText = t('bank_receipt') || 'قبض إلى البنك';
  else if (tx.tx_type === 'Transfer') typeText = t('bank_transfer') || 'تحويل بين الحسابات';
  else if (tx.tx_type === 'Deposit') typeText = t('voucher_deposit_cash') || 'إيداع نقدي';
  else if (tx.tx_type === 'Withdrawal') typeText = t('voucher_withdrawal_cash') || 'سحب نقدي';

  let partnerRow = tx.partner_name ? `<div class="v-row"><span>${t('partner_involved') || 'الشريك المعني:'}</span><span>${tx.partner_name}</span></div>` : '';
  let bankDetailsRow = '';
  if (tx.tx_type === 'Transfer') {
    bankDetailsRow = `<div class="v-row"><span>${t('from_account') || 'من حساب:'}</span><span>${tx.from_bank_name}</span></div>
                      <div class="v-row"><span>${t('to_account') || 'إلى حساب:'}</span><span>${tx.to_bank_name}</span></div>`;
  } else if (tx.tx_type === 'Payment' || tx.tx_type === 'Withdrawal') {
    bankDetailsRow = `<div class="v-row"><span>${t('source_bank_name') || 'اسم البنك المصدر:'}</span><span>${tx.from_bank_name}</span></div>`;
  } else if (tx.tx_type === 'Receipt' || tx.tx_type === 'Deposit') {
    bankDetailsRow = `<div class="v-row"><span>${t('receiving_bank_name') || 'اسم البنك المستلم:'}</span><span>${tx.to_bank_name}</span></div>`;
  }

  const html = `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: A5 landscape; margin: 0; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 15px; background: white; color: black; }
        .v-box { border: 2px solid #7A1A22; border-radius: 8px; padding: 15px; height: 120mm; display: flex; flex-direction: column; justify-content: space-between; }
        .v-row { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 5px 0; font-size: 13px; }
        .v-amount { font-size: 20px; font-weight: bold; border: 1px solid #000; padding: 5px 15px; background: #eee; display: inline-block; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="v-box">
        <div style="display:flex; justify-content:space-between; border-bottom:2px solid #7A1A22; padding-bottom:5px;">
          <div>
            <h2 style="margin:0; color:#7A1A22;">${cName}</h2>
            <p style="margin:2px 0; font-size:11px;">${cAddress} | ${cPhone}</p>
          </div>
          <div>${logoHtml}</div>
        </div>
        
        <div style="text-align:center; font-size:18px; font-weight:bold; margin-top: 5px;">${t('voucher_bank_title') || 'سند عمليات بنكية'} - ${typeText}</div>
        
        <div class="v-row"><span>رقم السند:</span><span>#${tx.id}</span></div>
        <div class="v-row"><span>تاريخ السند:</span><span>${tx.tx_date}</span></div>
        ${bankDetailsRow}
        ${partnerRow}
        <div class="v-row"><span>البيان / الوصف:</span><span>${tx.description || ''}</span></div>
        
        <div style="margin-top: 10px;">
          <span>المبلغ:</span>
          <div class="v-amount">${window.appSettings?.currency || '฿'}${tx.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
        </div>
        
        <div style="display:flex; justify-content:space-around; margin-top:15px; font-size: 13px; font-weight: bold;">
          <div><span>توقيع المسؤول:</span><br><br>__________________</div>
          <div><span>توقيع المستلم/المراجع:</span><br><br>__________________</div>
        </div>
      </div>
    </body>
    </html>
  `;
  try {
    await printHtmlToPDF(html, 'A5');
    showToast('تم إرسال السند للطابعة بنجاح', 'success');
  } catch (err) {
    showToast('فشل طباعة السند: ' + err.message, 'error');
  }
}

function handleOpenStatementModal() {
  const form = buildStatementForm();
  showModal('🏛️ كشف حساب بنك تفصيلي', form, {
    onConfirm: async () => {
      const bankId = parseInt(form.querySelector('#bank-statement-account-id').value);
      const start = form.querySelector('#bank-statement-start-date').value;
      const end = form.querySelector('#bank-statement-end-date').value;

      if (!bankId) {
        showToast('الرجاء اختيار الحساب البنكي', 'error');
        return;
      }
      if (!start || !end) {
        showToast('الرجاء تحديد الفترة الزمنية', 'error');
        return;
      }

      await executePrintBankStatement(bankId, start, end);
    }
  });
}

function buildStatementForm() {
  const container = createElement('div', { style: 'display:flex; flex-direction:column; gap:12px;' });
  
  const group1 = createElement('div', { style: 'display:flex; flex-direction:column; gap:4px;' });
  group1.appendChild(createElement('label', { textContent: 'اختر البنك' }));
  const select = createElement('select', { id: 'bank-statement-account-id', class: 'form-control' });
  select.style.height = '38px';
  select.innerHTML = bankAccounts.map(acc => `<option value="${acc.id}">${acc.bank_name}</option>`).join('');
  group1.appendChild(select);
  container.appendChild(group1);

  const group2 = createElement('div', { style: 'display:flex; flex-direction:column; gap:4px;' });
  group2.appendChild(createElement('label', { textContent: 'من تاريخ' }));
  const startInput = createElement('input', { type: 'date', id: 'bank-statement-start-date', class: 'form-control' });
  const firstDay = new Date();
  firstDay.setDate(1);
  startInput.value = firstDay.toISOString().substring(0, 10);
  group2.appendChild(startInput);
  container.appendChild(group2);

  const group3 = createElement('div', { style: 'display:flex; flex-direction:column; gap:4px;' });
  group3.appendChild(createElement('label', { textContent: 'إلى تاريخ' }));
  const endInput = createElement('input', { type: 'date', id: 'bank-statement-end-date', class: 'form-control' });
  endInput.value = new Date().toISOString().substring(0, 10);
  group3.appendChild(endInput);
  container.appendChild(group3);

  return container;
}

async function executePrintBankStatement(bankId, start, end) {
  const acc = bankAccounts.find(a => a.id === bankId);
  if (!acc) return;

  const appSettings = window.appSettings || {};
  const cName = appSettings.companyName || 'مؤسسة ثابت';
  const logoHtml = appSettings.logo ? `<img src="${appSettings.logo}" style="max-height: 60px;">` : '';

  try {
    const allTxs = await fetchTransactions(currentYearId);
    const mappings = await fetchMappings(currentYearId);
    let isMapped = mappings.filter(m => m.bank_account_id === bankId).map(m => m.channel_name);

    if ((acc.is_cash_vault === 1 || acc.is_cash_vault === true) && !isMapped.includes('cash_sales')) {
      const isCashMappedElsewhere = mappings.some(m => m.channel_name === 'cash_sales');
      if (!isCashMappedElsewhere) {
        isMapped.push('cash_sales');
      }
    }

    // Call IPC directly using getCashierReports exposed from preload
    const dailyReports = await getCashierReports('', currentYearId);
    const bankStartDate = acc.start_date || '2000-01-01';

    let mappingSalesBefore = 0;
    let mappingSalesDuring = [];

    dailyReports.forEach(r => {
      isMapped.forEach(channel => {
        const amt = r[channel] || 0;
        if (amt > 0) {
          const channelNames = {
            grab: t('sales_grab') || 'مبيعات GrabFood',
            lineman: t('sales_lineman') || 'مبيعات LineMan',
            kbank: t('sales_kbank') || 'مبيعات K-Bank',
            krungsri: t('sales_krungsri') || 'مبيعات Krungsri',
            cash_sales: t('sales_cash') || 'مبيعات نقدية'
          };
          const desc = channelNames[channel] || (`مبيعات قناة ${channel}`);

          if (r.report_date < start && r.report_date >= bankStartDate) {
            mappingSalesBefore += amt;
          } else if (r.report_date >= start && r.report_date <= end) {
            mappingSalesDuring.push({
              date: r.report_date,
              type: t('sales_deposit') || 'إيداع مبيعات',
              description: desc,
              credit: amt,
              debit: 0
            });
          }
        }
      });
    });

    let txBeforeIncoming = 0;
    let txBeforeOutgoing = 0;
    const txDuring = [];

    allTxs.forEach(txn => {
      const amt = txn.amount;
      const date = txn.tx_date;

      const isIncoming = (txn.to_account_id === bankId);
      const isOutgoing = (txn.from_account_id === bankId);

      if (isIncoming || isOutgoing) {
        if (date < start && date >= bankStartDate) {
          if (txn.tx_type === 'Transfer') {
            if (isIncoming) txBeforeIncoming += amt;
            if (isOutgoing) txBeforeOutgoing += amt;
          } else if (txn.tx_type === 'Deposit' || txn.tx_type === 'Receipt') {
            txBeforeIncoming += amt;
          } else if (txn.tx_type === 'Withdrawal' || txn.tx_type === 'Payment') {
            txBeforeOutgoing += amt;
          }
        } else if (date >= start && date <= end && date >= bankStartDate) {
          let debit = 0;
          let credit = 0;

          if (txn.tx_type === 'Transfer') {
            if (isIncoming) credit = amt;
            if (isOutgoing) debit = amt;
          } else if (txn.tx_type === 'Deposit' || txn.tx_type === 'Receipt') {
            credit = amt;
          } else if (txn.tx_type === 'Withdrawal' || txn.tx_type === 'Payment') {
            debit = amt;
          }

          let typeLabel = txn.tx_type;
          if (txn.tx_type === 'Payment') typeLabel = t('voucher_payment_bank') || 'صرف بنكي';
          else if (txn.tx_type === 'Receipt') typeLabel = t('voucher_receipt_bank') || 'قبض بنكي';
          else if (txn.tx_type === 'Transfer') typeLabel = isIncoming ? 'تحويل وارد' : 'تحويل صادر';
          else if (txn.tx_type === 'Deposit') typeLabel = 'إيداع نقدي';
          else if (txn.tx_type === 'Withdrawal') typeLabel = 'سحب نقدي';

          let partnerInfo = txn.partner_name ? ` (الشريك: ${txn.partner_name})` : '';

          txDuring.push({
            date: date,
            type: typeLabel,
            description: (txn.description || '') + partnerInfo,
            debit,
            credit
          });
        }
      }
    });

    const openingBalance = acc.opening_balance + mappingSalesBefore + txBeforeIncoming - txBeforeOutgoing;
    const ledger = [...mappingSalesDuring, ...txDuring].sort((a,b) => a.date.localeCompare(b.date));

    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    let ledgerHtml = ledger.map(item => {
      runningBalance = runningBalance + item.credit - item.debit;
      totalDebit += item.debit;
      totalCredit += item.credit;

      return `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; text-align:center;">${item.date}</td>
          <td style="padding: 8px; text-align:right; font-weight:bold;">${item.type}</td>
          <td style="padding: 8px; text-align:right; color:#555;">${escapeHtml(item.description || '')}</td>
          <td style="padding: 8px; text-align:left; color:#c62828; font-weight:bold;">${item.debit > 0 ? (window.appSettings?.currency || '฿') + item.debit.toLocaleString() : '-'}</td>
          <td style="padding: 8px; text-align:left; color:#2e7d32; font-weight:bold;">${item.credit > 0 ? (window.appSettings?.currency || '฿') + item.credit.toLocaleString() : '-'}</td>
          <td style="padding: 8px; text-align:left; font-weight:bold;">${window.appSettings?.currency || '฿'}${runningBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7A1A22; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background: #f5f5f5; color: #333; }
          .sum-container { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 25px; }
          .sum-box { border: 1px solid #ccc; padding: 12px; border-radius: 6px; text-align: center; background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0; color:#7A1A22;">${cName}</h2>
            <p style="margin:4px 0; font-size:12px;">${appSettings.address || ''} | ${appSettings.phone || ''}</p>
          </div>
          <div>${logoHtml}</div>
        </div>
        
        <h2 style="text-align:center; color: #1e293b; text-decoration: underline;">كشف حركة الحساب البنكي التفصيلي</h2>
        
        <div style="margin: 15px 0; font-size:13px; line-height: 1.5; background: #f8fafc; padding: 10px; border-radius: 6px; border-right: 4px solid #7A1A22;">
          <strong>الحساب البنكي:</strong> ${acc.bank_name}<br>
          <strong>رقم الحساب:</strong> ${acc.account_number || 'غير محدد'}<br>
          <strong>الفترة الزمنية:</strong> من ${start} إلى ${end}<br>
          <strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('ar-EG')}
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">التاريخ</th>
              <th style="width: 18%;">نوع الحركة</th>
              <th style="width: 32%;">البيان / تفاصيل القناة</th>
              <th style="width: 12.5%;">مدين (سحب/مصروفات)</th>
              <th style="width: 12.5%;">دائن (إيداع/مبيعات)</th>
              <th style="width: 13%;">الرصيد الجاري</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#e0f2fe; font-weight:bold;">
              <td>-</td>
              <td colspan="2">رصيد افتتاحي مرحل (قبل تاريخ ${start})</td>
              <td>-</td>
              <td>-</td>
              <td>${window.appSettings?.currency || '฿'}${openingBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
            </tr>
            ${ledgerHtml}
          </tbody>
        </table>
        
        <div class="sum-container">
          <div class="sum-box">
            <h4 style="margin:0 0 5px 0; color:#2e7d32;">إجمالي المقبوضات/المبيعات (+)</h4>
            <strong style="font-size: 16px; color:#2e7d32;">${window.appSettings?.currency || '฿'}${totalCredit.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
          </div>
          <div class="sum-box">
            <h4 style="margin:0 0 5px 0; color:#c62828;">إجمالي المدفوعات/المسحوبات (-)</h4>
            <strong style="font-size: 16px; color:#c62828;">${window.appSettings?.currency || '฿'}${totalDebit.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
          </div>
          <div class="sum-box" style="background:#7A1A22; color:white;">
            <h4 style="margin:0 0 5px 0; color:white;">الرصيد النهائي الجاري</h4>
            <strong style="font-size: 18px; color:#86efac;">${window.appSettings?.currency || '฿'}${runningBalance.toLocaleString('en-US', {minimumFractionDigits:2})}</strong>
          </div>
        </div>
        
        <div style="margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 13px; font-weight: bold;">
          <div><p>المحاسب المالي</p><p style="margin-top: 40px;">___________________</p></div>
          <div><p>المدير المسؤول</p><p style="margin-top: 40px;">___________________</p></div>
        </div>
      </body>
      </html>
    `;
    await printHtmlToPDF(html, 'A4');
    showToast('تم طباعة كشف الحساب بنجاح', 'success');
  } catch (err) {
    showToast('خطأ أثناء طباعة كشف الحساب: ' + err.message, 'error');
  }
}
