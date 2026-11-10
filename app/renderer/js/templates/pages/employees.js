(function mountEmployeesPage() {
  const sp = new URLSearchParams(window.location.search).get('standalone'); if (sp && sp !== 'employees') return; const root = document.getElementById('employees-page-root');
  if (!root) return;
  root.innerHTML = `<!-- ═══ TAB: EMPLOYEES ═══ -->
    <div class="tab-content" id="tab-employees">
      <!-- Top actions -->
      <div class="no-print employees-topbar">
        <button class="btn-submit employee-top-action" onclick="openEmployeeModal()"
          data-i18n="add_employee">➕ إضافة موظف</button>
        <button class="btn-secondary employee-top-action" onclick="openAllEmployeesReportModal()"
          data-i18n="all_employees_report">📄 كشف عام للموظفين</button>
        <div class="custom-dropdown employee-picker">
          <input type="text" id="select-employee-input" class="form-control" data-i18n-placeholder="search_emp_placeholder" placeholder="🔍 ابحث أو اختر الموظف..."
            autocomplete="off" oninput="filterEmployees()" onclick="toggleEmployeeDropdown(event)"
            onkeydown="handleEmployeeKeydown(event)">
          <div id="employee-dropdown-list" class="employee-dropdown-list">
          </div>
        </div>
      </div>

      <!-- Employee Management Panel -->
      <div id="employee-management-panel" style="display:none;">

        <!-- Transactions Input -->
        <div class="cashier-card no-print employee-transaction-card">
          <div class="employee-card-header">
            <div class="employee-heading">
              <img id="emp-header-photo" src="" onclick="toggleEmployeePhotoZoom()"
                class="employee-header-photo">
              <div class="card-label employee-section-title"><span
                  data-i18n="emp_record_tx">📝 تسجيل حركة للموظف</span>
                <div style="font-size:12px; margin-top:5px; color:var(--muted);"><span data-i18n="basic_salary">الراتب الأساسي</span>: <strong id="emp-basic-salary" style="color:var(--green2);">0.00</strong> <span class="sys-currency"></span><span id="emp-header-category-wrap" style="display:none; margin-inline-start: 10px;"> | <span data-i18n="employee_category_label">فئة الموظف</span>: <strong id="emp-header-category" style="color:var(--lahmi2);"></strong></span></div>
              </div>
            </div>
            <div class="employee-card-actions">
              <button class="btn-submit"
                onclick="openDisburseSalaryModal()" data-i18n="calculate_disburse_salary">احتساب وصرف الراتب</button>
              <button class="btn-secondary"
                onclick="openSalaryChangeModal()" data-i18n="edit_salary">📈 تعديل راتب</button>
              <button class="btn-secondary" onclick="editCurrentEmployee()" data-i18n="employee_data">✏️ بيانات الموظف</button>
              <button class="btn-primary"
                onclick="window.archiveItem('employee', currentEmployeeId)" data-i18n="archive_button">📦 أرشيف</button>
              <button class="btn-danger" onclick="deleteCurrentEmployee()" data-i18n="delete_button">🗑️ حذف</button>
            </div>
          </div>

          <div class="form-grid employee-transaction-grid">
            <div class="form-group">
              <label class="form-label"><span data-i18n="tx_date">التاريخ</span></label>
              <input type="date" id="emp-tx-date" class="form-control">
            </div>

            <div class="form-group">
              <label class="form-label"><span data-i18n="paid_amount">المبلغ (<span
                    class="sys-currency"></span>)</span></label>
              <input type="number" id="emp-tx-amount" class="form-control" step="any" value="0">
            </div>
            <div class="form-group">
              <label class="form-label"><span data-i18n="payment_source">طريقة الدفع (الحساب)</span></label>
              <select id="emp-tx-account" class="form-control account-dropdown"></select>
            </div>
            <div class="form-group">
              <label class="form-label"><span data-i18n="extra_days_allowance">أيام إضافية (تُحسب بدلات)</span></label>
              <input type="number" id="emp-tx-attendance" class="form-control" step="any" min="0" value="0" oninput="calculateEmployeeSalaryAmounts('attendance')">
            </div>
            <div class="form-group">
              <label class="form-label"><span data-i18n="abs_days">أيام الغياب</span></label>
              <input type="number" id="emp-tx-absence" class="form-control" step="any" min="0" value="0" oninput="calculateEmployeeSalaryAmounts('absence')">
            </div>
            <div class="form-group">
              <label class="form-label"><span data-i18n="deduction_thb">الخصم (<span
                    class="sys-currency"></span>)</span></label>
              <input type="number" id="emp-tx-deductions" class="form-control" step="any" value="0">
            </div>
            <div class="form-group">
              <label class="form-label"><span data-i18n="allowance_thb">البدلات (<span
                    class="sys-currency"></span>)</span></label>
              <input type="number" id="emp-tx-allowances" class="form-control" step="any" value="0">
            </div>
            <div class="form-group employee-notes-field">
              <label class="form-label"><span data-i18n="tx_notes">ملاحظات</span></label>
              <input type="text" id="emp-tx-notes" class="form-control" data-i18n-placeholder="tx_notes_placeholder" placeholder="ملاحظات الحركة"
                >
            </div>
          </div>

          <div class="employee-save-row">
            <button class="btn-submit" onclick="saveEmployeeTx()"><span data-i18n="save_tx">💾 حفظ
                الحركة</span></button>
          </div>
          <div class="employee-statement-filters">
            <div class="employee-filter-group employee-voucher-filter">
              <label class="form-label"><span
                  data-i18n="voucher_number_search">رقم السند (بحث)</span></label>
              <div class="employee-search-row">
                <input type="number" id="emp-tx-search-input" class="form-control"
                  data-i18n-placeholder="voucher_number_short_placeholder" placeholder="رقم السند" onkeydown="if(event.key === 'Enter') handleEmpTxSearch()">
                <button class="btn-primary" onclick="handleEmpTxSearch()" data-i18n="search_button">بحث</button>
              </div>
            </div>
            <div class="employee-filter-group">
              <label class="form-label"><span data-i18n="from_date_opt">من
                  تاريخ (اختياري)</span></label>
              <input type="date" id="emp-print-from" class="form-control">
            </div>
            <div class="employee-filter-group">
              <label class="form-label"><span data-i18n="to_date_opt">إلى
                  تاريخ (اختياري)</span></label>
              <input type="date" id="emp-print-to" class="form-control">
            </div>
            <button class="btn-secondary" onclick="printEmployeeStatement()"><span
                data-i18n="btn_statement">🖨️ كشف حساب</span></button>
            <button class="btn-secondary" onclick="exportEmployeeStatementExcel()" data-i18n="export_excel_button">📊 تصدير Excel</button>
          </div>
        </div>


        <!-- Transactions History Table -->
        <div class="table-container employees-table-container">
          <table class="report-table professional-table">
            <thead>
              <tr>
                <th class="table-header" data-i18n="row_number_short">م</th>
                <th class="table-header"><span data-i18n="tx_date">التاريخ</span></th>
                <th class="table-header"><span data-i18n="th_amount">المبلغ</span></th>
                <th class="table-header"><span data-i18n="th_att_abs">حضور/غياب</span></th>
                <th class="table-header"><span data-i18n="th_ded_allow">خصم/بدل</span></th>
                <th class="table-header"><span data-i18n="tx_notes">ملاحظات</span></th>
                <th class="table-header no-print"><span data-i18n="th_options">خيارات</span></th>
              </tr>
            </thead>
            <tbody id="emp-tx-tbody">
              <!-- Dynamic Data -->
            </tbody>
          </table>
        </div>

      </div>
    </div>`;
})();

