window.getLocalDateString = function(d) {
  const date = d ? new Date(d) : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
};

window.safeParseFloat = function(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let str = String(val);
  for (let i = 0; i < 10; i++) {
    str = str.replace(arabicNumbers[i], i);
  }
  str = str.replace(/,/g, ".");
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

window.escapeHTML = function(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag]));
};

window.alert = function(msg) {
  if (typeof window.playLuxurySound === 'function') {
    window.playLuxurySound('chime');
  }
  let toast = document.getElementById('custom-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.className = 'luxury-glass-toast';
    document.body.appendChild(toast);
  }
  const safeMsg = window.escapeHTML ? window.escapeHTML(String(msg ?? '')) : String(msg ?? '');
  toast.innerHTML = `
    <span class="luxury-toast-icon">✨</span>
    <span class="luxury-toast-text">${safeMsg}</span>
    <div class="luxury-toast-progress"></div>
  `;
  toast.style.display = 'flex';
  void toast.offsetWidth;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3500);
};

window.formatDateString = function(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  const standardMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${standardMonths[date.getMonth()]} ${date.getFullYear()}`;
};

window.animateVal = function(el, end, dur) {
  const start = performance.now();
  const update = now => {
    const p = Math.min((now-start)/dur, 1);
    const eased = 1 - Math.pow(1-p, 3);
    const txt = el.textContent;
    const prefix = txt.match(/^[-+]/)?.[0] || '';
    el.textContent = prefix + Math.round(end * eased).toLocaleString('en');
    if(p<1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
};

window.updateFormInputs = function() {
  if(window.updateSalesFormInputs) window.updateSalesFormInputs();
  if(window.updatePurchasesFormInputs) window.updatePurchasesFormInputs();
};
window.initInputForm = function() {
  window.updateFormInputs();
  if(window.initSalesForm) window.initSalesForm();
  if(window.initPurchasesForm) window.initPurchasesForm();
  if(window.initSalesIndex) window.initSalesIndex();
  if(window.initPurchasesIndex) window.initPurchasesIndex();
};
