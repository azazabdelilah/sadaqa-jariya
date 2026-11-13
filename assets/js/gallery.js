/**
 * Memorial Photo Gallery & Lightbox
 * - High performance WebP thumbnails + full-size view
 * - Accessible keyboard navigation & ARIA
 * - RTL/LTR arrow awareness
 */

import { getCurrentLang } from './i18n.js';

let galleryPhotos = [];
let currentIndex = 0;

export async function initGalleryPage() {
  try {
    const res = await fetch('data/gallery.json');
    galleryPhotos = await res.json();
    renderGalleryGrid();
    setupLightboxEvents();
  } catch (err) {
    console.error('Failed to load gallery.json:', err);
  }

  window.addEventListener('languageChanged', () => {
    renderGalleryGrid();
    if (document.getElementById('gallery-lightbox').classList.contains('open')) {
      updateLightboxContent();
    }
  });
}

function renderGalleryGrid() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const lang = getCurrentLang();

  galleryPhotos.forEach((photo, index) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View ${photo[`caption_${lang}`]}`);

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'gallery-thumb-wrap';

    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo[`caption_${lang}`] || 'Memorial Photo';
    img.loading = 'lazy';
    img.className = 'gallery-thumb';

    thumbWrap.appendChild(img);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'gallery-info';

    const captionH3 = document.createElement('h3');
    captionH3.className = 'gallery-caption';
    captionH3.textContent = photo[`caption_${lang}`];

    const subP = document.createElement('p');
    subP.className = 'gallery-sub';
    subP.textContent = photo[`sub_${lang}`];

    infoDiv.appendChild(captionH3);
    infoDiv.appendChild(subP);

    card.appendChild(thumbWrap);
    card.appendChild(infoDiv);

    const openHandler = () => openLightbox(index);
    card.addEventListener('click', openHandler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openHandler();
      }
    });

    grid.appendChild(card);
  });
}

export function openLightbox(index) {
  currentIndex = index;
  updateLightboxContent();
  const lightbox = document.getElementById('gallery-lightbox');
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeLightbox() {
  const lightbox = document.getElementById('gallery-lightbox');
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function updateLightboxContent() {
  const photo = galleryPhotos[currentIndex];
  if (!photo) return;

  const lang = getCurrentLang();
  const imgEl = document.getElementById('lightbox-img');
  const captionEl = document.getElementById('lightbox-caption');
  const subEl = document.getElementById('lightbox-sub');

  if (imgEl) {
    imgEl.src = photo.full;
    imgEl.alt = photo[`caption_${lang}`];
  }
  if (captionEl) captionEl.textContent = photo[`caption_${lang}`];
  if (subEl) subEl.textContent = photo[`sub_${lang}`];
}

export function nextImage() {
  currentIndex = (currentIndex + 1) % galleryPhotos.length;
  updateLightboxContent();
}

export function prevImage() {
  currentIndex = (currentIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
  updateLightboxContent();
}

function setupLightboxEvents() {
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  const lightbox = document.getElementById('gallery-lightbox');

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', prevImage);
  if (nextBtn) nextBtn.addEventListener('click', nextImage);

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('open')) return;
    const isRtl = getCurrentLang() === 'ar';

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') {
      if (isRtl) prevImage();
      else nextImage();
    }
    if (e.key === 'ArrowLeft') {
      if (isRtl) nextImage();
      else prevImage();
    }
  });
}

window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.nextImage = nextImage;
window.prevImage = prevImage;
