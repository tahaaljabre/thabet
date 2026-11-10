const translations = window.locales || { ar: {}, en: {} };
let currentLang = 'ar';

function toLatinDigits(value) {
  return String(value ?? '')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
}

function t(key, fallback = '') {
  return translations[currentLang]?.[key]
    || translations.ar?.[key]
    || fallback
    || key;
}

function translateElement(element) {
  if (!(element instanceof Element)) return;
  const key = element.getAttribute('data-i18n');
  if (key && translations[currentLang]?.[key]) {
    const value = toLatinDigits(translations[currentLang][key]);
    if (element.matches('input, textarea')) element.placeholder = value;
    else if (element.childElementCount === 0) element.textContent = value;
    else {
      const directText = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
      if (directText) {
        directText.nodeValue = element.querySelector('.sys-currency') ? `${value} (` : `${value} `;
      }
    }
  }

  const attributeMap = {
    'data-i18n-placeholder': 'placeholder',
    'data-i18n-title': 'title',
    'data-i18n-aria-label': 'aria-label',
    'data-i18n-alt': 'alt'
  };
  Object.entries(attributeMap).forEach(([source, target]) => {
    const attributeKey = element.getAttribute(source);
    if (attributeKey && translations[currentLang]?.[attributeKey]) {
      element.setAttribute(target, toLatinDigits(translations[currentLang][attributeKey]));
    }
  });
}

function normalizeDigits(root = document) {
  if (root.nodeType === Node.TEXT_NODE) {
    const normalized = toLatinDigits(root.nodeValue);
    if (normalized !== root.nodeValue) root.nodeValue = normalized;
    return;
  }
  if (!(root instanceof Element) && root !== document) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const normalized = toLatinDigits(node.nodeValue);
    if (normalized !== node.nodeValue) node.nodeValue = normalized;
  }
}

function applyTranslations(root = document) {
  if (root instanceof Element && root.matches('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label], [data-i18n-alt]')) {
    translateElement(root);
  }
  root.querySelectorAll?.('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label], [data-i18n-alt]')
    .forEach(translateElement);
  normalizeDigits(root);
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  document.documentElement.lang = lang;
  document.body?.classList.toggle('lang-en', lang === 'en');
  document.body?.classList.toggle('lang-ar', lang === 'ar');
  applyTranslations();
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

document.addEventListener('input', event => {
  const input = event.target;
  if (!input || !('value' in input)) return;
  const normalized = toLatinDigits(input.value);
  if (normalized !== input.value) input.value = normalized;
}, true);

const translationObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) applyTranslations(node);
    else if (node.nodeType === Node.TEXT_NODE) normalizeDigits(node);
  }));
});

translationObserver.observe(document.documentElement, { childList: true, subtree: true });

window.setLanguage = setLanguage;
window.t = t;
window.applyTranslations = applyTranslations;
window.currentLang = () => currentLang;
window.toLatinDigits = toLatinDigits;
