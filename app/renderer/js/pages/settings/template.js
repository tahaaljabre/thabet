import { companySections } from './template-sections/company.js';
import { systemSections } from './template-sections/system.js';
import { managementSections } from './template-sections/management.js';
import { assistantSection } from './template-sections/assistant.js';
import { salesChannelsSection } from './template-sections/sales-channels.js';
import { vaultCustomSection } from './template-sections/vault-custom.js';
import { auditSection } from './template-sections/audit.js';
import { archiveSection } from './template-sections/archive.js';
import { trashSection } from './template-sections/trash.js';

export function getTemplate() {
  return `
<div class="settings-layout" dir="rtl">
  
  <!-- Sidebar -->
  <div class="settings-sidebar" aria-label="أقسام الإعدادات" data-i18n-aria-label="settings_sections">
    <button class="settings-tab-btn active" data-tab="company" id="setting-company-tab" data-i18n="settings_tab_company">🏢 معلومات الشركة</button>
    <button class="settings-tab-btn" data-tab="theme" id="setting-theme-tab" data-i18n="settings_tab_theme">🎨 المظهر واللغة</button>
    <button class="settings-tab-btn" data-tab="commissions" id="setting-commissions-tab" data-i18n="settings_tab_commissions">🛵 عمولات التوصيل</button>
    <button class="settings-tab-btn" data-tab="sales-channels" id="setting-sales-channels-tab" data-i18n="settings_tab_sales_channels">📱 قنوات البيع</button>
    <button class="settings-tab-btn" data-tab="vault-custom" id="setting-vault-custom-tab" data-i18n="settings_tab_vault_custom">🗂️ تخصيص الصندوق</button>
    <button class="settings-tab-btn" data-tab="backup" id="setting-backup-tab" data-i18n="settings_tab_backup">💾 النسخ الاحتياطي</button>
    <button class="settings-tab-btn" data-tab="clear" id="setting-clear-tab" style="color: var(--red);" data-i18n="settings_tab_clear">⚠️ مسح البيانات</button>
    
    
    <button class="settings-tab-btn" data-tab="users" id="setting-users-tab" data-i18n="settings_tab_users">👥 إدارة المستخدمين</button>
    <button class="settings-tab-btn" data-tab="cashiers" id="setting-cashiers-tab" data-i18n="settings_tab_cashiers">💻 أجهزة الكاشير</button>
    <button class="settings-tab-btn" data-tab="partners" id="setting-partners-tab" data-i18n="settings_tab_partners">🤝 إدارة الشركاء</button>
    <button class="settings-tab-btn" data-tab="employee-categories" id="setting-employee-categories-tab" data-i18n="settings_tab_employee_categories">🏷️ فئات الموظفين</button>
    <button class="settings-tab-btn" data-tab="audit" id="setting-audit-tab" data-i18n="settings_tab_audit">🛡️ سجل التدقيق</button>
    <button class="settings-tab-btn" data-tab="archive" id="setting-archive-tab" data-i18n="settings_tab_archive">📦 الأرشيف</button>
    <button class="settings-tab-btn" data-tab="trash" id="setting-trash-tab" data-i18n="settings_tab_trash">🗑️ سلة المحذوفات</button>
    <button class="settings-tab-btn" data-tab="assistant" id="setting-assistant-tab" data-i18n="settings_tab_help">✦ للمساعدة</button>
    
  </div>

  <style>
    /* Modern Scrollbar */
    .settings-content::-webkit-scrollbar { width: 6px; }
    .settings-content::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
    
    .settings-tab-btn {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: right; 
      padding: 12px 15px; 
      border-radius: 10px; 
      border: 1px solid transparent; 
      background: transparent; 
      cursor: pointer;
      font-weight: 500;
      color: var(--text-color);
      opacity: 0.8;
    }
    .settings-tab-btn:hover {
      background: var(--bg-color);
      border-color: var(--border-color);
      opacity: 1;
      transform: translateX(-4px);
    }
    .settings-tab-btn.active {
      background: linear-gradient(135deg, var(--lahmi) 0%, var(--lahmi2) 100%);
      color: white;
      font-weight: bold;
      opacity: 1;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border-color: transparent;
      transform: translateX(0);
    }
    .settings-tab-btn.danger-tab:hover {
      background: rgba(220, 53, 69, 0.1);
      border-color: rgba(220, 53, 69, 0.2);
      color: var(--red);
    }
    
    /* Modern Toggle Switch */
    .switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--border-color);
      transition: .4s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 34px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    input:checked + .slider {
      background-color: var(--lahmi2);
    }
    input:checked + .slider:before {
      transform: translateX(22px);
    }
    .theme-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 0;
      border-bottom: 1px solid var(--border-color);
    }
    .theme-row:last-child {
      border-bottom: none;
    }
    .theme-icon {
      background: var(--bg-color);
      padding: 10px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
      border: 1px solid var(--border-color);
    }
  </style>

  <!-- Content Area -->
  <div class="settings-content">
    
${companySections}
${salesChannelsSection}
${vaultCustomSection}
${systemSections}
${managementSections}
${auditSection}
${archiveSection}
${trashSection}
${assistantSection}
  </div>
</div>
  `;
}
