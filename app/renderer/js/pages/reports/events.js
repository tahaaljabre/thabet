import { runClosingCalculation } from './calculation.js';
import { addPartner, renderPartnersView, removePartnerAt } from './partners.js';
import { executeYearEndClosingOrReopen } from './year-closing.js';
import { printClosingReportPreview } from './print.js';
import {
  fetchFinancialYears,
  fetchSettings
} from './api.js';
import {
  getAccountingPeriods,
  closeAccountingPeriod,
  reopenAccountingPeriod
} from '../../core/ipc.js';

import { showToast } from '../../core/notifications.js';
import { showConfirm, showPrompt } from '../../components/modal.js';
import { getState, setState } from '../../core/state.js';

// Local state
let partnersList = [];
let partnerWithdrawalsMap = {};
let financialYearsList = [];
let currentYearId = 1;
let currentYearName = '';
let currentUser = null;
let appSettings = {};
let isYearClosed = false;

// Translation helper
const t = (key) => {
  if (typeof window.t === 'function') return window.t(key);
  
  // Basic fallback translations
  const fallbacks = {
    'err_prefix': 'حدث خطأ: ',
    'err_no_profit_to_close': 'لا يوجد صافي أرباح قابلة للإقفال المالي.',
    'err_distribute_100_pct': 'يجب توزيع الأرباح بنسبة 100% تماماً بين الشركاء قبل الإقفال.',
    'confirm_execute_closing': 'تنبيه هام جداً: هذا الإجراء سيقوم بإقفال السنة المالية الحالية نهائياً وتجميد كافة الحركات وتوليد السندات الآلية وتدوير الحسابات لسنة مالية جديدة. هل تريد الاستمرار فعلاً؟',
    'voucher_desc_zakat': 'مستحقات الزكاة السنوية المحتسبة (2.5%) عن السنة المالية',
    'voucher_desc_profit_dist': 'توزيع صافي الأرباح السنوية المستحقة للشريك:',
    'voucher_desc_gross': '(حصة إجمالية:',
    'voucher_desc_withdrawals': 'مقابل مسحوبات سنوية:',
    'msg_year_closed_success': 'تم إقفال السنة المالية الحالية بنجاح، وتم إنشاء وفتح السنة المالية الجديدة: ',
    'confirm_reopen_year': 'هل أنت متأكد من إعادة فتح هذه السنة المالية؟ سيؤدي ذلك لحذف تقرير الإقفال والسماح بالتعديل.',
    'msg_year_reopened': 'تم إعادة فتح السنة المالية بنجاح.',
    'err_prepare_statement': 'خطأ في تحضير التقرير: ',
    'closing_report_title': 'تقرير الحسابات الختامية للسنة المالية: ',
    'lbl_closing_sales': 'إجمالي المبيعات',
    'closing_net_profit': 'صافي الأرباح التشغيلية',
    'closing_zakat_due': 'الزكاة المستحقة (2.5%)',
    'lbl_closing_distributable': 'الأرباح القابلة للتوزيع',
    'partner_shares_dist': 'حصص وتوزيعات الأرباح بين الشركاء',
    'col_partner_name': 'اسم الشريك',
    'col_partner_pct': 'النسبة (%)',
    'col_partner_gross': `الحصة الإجمالية (${window.appSettings?.currency || ''})`,
    'col_partner_withdraw': `المسحوبات (${window.appSettings?.currency || ''})`,
    'col_partner_net': `صافي المتبقي (${window.appSettings?.currency || ''})`,
    'finance_accountant_sign': 'توقيع المحاسب المالي',
    'manager_in_charge_sign': 'توقيع المدير المسؤول'
  };
  return fallbacks[key] || key;
};

// Local date helper
function getLocalDateString() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

