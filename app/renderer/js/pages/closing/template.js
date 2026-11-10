export function getTemplate() {
  return `
  <div class="cashier-card">
    <div class="card-label" style="margin-bottom:15px; font-size:16px; color:var(--red);" data-i18n="closing_system_title">🏁 نظام إقفال السنة المالية وتوزيع الأرباح</div>
    
    <!-- Step display of closing calculations -->
    <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 20px;">
      <h4 style="margin-top:0; color: var(--primary);" data-i18n="closing_profit_loss_title">حساب أرباح وخسائر السنة المالية الحالية</h4>
      <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 15px;">
        <button id="btn-calc-closing" class="btn-primary" style="padding: 8px 16px; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
          <span class="btn-text" data-i18n="calculate_operating_figures">🔄 حساب الأرقام التشغيلية</span>
        </button>
      </div>
      <style>
        .closing-dashboard {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
        }
        .closing-card {
          background: var(--panel-bg, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .closing-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 15px rgba(0,0,0,0.1);
        }
        .closing-card-title {
          font-size: 15px;
          color: var(--muted, #64748b);
          margin-bottom: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .closing-card-value {
          width: 100%;
          background: transparent;
          border: none;
          text-align: center;
          font-size: 26px;
          font-weight: bold;
          color: var(--text-color, #1e293b);
          outline: none;
          cursor: default;
        }
        /* Specific Colors */
        .card-profit { border-top: 4px solid var(--green2, #10b981); }
        .card-profit .closing-card-value { color: var(--green2, #10b981); font-size: 30px; }
        .card-zakat { border-top: 4px solid var(--red, #ef4444); }
        .card-zakat .closing-card-value { color: var(--red, #ef4444); }
        .card-distrib { border-top: 4px solid var(--primary, #3b82f6); background: rgba(59, 130, 246, 0.05); }
        .card-distrib .closing-card-value { color: var(--primary, #3b82f6); font-size: 32px; }
      </style>
      <div class="closing-dashboard">
        <div class="closing-card">
          <div class="closing-card-title" data-i18n="lbl_closing_sales">📈 إجمالي المبيعات</div>
          <input type="text" id="closing-sales" class="closing-card-value" readonly>
        </div>
        <div class="closing-card">
          <div class="closing-card-title" data-i18n="closing_total_expenses">🛒 إجمالي المصروفات</div>
          <input type="text" id="closing-total-expenses" class="closing-card-value" readonly>
          <div style="font-size: 11px; color: var(--muted); margin-top: 5px; text-align: center; direction: rtl;">
            (<span data-i18n="closing_paid_purchases">مشتريات مسددة</span>: <span id="closing-purchases-detail">0</span> | <span data-i18n="lbl_closing_employees">موظفين</span>: <span id="closing-employees-detail">0</span> | <span data-i18n="lbl_closing_operating">تشغيل</span>: <span id="closing-operating-detail">0</span> | <span data-i18n="closing_expense_commissions">عمولات التطبيقات</span>: <span id="closing-commissions-detail">0</span>)
          </div>
        </div>
        <div class="closing-card card-profit">
          <div class="closing-card-title" data-i18n="lbl_closing_netprofit">💰 صافي الأرباح</div>
          <input type="text" id="closing-netprofit" class="closing-card-value" readonly>
        </div>
        <div class="closing-card card-zakat">
          <div class="closing-card-title" data-i18n="zakat_due_card">🤲 الزكاة المستحقة (2.5%)</div>
          <input type="text" id="closing-zakat" class="closing-card-value" readonly>
        </div>
        <div class="closing-card card-distrib" style="grid-column: 1 / -1; padding: 30px;">
          <div class="closing-card-title" style="font-size: 18px; justify-content: center;" data-i18n="distributable_profit_card">💎 الأرباح القابلة للتوزيع</div>
          <input type="text" id="closing-distributable" class="closing-card-value" readonly>
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
    </div>

    <!-- Partners Profit Distribution -->
    <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 20px;">
      <h4 style="margin-top:0; color: var(--primary);" data-i18n="closing_partners_title">توزيع الأرباح بين الشركاء</h4>
      <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
        <input type="text" id="partner-name" class="form-control" data-i18n-placeholder="closing_partner_name" placeholder="اسم الشريك" style="flex:2; padding: 10px;">
        <input type="number" id="partner-percentage" class="form-control" data-i18n-placeholder="closing_partner_pct" placeholder="نسبة الشريك (%)" style="flex:1; padding: 10px;">
        <button class="btn-submit" id="btn-add-partner" style="margin: 0; padding: 10px 20px;" data-i18n="btn_add_partner">➕ إضافة شريك</button>
      </div>
      
      <div class="table-container">
        <table class="report-table professional-table" style="margin-bottom: 15px;">
          <thead>
            <tr>
              <th data-i18n="closing_partner_name">اسم الشريك</th>
              <th data-i18n="col_partner_pct">النسبة (%)</th>
              <th><span data-i18n="gross_share_column">الحصة الإجمالية</span> (${window.appSettings?.currency || ''})</th>
              <th><span data-i18n="annual_withdrawals_column">المسحوبات السنوية</span> (${window.appSettings?.currency || ''})</th>
              <th><span data-i18n="net_remaining_share_column">صافي الحصة المتبقية</span> (${window.appSettings?.currency || ''})</th>
              <th data-i18n="th_action">إجراء</th>
            </tr>
          </thead>
          <tbody id="partners-tbody">
            <!-- Rendered dynamically -->
          </tbody>
        </table>
      </div>
      
      <div style="font-size:14px; font-weight:bold; color:var(--muted); text-align:right;" id="distribution-total-pct" data-i18n="distribution_total_prefix">إجمالي النسب الموزعة: 0%</div>
    </div>

    <!-- Submit and Lock -->
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      <button class="btn-submit" id="btn-execute-closing" style="flex: 2; font-size: 16px; padding: 15px; background-color: var(--red); border-color: var(--red);">
        <span data-i18n="btn_execute_closing">🔒 تنفيذ إقفال السنة المالية وقفل الحسابات</span>
      </button>
      <button class="btn-secondary" id="btn-print-closing" style="flex: 1; font-size: 16px; padding: 15px;">
        <span data-i18n="btn_print_closing_preview">🖨️ طباعة تقرير الإقفال المالي</span>
      </button>
    </div>
  </div>
  `;
}
