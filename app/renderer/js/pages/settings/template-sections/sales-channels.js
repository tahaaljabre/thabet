export const salesChannelsSection = `
  <div class="setting-section cashier-card sales-channels-section" id="section-sales-channels" style="display:none;">
    <div class="sales-channels-hero">
      <div class="sales-channels-icon">📱</div>
      <div>
        <div class="card-label" data-i18n="sales_channels_title">إدارة قنوات البيع</div>
        <p data-i18n="sales_channels_description">خصّص أسماء قنوات البيع، فعّلها أو أوقفها، واربط كل قناة بالحساب البنكي المناسب.</p>
      </div>
      <button type="button" class="btn-primary" id="btn-add-sales-channel" data-i18n="add_sales_channel">➕ إضافة قناة بيع</button>
    </div>
    <div class="sales-channels-bank-hint">🏦 <span data-i18n="sales_channels_bank_hint">تُضاف مبيعات القناة تلقائيًا إلى رصيد الحساب البنكي المرتبط.</span></div>
    <div id="sales-channels-list" class="sales-channels-list"></div>
    <button type="button" class="btn-submit" id="btn-save-sales-channels" data-i18n="save_sales_channels">💾 حفظ قنوات البيع</button>
  </div>
  <style>
    .sales-channels-section { padding: 22px !important; }
    .sales-channels-hero { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:16px; padding:18px; border:1px solid var(--border-color); border-radius:16px; background:linear-gradient(135deg, rgba(122,26,34,.10), rgba(207,122,95,.05)); }
    .sales-channels-hero p { margin:5px 0 0; color:var(--muted); font-size:13px; }
    .sales-channels-icon { width:52px; height:52px; display:grid; place-items:center; border-radius:15px; font-size:25px; color:#fff; background:linear-gradient(135deg,var(--lahmi),var(--lahmi2)); box-shadow:0 8px 20px rgba(122,26,34,.2); }
    .sales-channels-bank-hint { margin:14px 0; padding:11px 14px; border-radius:10px; background:rgba(59,130,246,.08); color:var(--text-color); font-size:12px; border:1px solid rgba(59,130,246,.18); }
    .sales-channels-list { display:grid; gap:12px; margin:14px 0 18px; }
    .sales-channel-card { display:grid; grid-template-columns:minmax(160px,1fr) minmax(160px,1fr) minmax(180px,1fr) auto; gap:12px; align-items:end; padding:16px; border:1px solid var(--border-color); border-radius:14px; background:var(--panel-bg,var(--card)); box-shadow:0 5px 16px rgba(0,0,0,.04); }
    .sales-channel-card.is-disabled { opacity:.66; }
    .sales-channel-card .channel-head { grid-column:1/-1; display:flex; justify-content:space-between; align-items:center; }
    .channel-badge { font-size:10px; padding:4px 9px; border-radius:999px; background:rgba(122,26,34,.1); color:var(--lahmi2); font-weight:700; }
    .channel-toggle-wrap { display:flex; align-items:center; gap:9px; min-height:38px; }
    .channel-delete { min-height:38px; white-space:nowrap; }
    @media (max-width:900px) { .sales-channel-card { grid-template-columns:1fr 1fr; } .sales-channels-hero { grid-template-columns:auto 1fr; } .sales-channels-hero button { grid-column:1/-1; } }
  </style>`;
