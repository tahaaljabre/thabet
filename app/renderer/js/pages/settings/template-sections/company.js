export const companySections = `    <!-- Company Info -->
    <div class="setting-section cashier-card" id="section-company" style="display: block;">
      <div class="card-label" style="margin-bottom:15px; color:var(--lahmi2)" data-i18n="company_section_title">🏢 معلومات المطعم / الشركة</div>
      
      <!-- Upload Logo -->
      <div style="text-align: center; margin-bottom: 20px;">
        <div id="setting-logo-preview" style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden; margin: 0 auto 10px auto; border: 2px dashed var(--border-color); display: flex; align-items: center; justify-content: center; background: #fff;">
          <span style="color: var(--muted); font-size: 12px;" data-i18n="logo_label">شعار</span>
        </div>
        <input type="file" id="setting-logo-upload" accept="image/*" style="display: none;">
        <button class="btn-secondary" onclick="document.getElementById('setting-logo-upload').click()" style="padding: 5px 15px; font-size: 13px;" data-i18n="change_logo">تغيير الشعار</button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div class="form-group">
          <label data-i18n="restaurant_name">اسم المطعم</label>
          <input type="text" id="setting-company-name" class="form-control" data-i18n-placeholder="restaurant_name_placeholder" placeholder="أدخل اسم المطعم">
        </div>
        <div class="form-group">
          <label data-i18n="company_tax">الرقم الضريبي</label>
          <input type="text" id="setting-tax-number" class="form-control" data-i18n-placeholder="tax_placeholder" placeholder="الرقم الضريبي إن وجد">
        </div>
        <div class="form-group" style="grid-column: span 2;">
          <label data-i18n="company_address">العنوان</label>
          <input type="text" id="setting-address" class="form-control" data-i18n-placeholder="address_placeholder" placeholder="عنوان المطعم">
        </div>
        <div class="form-group">
          <label data-i18n="customer_phone">رقم الهاتف</label>
          <input type="text" id="setting-phone" class="form-control" data-i18n-placeholder="contact_placeholder" placeholder="أرقام التواصل">
        </div>
        <div class="form-group">
          <label data-i18n="default_currency">العملة الافتراضية</label>
          <input type="text" id="setting-currency" class="form-control" data-i18n-placeholder="currency_placeholder" placeholder="مثال: ريال أو $">
        </div>
        <div class="form-group">
          <label data-i18n="salary_due_day">يوم استحقاق الراتب الشهري (1 - 31)</label>
          <input type="number" id="setting-salary-accrual-day" class="form-control" min="1" max="31" placeholder="مثال: 28">
        </div>
        <div class="form-group">
          <label data-i18n="vat_rate_label">نسبة ضريبة القيمة المضافة (%)</label>
          <input type="number" id="setting-vat-rate" class="form-control" min="0" max="100" step="0.01" data-i18n-placeholder="vat_rate_placeholder" placeholder="مثال: 15">
        </div>
        <div class="form-group" style="grid-column: span 2;">
          <label style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="setting-vat-enabled">
            <span data-i18n="vat_enabled_label">تفعيل ضريبة القيمة المضافة على المبيعات</span>
          </label>
          <small style="color:var(--muted);" data-i18n="vat_inclusive_hint">تُعامل مبالغ قنوات البيع كمبالغ شاملة للضريبة، وتُفصل الضريبة تلقائياً في القيد المحاسبي.</small>
        </div>
      </div>
      <div style="margin-top: 20px;">
        <button class="btn-submit" id="btn-save-company-info" style="width: 100%; padding: 10px;" data-i18n="save_company_info">💾 حفظ بيانات الشركة</button>
      </div>
    </div>

    <!-- Theme & Language -->
    <div class="setting-section cashier-card" id="section-theme" style="display: none;">
      <div class="card-label" style="margin-bottom:20px; color:var(--lahmi2)" data-i18n="settings_tab_theme">🎨 المظهر واللغة</div>
      
      <div style="background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: 12px; padding: 0 15px;">
        <div class="theme-row">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="theme-icon">💡</div>
            <div>
              <div style="font-weight: bold; color: var(--text-color);" data-i18n="settings_light_mode">الوضع الفاتح (Light Mode)</div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 3px;" data-i18n="light_mode_description">تفعيل الألوان البيضاء الساطعة للتطبيق</div>
            </div>
          </div>
          <label class="switch">
            <input type="checkbox" id="setting-theme-toggle">
            <span class="slider"></span>
          </label>
        </div>

        <div class="theme-row">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="theme-icon">🌐</div>
            <div>
              <div style="font-weight: bold; color: var(--text-color);" data-i18n="settings_language">لغة البرنامج (Language)</div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 3px;" data-i18n="language_description">اختر لغة واجهة النظام الرئيسية</div>
            </div>
          </div>
          <select id="setting-language" class="form-control" style="width: auto; min-width: 140px; padding: 8px; border-radius: 8px;">
            <option value="ar" data-i18n="arabic_language">العربية</option>
            <option value="en" data-i18n="english_language">الإنجليزية</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Commissions -->
    <div class="setting-section cashier-card" id="section-commissions" style="display: none;">
      <div class="card-label" style="margin-bottom:15px; color:var(--lahmi2)" data-i18n="commissions_settings_title">🛵 إعدادات عمولات منصات التوصيل</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div class="form-group">
          <label data-i18n="lbl_grab_commission">نسبة عمولة GrabFood (%)</label>
          <input type="number" id="setting-grab-commission" class="form-control" placeholder="مثال: 32">
        </div>
        <div class="form-group">
          <label data-i18n="lbl_lineman_commission">نسبة عمولة LineMan (%)</label>
          <input type="number" id="setting-lineman-commission" class="form-control" placeholder="مثال: 32">
        </div>
      </div>
      <p style="font-size: 13px; color: var(--muted); margin-top: 10px;" data-i18n="commissions_hint">* سيتم الخصم تلقائياً من كشف الحساب البنكي عند حفظ أي تقرير يومي.</p>
      <div style="margin-top: 20px;">
        <button class="btn-submit" id="btn-save-commissions" style="width: 100%; padding: 10px;" data-i18n="save_commissions">💾 حفظ إعدادات العمولات</button>
      </div>
    </div>`;
