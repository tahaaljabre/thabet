export const managementSections = `    <!-- User Management -->
    <div class="setting-section cashier-card" id="section-users" style="display: none;">
      <div class="card-label" style="margin-bottom:15px; color:var(--lahmi2)" data-i18n="settings_tab_users">👥 إدارة المستخدمين</div>
      
      <input type="hidden" id="edit-user-id" value="">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
        <input type="text" id="new-user-name" class="form-control" data-i18n-placeholder="username" placeholder="اسم المستخدم">
        <input type="password" id="new-user-pass" class="form-control" data-i18n-placeholder="password_optional" placeholder="كلمة المرور (اتركه فارغاً لعدم التغيير)">
        <select id="new-user-role" class="form-control">
          <option value="cashier" data-i18n="cashier_role">كاشير</option>
          <option value="manager" data-i18n="manager_role">مدير النظام</option>
        </select>
      </div>

      <div style="margin-bottom: 15px; background: rgba(0,0,0,0.02); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
        <strong style="display: block; margin-bottom: 10px; font-size: 13px;" data-i18n="permissions_label">الصلاحيات:</strong>
        <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 13px;">
          <label data-i18n="menu_customers"><input type="checkbox" id="perm-sales" checked> المبيعات</label>
          <label data-i18n="menu_employees"><input type="checkbox" id="perm-employees" checked> الموظفين</label>
          <label data-i18n="suppliers_purchases_permission"><input type="checkbox" id="perm-suppliers" checked> الموردين والمشتريات</label>
          <label data-i18n="reports_permission"><input type="checkbox" id="perm-reports" checked> التقارير</label>
          <label data-i18n="vault_expenses_permission"><input type="checkbox" id="perm-vault"> الخزنة والمصروفات</label>
        </div>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button class="btn-submit" id="btn-save-user" style="margin:0; flex: 1;" data-i18n="add_save">إضافة / حفظ</button>
        <button class="btn-secondary" id="btn-cancel-edit-user" style="margin:0; display:none; flex: 1;" data-i18n="cancel_edit">إلغاء التعديل</button>
      </div>
      
      <table class="report-table" style="width:100%;">
        <thead>
          <tr style="background: var(--primary); color: white;">
            <th style="padding: 10px;" data-i18n="username">اسم المستخدم</th>
            <th style="padding: 10px;" data-i18n="permission_type">نوع الصلاحية</th>
            <th style="padding: 10px;" data-i18n="th_action">إجراء</th>
          </tr>
        </thead>
        <tbody id="users-tbody"></tbody>
      </table>
    </div>

    <!-- Cashiers Management -->
    <div class="setting-section cashier-card" id="section-cashiers" style="display: none;">
      <div class="card-label" style="margin-bottom:15px; color:var(--lahmi2)" data-i18n="settings_tab_cashiers">🏧 إدارة الكاشيرات</div>
      <input type="hidden" id="edit-cashier-id" value="">
      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <input type="text" id="new-cashier-name" class="form-control" data-i18n-placeholder="cashier_location" placeholder="اسم الدور/الكاشير" style="flex:1;">
        <input type="text" id="new-cashier-user" class="form-control" data-i18n-placeholder="responsible_employee" placeholder="الموظف المسؤول" style="flex:1;">
        <button class="btn-submit" id="btn-save-cashier" style="margin:0;" data-i18n="add_edit">إضافة/تعديل</button>
        <button class="btn-secondary" id="btn-cancel-edit-cashier" style="margin:0; display:none;" data-i18n="btn_cancel">إلغاء</button>
      </div>
      <table class="report-table" style="width:100%;">
        <thead>
          <tr style="background: var(--primary); color: white;">
            <th style="padding: 10px;" data-i18n="location_name">الاسم (الموقع)</th>
            <th style="padding: 10px;" data-i18n="employee_word">الموظف</th>
            <th style="padding: 10px;" data-i18n="th_action">إجراء</th>
          </tr>
        </thead>
        <tbody id="cashiers-tbody"></tbody>
      </table>
    </div>

    <!-- Partners Management -->
    <div class="setting-section cashier-card" id="section-partners" style="display: none;">
      <div class="card-label" style="margin-bottom:15px; color:var(--lahmi2)" data-i18n="settings_tab_partners">🤝 إدارة الشركاء</div>
      <input type="hidden" id="edit-partner-id" value="">
      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <input type="text" id="settings-new-partner-name" class="form-control" data-i18n-placeholder="closing_partner_name" placeholder="اسم الشريك" style="flex:1;">
        <input type="text" id="settings-new-partner-phone" class="form-control" data-i18n-placeholder="phone_optional" placeholder="رقم الهاتف (اختياري)" style="flex:1;">
        <button class="btn-submit" id="btn-save-settings-partner" style="margin:0;" data-i18n="add_edit">إضافة/تعديل</button>
        <button class="btn-secondary" id="btn-cancel-edit-partner" style="margin:0; display:none;" data-i18n="btn_cancel">إلغاء</button>
      </div>
      <div class="settings-list-heading">
        <span data-i18n="registered_partners">الشركاء المسجلون</span>
        <span class="settings-list-count" id="partners-count">0</span>
      </div>
      <div class="settings-table-wrap">
        <table class="report-table settings-management-table">
          <thead>
            <tr>
              <th data-i18n="closing_partner_name">اسم الشريك</th>
              <th data-i18n="customer_phone">رقم الهاتف</th>
              <th data-i18n="th_action">إجراء</th>
            </tr>
          </thead>
          <tbody id="settings-partners-tbody">
            <tr><td colspan="3" class="settings-table-message" data-i18n="loading_partners">جاري تحميل الشركاء...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Employee Categories Management -->
    <div class="setting-section cashier-card" id="section-employee-categories" style="display: none;">
      <div class="card-label" style="margin-bottom:15px; color:var(--lahmi2)" data-i18n="settings_tab_employee_categories">🏷️ فئات الموظفين</div>
      <input type="hidden" id="edit-employee-category-id" value="">
      <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <input type="text" id="settings-new-employee-category-name" class="form-control" data-i18n-placeholder="employee_category_name_placeholder" placeholder="اسم الفئة (مثال: مقيم، ابن البلد...)" style="flex:1;">
        <button class="btn-submit" id="btn-save-employee-category" style="margin:0;" data-i18n="add_edit">إضافة/تعديل</button>
        <button class="btn-secondary" id="btn-cancel-edit-employee-category" style="margin:0; display:none;" data-i18n="btn_cancel">إلغاء</button>
      </div>
      <div class="settings-list-heading">
        <span data-i18n="registered_employee_categories">فئات الموظفين المسجلة</span>
        <span class="settings-list-count" id="employee-categories-count">0</span>
      </div>
      <div class="settings-table-wrap">
        <table class="report-table settings-management-table">
          <thead>
            <tr>
              <th data-i18n="employee_category_name_col">اسم الفئة</th>
              <th data-i18n="employee_category_count_col">عدد الموظفين</th>
              <th data-i18n="th_action">إجراء</th>
            </tr>
          </thead>
          <tbody id="settings-employee-categories-tbody">
            <tr><td colspan="3" class="settings-table-message" data-i18n="loading_employee_categories">جاري تحميل فئات الموظفين...</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
