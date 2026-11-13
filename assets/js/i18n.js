/**
 * Internationalization (i18n) Engine
 * Handles instant language switching, DOM string updates, and persistence in localStorage.
 */

let currentLang = localStorage.getItem('site_lang') || 'ar';
let translations = {};

export async function loadTranslations(lang) {
  try {
    const res = await fetch(`locales/${lang}.json`);
    translations[lang] = await res.json();
    return translations[lang];
  } catch (err) {
    console.error(`Failed to load translations for ${lang}:`, err);
    return {};
  }
}

export function t(key, fallback = '') {
  if (translations[currentLang] && translations[currentLang][key]) {
    return translations[currentLang][key];
  }
  return fallback || key;
}

export function getCurrentLang() {
  return currentLang;
}

export function applyTranslations() {
  const dict = translations[currentLang] || {};
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

  // Update text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  // Update language toggle button text
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.textContent = currentLang === 'ar' ? 'English' : 'العربية';
  }

  // Update page title if key defined
  const pageTitleKey = document.body.getAttribute('data-page-title');
  if (pageTitleKey && dict[pageTitleKey]) {
    document.title = `${dict[pageTitleKey]} | ${dict['site_name']} - ${dict['deceased_name']}`;
  }

  // Notify components
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
}

export async function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('site_lang', lang);
  if (!translations[lang]) {
    await loadTranslations(lang);
  }
  applyTranslations();
}

export async function toggleLanguage() {
  const newLang = currentLang === 'ar' ? 'en' : 'ar';
  await setLanguage(newLang);
}

export async function initI18n() {
  await loadTranslations(currentLang);
  applyTranslations();

  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.addEventListener('click', toggleLanguage);
  }
}
