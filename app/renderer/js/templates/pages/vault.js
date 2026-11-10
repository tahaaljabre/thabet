(function mountVaultPage() {
  const sp = new URLSearchParams(window.location.search).get('standalone'); if (sp && sp !== 'vault') return; const root = document.getElementById('vault-page-root');
  if (!root) return;
  root.innerHTML = `<div class="tab-content" id="tab-vault">
      <div class="cashier-card no-print vault-main-card">
        <div class="card-label vault-section-title" data-i18n="vault_closing_title">🔐 إقفال الحركات وتقارير الصندوق المجمعة</div>

        <div class="form-grid vault-period-grid">
          <div class="form-group">
            <label class="form-label" data-i18n="from_start_date">من تاريخ (البداية)</label>
            <input type="date" id="vault-start-date" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label" data-i18n="to_end_date">إلى تاريخ (النهاية)</label>
            <input type="date" id="vault-end-date" class="form-control">
          </div>
        </div>

        <div class="vault-period-actions">
          <button type="button" class="btn-submit" onclick="fetchVaultReports()">
            <span data-i18n="show_period_data">🔍 عرض بيانات الفترة</span>
          </button>
          <button type="button" id="btn-close-vault" class="btn-submit" onclick="closeVaultPeriod()"
            >
            <span data-i18n="close_selected_period">🔒 إقفال حركة الفترة المختارة</span>
          </button>
          <button type="button" id="btn-unlock-vault" class="btn-submit" onclick="unlockVaultPeriodUI()"
            style="display:none; background:var(--red); border-color:var(--red);">
            <span data-i18n="unlock_period_manager">🔓 إلغاء الإقفال (مدير)</span>
          </button>
        </div>

        <div class="card-label vault-summary-title" data-i18n="period_aggregate_summary">📊 ملخص تجميعي للفترة:
        </div>
        <!-- General Cash Payment Voucher Section -->
        <div class="cashier-card no-print vault-voucher-card">
          <div class="card-label vault-subsection-title" data-i18n="general_cash_voucher_title">📄 سند صرف نقدي عام</div>
          <input type="hidden" id="edit-voucher-id" value="">
          <div class="form-grid vault-voucher-grid">
            <div class="form-group">
              <label class="form-label" data-i18n="col_date">التاريخ</label>
              <input type="date" id="voucher-date" class="form-control">
            </div>

            <div class="form-group">
              <label class="form-label"><span data-i18n="amount_with_currency">المبلغ</span> (<span class="sys-currency"></span>)</label>
              <input type="number" id="voucher-amount" class="form-control" step="any" placeholder="0.00">
            </div>
            <div class="form-group">
              <label class="form-label"><span data-i18n="payment_source">الحساب</span></label>
              <select id="voucher-account" class="form-control form-select account-dropdown"></select>
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="category_label">البند / التصنيف</label>
              <select id="voucher-category" class="form-control form-select" onchange="toggleVoucherPartnerField()">
                <option value="Zakat" data-i18n="cat_zakat">زكاة</option>
                <option value="Profit Distribution" data-i18n="cat_profit_distribution">توزيع أرباح</option>
                <option value="Partner Withdrawal" data-i18n="cat_partner_withdrawal">مسحوبات شركاء</option>
                <option value="General Expense" data-i18n="cat_general_expense">مصاريف عمومية</option>
                <option value="Other" data-i18n="cat_other">أخرى</option>
              </select>
            </div>
            <div class="form-group" id="voucher-partner-group" style="display: none;">
              <label class="form-label" data-i18n="closing_partner_name">اسم الشريك</label>
              <input type="text" id="voucher-partner-name" list="partners-list" class="form-control"
                placeholder="-- اختر أو اكتب اسم الشريك --" data-i18n-placeholder="partner_select_placeholder">
              <datalist id="partners-list"></datalist>
            </div>
            <div class="form-group vault-description-field">
              <label class="form-label" data-i18n="description_label">الوصف / البيان</label>
              <input type="text" id="voucher-description" class="form-control" placeholder="أدخل تفاصيل الصرف" data-i18n-placeholder="expense_description_placeholder"
                >
            </div>
          </div>
          <button type="button" class="btn-submit vault-wide-button" onclick="saveGeneralVoucher()">
            <span data-i18n="save_general_voucher">💾 حفظ سند الصرف النقدي</span>
          </button>
        </div>

        <div class="cashier-card no-print vault-vouchers-card">
          <div class="card-label vault-vouchers-toolbar">
            <span data-i18n="general_vouchers_period">📋 سندات الصرف العام للفترة</span>

            <div class="vault-vouchers-actions">
              <div class="vault-voucher-period-filter">
                <label class="form-label" data-i18n="date_from">من تاريخ</label>
                <input type="date" id="vault-vouchers-from" class="form-control">
              </div>
              <div class="vault-voucher-period-filter">
                <label class="form-label" data-i18n="date_to">إلى تاريخ</label>
                <input type="date" id="vault-vouchers-to" class="form-control">
              </div>
              <button type="button" class="btn-secondary vault-voucher-filter-button"
                onclick="applyVaultVoucherPeriod()" data-i18n="show_period_data">عرض الفترة</button>
              <div class="vault-voucher-search">
                <label class="form-label"><span
                    data-i18n="voucher_number_search">رقم السند (بحث)</span></label>
                <div class="vault-search-row">
                  <input type="number" id="vault-voucher-search-input" class="form-control"
                    placeholder="رقم السند" data-i18n-placeholder="voucher_number_placeholder"
                    onkeydown="if(event.key === 'Enter') handleVaultVoucherSearch()">
                  <button class="btn-primary" onclick="handleVaultVoucherSearch()"
                    data-i18n="search_button">بحث</button>
                </div>
              </div>
              <button class="btn-primary" onclick="openPartnerStatementModal()"
                >📑
                <span data-i18n="partner_statement_button">كشف حساب شريك</span></button>
            </div>
          </div>
          <div class="table-container vault-vouchers-table-container">
            <table class="report-table professional-table">
              <thead>
                <tr>
                  <th class="table-header" data-i18n="voucher_number">رقم السند</th>
                  <th class="table-header" data-i18n="col_date">التاريخ</th>
                  <th class="table-header" data-i18n="category_column">البند</th>
                  <th class="table-header" data-i18n="partner_label">الشريك</th>
                  <th class="table-header" data-i18n="amount">المبلغ</th>
                  <th class="table-header" data-i18n="th_desc">البيان</th>
                  <th class="table-header" data-i18n="created_by_column">بواسطة</th>
                  <th class="table-header no-print" data-i18n="th_options">خيارات</th>
                </tr>
              </thead>
              <tbody id="general-vouchers-tbody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>

        <div class="vault-summary-grid">
        <div class="cashier-row">
          <span class="c-key" data-i18n="total_cash_sales_card">💵 إجمالي مبيعات نقد</span>
          <span class="c-val" style="color:var(--lahmi2)" id="vault-sum-cash"><span
              class="sys-currency"></span>0.00</span>
        </div>
        <div class="cashier-row">
          <span class="c-key" data-i18n="online_net_after_comm">🌐 إجمالي الأونلاين والشبكات (بعد خصم العمولات)</span>
          <span class="c-val" style="color:var(--green2)" id="vault-sum-online"><span
              class="sys-currency"></span>0.00</span>
        </div>
        <div class="cashier-row">
          <span class="c-key" data-i18n="total_operating_expenses_card">📉 إجمالي المصروفات التشغيلية</span>
          <span class="c-val" style="color:var(--red)" id="vault-sum-expenses"><span
              class="sys-currency"></span>0.00</span>
        </div>
        <div class="cashier-row">
          <span class="c-key" data-i18n="total_employee_advances_card">إجمالي سلف الموظفين</span>
          <span class="c-val" style="color:#d84315" id="vault-sum-employees"><span
              class="sys-currency"></span>0.00</span>
        </div>
        <div class="cashier-row">
          <span class="c-key" data-i18n="print_sup_payments">إجمالي مدفوعات الموردين</span>
          <span class="c-val" style="color:#d84315" id="vault-sum-suppliers"><span
              class="sys-currency"></span>0.00</span>
        </div>
        <div class="cashier-row">
          <span class="c-key" data-i18n="total_general_vouchers_card">📄 إجمالي سندات الصرف العام</span>
          <span class="c-val" style="color:#d32f2f" id="vault-sum-vouchers"><span
              class="sys-currency"></span>0.00</span>
        </div>
        <div class="cashier-row vault-net-row">
          <span class="c-key" data-i18n="net_available_after_expenses">💰 صافي المتوفر الكلي (مبيعات - مصروفات وسندات صرف)</span>
          <span class="c-val" style="color:var(--beige)" id="vault-sum-net"><span
              class="sys-currency"></span>0.00</span>
        </div>
        </div>

        <div class="vault-print-actions">
          <button type="button" class="btn-submit" onclick="printVaultSummary()"
            >
            <span data-i18n="print_period_summary">🖨️ طباعة ملخص الفترة</span>
          </button>
          <button type="button" class="btn-submit" onclick="exportVaultSummaryExcel()" style="background:#217346;" data-i18n="export_excel_summary">📊 تصدير ملخص Excel</button>
          <button type="button" class="btn-submit" onclick="printVaultDetailed()"
            >
            <span data-i18n="print_detailed_report">🖨️ طباعة تقرير تفصيلي (أيام ومصروفات)</span>
          </button>
          <button type="button" class="btn-submit" onclick="exportVaultDetailedExcel()" style="background:#217346;" data-i18n="export_excel_detailed">📊 تصدير Excel تفصيلي</button>
        </div>

      </div>
    </div>`;
})();
