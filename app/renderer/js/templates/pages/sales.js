(function mountSalesPage() {
  const sp = new URLSearchParams(window.location.search).get('standalone'); if (sp && sp !== 'sales' && sp !== 'purchases') return; const root = document.getElementById('sales-page-root');
  if (!root) return;
  root.innerHTML = `<!-- ═══ TAB: SALES ═══ -->
    <div class="tab-content" id="tab-sales">

      <!-- Sales & Cashier Input Form (Hidden on Print) -->
      <div class="cashier-card no-print" id="sales-input-card">
        <div class="card-label sales-section-title"><span
            data-i18n="sales_input_title">💰 إدخال وتحديث مبيعات اليوم ومطابقة الكاشير</span></div>

        <!-- Date and Cashier Info -->
        <div class="form-grid sales-meta-grid">
          <div class="form-group">
            <label class="form-label" for="input-report-date"><span data-i18n="report_date">تاريخ التقرير</span></label>
            <input type="date" id="input-report-date" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label" for="select-report-cashier"><span data-i18n="select_cashier">الكاشير
                (Register)</span></label>
            <select id="select-report-cashier" class="form-control"></select>
          </div>
          <div class="form-group">
            <label class="form-label" for="input-cashier-user"><span data-i18n="cashier_employee">المستلم
                الفعلي</span></label>
            <input type="text" id="input-cashier-user" class="form-control" readonly>
          </div>
          <div class="form-group">
            <label class="form-label" for="input-cashier-actual"><span data-i18n="cashier_actual">المتوفر الفعلي
                بالكاشير (<span class="sys-currency"></span>)</span></label>
            <input type="number" id="input-cashier-actual" class="form-control" step="any"
              data-i18n-placeholder="cashier_actual_placeholder" placeholder="أدخل المبلغ الفعلي في الدرج" data-i18n="cashier_actual_placeholder">
          </div>
        </div>

        <!-- Income Sources Grid -->
        <div class="form-grid" id="sales-channels-grid">
          <div class="form-group">
            <label class="form-label" for="input-sales-cash"><span data-i18n="sales_cash_sys">مبيعات الكاشير - نقد (على
                النظام)</span></label>
            <input type="number" id="input-sales-cash" class="form-control" step="any" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="form-label" for="input-sales-kbank"><span data-i18n="sales_kbank">شبكة - KBank
                (البطاقات)</span></label>
            <input type="number" id="input-sales-kbank" class="form-control" step="any" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="form-label" for="input-sales-grab"><span data-i18n="sales_grab">جراب فود - Grab
                Food</span></label>
            <input type="number" id="input-sales-grab" class="form-control" step="any" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="form-label" for="input-sales-lineman"><span data-i18n="sales_lineman">لاين مان -
                Lineman</span></label>
            <input type="number" id="input-sales-lineman" class="form-control" step="any" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="form-label" for="input-sales-krungsri"><span data-i18n="sales_krungsri">كرونغسري أونلاين -
                Krungsri Online</span></label>
            <input type="number" id="input-sales-krungsri" class="form-control" step="any" placeholder="0.00">
          </div>
          <div id="custom-sales-channels" class="sales-custom-channels"></div>
        </div>

        <button type="button" class="btn-submit sales-save-button" id="btn-save-income">
          <span><span data-i18n="save_sales">💾 حفظ المبيعات ومطابقة الكاشير</span></span>
        </button>
      </div>

      <!-- Cashier Daily Reports Ledger Section -->
      <div class="cashier-card" id="sales-history-card">
        <div class="no-print sales-history-toolbar">
          <div class="card-label sales-history-title">
            <span data-i18n="cashier_ledger_title">سجل حركات مبيعات الكاشير</span>
          </div>
          <div class="sales-history-filters">
            <div class="sales-filter-group sales-voucher-filter">
              <label class="form-label" data-i18n="voucher_search_label">رقم السند (بحث)</label>
              <div class="sales-search-row">
                <input type="number" id="input-voucher-search" class="form-control" data-i18n-placeholder="voucher_number" placeholder="رقم السند"
                  inputmode="numeric">
                <button type="button" class="btn-primary" id="btn-search-voucher" data-i18n="search_button">بحث</button>
              </div>
            </div>
            <div class="sales-filter-group">
              <label class="form-label"><span
                  data-i18n="from_date_opt">من تاريخ</span></label>
              <input type="date" id="sales-print-from" class="form-control">
            </div>
            <div class="sales-filter-group">
              <label class="form-label"><span
                  data-i18n="to_date_opt">إلى تاريخ</span></label>
              <input type="date" id="sales-print-to" class="form-control">
            </div>
            <button class="btn-secondary sales-print-button" id="btn-excel-sales-statement" data-i18n="export_excel_button">📊 تصدير Excel</button>
            <button class="btn-secondary sales-print-button" id="btn-print-sales-statement"><span data-i18n="btn_print_statement">🖨️ طباعة كشف مبيعات
                الكاشير</span></button>
          </div>
        </div>

        <div class="table-container sales-table-container">
          <table class="report-table professional-table">
            <thead>
              <tr>
                <th class="table-header">م</th>
                <th class="table-header" data-i18n="voucher_number">رقم السند</th>
                <th class="table-header"><span data-i18n="tx_date">التاريخ</span></th>
                <th class="table-header"><span data-i18n="sales_cash_sys_short">نقد</span></th>
                <th class="table-header">KBank</th>
                <th class="table-header">Grab</th>
                <th class="table-header">Lineman</th>
                <th class="table-header">Krungsri</th>
                <th class="table-header"><span data-i18n="cashier_actual_short">الفعلي</span></th>
                <th class="table-header"><span data-i18n="diff_short">الفرق</span></th>
                <th class="table-header no-print"><span data-i18n="th_options">خيارات</span></th>
              </tr>
            </thead>
            <tbody id="sales-tx-tbody">
              <!-- Dynamic Data -->
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
})();

