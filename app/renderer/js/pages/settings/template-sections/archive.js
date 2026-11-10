export const archiveSection = `
  <div class="setting-section cashier-card settings-archive-section" id="section-archive" style="display:none;">
    <div class="card-label settings-section-title" data-i18n="archive_title">📦 أرشيف الحركات والملفات</div>
    <p class="settings-section-description" data-i18n="archive_section_description">استعرض واستعد الموظفين والموردين والسندات المؤرشفة، مع إمكانية طباعة الكشف أو تصديره إلى إكسل.</p>

    <div class="tabs archive-sub-tabs" style="margin-bottom: 15px; display: flex; gap: 6px;">
      <button type="button" class="tab-btn archive-tab-btn active" data-archive-tab="emp" onclick="switchArchiveTab('emp')" data-i18n="archived_employees">موظفون مؤرشفون</button>
      <button type="button" class="tab-btn archive-tab-btn" data-archive-tab="sup" onclick="switchArchiveTab('sup')" data-i18n="archived_suppliers">موردون مؤرشفون</button>
      <button type="button" class="tab-btn archive-tab-btn" data-archive-tab="emptx" onclick="switchArchiveTab('emptx')" data-i18n="archived_employee_txs">سندات موظفين مؤرشفة</button>
      <button type="button" class="tab-btn archive-tab-btn" data-archive-tab="suptx" onclick="switchArchiveTab('suptx')" data-i18n="archived_supplier_txs">سندات موردين مؤرشفة</button>
    </div>

    <div data-archive-panel="emp" class="archive-panel active">
      <div class="settings-table-wrap trash-table-wrap">
        <table class="report-table settings-management-table" style="width: 100%;">
          <thead>
            <tr>
              <th data-i18n="archive_col_name">الاسم</th>
              <th data-i18n="archive_col_phone">الهاتف</th>
              <th data-i18n="archive_col_salary">الراتب الأساسي</th>
              <th data-i18n="th_action">إجراء</th>
            </tr>
          </thead>
          <tbody class="archive-emp-tbody"></tbody>
        </table>
      </div>
    </div>

    <div data-archive-panel="sup" class="archive-panel" style="display:none;">
      <div class="settings-table-wrap trash-table-wrap">
        <table class="report-table settings-management-table" style="width: 100%;">
          <thead>
            <tr>
              <th data-i18n="archive_col_name">الاسم</th>
              <th data-i18n="archive_col_phone">الهاتف</th>
              <th data-i18n="archive_col_address">العنوان</th>
              <th data-i18n="th_action">إجراء</th>
            </tr>
          </thead>
          <tbody class="archive-sup-tbody"></tbody>
        </table>
      </div>
    </div>

    <div data-archive-panel="emptx" class="archive-panel" style="display:none;">
      <div class="settings-table-wrap trash-table-wrap">
        <table class="report-table settings-management-table" style="width: 100%;">
          <thead>
            <tr>
              <th data-i18n="archive_col_employee">الموظف</th>
              <th data-i18n="archive_col_date">التاريخ</th>
              <th data-i18n="archive_col_amount">المبلغ</th>
              <th data-i18n="archive_col_notes">ملاحظات</th>
              <th data-i18n="th_action">إجراء</th>
            </tr>
          </thead>
          <tbody class="archive-emptx-tbody"></tbody>
        </table>
      </div>
    </div>

    <div data-archive-panel="suptx" class="archive-panel" style="display:none;">
      <div class="settings-table-wrap trash-table-wrap">
        <table class="report-table settings-management-table" style="width: 100%;">
          <thead>
            <tr>
              <th data-i18n="archive_col_supplier">المورد</th>
              <th data-i18n="archive_col_date">التاريخ</th>
              <th data-i18n="archive_col_type">النوع</th>
              <th data-i18n="archive_col_amount">المبلغ</th>
              <th data-i18n="archive_col_notes">ملاحظات</th>
              <th data-i18n="th_action">إجراء</th>
            </tr>
          </thead>
          <tbody class="archive-suptx-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>`;

