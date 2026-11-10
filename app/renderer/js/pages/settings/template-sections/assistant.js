export const assistantSection = `    <!-- Assistant & Developer -->
    <div class="setting-section cashier-card settings-assistant-section" id="section-assistant" style="display: none;">
      <div class="assistant-card" style="width: min(540px, 100%); padding: 24px 28px;">
        <div class="assistant-mark" aria-hidden="true">ص</div>
        <div class="assistant-badge" data-i18n="support_help">الدعم والمساعدة</div>
        <h2 data-i18n="here_to_help">نحن هنا لمساعدتك</h2>
        <p class="assistant-description" style="margin-bottom: 14px;" data-i18n="support_description">للدعم والاستفسارات المتعلقة بنظام ثابت، يمكنك التواصل مباشرة مع المطوّر.</p>

        <!-- Direct App Updater Box -->
        <div id="assistant-updater-box" style="margin: 0 auto 18px; padding: 14px 16px; border: 1.5px solid var(--border); border-radius: 14px; background: rgba(196,112,90,0.06); text-align: right;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 13px; font-weight: 800; color: var(--text);" data-i18n="update_section_badge">🚀 تحديثات النظام المباشرة</span>
            <span id="app-current-version-badge" dir="ltr" style="font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px; background: rgba(196,112,90,0.16); color: var(--lahmi2);">v1.1.0</span>
          </div>

          <div id="app-update-status-text" style="font-size: 12px; color: var(--muted); margin-bottom: 12px; line-height: 1.6;" data-i18n="update_status_idle">
            اضغط على فحص التحديثات للتحقق من وجود إصدار جديد
          </div>

          <div id="app-update-progress-wrap" style="display: none; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 4px; color: var(--text);">
              <span id="app-update-progress-label" data-i18n="update_downloading_label">جاري تحميل التحديث مباشرة من السحابة...</span>
              <span id="app-update-progress-pct" dir="ltr">0%</span>
            </div>
            <div style="height: 8px; width: 100%; background: rgba(0,0,0,0.12); border-radius: 999px; overflow: hidden;">
              <div id="app-update-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, var(--kabd), var(--lahmi), #16a34a); transition: width 0.2s ease;"></div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" id="btn-check-updates" class="btn-secondary" style="flex: 1; min-height: 38px; font-size: 12px;" data-i18n="btn_check_updates">🔍 فحص التحديثات</button>
            <button type="button" id="btn-install-update" class="btn-submit" style="flex: 1.3; min-height: 38px; font-size: 12px; background: linear-gradient(135deg, #15803d, #16a34a); border-color: #16a34a; color: #fff; position: relative;" data-i18n="btn_install_update_now">
              ⬇️ تحديث التطبيق الآن
            </button>
          </div>
        </div>

        <div class="assistant-credits" style="margin-bottom: 14px;">
          <div class="assistant-credit-row">
            <span data-i18n="development_credit">تطوير</span>
            <strong>طه اليافعي</strong>
          </div>
        </div>

        <a class="assistant-whatsapp" href="#" onclick="window.open('https://wa.me/967738950505', '_blank'); return false;" aria-label="التواصل مع طه اليافعي عبر واتساب" data-i18n-aria-label="whatsapp_aria">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413z"/>
          </svg>
          <span>
            <small data-i18n="whatsapp_contact">للتواصل عبر واتساب</small>
            <b dir="ltr">+967 738 950 505</b>
          </span>
        </a>
      </div>
    </div>`;