// Float helper
function safeParseFloat(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export async function initEvents() {
  currentUser = getState('currentUser');
  currentYearId = getState('currentFiscalYear') || 1;

  // Load configuration
  try {
    financialYearsList = await fetchFinancialYears();
    appSettings = await fetchSettings();

    const activeYearObj = financialYearsList.find(y => y.YearID === currentYearId);
    if (activeYearObj) {
      currentYearName = activeYearObj.YearName;
      isYearClosed = activeYearObj.IsClosed === 1;
    }
  } catch (err) {
    console.error('Failed to init reports metadata:', err);
  }

  // Configure UI depending on year state
  const btnExecute = document.getElementById('btn-execute-closing');
  if (btnExecute) {
    if (isYearClosed) {
      btnExecute.innerHTML = '🔓 إعادة فتح السنة المالية الحالية (مدير)';
      btnExecute.style.backgroundColor = 'var(--green2)';
      btnExecute.style.borderColor = 'var(--green2)';
    } else {
      btnExecute.innerHTML = '🔒 تنفيذ إقفال السنة المالية وقفل الحسابات';
      btnExecute.style.backgroundColor = 'var(--red)';
      btnExecute.style.borderColor = 'var(--red)';
    }
  }

  // Bind UI buttons
  const btnCalc = document.getElementById('btn-calc-closing');
  if (btnCalc) btnCalc.addEventListener('click', handleCalculateClosingFigures);

  const btnAddPartner = document.getElementById('btn-add-closing-partner');
  if (btnAddPartner) btnAddPartner.addEventListener('click', handleAddPartner);

  if (btnExecute) {
    btnExecute.addEventListener('click', handleExecuteYearEndClosingOrReopen);
  }

  const btnPrint = document.getElementById('btn-print-closing-preview');
  if (btnPrint) btnPrint.addEventListener('click', handlePrintClosingReportPreview);
  document.getElementById('btn-refresh-accounting-periods')?.addEventListener('click', loadAccountingPeriods);

  // Auto calculate on load (especially for closed years)
  await loadAccountingPeriods();
  await handleCalculateClosingFigures();
}

function accountingPeriodError(error) {
  const message = String(error?.message || error || '');
  const mappings = [
    ['FIN_PREVIOUS_PERIOD_OPEN', 'monthly_error_previous_open'],
    ['FIN_LATER_PERIOD_CLOSED', 'monthly_error_later_closed'],
    ['FIN_PERIOD_HAS_DRAFT_JOURNALS', 'monthly_error_draft_journals'],
    ['FIN_PERIOD_TRIAL_BALANCE_UNBALANCED', 'monthly_error_unbalanced'],
    ['FIN_PERIOD_REOPEN_REASON_REQUIRED', 'monthly_error_reason_required'],
    ['FIN_PERIOD_ALREADY_CLOSED', 'monthly_error_already_closed'],
    ['FIN_PERIOD_ALREADY_OPEN', 'monthly_error_already_open'],
    ['FIN_PERIOD_BANK_RECONCILIATION_REQUIRED', 'monthly_error_bank_reconciliation_required'],
    ['FIN_PERIOD_INTEGRITY_CHECK_FAILED', 'monthly_error_integrity_check_failed'],
    ['FIN_YEAR_CLOSED', 'monthly_error_year_closed']
  ];
  const match = mappings.find(([code]) => message.includes(code));
  return match ? t(match[1]) : `${t('error')}: ${message}`;
}

function assertAccountingPeriodResult(result) {
  if (result?.success === false) {
    throw new Error(result.error || 'FIN_PERIOD_OPERATION_FAILED');
  }
  return result;
}

async function loadAccountingPeriods() {
  const body = document.getElementById('accounting-periods-body');
  if (!body) return;
  try {
    const periods = await getAccountingPeriods(currentYearId);
    const locale = window.currentLang?.() === 'en' ? 'en-US' : 'ar-SA';
    body.innerHTML = periods.map(period => {
      const monthName = new Intl.DateTimeFormat(locale, { month: 'long' })
        .format(new Date(2020, period.period_month - 1, 1));
      const isClosed = period.status === 'closed';
      const total = (Number(period.trial_debit_minor || 0) / 100)
        .toLocaleString('en-US', { minimumFractionDigits: 2 });
      return `<tr>
        <td>${monthName}</td>
        <td><span class="status-badge ${isClosed ? 'status-closed' : 'status-open'}">${t(isClosed ? 'monthly_status_closed' : 'monthly_status_open')}</span></td>
        <td dir="ltr">${period.closed_at || '—'}</td>
        <td>${period.closed_by || '—'}</td>
        <td dir="ltr">${total}</td>
        <td class="no-print">
          <button class="${isClosed ? 'btn-secondary' : 'btn-danger'} monthly-period-action"
            data-month="${period.period_month}" data-closed="${isClosed ? '1' : '0'}">
            ${t(isClosed ? 'monthly_reopen_button' : 'monthly_close_button')}
          </button>
        </td>
      </tr>`;
    }).join('');
    body.querySelectorAll('.monthly-period-action').forEach(button => {
      button.addEventListener('click', async () => {
        if (button.disabled) return;
        button.disabled = true;
        const month = Number(button.dataset.month);
        try {
          if (button.dataset.closed === '1') await handleReopenMonth(month);
          else await handleCloseMonth(month);
        } finally {
          if (button.isConnected) button.disabled = false;
        }
      });
    });
  } catch (error) {
    body.innerHTML = `<tr><td colspan="6">${accountingPeriodError(error)}</td></tr>`;
  }
}

async function handleCloseMonth(month) {
  const confirmed = await showConfirm(t('monthly_close_confirm_title'), t('monthly_close_confirm_message'));
  if (!confirmed) return;
  try {
    const note = document.getElementById('monthly-close-note')?.value || '';
    assertAccountingPeriodResult(await closeAccountingPeriod(currentYearId, month, note));
    showToast(t('monthly_close_success'), 'success');
    await loadAccountingPeriods();
  } catch (error) {
    showToast(accountingPeriodError(error), 'error');
  }
}

async function handleReopenMonth(month) {
  try {
    const reason = await showPrompt(
      t('monthly_reopen_confirm_title'),
      t('monthly_reopen_reason_prompt'),
      t('monthly_reopen_reason_placeholder')
    );
    if (reason === null) return;
    if (!reason.trim()) throw new Error('FIN_PERIOD_REOPEN_REASON_REQUIRED');
    assertAccountingPeriodResult(await reopenAccountingPeriod(currentYearId, month, reason.trim()));
    showToast(t('monthly_reopen_success'), 'success');
    await loadAccountingPeriods();
  } catch (error) {
    showToast(accountingPeriodError(error), 'error');
  }
}
async function handleCalculateClosingFigures() {
  return runClosingCalculation({
    currentYearId, isYearClosed, t,
    setPartnerWithdrawals: (value) => { partnerWithdrawalsMap = value; },
    setPartners: (value) => { partnersList = value; },
    renderPartners
  });
}

function getPartnerContext() {
  return { isYearClosed, partnersList, partnerWithdrawalsMap, safeParseFloat, renderPartners, removePartner: handleRemovePartner };
}

function handleAddPartner() {
  return addPartner(getPartnerContext());
}

function renderPartners() {
  return renderPartnersView(getPartnerContext());
}

function handleRemovePartner(idx) {
  return removePartnerAt(idx, getPartnerContext());
}

async function handleExecuteYearEndClosingOrReopen() {
  return executeYearEndClosingOrReopen({
    isYearClosed, currentYearId, currentYearName, currentUser, partnersList,
    partnerWithdrawalsMap, t, safeParseFloat, getLocalDateString
  });
}

async function handlePrintClosingReportPreview() {
  return printClosingReportPreview({
    partnersList, partnerWithdrawalsMap, currentYearName, appSettings, t, safeParseFloat
  });
}
