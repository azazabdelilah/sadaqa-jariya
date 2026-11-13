/**
 * Navigation, Theme Toggle & Global Utilities
 */
import { initI18n, t, getCurrentLang } from './i18n.js';
import { showToast } from './toast.js';

// Theme Management
export function initTheme() {
  const savedTheme = localStorage.getItem('site_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const activeTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(activeTheme);

  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('site_theme', theme);

  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    if (theme === 'dark') {
      themeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
      themeBtn.setAttribute('title', 'Light Mode');
      themeBtn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      themeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
      themeBtn.setAttribute('title', 'Dark Mode');
      themeBtn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }
}

// Mobile Menu Navigation
export function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');

  if (toggleBtn && mobileNav) {
    toggleBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      const isOpen = mobileNav.classList.contains('open');
      toggleBtn.setAttribute('aria-expanded', isOpen);
    });
  }
}

// Active Nav Link Highlight
export function highlightActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Share Functionality
export function initShare() {
  window.sharePage = async function() {
    const deceased = t('deceased_name', 'Tadjeddine Mezioud');
    const site = t('site_name', 'Digital Waqf');
    const title = `${site} - ${t('memory_of', 'In Memory of')} ${deceased}`;
    const text = `${t('sadaqa_jariya', 'Sadaqa Jariya')} - ${title}`;
    const url = window.location.origin + window.location.pathname;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }

    // Modern Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('copied', 'Link copied to clipboard successfully'));
    } catch (err) {
      // Prompt fallback
      prompt('Copy this link:', url);
    }
  };
}

// Initialize Global Nav Systems
export async function initApp() {
  await initI18n();
  initTheme();
  initMobileMenu();
  highlightActiveNav();
  initShare();
}
