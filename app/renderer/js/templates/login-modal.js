(function mountLoginModal() {
  const standaloneParam = new URLSearchParams(window.location.search).get('standalone');
  if (standaloneParam) {
    document.documentElement.classList.add('standalone-os-window');
    if (document.body) {
      document.body.classList.add('standalone-os-window');
      document.body.dataset.standalone = standaloneParam;
    }
    return;
  }

  const root = document.getElementById('login-modal-root');
  if (!root) return;

  root.innerHTML = `
    <div id="login-modal"
      style="position:fixed; inset:0; background:var(--bg-color, #f8fafc); z-index:99999; display:flex; align-items:center; justify-content:center; flex-direction:column;">
      <div style="background:#fff; padding:40px; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.1); width:400px; text-align:center;">
        <img src="renderer/assets/icon.png" id="login-logo" alt="شعار التطبيق"
          style="width:100px; height:100px; border-radius:50%; margin-bottom:20px; display:none;">
        <h2 id="login-title" style="margin-bottom:10px; color:var(--text-color);">تسجيل الدخول</h2>
        <p id="login-desc" style="margin-bottom:25px; color:var(--muted); font-size:14px;"></p>

        <div style="margin-bottom:15px; text-align:right;">
          <label style="display:block; margin-bottom:5px; font-size:14px; color:var(--muted);" data-i18n="username">اسم المستخدم</label>
          <input type="text" id="login-username" class="form-control" placeholder="أدخل اسم المستخدم" autocomplete="username" style="width:100%; box-sizing:border-box;">
        </div>

        <div style="margin-bottom:15px; text-align:right;">
          <label style="display:block; margin-bottom:5px; font-size:14px; color:var(--muted);">السنة المالية</label>
          <select id="login-year-select" class="form-control" style="width:100%; box-sizing:border-box;"></select>
        </div>

        <div style="margin-bottom:25px; text-align:right;">
          <label style="display:block; margin-bottom:5px; font-size:14px; color:var(--muted);">كلمة المرور</label>
          <input type="password" id="login-password" class="form-control" placeholder="أدخل كلمة المرور" autocomplete="current-password"
            style="width:100%; box-sizing:border-box;">
        </div>

        <button id="btn-login-action" class="btn-submit" style="width:100%; padding:12px; font-size:16px;" data-i18n="login_button">دخول</button>
        <div id="login-error" style="color:var(--red); margin-top:15px; font-size:14px; display:none;"></div>
      </div>
    </div>`;
})();
