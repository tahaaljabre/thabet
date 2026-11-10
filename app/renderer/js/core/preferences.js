const STORAGE_KEY = 'thabit_settings';

export function getCachedPreferences() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (error) {
    console.warn('Invalid cached preferences:', error);
    return {};
  }
}

export function cachePreferences(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings || {}));
}

export function applyPreferences(settings = {}) {
  const isLightMode = settings.isLightMode === true;
  document.body.classList.toggle('light-theme', isLightMode);
  document.documentElement.classList.toggle('light-theme', isLightMode);

  const language = settings.language === 'en' ? 'en' : 'ar';
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  if (typeof window.setLanguage === 'function') window.setLanguage(language);
}
