/**
 * Supplications (Duas) for the Deceased
 */

import { getCurrentLang, t } from './i18n.js';
import { showToast } from './toast.js';

let duasData = [];

export async function initSupplicationsPage() {
  try {
    const res = await fetch('data/duas.json');
    duasData = await res.json();
    renderDuas();
  } catch (err) {
    console.error('Failed to load duas.json:', err);
  }

  window.addEventListener('languageChanged', () => {
    renderDuas();
  });
}

function renderDuas() {
  const container = document.getElementById('duas-container');
  if (!container) return;

  container.innerHTML = '';
  const lang = getCurrentLang();

  duasData.forEach(dua => {
    const card = document.createElement('div');
    card.className = 'feature-card';
    card.style.marginBottom = '1.75rem';

    // Header badge
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.marginBottom = '1.25rem';

    const titleH3 = document.createElement('h3');
    titleH3.className = 'feature-title';
    titleH3.style.fontSize = '1.15rem';
    titleH3.style.marginBottom = '0';
    titleH3.textContent = lang === 'ar' ? dua.title_ar : dua.title_en;

    const sourceSpan = document.createElement('span');
    sourceSpan.className = 'hero-badge';
    sourceSpan.style.margin = '0';
    sourceSpan.style.fontSize = '0.75rem';
    sourceSpan.textContent = dua.source;

    headerDiv.appendChild(titleH3);
    headerDiv.appendChild(sourceSpan);

    // Dua Text
    const duaP = document.createElement('p');
    duaP.className = 'arabic-font';
    duaP.dir = 'rtl';
    duaP.style.fontSize = '1.45rem';
    duaP.style.lineHeight = '2.2';
    duaP.style.color = 'var(--color-peace)';
    duaP.style.textAlign = 'justify';
    duaP.style.marginBottom = '1.5rem';
    duaP.textContent = dua.arabic;

    // Footer with Copy Action
    const footerDiv = document.createElement('div');
    footerDiv.style.display = 'flex';
    footerDiv.style.justifyContent = 'flex-end';
    footerDiv.style.paddingTop = '1rem';
    footerDiv.style.borderTop = '1px solid var(--color-border)';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-outline';
    copyBtn.style.padding = '0.45rem 1rem';
    copyBtn.style.fontSize = '0.85rem';
    copyBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>${lang === 'ar' ? 'نسخ الدعاء' : 'Copy Dua'}</span>
    `;

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(dua.arabic);
        showToast(lang === 'ar' ? 'تم نسخ الدعاء بنجاح' : 'Dua copied to clipboard');
      } catch (err) {
        prompt('Copy Dua:', dua.arabic);
      }
    });

    footerDiv.appendChild(copyBtn);

    card.appendChild(headerDiv);
    card.appendChild(duaP);
    card.appendChild(footerDiv);
    container.appendChild(card);
  });
}
