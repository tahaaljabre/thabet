(function mountPurchasesPage() {
  const sp = new URLSearchParams(window.location.search).get('standalone'); if (sp && sp !== 'purchases' && sp !== 'sales') return; const root = document.getElementById('purchases-page-root');
  if (!root) return;
  root.innerHTML = `<!-- ═══ TAB: PURCHASES ═══ -->
    <div class="tab-content" id="tab-purchases">

      <!-- Expenses & Vouchers Entry (Hidden on Print) -->
      <div class="cashier-card no-print" id="purchases-input-card">
        <div class="card-label purchases-section-title"><span
            data-i18n="expense_input_title">💸 إدخال المصروفات وسندات الصرف تفصيلياً</span></div>

        <!-- Date Picker for Daily Expenses Sheet -->
        <div class="form-grid purchases-date-grid">
          <div class="form-group">
            <label class="form-label" for="expense-report-date" data-i18n="expense_voucher_date">📅 تاريخ السند / الحركة</label>
            <input type="date" id="expense-report-date" class="form-control">
          </div>
        </div>

        <div class="form-grid purchases-entry-grid">
          <div class="form-group">
            <label class="form-label" for="expense-name"><span data-i18n="expense_name_label">بيان المصروف (الاسم /
                السند)</span></label>
            <input type="text" id="expense-name" class="form-control" data-i18n-placeholder="expense_name_ph" placeholder="مثال: خضار وفواكه، راتب محمد"
              data-i18n="expense_name_ph">
          </div>
          <div class="form-group">
            <label class="form-label" for="expense-qty"><span data-i18n="expense_qty_label">الكمية / التفاصيل
                (اختياري)</span></label>
            <input type="text" id="expense-qty" class="form-control" data-i18n-placeholder="expense_qty_ph" placeholder="مثال: 5 كجم، دفعة رقم 2"
              data-i18n="expense_qty_ph">
          </div>
          <div class="form-group">
            <label class="form-label" for="expense-amount"><span data-i18n="expense_amount_label">مبلغ المصروف (<span
                  class="sys-currency"></span>)</span></label>
            <input type="number" id="expense-amount" class="form-control" step="any" placeholder="0.00">
          </div>

          <div class="form-group">
            <label class="form-label" for="expense-category"><span data-i18n="expense_category_label">فئة
                المصروف</span></label>
            <select id="expense-category" class="form-control form-select">
              <option value="food" data-i18n="cat_food">مواد غذائية (Food Items)</option>
              <option value="macro_veg" data-i18n="cat_macro">ماكرو وخضار (Macro & Vegetables)</option>
              <option value="maintenance" data-i18n="cat_maintenance">صيانة وتشغيل (Maintenance)</option>
              <option value="salaries" data-i18n="cat_salaries">رواتب وأجور (Salaries & Wages)</option>
              <option value="other" data-i18n="cat_others">مصروفات نثرية أخرى (Others)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="expense-account"><span data-i18n="payment_source">طريقة الدفع
                (الحساب)</span></label>
            <select id="expense-account" class="form-control form-select account-dropdown"></select>
          </div>
        </div>

        <button type="button" class="btn-submit purchases-wide-button" id="btn-add-expense">
          <span><span data-i18n="add_expense_btn">➕ إضافة المصروف للتقرير</span></span>
        </button>

        <div class="card-label purchases-draft-title"><span
            data-i18n="current_report_draft">📋 المصروفات الحالية بالتقرير (مسودة):</span></div>
        <div class="scroll-container purchases-draft-container">
          <table class="expenses-table">
            <thead>
              <tr>
                <th style="width: 45%;"><span data-i18n="th_desc">البيان</span></th>
                <th style="width: 25%;"><span data-i18n="th_cat">التصنيف</span></th>
                <th style="width: 20%; text-align: left;"><span data-i18n="th_amount">المبلغ</span></th>
                <th style="width: 10%; text-align: center;"><span data-i18n="th_action">إجراء</span></th>
              </tr>
            </thead>
            <tbody id="input-expenses-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
        <button type="button" id="btn-save-purchases-report"
          class="btn-submit purchases-wide-button purchases-save-button" data-i18n="save_expenses_reconcile">
          💾 حفظ المصروفات ومطابقة الصندوق
        </button>
      </div>

      <div class="print-only">
        <div class="print-only-section-title"><span data-i18n="op_purchases_details">💸 تفاصيل المشتروات
            التشغيلية</span></div>
        <div class="purchase-list" id="purchases-list-container">
          <!-- Will be rendered dynamically -->
        </div>

        <div class="total-row" style="margin-bottom: 25px;">
          <div class="total-label"><span data-i18n="total_op_purchases">💳 إجمالي المشتروات التشغيلية</span></div>
          <div class="total-amount" style="color:var(--red)" id="purchases-total-display"><span
              class="sys-currency"></span>0</div>
        </div>
      </div>

      <!-- Expenses Daily Reports Ledger Section -->
      <div class="cashier-card" id="expenses-history-card">
        <div class="no-print purchases-history-toolbar">
          <div class="card-label purchases-history-title">
            <span data-i18n="daily_expenses_ledger">سجل حركات المصروفات والمشتريات اليومية</span>
          </div>
          <div class="purchases-history-filters">
            <div class="purchases-filter-group purchases-voucher-filter">
              <label class="form-label"><span
                  data-i18n="voucher_number_search">رقم السند (بحث)</span></label>
              <div class="purchases-search-row">
                <input type="number" id="expenses-voucher-search-input" class="form-control" data-i18n-placeholder="voucher_number" placeholder="رقم السند">
                <button class="btn-primary" id="purchases-voucher-search-btn" data-i18n="search_button">بحث</button>
              </div>
            </div>
            <div class="purchases-filter-group">
              <label class="form-label" data-i18n="date_from">من تاريخ</label>
              <input type="date" id="expenses-print-from" class="form-control">
            </div>
            <div class="purchases-filter-group">
              <label class="form-label" data-i18n="date_to">إلى تاريخ</label>
              <input type="date" id="expenses-print-to" class="form-control">
            </div>
            <button class="btn-secondary purchases-print-button" id="btn-print-purchases-statement"
              data-i18n="print_purchases_statement_button">🖨️ طباعة كشف حساب المشتريات</button>
            <button class="btn-secondary purchases-print-button" id="btn-excel-purchases-statement" data-i18n="export_excel_button">📊 تصدير Excel</button>
          </div>
        </div>

        <div class="table-container purchases-table-container">
          <table class="report-table professional-table">
            <thead>
              <tr>
                <th class="table-header" data-i18n="row_number_short">م</th>
                <th class="table-header"><span data-i18n="voucher_number">رقم السند</span></th>
                <th class="table-header" data-i18n="col_date">التاريخ</th>
                <th class="table-header" data-i18n="expense_count">عدد المصروفات</th>
                <th class="table-header" data-i18n="th_amount">إجمالي المبلغ</th>
                <th class="table-header no-print" data-i18n="th_options">خيارات</th>
              </tr>
            </thead>
            <tbody id="expenses-tx-tbody">
              <!-- Dynamic Data -->
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
})();

