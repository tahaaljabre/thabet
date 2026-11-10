(function mountDashboardPage() {
  const sp = new URLSearchParams(window.location.search).get('standalone');
  if (sp && sp !== 'dashboard') return;
  const root = document.getElementById('dashboard-page-root');
  if (!root) return;

  const metricCard = (id, labelMarkup, icon, color) => `
    <div class="dash-card">
      <div class="dash-icon" style="color:${color};">${icon}</div>
      <div class="dash-info">
        <p>${labelMarkup}</p>
        <h3 id="${id}" style="color:${color}; direction:ltr; text-align:left;">0.00</h3>
      </div>
    </div>`;

  root.innerHTML = `
    <div id="tab-dashboard" class="tab-content dashboard-page">
      <div class="dashboard-header">
        <h2 id="print-dashboard-title" class="print-only" data-i18n="dashboard_title"
          style="display:none; text-align:center; margin-bottom:20px;"></h2>
        <div>
          <h2 class="dashboard-title" data-i18n="dashboard_title">الشاشة التفاعلية والإحصائيات</h2>
          <p class="dashboard-subtitle" data-i18n="dashboard_executive_summary_hint">
            ملخص تنفيذي للحركة النقدية والالتزامات والرقابة المحاسبية
          </p>
        </div>
        <div class="dashboard-filters">
          <label class="dashboard-date-filter">
            <span data-i18n="date_from">من تاريخ</span>
            <input type="date" id="dash-start-date" class="form-control">
          </label>
          <span class="dashboard-period-separator" data-i18n="period_to">إلى</span>
          <label class="dashboard-date-filter">
            <span data-i18n="date_to">إلى تاريخ</span>
            <input type="date" id="dash-end-date" class="form-control">
          </label>
          <button id="dashboard-refresh-button" class="btn-primary" onclick="loadDashboardData()"
            data-i18n="dashboard_refresh">تحديث</button>
          <button class="btn-secondary no-print dashboard-print-button" onclick="printDashboard()"
            data-i18n="print_button">طباعة</button>
          <button class="btn-secondary no-print dashboard-print-button" onclick="exportDashboardExcel()"
            data-i18n="export_excel_button">تصدير Excel</button>
        </div>
      </div>

      <section class="dashboard-section">
        <div class="dashboard-section-heading">
          <h3 data-i18n="dashboard_executive_summary">الملخص التنفيذي</h3>
        </div>
        <div class="dash-summary-cards dashboard-primary-metrics">
          ${metricCard('dash-val-totalsales', '<span data-i18n="lbl_closing_sales">إجمالي المبيعات</span>', '🛒', '#2563eb')}
          ${metricCard('dash-val-total-expenses', '<span data-i18n="dashboard_paid_expenses_total">إجمالي المصروفات المدفوعة (صندوق وبنوك)</span>', '💸', '#d97706')}
          ${metricCard('dash-val-deficit', '<span data-i18n="dashboard_financial_deficit">العجز المالي</span>', '📉', '#dc2626')}
          ${metricCard('dash-val-app-commissions', '<span data-i18n="dashboard_app_commissions_total">إجمالي عمولات التطبيقات</span>', '📱', '#7c3aed')}
          ${metricCard('dash-val-debts', '<span data-i18n="dashboard_supplier_debts">إجمالي ديون الموردين</span>', '🧾', '#b91c1c')}
          ${metricCard('dash-val-supplier-payments', '<span data-i18n="dashboard_supplier_payments">مبالغ مسددة للموردين</span>', '🚚', '#c2410c')}
          ${metricCard('dash-val-salaries', '<span data-i18n="dashboard_employee_paid_breakdown">مبالغ مدفوعة للموظفين</span>', '👥', '#0f766e')}
          ${metricCard('dash-val-cash-net-flow', '<span data-i18n="dashboard_cash_net_flow">صافي التدفق النقدي</span>', '💧', '#15803d')}
        </div>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-heading">
          <h3 data-i18n="dashboard_visual_analysis">التحليل المالي المرئي</h3>
        </div>
        <div class="dash-charts-grid">
          <div class="dash-chart-container dashboard-chart-wide">
            <h3 data-i18n="dashboard_sales_expenses_daily">المبيعات مقابل مصروفات الاستحقاق يوميًا</h3>
            <canvas id="barChart"></canvas>
          </div>
          <div class="dash-chart-container">
            <h3 data-i18n="dashboard_expense_distribution">توزيع المصروفات</h3>
            <canvas id="doughnutChart"></canvas>
          </div>
          <div class="dash-chart-container dashboard-chart-full">
            <h3 data-i18n="dashboard_profit_revenue_trend">مسار الأرباح والإيرادات</h3>
            <canvas id="lineChart"></canvas>
          </div>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-heading">
          <h3 data-i18n="dashboard_accounting_control">الرقابة المحاسبية</h3>
        </div>

        <div class="cashier-card dashboard-accounting-card">
          <div class="card-label bank-section-title" data-i18n="accounting_trial_balance_title">ميزان المراجعة ودفتر الأستاذ</div>
          <p class="dashboard-card-hint" data-i18n="accounting_trial_balance_hint">يعرض الأرصدة من القيود المزدوجة المرحلة فقط.</p>
          <div class="dashboard-table-wrap">
            <table class="data-table">
              <thead><tr>
                <th data-i18n="accounting_account_code">رمز الحساب</th>
                <th data-i18n="accounting_account_name">اسم الحساب</th>
                <th data-i18n="accounting_debit">مدين</th>
                <th data-i18n="accounting_credit">دائن</th>
                <th data-i18n="accounting_balance">الرصيد</th>
              </tr></thead>
              <tbody id="trial-balance-body"><tr><td colspan="5" data-i18n="loading">جاري التحميل...</td></tr></tbody>
              <tfoot><tr>
                <th colspan="2" data-i18n="grand_totals">المجاميع الكلية</th>
                <th id="trial-balance-debit-total">0.00</th>
                <th id="trial-balance-credit-total">0.00</th>
                <th id="trial-balance-status">—</th>
              </tr></tfoot>
            </table>
          </div>
        </div>

        <div class="cashier-card dashboard-accounting-card">
          <div class="card-label bank-section-title" data-i18n="accounting_general_ledger_title">دفتر الأستاذ العام</div>
          <div class="dashboard-table-wrap dashboard-ledger-table">
            <table class="data-table">
              <thead><tr>
                <th data-i18n="accounting_entry_number">رقم القيد</th>
                <th data-i18n="date_label">التاريخ</th>
                <th data-i18n="accounting_account_name">الحساب</th>
                <th data-i18n="description_label">البيان</th>
                <th data-i18n="accounting_debit">مدين</th>
                <th data-i18n="accounting_credit">دائن</th>
              </tr></thead>
              <tbody id="general-ledger-body"><tr><td colspan="6" data-i18n="loading">جاري التحميل...</td></tr></tbody>
            </table>
          </div>
        </div>

        <div class="cashier-card dashboard-accounting-card">
          <div class="card-label bank-section-title" data-i18n="integrity_check_title">فحص السلامة المالية اليومي</div>
          <p class="dashboard-card-hint" data-i18n="integrity_check_description">
            يطابق الحركات المصدرية مع قيود دفتر الأستاذ ويتحقق من التوازن والتكرار.
          </p>
          <div class="dashboard-integrity-toolbar">
            <div class="form-group">
              <label data-i18n="integrity_check_date">تاريخ الفحص</label>
              <input type="date" id="integrity-check-date" class="form-control">
            </div>
            <button id="run-integrity-check" class="btn-submit" data-i18n="integrity_run_button">تشغيل الفحص الآن</button>
            <strong id="integrity-latest-status" data-i18n="loading">جاري التحميل...</strong>
          </div>
          <div id="integrity-findings" class="dashboard-integrity-findings"></div>
          <div class="dashboard-table-wrap dashboard-integrity-history">
            <table class="data-table">
              <thead><tr>
                <th data-i18n="integrity_check_date">تاريخ الفحص</th>
                <th data-i18n="monthly_period_status">الحالة</th>
                <th data-i18n="integrity_critical_count">أخطاء حرجة</th>
                <th data-i18n="integrity_warning_count">تحذيرات</th>
                <th data-i18n="integrity_trigger">طريقة التشغيل</th>
              </tr></thead>
              <tbody id="integrity-history-body"><tr><td colspan="5" data-i18n="loading">جاري التحميل...</td></tr></tbody>
            </table>
          </div>
        </div>
      </section>
    </div>`;
})();
