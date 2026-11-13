/**
 * Quran Reader & Audio Player Engine
 * - Local static JSON with API fallback
 * - Search with Arabic normalization (exact text preserved in display)
 * - EveryAyah multi-reciter streaming with auto-advance and visual ayah sync
 * - Safe DOM manipulation (textContent)
 */

import { getCurrentLang, t } from './i18n.js';
import { showToast } from './toast.js';

let allSurahs = [];
let currentSurahData = null;
let currentAyahIndex = 0;
let isPlaying = false;
const audioPlayer = new Audio();

const RECITERS = {
  alafasy: {
    nameKey: 'reciter_alafasy',
    baseUrl: 'https://everyayah.com/data/Alafasy_128kbps/'
  },
  husary: {
    nameKey: 'reciter_husary',
    baseUrl: 'https://everyayah.com/data/Husary_128kbps/'
  },
  abdulbasit: {
    nameKey: 'reciter_abdulbasit',
    baseUrl: 'https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/'
  }
};

let selectedReciter = localStorage.getItem('selected_reciter') || 'alafasy';

// Normalize Arabic ONLY for search matching
export function normalizeArabicForSearch(text) {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel & diacritics
    .replace(/[أإآٱ]/g, 'ا')              // Unify Alef variants
    .replace(/ة/g, 'ه')                    // Teh Marbuta -> Heh
    .replace(/ى/g, 'ي')                    // Alef Maksura -> Yeh
    .replace(/[\u06D6-\u06ED]/g, '')       // Remove Quranic pause marks
    .trim()
    .toLowerCase();
}

// Format 3-digit number for EveryAyah filenames
function pad3(num) {
  return String(num).padStart(3, '0');
}

// Load Surahs Index
export async function initQuranPage() {
  const listContainer = document.getElementById('surah-list-container');
  const searchInput = document.getElementById('surah-search');

  try {
    const res = await fetch('data/surahs.json');
    allSurahs = await res.json();
    renderSurahList(allSurahs);
  } catch (err) {
    console.warn('Local surahs.json failed, falling back to API:', err);
    try {
      const apiRes = await fetch('https://api.alquran.cloud/v1/surah');
      const apiData = await apiRes.json();
      allSurahs = apiData.data;
      renderSurahList(allSurahs);
    } catch (apiErr) {
      listContainer.innerHTML = '';
      const errP = document.createElement('p');
      errP.className = 'text-center text-muted';
      errP.textContent = 'Failed to load Quran data. Please check your connection.';
      listContainer.appendChild(errP);
      return;
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterSurahs(e.target.value);
    });
  }

  setupAudioListeners();

  window.addEventListener('languageChanged', () => {
    if (document.getElementById('reader-view').classList.contains('hidden')) {
      renderSurahList(allSurahs);
    } else if (currentSurahData) {
      renderReader(currentSurahData);
    }
  });
}

function filterSurahs(query) {
  const q = normalizeArabicForSearch(query);
  const filtered = allSurahs.filter(surah => {
    const arName = normalizeArabicForSearch(surah.name);
    const enName = (surah.englishName || '').toLowerCase();
    const enTrans = (surah.englishNameTranslation || '').toLowerCase();
    const num = String(surah.number);
    return arName.includes(q) || enName.includes(q) || enTrans.includes(q) || num === q;
  });
  renderSurahList(filtered);
}

function renderSurahList(surahs) {
  const container = document.getElementById('surah-list-container');
  if (!container) return;

  container.innerHTML = '';
  const lang = getCurrentLang();

  if (surahs.length === 0) {
    const emptyP = document.createElement('p');
    emptyP.className = 'text-center text-muted';
    emptyP.style.gridColumn = '1 / -1';
    emptyP.style.padding = '3rem 0';
    emptyP.textContent = lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching Surah found';
    container.appendChild(emptyP);
    return;
  }

  surahs.forEach(surah => {
    const card = document.createElement('div');
    card.className = 'surah-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${surah.name} - ${surah.englishName}`);

    // Left info
    const leftDiv = document.createElement('div');
    leftDiv.className = 'surah-meta';

    const numSpan = document.createElement('span');
    numSpan.className = 'surah-num';
    numSpan.textContent = surah.number;

    const namesDiv = document.createElement('div');
    namesDiv.className = 'surah-names';

    const titleH4 = document.createElement('h4');
    titleH4.className = 'surah-title';
    titleH4.textContent = lang === 'ar' ? surah.name : surah.englishName;

    const subP = document.createElement('p');
    subP.className = 'surah-sub';
    subP.textContent = surah.englishNameTranslation || '';

    namesDiv.appendChild(titleH4);
    namesDiv.appendChild(subP);
    leftDiv.appendChild(numSpan);
    leftDiv.appendChild(namesDiv);

    // Right info
    const rightDiv = document.createElement('div');
    rightDiv.className = 'surah-arabic';

    const arNameDiv = document.createElement('div');
    arNameDiv.className = 'surah-ar-name';
    arNameDiv.textContent = surah.name;

    const ayahCountSpan = document.createElement('span');
    ayahCountSpan.className = 'surah-ayah-count';
    ayahCountSpan.textContent = `${surah.numberOfAyahs} ${lang === 'ar' ? 'آية' : 'Ayahs'}`;

    rightDiv.appendChild(arNameDiv);
    rightDiv.appendChild(ayahCountSpan);

    card.appendChild(leftDiv);
    card.appendChild(rightDiv);

    const openHandler = () => openSurah(surah.number);
    card.addEventListener('click', openHandler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openHandler();
      }
    });

    container.appendChild(card);
  });
}

