(function mountBanksPage() {
  const sp = new URLSearchParams(window.location.search).get('standalone'); if (sp && sp !== 'banks') return; const root = document.getElementById('banks-page-root');
  if (!root) return;
  root.innerHTML = `<!-- ═══ TAB: BANKS ═══ -->
    <div class="tab-content" id="tab-banks" style="display: none;">
      <!-- Banks dashboard cards -->
      <div class="mini-grid banks-summary-grid" id="banks-grid">
        <!-- Populated dynamically -->
      </div>

      <!-- Forms Row -->
      <div class="banks-forms-grid">

        <!-- Bank Account Create/Edit Form -->
        <div class="cashier-card">
          <div class="card-label bank-section-title" id="bank-form-title" data-i18n="title_add_bank">➕ إضافة حساب بنكي
            جديد</div>
          <input type="hidden" id="edit-bank-id" value="">
          <div class="form-group">
            <label class="form-label" data-i18n="lbl_bank_name">اسم البنك / المحفظة</label>
            <input type="text" id="bank-name-input" class="form-control"
              data-i18n-placeholder="placeholder_bank_name" placeholder="مثال: KBank, Grab Wallet">
          </div>
          <div class="form-group" style="margin-bottom: 10px;">
            <label class="form-label" data-i18n="lbl_acc_num">رقم الحساب</label>
            <input type="text" id="bank-number-input" class="form-control"
              data-i18n-placeholder="placeholder_acc_num" placeholder="أدخل رقم الحساب إن وجد">
          </div>
          <div class="form-group" style="margin-bottom: 15px;">
            <label class="form-label" data-i18n="lbl_opening_balance">الرصيد الافتتاحي (<span
                class="sys-currency"></span>)</label>
            <input type="number" id="bank-balance-input" class="form-control" step="any" placeholder="0.00"
              >
          </div>
          <div class="form-group" style="margin-bottom: 15px;">
            <label class="form-label" data-i18n="lbl_opening_date">تاريخ الرصيد الافتتاحي (بدء التتبع)</label>
            <input type="date" id="bank-start-date-input" class="form-control">
          </div>
          <div class="bank-form-actions">
            <button class="btn-primary" onclick="saveBankAccount()" data-i18n="btn_save_bank">💾 حفظ
              الحساب</button>
            <button class="btn-secondary" onclick="resetBankAccountForm()" style="width: 80px;"
              data-i18n="btn_cancel">إلغاء</button>
          </div>
        </div>

        <!-- Sales Channel Mapping Settings -->
        <div class="cashier-card">
          <div class="card-label bank-section-title" data-i18n="title_bank_mapping">🔗 ربط
            قنوات المبيعات بالحسابات البنكية</div>
          <div id="bank-sales-mappings-list"></div>
          <button class="btn-primary" onclick="saveBankSalesMappings()" style="width: 100%;"
            data-i18n="btn_save_mapping">💾 حفظ إعدادات الربط</button>
        </div>

      </div>

      <!-- Bank Voucher Creation Form -->
      <div class="cashier-card bank-transaction-card">
        <div class="card-label bank-section-title" id="bank-tx-form-title" data-i18n="title_add_bank_tx">📝 سند بنكي جديد
          (صرف / قبض / تحويل / إيداع / سحب)</div>
        <input type="hidden" id="edit-bank-tx-id" value="">
        <div class="form-grid bank-transaction-grid">
          <div class="form-group">
            <label class="form-label" data-i18n="col_date">التاريخ</label>
            <input type="date" id="bank-tx-date" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;" data-i18n="tx_type_col">نوع الحركة</label>
            <select id="bank-tx-type" class="form-control form-select" onchange="toggleBankTxFields()">
              <option value="Payment" data-i18n="tx_payment_bank">صرف من البنك</option>
              <option value="Receipt" data-i18n="tx_receipt_bank">قبض إلى البنك</option>
              <option value="Transfer" data-i18n="tx_transfer_bank">تحويل بين البنوك</option>
              <option value="Deposit" data-i18n="tx_deposit_cash">إيداع نقدي من الصندوق للبنك</option>
              <option value="Withdrawal" data-i18n="tx_withdrawal_cash">سحب نقدي من البنك للصندوق</option>
            </select>
          </div>
          <div class="form-group" id="bank-tx-from-group">
            <label class="form-label" style="font-size:12px;" data-i18n="source_bank">البنك المصدر</label>
            <select id="bank-tx-from" class="form-control form-select bank-select-dropdown"></select>
          </div>
          <div class="form-group" id="bank-tx-to-group" style="display: none;">
            <label class="form-label" style="font-size:12px;" data-i18n="receiving_bank">البنك المستلم</label>
            <select id="bank-tx-to" class="form-control form-select bank-select-dropdown"></select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;" data-i18n="amount_with_currency">المبلغ (<span class="sys-currency"></span>)</label>
            <input type="number" id="bank-tx-amount" class="form-control" placeholder="0.00" style="padding: 8px;">
          </div>
          <div class="form-group" id="bank-tx-partner-group" style="display: none;">
            <label class="form-label" style="font-size:12px;" data-i18n="partner_optional">اسم الشريك (اختياري)</label>
            <input type="text" id="bank-tx-partner-name" class="form-control" data-i18n-placeholder="partner_transaction_placeholder" placeholder="للمسحوبات أو التوزيعات"
              style="padding: 8px;">
          </div>
          <div class="form-group bank-description-field">
            <label class="form-label" style="font-size:12px;" data-i18n="voucher_desc_label">البيان / الوصف</label>
            <input type="text" id="bank-tx-description" class="form-control" data-i18n-placeholder="operation_details_placeholder" placeholder="أدخل تفاصيل العملية"
              style="padding: 8px;">
          </div>
        </div>
        <div class="bank-form-actions">
          <button class="btn-primary" onclick="saveBankTransaction()" data-i18n="save_bank_voucher">💾 حفظ السند البنكي</button>
          <button class="btn-secondary" onclick="resetBankTxForm()" style="width: 100px;"
            data-i18n="btn_cancel">إلغاء</button>
        </div>
      </div>

      <div class="cashier-card no-print" id="bank-reconciliation-section">
        <div class="card-label bank-section-title" data-i18n="bank_reconciliation_title">التسوية البنكية</div>
        <p data-i18n="bank_reconciliation_description">استورد كشف البنك وطابق حركاته مع قيود النظام قبل إقفال الشهر.</p>
        <div class="form-grid">
          <div class="form-group"><label data-i18n="select_bank_label">اختر البنك</label>
            <select id="recon-bank-id" class="form-control bank-select-dropdown"></select></div>
          <div class="form-group"><label data-i18n="bank_reconciliation_month">الشهر</label>
            <select id="recon-month" class="form-control"></select></div>
          <div class="form-group"><label data-i18n="date_from">من تاريخ</label>
            <input id="recon-start-date" type="date" class="form-control"></div>
          <div class="form-group"><label data-i18n="date_to">إلى تاريخ</label>
            <input id="recon-end-date" type="date" class="form-control"></div>
          <div class="form-group"><label data-i18n="bank_statement_closing_balance">رصيد إقفال كشف البنك</label>
            <input id="recon-closing-balance" type="number" step="0.01" class="form-control"></div>
        </div>
        <div style="display:flex; gap:8px; margin:12px 0;">
          <button class="btn-primary" onclick="previewBankReconciliationFile()" data-i18n="bank_import_statement">استيراد CSV / Excel</button>
          <button class="btn-secondary" onclick="loadBankReconciliations()" data-i18n="dashboard_refresh">تحديث</button>
        </div>
        <div id="recon-mapping-panel"></div>
        <div class="table-container"><table class="report-table professional-table">
          <thead><tr>
            <th data-i18n="bank_reconciliation_month">الشهر</th><th data-i18n="bank_name">البنك</th>
            <th data-i18n="monthly_period_status">الحالة</th><th data-i18n="bank_statement_closing_balance">رصيد الكشف</th>
            <th data-i18n="th_action">إجراء</th>
          </tr></thead><tbody id="bank-reconciliations-body"></tbody>
        </table></div>
        <div id="bank-reconciliation-detail" style="margin-top:14px;"></div>
      </div>

      <!-- Recent Bank Transactions List -->
      <div class="cashier-card">
        <div class="card-label bank-history-header">
          <span data-i18n="recent_bank_operations">📋 كشف العمليات والسندات البنكية الأخيرة</span>
          <div class="bank-history-actions">
            <div class="bank-history-date-filter">
              <label class="form-label" data-i18n="home_bank_filter_label">الحساب</label>
              <select id="bank-tx-filter-account" class="form-control" onchange="applyBankAccountFilter()"></select>
            </div>
            <div class="bank-history-date-filter">
              <label class="form-label" data-i18n="date_from">من تاريخ</label>
              <input type="date" id="bank-tx-filter-from" class="form-control" onchange="applyBankTransactionDateFilter()">
            </div>
            <div class="bank-history-date-filter">
              <label class="form-label" data-i18n="date_to">إلى تاريخ</label>
              <input type="date" id="bank-tx-filter-to" class="form-control" onchange="applyBankTransactionDateFilter()">
            </div>
            <button type="button" class="btn-secondary bank-history-filter-button"
              onclick="applyBankTransactionDateFilter()" data-i18n="show_period_data">عرض الفترة</button>
            <button class="btn-primary" onclick="openBankStatementModal()"
              style="margin: 0; background-color: var(--kabd);" data-i18n="detailed_bank_statement">📊 كشف حساب بنك
              تفصيلي</button>
          </div>
        </div>
        <div class="table-container banks-table-container">
          <table class="report-table professional-table">
            <thead>
              <tr>
                <th class="table-header" data-i18n="voucher_number">رقم السند</th>
                <th class="table-header" data-i18n="col_date">التاريخ</th>
                <th class="table-header" data-i18n="tx_type_col">نوع الحركة</th>
                <th class="table-header" data-i18n="source_bank">البنك المصدر</th>
                <th class="table-header" data-i18n="receiving_bank">البنك المستلم</th>
                <th class="table-header" data-i18n="partner_label">الشريك</th>
                <th class="table-header" data-i18n="amount">المبلغ</th>
                <th class="table-header" data-i18n="voucher_desc_label">البيان / الوصف</th>
                <th class="table-header" data-i18n="responsible_person">المسؤول</th>
                <th class="table-header no-print" data-i18n="th_options">خيارات</th>
              </tr>
            </thead>
            <tbody id="bank-tx-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
        <div class="no-print" style="text-align:center; margin-top:12px;">
          <button id="bank-load-more" class="btn-secondary" onclick="loadMoreBankTransactions()" style="display:none;">عرض حركات أقدم</button>
        </div>
      </div>
    </div>

    <!-- Bank Statement Modal -->
    <div id="bank-statement-modal" class="modal">
      <div class="modal-content bank-statement-dialog">
        <div class="modal-header bank-statement-header">
          <h3 data-i18n="detailed_bank_statement">🏛️ كشف حساب بنك تفصيلي</h3>
          <button class="modal-close" onclick="closeBankStatementModal()">✖</button>
        </div>
        <div class="modal-body">
          <div class="form-group" style="margin-bottom: 15px;">
            <label style="font-weight:bold; display:block; margin-bottom:5px;" data-i18n="select_bank_label">اختر البنك</label>
            <select id="bank-statement-account-id" class="form-control bank-select-dropdown"
              ></select>
          </div>
          <div class="form-group" style="margin-bottom: 15px;">
            <label style="font-weight:bold; display:block; margin-bottom:5px;" data-i18n="date_from">من تاريخ</label>
            <input type="date" id="bank-statement-start-date" class="form-control"
              >
          </div>
          <div class="form-group" style="margin-bottom: 25px;">
            <label style="font-weight:bold; display:block; margin-bottom:5px;" data-i18n="date_to">إلى تاريخ</label>
            <input type="date" id="bank-statement-end-date" class="form-control"
              >
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn-secondary" onclick="closeBankStatementModal()"
              data-i18n="btn_cancel">إلغاء</button>
            <button class="btn-submit" onclick="printBankStatementReport()"
              style="padding: 10px 20px; font-size:15px; background-color: var(--kabd);" data-i18n="print_statement_button">🖨️ طباعة الكشف</button>
            <button class="btn-submit" onclick="exportBankStatementExcel()"
              style="padding: 10px 20px; font-size:15px; background-color: #217346;" data-i18n="export_excel_button">📊 تصدير Excel</button>
          </div>
        </div>
      </div>
    </div>`;
})();
