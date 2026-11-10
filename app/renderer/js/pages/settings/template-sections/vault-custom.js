export const vaultCustomSection = `
    <!-- Section: Vault Customization & Category Reports -->
    <div id="section-vault-custom" class="setting-section" style="display: none;">
      <h3 style="margin-top: 0; border-bottom: 2px solid var(--border-color); padding-bottom: 12px; color: var(--lahmi); display: flex; align-items: center; gap: 8px;">
        <span data-i18n="vault_custom_title">تخصيص مدخلات الصندوق وتقارير البنود</span>
      </h3>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 18px;" data-i18n="vault_custom_desc">
        أضف مدخلات وبنود صرف جديدة تظهر في أعلى قائمة البنود في الصندوق (مثل: كهرباء، ماء، محامين...)، واطبع تقريراً مستقلاً لكل مدخل.
      </p>

      <!-- Add New Custom Input -->
      <div style="background: var(--bg-color); padding: 18px; border-radius: 12px; margin-bottom: 22px; border: 1px solid var(--border-color);">
        <label class="form-label" style="display:block; margin-bottom:8px; font-weight:700;" data-i18n="vault_custom_add_label">اسم المدخل / البند الجديد</label>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input type="text" id="vault-custom-cat-input" class="form-control" style="flex: 1; min-width: 220px;"
            data-i18n-placeholder="vault_custom_placeholder" placeholder="مثال: كهرباء، ماء، محامين، إيجار...">
          <button type="button" id="btn-add-vault-custom-cat" class="btn-submit" style="width: auto; padding: 10px 22px; margin: 0;"
            data-i18n="vault_custom_add_btn">➕ إضافة مدخل للصندوق</button>
        </div>
      </div>

      <!-- Category Reports & Management -->
      <div style="background: var(--bg-color); padding: 18px; border-radius: 12px; border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
          <div>
            <h4 style="margin: 0 0 4px 0; color: var(--text-color);" data-i18n="vault_custom_reports_title">📊 كشف وطباعة تقارير مدخلات الصندوق</h4>
            <p style="margin: 0; font-size: 12px; color: var(--muted);" data-i18n="vault_custom_reports_desc">حدد الفترة الزمنية لمعرفة إجمالي الصرف لكل مدخل وطباعة تقرير تفصيلي خاص بأي بند.</p>
          </div>
          <button type="button" id="btn-print-all-vault-cats" class="btn-primary" style="padding: 8px 16px;"
            data-i18n="vault_custom_print_all_btn">🖨️ طباعة ملخص جميع البنود</button>
        </div>

        <div style="display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; padding: 12px; background: var(--card); border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="flex: 1; min-width: 150px;">
            <label class="form-label" style="font-size: 12px;" data-i18n="date_from">من تاريخ</label>
            <input type="date" id="vault-cat-report-from" class="form-control">
          </div>
          <div style="flex: 1; min-width: 150px;">
            <label class="form-label" style="font-size: 12px;" data-i18n="date_to">إلى تاريخ</label>
            <input type="date" id="vault-cat-report-to" class="form-control">
          </div>
          <button type="button" id="btn-refresh-vault-cat-reports" class="btn-secondary" style="height: 40px; padding: 0 18px;"
            data-i18n="vault_custom_refresh_btn">🔍 تحديث كشف الفترة</button>
        </div>

        <div class="table-container" style="max-height: 420px; overflow-y: auto;">
          <table class="report-table professional-table" style="width: 100%;">
            <thead>
              <tr>
                <th class="table-header" data-i18n="vault_custom_col_name">المدخل / البند</th>
                <th class="table-header" data-i18n="vault_custom_col_type">النوع</th>
                <th class="table-header" data-i18n="vault_custom_col_count">عدد السندات</th>
                <th class="table-header" data-i18n="vault_custom_col_total">إجمالي الصرف</th>
                <th class="table-header" data-i18n="vault_custom_col_actions">خيارات الطباعة والحذف</th>
              </tr>
            </thead>
            <tbody id="vault-custom-cats-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
`;