export async function openSurah(number) {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const listContainer = document.getElementById('surah-list-container');
  const searchWrapper = document.getElementById('search-wrapper');
  const readerView = document.getElementById('reader-view');

  listContainer.style.display = 'none';
  if (searchWrapper) searchWrapper.style.display = 'none';
  readerView.classList.remove('hidden');

  stopAudio();

  // Try local JSON first
  try {
    const res = await fetch(`data/quran/${number}.json`);
    if (!res.ok) throw new Error('Local file not found');
    currentSurahData = await res.json();
    renderReader(currentSurahData);
  } catch (err) {
    console.warn(`Local fetch for Surah ${number} failed, falling back to API:`, err);
    try {
      const apiRes = await fetch(`https://api.alquran.cloud/v1/surah/${number}/editions/quran-uthmani,en.sahih`);
      const apiData = await apiRes.json();
      const uthmani = apiData.data[0];
      const english = apiData.data[1];

      currentSurahData = {
        number: uthmani.number,
        name: uthmani.name,
        englishName: uthmani.englishName,
        englishNameTranslation: uthmani.englishNameTranslation,
        numberOfAyahs: uthmani.numberOfAyahs,
        revelationType: uthmani.revelationType,
        ayahs: uthmani.ayahs.map((a, i) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          juz: a.juz,
          text: a.text,
          translation: english.ayahs[i] ? english.ayahs[i].text : ''
        }))
      };
      renderReader(currentSurahData);
    } catch (apiErr) {
      alert('Unable to load Surah. Please check your internet connection.');
      closeReader();
    }
  }
}

function renderReader(surah) {
  const lang = getCurrentLang();

  // Title & Metadata
  const titleEl = document.getElementById('reader-surah-title');
  const metaEl = document.getElementById('reader-surah-info');

  if (titleEl) {
    titleEl.textContent = lang === 'ar' ? surah.name : surah.englishName;
  }
  if (metaEl) {
    metaEl.textContent = `${surah.revelationType} • ${surah.numberOfAyahs} ${lang === 'ar' ? 'آية' : 'Ayahs'}`;
  }

  // Bismillah Area (hidden for Surah 1 Al-Fatiha and Surah 9 At-Tawbah)
  const bismillahArea = document.getElementById('bismillah-area');
  if (bismillahArea) {
    if (surah.number === 1 || surah.number === 9) {
      bismillahArea.style.display = 'none';
    } else {
      bismillahArea.style.display = 'block';
    }
  }

  // Render Mushaf Paragraph
  const ayahsContainer = document.getElementById('ayahs-container');
  ayahsContainer.innerHTML = '';

  const mushafBox = document.createElement('div');
  mushafBox.className = 'mushaf-box';

  const p = document.createElement('p');
  p.className = 'mushaf-paragraph';
  p.dir = 'rtl';

  surah.ayahs.forEach((ayah, index) => {
    const spanAyah = document.createElement('span');
    spanAyah.className = 'ayah-span';
    spanAyah.id = `ayah-span-${index}`;

    // Clean leading Bismillah in Uthmani text if present on first ayah (except Fatiha)
    let displayText = ayah.text;
    if (surah.number !== 1 && ayah.numberInSurah === 1) {
      const bismillahPattern = /^﻿?بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/;
      displayText = displayText.replace(bismillahPattern, '');
    }

    // Exact Quranic text preserved faithfully via textContent
    const textNode = document.createTextNode(displayText);
    spanAyah.appendChild(textNode);

    const marker = document.createElement('span');
    marker.className = 'ayah-marker';
    marker.textContent = ayah.numberInSurah;
    spanAyah.appendChild(marker);

    // Click on ayah to jump audio
    spanAyah.addEventListener('click', () => {
      playAyah(index);
    });

    p.appendChild(spanAyah);
    p.appendChild(document.createTextNode(' '));
  });

  mushafBox.appendChild(p);
  ayahsContainer.appendChild(mushafBox);

  // Render English Translations if English language selected
  if (lang === 'en') {
    const transSec = document.createElement('div');
    transSec.className = 'translation-section';

    const transH3 = document.createElement('h3');
    transH3.style.marginBottom = '1.5rem';
    transH3.textContent = 'English Translation (Sahih International)';
    transSec.appendChild(transH3);

    surah.ayahs.forEach(ayah => {
      const item = document.createElement('div');
      item.className = 'translation-item';

      const numBadge = document.createElement('span');
      numBadge.className = 'translation-ayah-num';
      numBadge.textContent = ayah.numberInSurah;

      const transP = document.createElement('p');
      transP.className = 'translation-text';
      transP.textContent = ayah.translation;

      item.appendChild(numBadge);
      item.appendChild(transP);
      transSec.appendChild(item);
    });

    ayahsContainer.appendChild(transSec);
  }

  currentAyahIndex = 0;
  updateAudioNowPlaying();
}

