import { initEvents } from './events.js';

export async function init() {
  await initEvents();
}

export function cleanup() {
  // Event listeners are attached to the page DOM, which the router removes.
}

export function getTemplate() {
  return `
<div class="page-sales">
  <div class="cashier-card no-print" id="sales-input-card" style="margin-bottom: 20px;">
    <div class="card-label" style="margin-bottom:15px; font-size:13px; color:var(--lahmi2)"><span data-i18n="sales_input_title">💰 إدخال وتحديث مبيعات اليوم ومطابقة الكاشير</span></div>
    <div class="form-grid" style="margin-bottom: 15px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      <div class="form-group"><label class="form-label" for="input-report-date" data-i18n="report_date">تاريخ التقرير</label><input type="date" id="input-report-date" class="form-control"></div>
      <div class="form-group"><label class="form-label" for="select-report-cashier" data-i18n="select_cashier">الكاشير (Register)</label><select id="select-report-cashier" class="form-control form-select"></select></div>
      <div class="form-group"><label class="form-label" for="input-cashier-user" data-i18n="cashier_employee">المستلم الفعلي</label><input type="text" id="input-cashier-user" class="form-control" readonly></div>
      <div class="form-group"><label class="form-label" for="input-cashier-actual" data-i18n="cashier_actual">المتوفر الفعلي بالكاشير </label><input type="number" id="input-cashier-actual" class="form-control" step="any" data-i18n-placeholder="cashier_actual_placeholder" placeholder="أدخل المبلغ الفعلي في الدرج"></div>
    </div>
    <div class="form-grid" id="sales-channels-grid" style="margin-bottom: 15px;">
      <div class="form-group"><label class="form-label" for="input-sales-cash" data-i18n="sales_cash_sys">مبيعات الكاشير - نقد (على النظام)</label><input type="number" id="input-sales-cash" class="form-control" step="any" placeholder="0.00"></div>
      <div class="form-group"><label class="form-label" for="input-sales-kbank" data-i18n="sales_kbank">شبكة - KBank (البطاقات)</label><input type="number" id="input-sales-kbank" class="form-control" step="any" placeholder="0.00"></div>
      <div class="form-group"><label class="form-label" for="input-sales-grab" data-i18n="sales_grab">جراب فود - Grab Food</label><input type="number" id="input-sales-grab" class="form-control" step="any" placeholder="0.00"></div>
      <div class="form-group"><label class="form-label" for="input-sales-lineman" data-i18n="sales_lineman">لاين مان - Lineman</label><input type="number" id="input-sales-lineman" class="form-control" step="any" placeholder="0.00"></div>
      <div class="form-group"><label class="form-label" for="input-sales-krungsri" data-i18n="sales_krungsri">كرونغسري أونلاين - Krungsri Online</label><input type="number" id="input-sales-krungsri" class="form-control" step="any" placeholder="0.00"></div>
      <div id="custom-sales-channels" style="display:contents"></div>
    </div>
    <button type="button" class="btn-submit" id="btn-save-income" style="width: 100%; margin-top: 15px;"><span data-i18n="save_sales">💾 حفظ المبيعات ومطابقة الكاشير</span></button>
  </div>
  <div class="cashier-card" id="sales-history-card">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;" class="no-print">
      <div class="card-label" style="font-size:16px; color:var(--lahmi2); font-weight:bold;"><span data-i18n="cashier_ledger_title">سجل حركات مبيعات الكاشير</span></div>
      <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap: wrap;">
<div><label class="form-label" style="font-size:12px; font-weight:normal; margin-bottom: 2px; display: block;" data-i18n="voucher_search_label">رقم السند (بحث)</label><div style="display: flex; gap: 5px;"><input type="number" id="input-voucher-search" class="form-control" data-i18n-placeholder="voucher_number" placeholder="رقم السند" style="font-size:13px; padding:5px; height: auto; width: 120px;"><button type="button" class="btn-primary" id="btn-search-voucher" style="padding: 5px 10px; margin: 0; font-size: 13px;" data-i18n="search_button">بحث</button></div></div>
        <div><label class="form-label" style="font-size:12px; font-weight:normal; margin-bottom: 2px; display: block;" data-i18n="date_from">من تاريخ</label><input type="date" id="sales-print-from" class="form-control" style="font-size:13px; padding:5px; height: auto;"></div>
        <div><label class="form-label" style="font-size:12px; font-weight:normal; margin-bottom: 2px; display: block;" data-i18n="date_to">إلى تاريخ</label><input type="date" id="sales-print-to" class="form-control" style="font-size:13px; padding:5px; height: auto;"></div>
        <button type="button" class="btn-secondary" id="btn-print-sales-statement" style="padding: 10px 15px; margin-top: 14px;" data-i18n="btn_print_statement">🖨️ طباعة كشف مبيعات الكاشير</button>
      </div>
    </div>
<div class="table-container"><table class="report-table professional-table"><thead><tr><th class="table-header" data-i18n="row_number_short">م</th><th class="table-header" data-i18n="voucher_number">رقم السند</th><th class="table-header" data-i18n="col_date">التاريخ</th><th class="table-header" data-i18n="sales_cash_sys_short">نقد</th><th class="table-header">KBank</th><th class="table-header">Grab</th><th class="table-header">Lineman</th><th class="table-header">Krungsri</th><th class="table-header" data-i18n="actual_short">الفعلي</th><th class="table-header" data-i18n="diff_short">الفرق</th><th class="table-header no-print" data-i18n="th_options">خيارات</th></tr></thead><tbody id="sales-tx-tbody"></tbody></table></div>
  </div>
</div>`;
}
