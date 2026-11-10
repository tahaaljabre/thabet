(function mountSuppliersPage() {
  const sp = new URLSearchParams(window.location.search).get('standalone'); if (sp && sp !== 'suppliers') return; const root = document.getElementById('suppliers-page-root');
  if (!root) return;
  root.innerHTML = `<!-- ═══ TAB: SUPPLIERS ═══ -->
    <div class="tab-content" id="tab-suppliers">
      <!-- Top actions -->
      <div class="no-print suppliers-topbar">
        <button class="btn-submit supplier-top-action" onclick="openSupplierModal()"
          data-i18n="add_supplier">➕ إضافة مورد</button>
        <button class="btn-secondary supplier-top-action" onclick="openAllSuppliersReportModal()"
          data-i18n="all_suppliers_report">📄 كشف عام للموردين</button>
        <div class="supplier-picker">
          <input type="text" id="select-supplier-input" class="form-control" data-i18n-placeholder="supplier_search_placeholder" placeholder="🔍 ابحث أو اختر المورد..."
            autocomplete="off" oninput="filterSuppliers()" onclick="toggleSupplierDropdown(event)"
            onkeydown="handleSupplierKeydown(event)">
          <div id="supplier-dropdown-list" class="supplier-dropdown-list">
          </div>
        </div>
      </div>

      <!-- Supplier Management Panel -->
      <div id="supplier-management-panel" style="display:none;">

        <!-- Transactions Input -->
        <div class="cashier-card no-print supplier-transaction-card">
          <div class="supplier-card-header">
            <div class="card-label supplier-section-title"><span data-i18n="sup_record_tx">📝 تسجيل
                حركة للمورد</span></div>
            <div class="supplier-card-actions">
              <button class="btn-secondary" onclick="editCurrentSupplier()" data-i18n="edit_button">✏️ تعديل</button>
              <button class="btn-primary"
                onclick="window.archiveItem('supplier', currentSupplierId)" data-i18n="archive_button">📦 أرشيف</button>
              <button class="btn-danger" onclick="deleteCurrentSupplier()" data-i18n="delete_button">🗑️ حذف</button>
            </div>
          </div>

          <div class="form-grid supplier-transaction-grid">
            <div class="form-group">
              <label class="form-label"><span data-i18n="tx_date">التاريخ</span></label>
              <input type="date" id="sup-tx-date" class="form-control">
            </div>
            <div class="form-group">
              <label class="form-label"><span data-i18n="tx_type">نوع العملية</span></label>
              <select id="sup-tx-type" class="form-control form-select">
                <option value="له" data-i18n="tx_type_credit">له (فاتورة / دين علينا)</option>
                <option value="عليه" data-i18n="tx_type_debit">عليه (دفعة نقدية / سند صرف)</option>
                <option value="خصم" data-i18n="discount_settlement_type">خصم مكتسب / تسوية فاتورة (لا يؤثر على الصندوق)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" data-i18n="amount_with_currency">المبلغ (<span class="sys-currency"></span>)</label>
              <input type="number" id="sup-tx-amount" class="form-control" step="any" value="0">
            </div>
            <div class="form-group">
              <label class="form-label"><span data-i18n="payment_source">طريقة الدفع (الحساب)</span></label>
              <select id="sup-tx-account" class="form-control account-dropdown"></select>
            </div>
            <div class="form-group supplier-notes-field">
              <label class="form-label" data-i18n="details_notes">التفاصيل / ملاحظات</label>
              <input type="text" id="sup-tx-notes" class="form-control" data-i18n-placeholder="sup_tx_notes_ph" placeholder="تفاصيل الحركة"
                >
            </div>
          </div>

          <div class="supplier-save-row">
            <button class="btn-submit" onclick="saveSupplierTx()"><span data-i18n="save_tx">💾 حفظ
                الحركة</span></button>
          </div>
          <div class="supplier-statement-filters">
            <div class="supplier-filter-group">
              <label class="form-label"><span data-i18n="from_date_opt">من
                  تاريخ (اختياري)</span></label>
              <input type="date" id="sup-print-from" class="form-control">
            </div>
            <div class="supplier-filter-group">
              <label class="form-label"><span data-i18n="to_date_opt">إلى
                  تاريخ (اختياري)</span></label>
              <input type="date" id="sup-print-to" class="form-control">
            </div>
            <button class="btn-secondary" onclick="printSupplierStatement()"><span
                data-i18n="btn_statement">🖨️ كشف حساب</span></button>
            <button class="btn-secondary" onclick="exportSupplierStatementExcel()" data-i18n="export_excel_button">📊 تصدير Excel</button>
          </div>
        </div>


        <!-- Search Voucher -->
        <div class="no-print supplier-voucher-search">
          <label class="form-label" data-i18n="search_by_voucher">بحث برقم السند</label>
          <input type="number" id="sup-voucher-search" class="form-control" data-i18n-placeholder="voucher_number" placeholder="رقم السند"
            >
          <button class="btn-secondary" onclick="handleSupplierTxSearch()" data-i18n="search_action">بحث 🔍</button>
        </div>

        <!-- Transactions History Table -->
        <div class="table-container suppliers-table-container">
          <table class="report-table professional-table">
            <thead>
              <tr>
                <th class="table-header" data-i18n="row_number_short">م</th>
                <th class="table-header"><span data-i18n="tx_date">التاريخ</span></th>
                <th class="table-header" data-i18n="type_column">النوع</th>
                <th class="table-header"><span data-i18n="th_amount">المبلغ</span></th>
                <th class="table-header"><span data-i18n="th_details">التفاصيل</span></th>
                <th class="table-header no-print"><span data-i18n="th_options">خيارات</span></th>
              </tr>
            </thead>
            <tbody id="sup-tx-tbody">
              <!-- Dynamic Data -->
            </tbody>
          </table>
        </div>

      </div>
    </div>`;
})();

