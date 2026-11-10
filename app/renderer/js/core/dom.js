/**
 * Safe DOM helpers.
 */

export function sanitizeHTML(html) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html);
  }
  return html; // Fallback if not loaded
}

export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'textContent') {
      el.textContent = val;
    } else if (key === 'innerHTML') {
      el.innerHTML = val;
    } else if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else {
      el.setAttribute(key, val);
    }
  }
  for (const child of children) {
    if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(String(child)));
  }
  return el;
}

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Makes IDs rendered inside the active page authoritative.
 * The legacy shell still contains hidden elements for some migrated pages;
 * renaming only those outside the active container prevents getElementById
 * from updating an invisible legacy control or table.
 */
export function isolatePageIds(container) {
  if (!container) return;

  const activeIds = new Set(
    Array.from(container.querySelectorAll('[id]'))
      .map(element => element.id)
      .filter(Boolean)
  );

  activeIds.forEach(id => {
    const matches = Array.from(document.querySelectorAll(`[id="${CSS.escape(id)}"]`));
    let legacyIndex = 0;
    matches.forEach(element => {
      if (container.contains(element)) return;
      legacyIndex += 1;
      element.id = `legacy-${id}-${legacyIndex}`;
    });
  });
}

export function setFormValues(form, values) {
  for (const [name, value] of Object.entries(values)) {
    const field = form.querySelector(`[name="${CSS.escape(name)}"]`);
    if (!field) continue;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else if (field.type === 'radio') {
      const radio = form.querySelector(`[name="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`);
      if (radio) radio.checked = true;
    } else field.value = value ?? '';
  }
}

export function getFormValues(form) {
  const data = new FormData(form);
  const obj = {};
  data.forEach((val, key) => {
    if (obj[key] !== undefined) {
      if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
      obj[key].push(val);
    } else {
      obj[key] = val;
    }
  });
  return obj;
}
