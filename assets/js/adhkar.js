/**
 * Adhkar & Digital Tasbih Engine
 * - Clean Web Audio API synthesis
 * - Haptic vibration feedback
 * - LocalStorage persistence for global stats
 * - Safe DOM manipulation
 */

import { getCurrentLang, t } from './i18n.js';
import { showToast } from './toast.js';

let adhkarData = {};
let currentCategory = 'morning';
let currentCount = 0;
let tasbihTarget = 33;
let isSoundOn = localStorage.getItem('tasbih_sound') !== 'false';
let totalDhikr = parseInt(localStorage.getItem('totalDhikr') || '0', 10);

export async function initAdhkarPage() {
  try {
    const res = await fetch('data/adhkar.json');
    adhkarData = await res.json();
  } catch (err) {
    console.error('Failed to load adhkar.json:', err);
  }

  setupTabListeners();
  setupTasbihListeners();
  renderCurrentCategory();
  updateTasbihUI();

  window.addEventListener('languageChanged', () => {
    renderCurrentCategory();
    updateTasbihUI();
  });
}

function setupTabListeners() {
  document.querySelectorAll('.adhkar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.getAttribute('data-tab');
      switchTab(category);
    });
  });
}

export function switchTab(category) {
  currentCategory = category;

  document.querySelectorAll('.adhkar-tab').forEach(tab => {
    if (tab.getAttribute('data-tab') === category) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const contentArea = document.getElementById('adhkar-content-area');
  const tasbihArea = document.getElementById('tasbih-interface');

  if (category === 'tasbih') {
    if (contentArea) contentArea.style.display = 'none';
    if (tasbihArea) tasbihArea.style.display = 'flex';
  } else {
    if (tasbihArea) tasbihArea.style.display = 'none';
    if (contentArea) {
      contentArea.style.display = 'block';
      renderCurrentCategory();
    }
  }
}

function renderCurrentCategory() {
  const container = document.getElementById('adhkar-content-area');
  if (!container || !adhkarData[currentCategory]) return;

  container.innerHTML = '';
  const lang = getCurrentLang();
  const items = adhkarData[currentCategory];

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'adhkar-card';

    const pArabic = document.createElement('p');
    pArabic.className = 'adhkar-arabic';
    pArabic.dir = 'rtl';
    pArabic.textContent = item.arabic;

    const footerDiv = document.createElement('div');
    footerDiv.className = 'adhkar-footer';

    const transP = document.createElement('p');
    transP.className = 'text-muted';
    transP.style.fontSize = '0.9rem';
    transP.style.maxWidth = '480px';
    transP.textContent = lang === 'ar' ? item.arabic.slice(0, 45) + '...' : item.translation;

    const actionDiv = document.createElement('div');
    actionDiv.style.display = 'flex';
    actionDiv.style.alignItems = 'center';
    actionDiv.style.gap = '1rem';

    const countBadge = document.createElement('span');
    countBadge.className = 'adhkar-count-badge';
    countBadge.textContent = `${item.count} ${lang === 'ar' ? 'مرات' : 'Times'}`;

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-outline';
    doneBtn.style.padding = '0.45rem 1rem';
    doneBtn.style.fontSize = '0.85rem';
    doneBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${t('done', 'Done')}</span>
    `;

    doneBtn.addEventListener('click', () => {
      incrementGlobalDhikr(item.count);
      doneBtn.classList.remove('btn-outline');
      doneBtn.classList.add('btn-primary');
      showToast(lang === 'ar' ? 'تم تسجيل الذكر وتقبل الله طاعتكم' : 'Dhikr recorded. May Allah accept!');
    });

    actionDiv.appendChild(countBadge);
    actionDiv.appendChild(doneBtn);

    footerDiv.appendChild(transP);
    footerDiv.appendChild(actionDiv);

    card.appendChild(pArabic);
    card.appendChild(footerDiv);
    container.appendChild(card);
  });
}

// Tasbih Logic
function setupTasbihListeners() {
  const countBtn = document.getElementById('tasbih-count-btn');
  const resetBtn = document.getElementById('tasbih-reset-btn');
  const soundBtn = document.getElementById('tasbih-sound-btn');
  const target33 = document.getElementById('target-33');
  const target100 = document.getElementById('target-100');

  if (countBtn) countBtn.addEventListener('click', incrementTasbih);
  if (resetBtn) resetBtn.addEventListener('click', resetTasbih);
  if (soundBtn) soundBtn.addEventListener('click', toggleSound);

  if (target33) {
    target33.addEventListener('click', () => setTarget(33));
  }
  if (target100) {
    target100.addEventListener('click', () => setTarget(100));
  }
}

export function incrementTasbih() {
  currentCount++;
  incrementGlobalDhikr(1);
  updateTasbihUI();

  if (isSoundOn) playAudioClick();

  if (currentCount >= tasbihTarget) {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    currentCount = 0;
    setTimeout(() => {
      showToast(getCurrentLang() === 'ar' ? 'اكتملت الدورة، بارك الله فيك' : 'Target completed, may Allah reward you!');
      updateTasbihUI();
    }, 200);
  } else {
    if (navigator.vibrate) navigator.vibrate(40);
  }
}

export function resetTasbih() {
  currentCount = 0;
  updateTasbihUI();
}

export function setTarget(target) {
  tasbihTarget = target;
  currentCount = 0;
  document.querySelectorAll('.btn-target').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-target'), 10) === target);
  });
  updateTasbihUI();
}

function incrementGlobalDhikr(amount = 1) {
  totalDhikr += amount;
  localStorage.setItem('totalDhikr', totalDhikr);
  updateGlobalStats();
}

function updateGlobalStats() {
  const globalEl = document.getElementById('global-counter');
  const progressEl = document.getElementById('tasbih-progress-bar');
  if (globalEl) globalEl.textContent = totalDhikr;
  if (progressEl) {
    const percent = Math.min(100, (totalDhikr / 1000) * 100);
    progressEl.style.width = `${percent}%`;
  }
}

function updateTasbihUI() {
  const countEl = document.getElementById('tasbih-count-display');
  const ringEl = document.getElementById('tasbih-ring-circle');

  if (countEl) countEl.textContent = currentCount;
  if (ringEl) {
    const circumference = 2 * Math.PI * 110; // r=110
    const offset = circumference - (currentCount / tasbihTarget) * circumference;
    ringEl.style.strokeDashoffset = Math.max(0, offset);
  }

  updateGlobalStats();
}

function playAudioClick() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (err) {
    // Silent fail if AudioContext is not permitted
  }
}

function toggleSound() {
  isSoundOn = !isSoundOn;
  localStorage.setItem('tasbih_sound', isSoundOn);
  const soundBtn = document.getElementById('tasbih-sound-btn');
  if (soundBtn) {
    soundBtn.style.opacity = isSoundOn ? '1' : '0.4';
  }
}

window.switchTab = switchTab;
window.incrementTasbih = incrementTasbih;
window.resetTasbih = resetTasbih;
window.setTarget = setTarget;
