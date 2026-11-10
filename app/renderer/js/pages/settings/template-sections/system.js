export const systemSections = `    <!-- Backup -->
    <div class="setting-section cashier-card" id="section-backup" style="display: none;">
      <div class="card-label" style="margin-bottom:15px; color:var(--lahmi2)" data-i18n="backup_security_title">💾 النسخ الاحتياطي والأمان</div>
      
      <div class="form-group" style="margin-bottom: 20px;">
        <label data-i18n="auto_backup_path">مسار النسخ الاحتياطي التلقائي</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="setting-backup-path" class="form-control" data-i18n-placeholder="backup_path_placeholder" placeholder="اختر المجلد ليتم النسخ فيه تلقائياً..." readonly style="flex: 1; cursor: pointer;" onclick="if(window.selectBackupPath) window.selectBackupPath()">
          <button class="btn-secondary" onclick="if(window.clearBackupPath) window.clearBackupPath()" style="margin: 0;" data-i18n="clear_button">مسح</button>
        </div>
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button class="btn-submit" id="btn-trigger-backup" style="flex: 1; background-color: var(--green2); border-color: var(--green2); margin:0;" data-i18n="manual_backup">📥 أخذ نسخة احتياطية يدوياً</button>
        <button class="btn-secondary" id="btn-trigger-restore" style="flex: 1; margin:0;" data-i18n="restore_backup">📤 استعادة نسخة</button>
      </div>
      <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0;">
      
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h4 style="margin: 0; color: #4285F4; font-size: 16px;">☁️ النسخ الاحتياطي السحابي (Google Drive)</h4>
            <p style="font-size:12px; color:var(--muted); margin:4px 0 0;" data-i18n="cloud_backup_setup_hint">قم بحفظ بياناتك بأمان في السحابة واستعادتها في أي وقت.</p>
          </div>
          <div style="text-align: left;">
            <span id="cloud-status-badge" style="font-size: 12px; padding: 4px 8px; border-radius: 4px; background: #eee; color: #666;">غير متصل</span>
            <div id="cloud-last-backup" style="font-size: 11px; color: var(--muted); margin-top: 4px; display: none;"></div>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px;" id="cloud-connect-container">
          <button class="btn-submit" id="btn-cloud-connect" style="flex: 1; background-color: #4285F4; border-color: #4285F4; color: white; margin:0;">🔗 ربط حساب Google</button>
          <button class="btn-secondary" id="btn-cloud-disconnect" style="flex: 1; margin:0; display: none;">❌ إلغاء الربط</button>
        </div>

        <div style="display: flex; gap: 10px;" id="cloud-actions-container">
          <button class="btn-submit" id="btn-trigger-cloud-backup" style="flex: 1; background-color: #4285F4; border-color: #4285F4; color: white; margin:0;" data-i18n="cloud_backup">☁️ بدء النسخ السحابي</button>
          <button class="btn-secondary" id="btn-trigger-cloud-restore" style="flex: 1; margin:0;" data-i18n="cloud_restore">☁️ استعادة نسخة سحابية</button>
        </div>
      </div>
    </div>



    <!-- Danger Zone Card -->
    <div class="setting-section cashier-card" id="section-clear" style="display: none; border: 1px solid var(--red);">
      <div class="card-label" style="margin-bottom:15px; color:var(--red)" data-i18n="danger_zone_title">⚠️ منطقة الخطر</div>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 15px;" data-i18n="danger_zone_full_description">سيتم مسح جميع التقارير والمبيعات والمصروفات بالكامل. هذا الإجراء نهائي ولا يمكن التراجع عنه.</p>
      <button class="btn-danger" id="btn-clear-all-data" style="width:100%; padding:10px;" data-i18n="clear_all_data">🗑️ مسح كافة البيانات</button>
    </div>`;