export function closeReader() {
  stopAudio();
  const listContainer = document.getElementById('surah-list-container');
  const searchWrapper = document.getElementById('search-wrapper');
  const readerView = document.getElementById('reader-view');

  listContainer.style.display = 'grid';
  if (searchWrapper) searchWrapper.style.display = 'block';
  readerView.classList.add('hidden');
}

// Audio Player Handlers
function setupAudioListeners() {
  const playBtn = document.getElementById('audio-play-btn');
  const prevBtn = document.getElementById('audio-prev-btn');
  const nextBtn = document.getElementById('audio-next-btn');
  const reciterSelect = document.getElementById('reciter-select');

  if (reciterSelect) {
    reciterSelect.value = selectedReciter;
    reciterSelect.addEventListener('change', (e) => {
      selectedReciter = e.target.value;
      localStorage.setItem('selected_reciter', selectedReciter);
      if (isPlaying) {
        playAyah(currentAyahIndex);
      }
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', toggleAudio);
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentAyahIndex > 0) {
        playAyah(currentAyahIndex - 1);
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentSurahData && currentAyahIndex < currentSurahData.ayahs.length - 1) {
        playAyah(currentAyahIndex + 1);
      }
    });
  }

  // Auto-advance to next ayah when finished
  audioPlayer.addEventListener('ended', () => {
    if (currentSurahData && currentAyahIndex < currentSurahData.ayahs.length - 1) {
      playAyah(currentAyahIndex + 1);
    } else {
      stopAudio();
    }
  });

  audioPlayer.addEventListener('error', (e) => {
    console.warn('Audio streaming failed:', e);
    showToast('Audio recitation not available for this verse.');
    stopAudio();
  });
}

function getAyahAudioUrl(surahNum, ayahNumInSurah) {
  const reciter = RECITERS[selectedReciter] || RECITERS.alafasy;
  return `${reciter.baseUrl}${pad3(surahNum)}${pad3(ayahNumInSurah)}.mp3`;
}

export function playAyah(index) {
  if (!currentSurahData || !currentSurahData.ayahs[index]) return;

  currentAyahIndex = index;
  const ayah = currentSurahData.ayahs[index];
  const url = getAyahAudioUrl(currentSurahData.number, ayah.numberInSurah);

  audioPlayer.src = url;
  audioPlayer.play().then(() => {
    isPlaying = true;
    updateAudioUI();
    highlightCurrentAyah();
  }).catch(err => {
    console.warn('Audio play prevented:', err);
    isPlaying = false;
    updateAudioUI();
  });
}

export function toggleAudio() {
  if (!currentSurahData) return;
  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
    updateAudioUI();
  } else {
    if (!audioPlayer.src || audioPlayer.src === '') {
      playAyah(currentAyahIndex);
    } else {
      audioPlayer.play().then(() => {
        isPlaying = true;
        updateAudioUI();
        highlightCurrentAyah();
      });
    }
  }
}

function stopAudio() {
  audioPlayer.pause();
  audioPlayer.removeAttribute('src');
  isPlaying = false;
  currentAyahIndex = 0;
  updateAudioUI();
  clearAyahHighlights();
}

function updateAudioUI() {
  const playBtn = document.getElementById('audio-play-btn');
  if (playBtn) {
    if (isPlaying) {
      playBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      `;
      playBtn.setAttribute('title', 'Pause');
    } else {
      playBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="transform: translateX(1px)">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
      playBtn.setAttribute('title', 'Play');
    }
  }
  updateAudioNowPlaying();
}

function updateAudioNowPlaying() {
  const nowPlayingEl = document.getElementById('audio-now-playing');
  if (nowPlayingEl && currentSurahData) {
    const ayahNum = currentSurahData.ayahs[currentAyahIndex] ? currentSurahData.ayahs[currentAyahIndex].numberInSurah : 1;
    nowPlayingEl.textContent = `${t('quran')}: ${t('verse', 'Ayah')} ${ayahNum} / ${currentSurahData.numberOfAyahs}`;
  }
}

function highlightCurrentAyah() {
  clearAyahHighlights();
  const el = document.getElementById(`ayah-span-${currentAyahIndex}`);
  if (el) {
    el.classList.add('playing');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function clearAyahHighlights() {
  document.querySelectorAll('.ayah-span.playing').forEach(el => el.classList.remove('playing'));
}

// Gift Recitation Toast Action
export function giftRecitation() {
  showToast(t('gift_toast'));
}

// Attach globals for HTML click attributes
window.openSurah = openSurah;
window.closeReader = closeReader;
window.toggleAudio = toggleAudio;
window.giftRecitation = giftRecitation;
