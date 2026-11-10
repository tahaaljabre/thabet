export const trashSection = `
  <div class="setting-section cashier-card settings-trash-section" id="section-trash" style="display:none;">
    <div class="card-label settings-section-title" data-i18n="trash_title">🗑️ سلة المحذوفات</div>
    <p class="settings-section-description" data-i18n="trash_description">استعد السجلات المحذوفة أو احذفها نهائيًا. الحذف النهائي لا يمكن التراجع عنه.</p>
    <div class="trash-toolbar">
      <input type="search" id="trash-search" class="form-control" data-i18n-placeholder="trash_search" placeholder="ابحث في المحذوفات">
      <button type="button" id="trash-refresh" class="btn-secondary" data-i18n="audit_refresh">🔄 تحديث</button>
      <span class="settings-list-count" id="trash-count">0</span>
    </div>
    <div class="settings-table-wrap trash-table-wrap">
      <table class="report-table settings-management-table trash-table">
        <thead><tr>
          <th data-i18n="trash_item">العنصر</th>
          <th data-i18n="audit_section">القسم</th>
          <th data-i18n="trash_deleted_at">تاريخ الحذف</th>
          <th data-i18n="trash_deleted_by">حُذف بواسطة</th>
          <th data-i18n="trash_actions">الإجراءات</th>
        </tr></thead>
        <tbody id="trash-items-tbody"><tr><td colspan="5" class="settings-table-message" data-i18n="trash_loading">جاري تحميل سلة المحذوفات...</td></tr></tbody>
      </table>
    </div>
  </div>`;
