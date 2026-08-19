/* ===== Gallery renderer + lightbox =====
   Renders a collection from /data/galleries/<slug>.json into [data-gallery="<slug>"]
   Shape: { title, subtitle, images: [{src, alt, caption?, featured?}] }
   Also supports [data-featured-count="N"] to only render featured (or first N) images.
   ============================================ */

(function () {
  'use strict';

  function el(tag, cls, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  }

  function renderEmpty(mount, subtitle) {
    const wrap = el('div', 'gallery__empty');
    const h = el('h3');
    h.textContent = 'Coming soon';
    const p = el('p');
    p.textContent = subtitle || 'New work will be added to this gallery soon.';
    wrap.appendChild(h);
    wrap.appendChild(p);
    mount.appendChild(wrap);
  }

  function rewriteSrc(src) {
    if (!src) return src;
    if (/^https?:\/\//i.test(src) || src.startsWith('//') || src.startsWith('data:')) return src;
    if (src.startsWith('/') && window.AJP && window.AJP.url) return window.AJP.url(src);
    return src;
  }

  function renderGrid(mount, images) {
    const grid = el('div', 'gallery__grid');
    const rewritten = images.map((i) => Object.assign({}, i, { src: rewriteSrc(i.src) }));
    rewritten.forEach((img, i) => {
      const item = el('div', 'gallery__item reveal');
      const image = el('img', null, {
        src: img.src,
        alt: img.alt || '',
        loading: i < 3 ? 'eager' : 'lazy',
        'data-index': String(i),
      });
      item.appendChild(image);
      grid.appendChild(item);
    });
    mount.appendChild(grid);
    if (window.AJP && window.AJP.wireReveal) window.AJP.wireReveal();
    wireLightbox(grid, rewritten);
  }

  function wireLightbox(grid, images) {
    let lb = document.querySelector('.lightbox');
    if (!lb) {
      lb = el('div', 'lightbox');
      lb.innerHTML = `
        <button class="lightbox__close" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M6 18L18 6"/></svg>
        </button>
        <button class="lightbox__prev" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <img alt="">
        <button class="lightbox__next" aria-label="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 6l6 6-6 6"/></svg>
        </button>
        <div class="lightbox__caption"></div>
      `;
      document.body.appendChild(lb);
    }
    const lbImg = lb.querySelector('img');
    const lbCap = lb.querySelector('.lightbox__caption');
    let index = 0;

    function show(i) {
      index = (i + images.length) % images.length;
      lbImg.src = images[index].src;
      lbImg.alt = images[index].alt || '';
      lbCap.textContent = images[index].caption || '';
      lb.classList.add('is-open');
    }
    function close() { lb.classList.remove('is-open'); }

    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.gallery__item img');
      if (!item) return;
      show(parseInt(item.dataset.index, 10));
    });
    lb.querySelector('.lightbox__close').addEventListener('click', close);
    lb.querySelector('.lightbox__prev').addEventListener('click', () => show(index - 1));
    lb.querySelector('.lightbox__next').addEventListener('click', () => show(index + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  async function loadGallery(mount) {
    const slug = mount.getAttribute('data-gallery');
    const featuredCount = parseInt(mount.getAttribute('data-featured-count') || '0', 10);
    try {
      const url = (window.AJP && window.AJP.url ? window.AJP.url('/data/galleries/' + slug + '.json') : '/data/galleries/' + slug + '.json');
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Gallery load failed: ' + slug);
      const data = await res.json();
      let images = Array.isArray(data.images) ? data.images.slice() : [];

      if (featuredCount > 0) {
        const featured = images.filter((i) => i.featured);
        images = (featured.length ? featured : images).slice(0, featuredCount);
      }

      if (!images.length) {
        renderEmpty(mount, data.emptyMessage);
        return;
      }
      renderGrid(mount, images);
    } catch (err) {
      console.warn(err);
      renderEmpty(mount);
    }
  }

  function boot() {
    document.querySelectorAll('[data-gallery]').forEach(loadGallery);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
