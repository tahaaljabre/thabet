const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');

// Function to remove a div and its contents by id
function removeDivById(htmlStr, id) {
  const searchStr = `<div id="${id}"`;
  let idx = htmlStr.indexOf(searchStr);
  while (idx !== -1) {
    let divCount = 1;
    let i = htmlStr.indexOf('>', idx) + 1;
    while (divCount > 0 && i < htmlStr.length) {
      const openIdx = htmlStr.indexOf('<div', i);
      const closeIdx = htmlStr.indexOf('</div', i);
      
      if (closeIdx === -1) break; // Error
      
      if (openIdx !== -1 && openIdx < closeIdx) {
        divCount++;
        i = openIdx + 4;
      } else {
        divCount--;
        i = closeIdx + 6;
      }
    }
    
    // Remove from idx to i
    htmlStr = htmlStr.substring(0, idx) + htmlStr.substring(i);
    // Find next
    idx = htmlStr.indexOf(searchStr);
  }
  return htmlStr;
}

// Remove ALL login modals
html = html.replace(/<!-- LOGIN MODAL -->/g, '');
html = removeDivById(html, 'login-modal');

// Remove year-selection-modal to recreate it properly as well
html = html.replace(/<!-- Year Selection Modal -->/g, '');
html = removeDivById(html, 'year-selection-modal');

const loginAndYearModals = `
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

<!-- Year Selection Modal -->
<div id="year-selection-modal" class="modal no-print" style="display: none; background: rgba(0,0,0,0.85); z-index: 9998; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%;">
  <div class="modal-content" style="max-width: 400px; text-align: center; padding: 25px; border-radius: 12px; background: var(--panel-bg); color: var(--text-color); box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
    <h3 style="margin-top: 0; color: var(--primary); font-size: 20px; font-family: 'Cairo', sans-serif;">مرحباً بك في نظام ثابت</h3>
    <p style="font-size: 14px; margin-bottom: 20px; color: var(--muted);">هذه أول مرة تفتح فيها النظام أو لا توجد سنة مالية. يرجى إنشاء سنة مالية:</p>
    <select id="select-financial-year" class="form-control" style="width: 100%; margin-bottom: 20px; padding: 10px; font-size: 16px; border-radius: 6px;"></select>
    <button class="btn-submit" onclick="selectFinancialYear()" style="width: 100%; margin-bottom: 10px; padding: 12px; font-size: 15px;">اختيار السنة</button>
    <button class="btn-secondary" onclick="showCreateYearUI()" style="width: 100%; margin-bottom: 10px; padding: 12px; font-size: 15px; background-color: #3b82f6; border-color: #3b82f6; color: white;">+ إضافة سنة جديدة</button>
    
    <div id="create-year-container" style="display: none; margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 15px;">
      <input type="text" id="new-year-name" class="form-control" placeholder="اسم السنة (مثال: 2026)" style="margin-bottom: 10px; padding: 10px;">
      <button class="btn-submit" onclick="createNewFinancialYear()" style="width: 100%; background-color: #10b981; border-color: #10b981; padding: 10px;">حفظ وبدء العمل</button>
    </div>
  </div>
</div>
`;

// Insert before <!-- EMPLOYEE MODAL -->
html = html.replace('<!-- EMPLOYEE MODAL -->', loginAndYearModals + '\n<!-- EMPLOYEE MODAL -->');

fs.writeFileSync(file, html, 'utf8');
console.log('Cleaned up multiple modals and inserted correctly.');
