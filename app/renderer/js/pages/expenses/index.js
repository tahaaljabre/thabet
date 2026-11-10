import { initEvents } from './events.js';

export async function init(params) {
  await initEvents();
}

export function cleanup() {
  console.log("Expenses page cleanup executed.");
}

export function getTemplate() {
  return `
<!-- Expenses & Vouchers Entry -->
<div class="page-expenses">
  <div class="cashier-card no-print" style="margin-bottom: 20px;">
    <div class="card-label" style="margin-bottom:15px; font-size:13px; color:var(--lahmi2)">
      <span data-i18n="expense_input_title">💸 إدخال المصروفات وسندات الصرف تفصيلياً</span>
    </div>
    
    <!-- Date Picker and Cashier Selection -->
    <div class="form-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 15px; gap: 15px;">
      <div class="form-group">
            <label class="form-label" for="expense-report-date" data-i18n="expense_voucher_date">📅 تاريخ السند / الحركة</label>
        <input type="date" id="expense-report-date" class="form-control">
      </div>
      <div class="form-group">
            <label class="form-label" for="expense-cashier-select" data-i18n="cashier_pos_label">👤 الكاشير / نقطة البيع</label>
        <select id="expense-cashier-select" class="form-control form-select"></select>
      </div>
    </div>

    <!-- Form inputs for individual item -->
    <div class="form-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:15px; gap:15px;">
      <div class="form-group">
        <label class="form-label" for="expense-name" data-i18n="expense_name_label">بيان المصروف (الاسم / السند)</label>
        <input type="text" id="expense-name" class="form-control" data-i18n-placeholder="expense_name_ph" placeholder="مثال: خضار وفواكه، راتب محمد">
      </div>
      <div class="form-group">
        <label class="form-label" for="expense-qty" data-i18n="expense_qty_label">الكمية / التفاصيل (اختياري)</label>
        <input type="text" id="expense-qty" class="form-control" data-i18n-placeholder="expense_qty_ph" placeholder="مثال: 5 كجم، دفعة رقم 2">
      </div>
      <div class="form-group">
            <label class="form-label" for="expense-amount"><span data-i18n="expense_amount_label">مبلغ المصروف</span> (${window.appSettings?.currency || ''})</label>
        <input type="number" id="expense-amount" class="form-control" step="any" placeholder="0.00">
      </div>
      <div class="form-group">
            <label class="form-label" for="expense-category" data-i18n="expense_category_label">فئة المصروف</label>
        <select id="expense-category" class="form-control form-select">
          <option value="food" data-i18n="cat_food">مواد غذائية (Food Items)</option>
          <option value="macro_veg" data-i18n="cat_macro">ماكرو وخضار (Macro & Vegetables)</option>
              <option value="maintenance" data-i18n="maintenance_operation_category">صيانة وتشغيل</option>
          <option value="salaries" data-i18n="cat_salaries">رواتب وأجور (Salaries & Wages)</option>
              <option value="other" data-i18n="other_misc_expenses">مصروفات نثرية أخرى</option>
        </select>
      </div>
      <div class="form-group" style="grid-column: span 2;">
        <label class="form-label" for="expense-account" data-i18n="payment_source">طريقة الدفع (الحساب)</label>
        <select id="expense-account" class="form-control form-select account-dropdown"></select>
      </div>
    </div>
    
    <button type="button" class="btn-submit" id="btn-add-expense-item" style="width: 100%; margin-bottom: 20px;">
          <span data-i18n="add_expense_draft">➕ إضافة المصروف للمسودة</span>
    </button>

    <!-- Draft expenses table -->
    <div class="card-label" style="margin-bottom:10px; font-size:12px; color:var(--muted)">
          <span data-i18n="current_report_draft">📋 المصروفات الحالية بالتقرير (مسودة):</span>
    </div>
    <div class="scroll-container" style="margin-bottom: 20px;">
      <table class="expenses-table">
        <thead>
          <tr>
            <th style="width: 45%; text-align: right;" data-i18n="th_desc">البيان</th>
            <th style="width: 25%; text-align: right;" data-i18n="th_cat">التصنيف</th>
            <th style="width: 20%; text-align: left;" data-i18n="amount">المبلغ</th>
            <th style="width: 10%; text-align: center;" data-i18n="th_action">إجراء</th>
          </tr>
        </thead>
        <tbody id="input-expenses-tbody">
          <!-- Rendered dynamically -->
        </tbody>
      </table>
    </div>

    <button type="button" class="btn-submit" id="btn-save-expenses-report" style="width: 100%; background-color: var(--green2); border-color: var(--green2);">
          <span data-i18n="save_expenses_reconcile">💾 حفظ المصروفات ومطابقة الصندوق</span>
    </button>
  </div>

  <!-- Expenses Daily Reports Ledger Section -->
  <div class="cashier-card" id="expenses-history-card">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;" class="no-print">
      <div class="card-label" style="font-size:16px; color:var(--lahmi2); font-weight:bold;">
          <span data-i18n="daily_expenses_ledger">سجل حركات المصروفات والمشتريات اليومية</span>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">
        <div>
          <label class="form-label" style="font-size:12px; font-weight:normal; margin-bottom: 2px; display: block;" data-i18n="date_from">من تاريخ</label>
          <input type="date" id="expenses-print-from" class="form-control" style="font-size:13px; padding:5px; height: auto;">
        </div>
        <div>
          <label class="form-label" style="font-size:12px; font-weight:normal; margin-bottom: 2px; display: block;" data-i18n="date_to">إلى تاريخ</label>
          <input type="date" id="expenses-print-to" class="form-control" style="font-size:13px; padding:5px; height: auto;">
        </div>
          <button class="btn-secondary" id="btn-print-expenses-statement" style="padding: 10px 15px; margin-top: 14px;" data-i18n="print_purchases_statement_button">🖨️ طباعة كشف حساب المشتريات</button>
      </div>
    </div>

    <div class="table-container">
      <div id="expenses-ledger-table-container"></div>
    </div>
  </div>
</div>
  `;
}
