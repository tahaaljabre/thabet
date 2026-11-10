export const auditSection = `
  <div class="setting-section cashier-card settings-audit-section" id="section-audit" style="display:none;">
    <div class="card-label settings-section-title" data-i18n="audit_log_title">🛡️ سجل التدقيق</div>
    <p class="settings-section-description" data-i18n="audit_log_description">راجع عمليات الإضافة والتعديل والحذف والإقفال ومن قام بها.</p>

    <div class="audit-filters">
      <input type="search" id="audit-search" class="form-control" data-i18n-placeholder="audit_search_placeholder" placeholder="ابحث في التفاصيل أو المستخدم">
      <select id="audit-action-filter" class="form-control form-select">
        <option value="" data-i18n="audit_all_actions">كل العمليات</option>
        <option value="INSERT" data-i18n="audit_action_insert">إضافة</option>
        <option value="UPDATE" data-i18n="audit_action_update">تعديل</option>
        <option value="DELETE" data-i18n="audit_action_delete">حذف</option>
        <option value="CANCEL" data-i18n="audit_action_cancel">إلغاء مالي</option>
        <option value="CLOSE_PERIOD" data-i18n="audit_action_close_period">إقفال فترة شهرية</option>
        <option value="REOPEN_PERIOD" data-i18n="audit_action_reopen_period">إعادة فتح فترة شهرية</option>
        <option value="RESTORE" data-i18n="audit_action_restore">استعادة</option>
        <option value="PURGE" data-i18n="audit_action_purge">حذف نهائي</option>
        <option value="CLOSE_YEAR" data-i18n="audit_action_close_year">إقفال سنة</option>
        <option value="REOPEN_YEAR" data-i18n="audit_action_reopen_year">إعادة فتح سنة</option>
      </select>
      <select id="audit-user-filter" class="form-control form-select">
        <option value="" data-i18n="audit_all_users">كل المستخدمين</option>
      </select>
      <button type="button" id="audit-refresh" class="btn-secondary" data-i18n="audit_refresh">🔄 تحديث</button>
    </div>

    <div class="settings-list-heading audit-list-heading">
      <span data-i18n="audit_recent_activity">أحدث العمليات</span>
      <span class="settings-list-count" id="audit-count">0</span>
    </div>
    <div class="settings-table-wrap audit-table-wrap">
      <table class="report-table settings-management-table audit-table">
        <thead><tr>
          <th data-i18n="audit_date_time">التاريخ والوقت</th>
          <th data-i18n="audit_user">المستخدم</th>
          <th data-i18n="audit_action">العملية</th>
          <th data-i18n="audit_section">القسم</th>
          <th data-i18n="audit_details">التفاصيل</th>
          <th data-i18n="audit_record_number">رقم السجل</th>
        </tr></thead>
        <tbody id="audit-logs-tbody">
          <tr><td colspan="6" class="settings-table-message" data-i18n="audit_loading">جاري تحميل سجل التدقيق...</td></tr>
        </tbody>
      </table>
    </div>
  </div>`;
