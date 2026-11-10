const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');

const replacement = `<!-- User Management Section -->
        <div id="setting-section-users" class="setting-section" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 20px; display: none;">
          <h4 style="margin-top: 0; color: var(--primary-color);" data-i18n="settings_users">👥 إدارة المستخدمين</h4>
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
             <input type="hidden" id="edit-user-id" value="">
             <input type="text" id="new-user-name" class="form-control" placeholder="اسم المستخدم" style="flex:1;">
             <input type="password" id="new-user-pass" class="form-control" placeholder="كلمة المرور (اختياري عند التعديل)" style="flex:1;">
             <button id="btn-save-user" class="btn-submit" onclick="saveUser()" style="margin:0; padding:5px 15px;">إضافة / حفظ</button>
             <button id="btn-cancel-edit-user" class="btn-secondary" onclick="cancelEditUser()" style="margin:0; padding:5px 15px; display:none;" data-i18n="btn_cancel">إلغاء</button>
          </div>
          <div style="margin-bottom: 10px; font-size:13px; display:flex; gap:10px; flex-wrap: wrap;">
             <label><input type="checkbox" id="perm-sales" checked> المبيعات</label>
             <label><input type="checkbox" id="perm-employees" checked> الموظفين</label>
             <label><input type="checkbox" id="perm-suppliers" checked> الموردين</label>
             <label><input type="checkbox" id="perm-reports" checked> التقارير</label>
             <label><input type="checkbox" id="perm-vault"> الصندوق</label>
          </div>
          <table class="expenses-table" style="width:100%; margin-top:10px;">
            <thead>
              <tr><th>اسم المستخدم</th><th>الدور</th><th><span data-i18n="th_action">إجراء</span></th></tr>
            </thead>
            <tbody id="users-tbody"></tbody>
          </table>
        </div>
  
        <!-- Cashier Management Section -->
        <div id="setting-section-cashiers" class="setting-section" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 20px; display: none;">
          <h4 style="margin-top: 0; color: var(--primary-color);" data-i18n="settings_cashiers">🏧 إدارة الكاشيرات</h4>
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
             <input type="hidden" id="edit-cashier-id" value="">
             <input type="text" id="new-cashier-name" class="form-control" placeholder="اسم الكاشير (مثال: الدور الأول)" style="flex:1;">
             <input type="text" id="new-cashier-user" class="form-control" placeholder="الموظف المسؤول (المستخدم الفعلي)" style="flex:1;">
             <button id="btn-save-cashier" class="btn-submit" onclick="saveCashier()" style="margin:0; padding:5px 15px;">إضافة / حفظ</button>
             <button id="btn-cancel-edit-cashier" class="btn-secondary" onclick="cancelEditCashier()" style="margin:0; padding:5px 15px; display:none;" data-i18n="btn_cancel">إلغاء</button>
          </div>
          <table class="expenses-table" style="width:100%; margin-top:10px;">
            <thead>
              <tr><th>اسم الكاشير</th><th>الموظف المسؤول</th><th><span data-i18n="th_action">إجراء</span></th></tr>
            </thead>
            <tbody id="cashiers-tbody"></tbody>
          </table>
        </div>
  
        <!-- Partners Section -->
        <div id="setting-section-partners" class="setting-section" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 20px; display: none;">
          <h4 style="margin-top: 0; color: var(--primary-color);">🤝 إدارة الشركاء</h4>
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
             <input type="hidden" id="edit-partner-id" value="">
             <input type="hidden" id="edit-partner-oldname" value="">
             <input type="text" id="new-settings-partner-name" class="form-control" placeholder="اسم الشريك" style="flex:1;">
             <input type="text" id="new-settings-partner-phone" class="form-control" placeholder="رقم الهاتف (اختياري)" style="flex:1;">
             <button id="btn-save-settings-partner" class="btn-submit" onclick="saveSettingsPartner()" style="margin:0; padding:5px 15px;">إضافة / حفظ</button>
             <button id="btn-cancel-edit-partner" class="btn-secondary" onclick="cancelEditSettingsPartner()" style="margin:0; padding:5px 15px; display:none;">إلغاء</button>
          </div>
          <table class="expenses-table" style="width:100%; margin-top:10px;">
            <thead>
              <tr><th>اسم الشريك</th><th>رقم الهاتف</th><th>إجراء</th></tr>
            </thead>
            <tbody id="settings-partners-tbody"></tbody>
          </table>
        </div>
  
        <!-- Clear Data Section -->
        <div id="setting-section-clear" class="setting-section" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 20px; display: none; border-color: var(--red);">
          <h4 style="margin-top: 0; color: var(--red);">🗑️ مسح بيانات النظام</h4>
          <p style="font-size: 13px; color: var(--text-color); margin-bottom: 15px;">تحذير شديد: هذا الإجراء سيقوم بحذف جميع البيانات في النظام نهائياً. لا يمكن التراجع عن هذه الخطوة.</p>
          <button class="btn-action" style="background-color: var(--red); color: white; width:100%;" onclick="clearAllDataPrompt()">⚠️ مسح جميع البيانات نهائياً</button>
        </div>
  
        <!-- Delivery Commissions Section -->
        <div id="setting-section-commissions" class="setting-section" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 20px; display: none;">
          <h4 style="margin-top: 0; color: var(--primary-color);">🚚 عمولات التوصيل</h4>
          <div class="form-group" style="display:flex; gap:10px;">
            <div style="flex:1;">
              <label>عمولة Grab (%)</label>
              <input type="number" id="setting-grab-commission" class="form-control" placeholder="مثال: 30" min="0" max="100">
            </div>
            <div style="flex:1;">
              <label>عمولة Lineman (%)</label>
              <input type="number" id="setting-lineman-commission" class="form-control" placeholder="مثال: 30" min="0" max="100">
            </div>
          </div>
        </div>

      <!-- Close settings-content -->
      </div>
      
    <!-- Close settings-layout (modal-body) -->
    </div>
    
    <div style="font-size: 11px; text-align: center; color: var(--muted); border-top: 1px solid var(--border); padding: 10px; background: var(--dark);">
      تصميم: ثابت صالح | برمجة وتطوير: طه اليافعي | إصدار: 1.0.0
    </div>
    
    <div class="modal-footer" style="display: flex; justify-content: space-between;">
      <button class="btn-cancel" onclick="closeSettingsModal()" data-i18n="btn_cancel">إلغاء</button>
      <button class="btn-submit" onclick="saveSettings()" style="margin-top: 0;">حفظ التغييرات</button>
    </div>
  </div>
</div>

<!-- LOGIN MODAL -->
<div id="login-modal" class="modal no-print" style="display: flex; background: var(--bg-color); z-index: 9999;">
  <div class="modal-content" style="max-width: 400px; margin: auto; text-align: center;">
    <div class="modal-header">
      <h3 id="login-title">تسجيل الدخول</h3>
    </div>
    <div class="modal-body" style="text-align: right;">
      <p id="login-desc" style="font-size: 13px; margin-bottom: 15px;">الرجاء اختيار السنة المالية وإدخال بيانات الدخول.</p>
      <div class="form-group">
        <label>السنة المالية</label>
        <select id="login-year-select" class="form-control" style="padding:8px; height:38px;"></select>
      </div>
      <div class="form-group">
        <label>اسم المستخدم</label>
        <input type="text" id="login-username" class="form-control" placeholder="اسم المستخدم">
      </div>
      <div class="form-group">
        <label>كلمة المرور</label>
        <input type="password" id="login-password" class="form-control" placeholder="كلمة المرور">
      </div>
    </div>
    <div class="modal-footer" style="display: flex; justify-content: center;">
      <button class="btn-submit" id="btn-login-action" onclick="performLogin()" style="width: 100%; margin-top: 0;">تسجيل الدخول</button>
    </div>
  </div>
</div>

<!-- Year Selection Modal -->`;

const startIndex = html.indexOf('<!-- User Management Section -->');
const endIndex = html.indexOf('<!-- Year Selection Modal -->');

if (startIndex !== -1 && endIndex !== -1) {
  html = html.substring(0, startIndex) + replacement + html.substring(endIndex);
  fs.writeFileSync(file, html, 'utf8');
  console.log('Restored login modal and fixed settings section!');
} else {
  console.log('Could not find boundaries.');
  console.log('start', startIndex, 'end', endIndex);
}
