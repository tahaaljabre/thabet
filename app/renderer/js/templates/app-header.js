(function mountAppHeader() {
  const root = document.getElementById('app-header-root');
  if (!root) return;
  if (new URLSearchParams(window.location.search).get('standalone')) {
    root.style.display = 'none';
  }
  root.innerHTML = `<!-- ══ HEADER ══ -->
  <div class="header">
    <div class="header-inner">
      <div class="logo-box">
        <img src="LOGO_PLACEHOLDER" alt="شعار المطعم" data-i18n-alt="company_logo_alt" id="header-logo-img">
      </div>
      <div class="header-info">
        <h1 id="header-company-name"></h1>
        <div class="eng" id="header-branch-name"></div>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <div class="status-badge" id="header-status-badge" data-i18n="active_status"><span class="status-dot"></span> نشط</div>
          <span id="header-version-pill" style="display:inline-flex; align-items:center; background:rgba(196,112,90,0.15); border:1px solid var(--border); border-radius:20px; padding:2px 8px; font-size:10px; font-weight:800; color:var(--lahmi2); margin-top:5px;" dir="ltr">v1.1.0</span>
          <button type="button" id="header-vault-pulse-pill" class="vault-pulse-pill" onclick="triggerInstantLuxuryBackup()" data-i18n-title="vault_pulse_title" title="قاعدة البيانات مؤمنة — اضغط لإنشاء نسخة احتياطية فورية الآن">
            <span class="pulse-dot"></span>
            <span data-i18n="vault_pulse_badge">🛡️ محمي ومحفوظ تلقائياً</span>
          </button>
        </div>
      </div>
      <div class="header-actions">

        <!-- User info and Settings Dropdown -->
        <div id="header-year-selector-container"
          style="display: none; align-items: center; gap: 5px; margin-left: 15px; margin-right: 15px; background: rgba(0,0,0,0.2); padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
          <span style="font-size: 13px; font-weight: bold; color: var(--text-color);" data-i18n="year_label">📅 السنة:</span>
          <select id="header-year-select" onchange="changeActiveYear(this.value)"
            style="background: transparent; color: var(--text-color); border: none; font-size: 14px; font-weight: bold; cursor: pointer; outline: none; font-family: 'Cairo', sans-serif;"></select>
        </div>
        <div id="current-user-info"
          style="display: none; align-items: center; gap: 10px; margin-left: 10px; color: var(--text-color);">
          <span id="current-username" class="luxury-greeting-pill"
            style="font-weight: bold; background: var(--border-color); padding: 5px 10px; border-radius: 5px;"></span>

          <button id="btn-cmd-palette" type="button" class="settings-btn luxury-cmd-trigger" onclick="openLuxuryCommandPalette()" data-i18n-title="cmd_palette_title" title="الباحث الذكي والانتقال السريع"
            style="background-color: var(--card); border: 1px solid var(--border); color: var(--text); padding: 5px 11px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: 'Cairo', sans-serif; font-size: 12px; font-weight: 800;">
            <span data-i18n="cmd_palette_btn">🔍 بحث سريع (Ctrl+K)</span>
          </button>

          <button id="btn-privacy-blur" type="button" class="settings-btn luxury-icon-pill" onclick="toggleVipPrivacyBlur()" data-i18n-title="privacy_blur_btn_title" title="إخفاء / إظهار الأرقام المالية (Ctrl+9)"
            style="background-color: var(--card); border: 1px solid var(--border); color: var(--text); padding: 5px 10px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">
            <span id="privacy-blur-icon">👁️</span>
          </button>

          <button id="btn-floating-calc" type="button" class="settings-btn luxury-icon-pill" onclick="toggleExecutiveCalculator()" data-i18n-title="calc_btn_title" title="الآلة الحاسبة المحاسبية السريعة (Ctrl+0)"
            style="background-color: var(--card); border: 1px solid var(--border); color: var(--text); padding: 5px 10px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">
            🧮
          </button>

          <button id="btn-sticky-notes" type="button" class="settings-btn luxury-icon-pill" onclick="toggleRoyalStickyNotes()" data-i18n-title="sticky_notes_btn_title" title="المفكرة الملكية العائمة والتذكيرات (Ctrl+Shift+1)"
            style="background-color: var(--card); border: 1px solid var(--border); color: var(--text); padding: 5px 10px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">
            📌
          </button>

          <button id="btn-audio-fx" type="button" class="settings-btn luxury-icon-pill" onclick="toggleLuxuryAudioFx()" data-i18n-title="audio_fx_btn_title" title="تفعيل / كتم المؤثرات الصوتية الفاخرة"
            style="background-color: var(--card); border: 1px solid var(--border); color: var(--text); padding: 5px 10px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">
            <span id="audio-fx-icon">🔊</span>
          </button>

          <button id="btn-session-lock" type="button" class="settings-btn luxury-icon-pill" onclick="lockAppSession()" data-i18n-title="lock_screen_btn_title" title="قفل الجلسة السريع لحماية الشاشة (Ctrl+L)"
            style="background-color: var(--card); border: 1px solid var(--border); color: var(--text); padding: 5px 10px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">
            🔒
          </button>

          <button id="btn-shortcuts-guide" type="button" class="settings-btn luxury-icon-pill" onclick="toggleRoyalShortcutsModal()" data-i18n-title="shortcuts_btn_title" title="دليل الاختصارات الملكية السريعة (Ctrl+Shift+2)"
            style="background-color: var(--card); border: 1px solid var(--border); color: var(--text); padding: 5px 10px; border-radius: 999px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">
            ⌨️
          </button>

          <button id="btn-update-bell" type="button" class="settings-btn" data-i18n-title="update_bell_title" title="تنبيهات تحديث النظام"
            style="position: relative; background-color: var(--card); border: 1px solid var(--border); color: var(--text); padding: 5px 11px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px;">
            🔔
            <span id="update-bell-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #dc2626; color: #fff; font-size: 10px; font-weight: 900; width: 18px; height: 18px; border-radius: 50%; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(220,38,38,0.8);">1</span>
          </button>

          <div class="settings-wrapper" id="settings-wrapper-div">
            <button id="btn-open-settings" class="settings-btn" data-i18n="settings_button"
              style="background-color: var(--card); border: 1px solid var(--border); color: var(--text); padding: 5px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-family: 'Cairo', sans-serif;">
              ⚙️ الإعدادات
            </button>
            <div id="settings-dropdown" class="settings-dropdown">
              <a href="#" data-action="settings" data-tab="commissions" data-i18n="settings_commissions">عمولات منصات التوصيل</a>
              <a href="#" data-action="settings" data-tab="vault-custom" data-i18n="settings_tab_vault_custom">🗂️ تخصيص الصندوق</a>
              <a href="#" data-action="settings" data-tab="company" data-i18n="settings_company_info">🏢 معلومات الشركة</a>
              <a href="#" data-action="settings" data-tab="theme" data-i18n="settings_appearance">🎨 المظهر العام</a>
              <a href="#" data-action="settings" data-tab="backup" data-i18n="settings_backup">💾 النسخ والأمان</a>
              <a href="#" data-action="archive" data-i18n="settings_archive_btn">📦 أرشيف العمليات</a>
              <a href="#" id="menu-users" data-action="settings" data-tab="users" style="display: none;"
                data-i18n="settings_users">👥 إدارة المستخدمين</a>
              <a href="#" id="menu-cashiers" data-action="settings" data-tab="cashiers" style="display: none;"
                data-i18n="settings_cashiers">🏧 إدارة الكاشيرات</a>
              <a href="#" id="menu-partners" data-action="settings" data-tab="partners" style="display: none;" data-i18n="settings_tab_partners">إدارة الشركاء</a>
              <a href="#" id="menu-clear" data-action="settings" data-tab="clear" style="display: none; color: var(--red);"
                data-i18n="settings_danger">⚠️ مسح البيانات</a>
              <a href="#" data-action="logout" class="logout-item" data-i18n="logout">🚪 تسجيل الخروج</a>
            </div>
          </div>
        </div>
        <div class="date-badge" id="report-date-display"></div>


      </div>
    </div>
  </div>`;
  function getGreetingPrefix() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return typeof t === 'function' ? t('greeting_morning') : '';
    if (h >= 12 && h < 17) return typeof t === 'function' ? t('greeting_afternoon') : '';
    return typeof t === 'function' ? t('greeting_evening') : '';
  }

  window.updateRoyalHeaderGreeting = function() {
    const usernameEl = document.getElementById('current-username');
    if (!usernameEl) return;
    const uname = window.currentUser?.username || window.currentUser?.Username || '';
    if (!uname) return;
    const prefix = getGreetingPrefix();
    usernameEl.textContent = prefix ? `${prefix} • ${uname}` : `👤 ${uname}`;
  };

  function updateRoyalLiveClock() {
    const dateBadge = document.getElementById('report-date-display');
    if (!dateBadge) return;
    const now = new Date();
    const datePart = now.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const timePart = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    dateBadge.innerHTML = `<span class="royal-clock-time" dir="ltr">🕰️ ${timePart}</span><span class="royal-clock-sep">•</span><span class="royal-clock-date" dir="ltr">${datePart}</span>`;
  }

  updateRoyalLiveClock();
  setInterval(updateRoyalLiveClock, 1000);
  window.addEventListener('languageChanged', () => {
    if (typeof window.updateRoyalHeaderGreeting === 'function') {
      window.updateRoyalHeaderGreeting();
    }
  });
})();
