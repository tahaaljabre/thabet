(function mountClosingPage() {
  const sp = new URLSearchParams(window.location.search).get('standalone'); if (sp && sp !== 'closing') return; const root = document.getElementById('closing-page-root');
  if (!root) return;
  root.innerHTML = `<!-- ═══ TAB: CLOSING ═══ -->
    <div class="tab-content" id="tab-closing" style="display: none;">
      <div class="cashier-card closing-main-card">
        <div class="card-label closing-page-title" data-i18n="closing_system_title">🏁 نظام إقفال السنة
          المالية وتوزيع الأرباح</div>

        <!-- Step display of closing calculations -->
        <div class="closing-section">
          <h4 data-i18n="closing_profit_loss_title">حساب أرباح وخسائر السنة المالية الحالية</h4>
          <div class="closing-calculate-row">
            <button id="btn-calc-closing" class="btn-primary" onclick="calculateClosingFigures()"
              >
              <span class="btn-text" data-i18n="calculate_operating_figures">🔄 حساب الأرقام التشغيلية</span>
            </button>
          </div>
          <div class="closing-dashboard">
            <div class="closing-card">
              <div class="closing-card-title">📈 <span data-i18n="lbl_closing_sales">إجمالي المبيعات</span></div>
              <input type="text" id="closing-sales" class="closing-card-value" readonly>
            </div>
            <div class="closing-card">
              <div class="closing-card-title">🛒 <span data-i18n="lbl_closing_expenses">إجمالي المصروفات</span></div>
              <input type="text" id="closing-total-expenses" class="closing-card-value" readonly>
              <div class="closing-expense-breakdown">
                (<span data-i18n="closing_paid_purchases">مشتريات مسددة</span>: <span id="closing-purchases-detail">0</span> | <span data-i18n="closing_expense_employees">موظفين</span>: <span
                id="closing-employees-detail">0</span> <small data-i18n="closing_employee_cost_note">(المبالغ المصروفة فعليًا؛ المستحقات والخصومات تبقى في كشف الموظف)</small> | <span data-i18n="closing_expense_operations">تشغيل</span>: <span id="closing-operating-detail">0</span>
                | <span data-i18n="closing_expense_commissions">عمولات التطبيقات</span>: <span id="closing-commissions-detail">0</span>)
              </div>
            </div>
            <div class="closing-card card-profit" style="order:10;">
              <div class="closing-card-title"><span data-i18n="closing_accounting_net_profit">الربح المحاسبي قبل استبعاد المديونيات</span></div>
              <input type="text" id="closing-accounting-netprofit" class="closing-card-value" readonly>
            </div>
            <div class="closing-card card-profit">
              <div class="closing-card-title">💰 <span data-i18n="lbl_closing_netprofit">صافي الأرباح</span></div>
              <input type="text" id="closing-netprofit" class="closing-card-value" readonly>
            </div>
            <div class="closing-card" style="border-top:4px solid #b45309; order:10;">
              <div class="closing-card-title" data-i18n="closing_employee_receivables">مديونيات الموظفين المستبعدة من التوزيع</div>
              <input type="text" id="closing-employee-receivables" class="closing-card-value" readonly>
              <small data-i18n="closing_employee_receivables_hint">تُرحّل كرصيد مدين على الموظفين ولا تدخل في ربح التوزيع حتى تحصيلها.</small>
            </div>
            <div class="closing-card card-zakat">
              <div class="closing-card-title">🤲 <span data-i18n="lbl_closing_zakat">الزكاة المستحقة (2.5%)</span></div>
              <input type="text" id="closing-zakat" class="closing-card-value" readonly>
            </div>
            <div class="closing-card card-distrib">
              <div class="closing-card-title closing-distribution-title">💎 <span
                  data-i18n="lbl_closing_distributable">الأرباح القابلة للتوزيع</span></div>
              <input type="text" id="closing-distributable" class="closing-card-value" readonly>
            </div>
            <div class="closing-card" style="border-top:4px solid #2563eb;">
              <div class="closing-card-title" data-i18n="closing_total_liquidity">🏦 إجمالي السيولة في البنوك والصندوق</div>
              <input type="text" id="closing-total-liquidity" class="closing-card-value" readonly>
            </div>
            <div class="closing-card" style="border-top:4px solid #dc2626;">
              <div class="closing-card-title" data-i18n="closing_supplier_debts">📦 إجمالي المتبقي للموردين</div>
              <input type="text" id="closing-supplier-debts" class="closing-card-value" readonly>
              <small data-i18n="closing_supplier_debts_hint">التزام يُرحّل للسنة التالية ولا يُخصم من السيولة حتى السداد.</small>
            </div>
          </div>
          <h4 data-i18n="closing_commissions_title">عمولات تطبيقات التوصيل المحتسبة</h4>
          <div class="closing-dashboard">
            <div class="closing-card" style="border-top:4px solid #15803d;">
              <div class="closing-card-title" data-i18n="dashboard_grab_commission">عمولة GrabFood</div>
              <input type="text" id="closing-grab-commission-amount" class="closing-card-value" readonly>
              <small><span data-i18n="dashboard_commission_rate">النسبة الفعلية</span>: <b id="closing-grab-commission-rate" dir="ltr">0.00%</b></small>
            </div>
            <div class="closing-card" style="border-top:4px solid #a16207;">
              <div class="closing-card-title" data-i18n="dashboard_lineman_commission">عمولة LineMan</div>
              <input type="text" id="closing-lineman-commission-amount" class="closing-card-value" readonly>
              <small><span data-i18n="dashboard_commission_rate">النسبة الفعلية</span>: <b id="closing-lineman-commission-rate" dir="ltr">0.00%</b></small>
            </div>
            <div class="closing-card" style="border-top:4px solid #7c3aed;">
              <div class="closing-card-title" data-i18n="dashboard_app_commissions_total">إجمالي عمولات التطبيقات</div>
              <input type="text" id="closing-commissions-total-card" class="closing-card-value" readonly>
            </div>
          </div>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;line-height:1.9;color:#1e3a8a;font-size:13px;">
            <strong data-i18n="closing_calculation_method">طريقة الحساب:</strong><br>
            <span data-i18n="closing_profit_formula">1) صافي الربح = المبيعات − المشتريات المسددة − المبالغ المصروفة للموظفين − المصروفات التشغيلية − عمولات التطبيقات.</span><br>
            <span data-i18n="closing_zakat_formula">2) الزكاة المستحقة = صافي الربح الموجب × 2.5%.</span><br>
            <span data-i18n="closing_distributable_formula">3) الربح القابل للتوزيع = صافي الربح − الزكاة المستحقة.</span><br>
            <span data-i18n="closing_liquidity_formula">4) إجمالي السيولة = مجموع الأرصدة الحالية للبنوك والصندوق، وهو رقم مستقل عن الربح.</span><br>
            <span data-i18n="closing_supplier_debts_formula">5) المتبقي للموردين يُرحّل تلقائيًا إلى السنة التالية، ولا يصبح مصروفًا مدفوعًا إلا عند تسجيل سند السداد.</span><br>
            <strong style="color:#9a3412;" data-i18n="closing_zakat_payment_note">عند الإقفال تُسجل الزكاة كمستحق فقط، ولا ينخفض رصيد البنك أو الصندوق إلا عند دفعها بسند صرف فعلي.</strong>
          </div>
        </div>
        <!-- Bank Balances section -->
        <div class="closing-section">
          <h4 data-i18n="closing_bank_audit_title">أرصدة الحسابات البنكية والصناديق (التدقيق المالي)</h4>
          <div id="closing-banks-container" class="closing-banks-grid">
            <!-- Filled dynamically via events.js -->
            <div class="closing-empty-message" data-i18n="closing_calculate_prompt">يرجى الضغط على حساب الأرقام التشغيلية أولًا.</div>
          </div>
        </div>

        <!-- Partners Profit Distribution -->
        <div class="closing-section">
          <h4 data-i18n="closing_partners_title">توزيع الأرباح بين الشركاء</h4>
          <div class="closing-partner-form">
            <input type="text" id="partner-name" class="form-control"
              data-i18n-placeholder="closing_partner_name" placeholder="اسم الشريك">
            <input type="number" id="partner-percentage" class="form-control"
              data-i18n-placeholder="closing_partner_pct" placeholder="نسبة الشريك (%)">
            <button class="btn-submit" onclick="addPartner()"
              data-i18n="btn_add_partner">➕ إضافة شريك</button>
          </div>

          <div class="table-container closing-partners-table-container">
            <table class="report-table professional-table" style="margin-bottom: 15px;">
              <thead>
                <tr>
                  <th data-i18n="col_partner_name">اسم الشريك</th>
                  <th data-i18n="col_partner_pct">النسبة (%)</th>
                  <th data-i18n="col_partner_gross">الحصة الإجمالية</th>
                  <th data-i18n="annual_withdrawals_column">المسحوبات السنوية</th>
                  <th data-i18n="col_partner_net">صافي الحصة المتبقية</th>
                  <th data-i18n="th_action">إجراء</th>
                </tr>
              </thead>
              <tbody id="partners-tbody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>

          <div class="closing-distribution-total"
            id="distribution-total-pct">إجمالي النسب الموزعة: 0%</div>
        </div>

        <!-- Submit and Lock -->
        <div class="closing-final-actions">
          <button class="btn-submit" onclick="executeYearEndClosing()" id="btn-execute-closing"
            data-i18n="closing_execute_button">
            🔒 تنفيذ إقفال السنة المالية وقفل الحسابات
          </button>
          <button class="btn-secondary" onclick="printClosingReportPreview()"
            data-i18n="closing_print_report_button">
            🖨️ طباعة تقرير الإقفال المالي
          </button>
          <button class="btn-secondary" onclick="exportClosingReportExcel()" data-i18n="export_excel_button">📊 تصدير Excel</button>
        </div>
      </div>
    </div>`;
})();
