/* ===== Pricing renderer =====
   Renders /data/pricing.json into flat, mockup-style sections:
   - Weddings: 3 tier cards horizontally, middle tier featured in sage
   - Elopements: 1 vertical photo + includes list side-by-side
   - Portraits: 3 photo tiles with labels + includes list side-by-side
   ============================================ */

(function () {
  'use strict';

  function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function ctaButton(sec) {
    const defaultHref = (window.AJP && window.AJP.url) ? window.AJP.url('/inquire.html') : '/inquire.html';
    const cta = sec.cta || { label: 'Inquire here', href: defaultHref };
    const a = el('a', 'psec__cta');
    a.href = cta.href;
    a.innerHTML = escapeHtml(cta.label) + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
    return a;
  }

  function renderHeader(sec) {
    const head = el('header', 'psec__head');
    head.innerHTML =
      (sec.label ? '<span class="psec__label">' + escapeHtml(sec.label) + '</span>' : '') +
      '<h2 class="psec__name">' + escapeHtml(sec.name || '') + '</h2>' +
      (sec.startingAt
        ? '<span class="psec__price">' +
            (sec.priceNote ? '<small>' + escapeHtml(sec.priceNote) + '</small> ' : '') +
            '<strong>' + escapeHtml(sec.startingAt) + '</strong>' +
          '</span>'
        : '');
    return head;
  }

  function renderTiers(tiers) {
    const wrap = el('div', 'ptiers');
    tiers.filter((t) => t && (t.name || t.price || (t.includes && t.includes.length))).forEach((t) => {
      const card = el('article', 'ptier' + (t.featured ? ' ptier--featured' : ''));
      if (t.featured) {
        const badge = el('span', 'ptier__badge');
        badge.textContent = 'Most Popular';
        card.appendChild(badge);
      }
      if (t.name) {
        const nm = el('h3', 'ptier__name');
        nm.textContent = t.name;
        card.appendChild(nm);
      }
      if (t.price) {
        const pr = el('p', 'ptier__price');
        pr.textContent = t.price;
        card.appendChild(pr);
      }
      if (Array.isArray(t.includes) && t.includes.length) {
        const ul = el('ul', 'ptier__list');
        t.includes.forEach((line) => {
          const li = document.createElement('li');
          li.textContent = line;
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      wrap.appendChild(card);
    });
    return wrap;
  }

  function renderIncludesList(groups) {
    const wrap = el('div', 'psec__includes');
    (groups || []).forEach((g) => {
      if (g.heading) {
        const h = el('h3', 'psec__group-head');
        h.textContent = g.heading;
        wrap.appendChild(h);
      }
      if (Array.isArray(g.items) && g.items.length) {
        const ul = el('ul', 'psec__list');
        g.items.forEach((line) => {
          const li = document.createElement('li');
          li.textContent = line;
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
      }
    });
    return wrap;
  }

  function renderWeddings(sec) {
    const article = el('article', 'psec psec--weddings reveal');
    if (sec.id) article.id = sec.id;
    article.appendChild(renderHeader(sec));
    if (Array.isArray(sec.tiers) && sec.tiers.length) {
      article.appendChild(renderTiers(sec.tiers));
    }
    const ctaWrap = el('div', 'psec__cta-row');
    ctaWrap.appendChild(ctaButton(sec));
    article.appendChild(ctaWrap);
    return article;
  }

  function renderElopements(sec) {
    const article = el('article', 'psec psec--elopements reveal');
    if (sec.id) article.id = sec.id;
    article.appendChild(renderHeader(sec));

    const grid = el('div', 'psec__split');
    if (sec.heroImage) {
      const fig = el('figure', 'psec__hero-vertical');
      const im = document.createElement('img');
      im.src = sec.heroImage;
      im.alt = sec.heroImageAlt || sec.name || '';
      im.loading = 'lazy';
      fig.appendChild(im);
      grid.appendChild(fig);
    }
    const right = el('div', 'psec__right');
    right.appendChild(renderIncludesList(sec.groups));
    right.appendChild(ctaButton(sec));
    grid.appendChild(right);
    article.appendChild(grid);
    return article;
  }

  function renderPortraits(sec) {
    const article = el('article', 'psec psec--portraits reveal');
    if (sec.id) article.id = sec.id;
    article.appendChild(renderHeader(sec));

    const grid = el('div', 'psec__split psec__split--portraits');
    // Left: 3 photo tiles with labels
    const tiles = el('div', 'psec__tiles');
    (sec.subImages || []).forEach((im) => {
      const tile = el('figure', 'psec__tile');
      const img = document.createElement('img');
      img.src = im.src;
      img.alt = im.label || '';
      img.loading = 'lazy';
      tile.appendChild(img);
      if (im.label) {
        const cap = el('figcaption', 'psec__tile-cap');
        cap.textContent = im.label;
        tile.appendChild(cap);
      }
      tiles.appendChild(tile);
    });
    grid.appendChild(tiles);

    // Right: includes list + button
    const right = el('div', 'psec__right');
    right.appendChild(renderIncludesList(sec.groups));
    right.appendChild(ctaButton(sec));
    grid.appendChild(right);

    article.appendChild(grid);
    return article;
  }

  function renderSection(sec) {
    if (sec.id === 'weddings' || (Array.isArray(sec.tiers) && sec.tiers.length)) {
      return renderWeddings(sec);
    }
    if (sec.id === 'portraits' || (Array.isArray(sec.subImages) && sec.subImages.length)) {
      return renderPortraits(sec);
    }
    return renderElopements(sec);
  }

  async function loadPricing(mount) {
    try {
      const url = (window.AJP && window.AJP.url) ? window.AJP.url('/data/pricing.json') : '/data/pricing.json';
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Pricing load failed');
      const data = await res.json();

      if (data.intro) {
        const introEl = mount.querySelector('[data-pricing-intro]');
        if (introEl) introEl.textContent = data.intro;
      }

      const sectionsMount = mount.querySelector('[data-pricing-sections]');
      if (sectionsMount && Array.isArray(data.sections)) {
        sectionsMount.innerHTML = '';
        data.sections.forEach((s) => sectionsMount.appendChild(renderSection(s)));

        // Scroll to hash if present
        const hash = (location.hash || '').replace(/^#/, '');
        if (hash) {
          const target = document.getElementById(hash);
          if (target) {
            requestAnimationFrame(() => {
              const y = target.getBoundingClientRect().top + window.scrollY - 80;
              window.scrollTo({ top: y, behavior: 'smooth' });
            });
          }
        }
      }

      if (window.AJP && window.AJP.wireReveal) window.AJP.wireReveal();
    } catch (err) {
      console.warn(err);
    }
  }

  function boot() {
    document.querySelectorAll('[data-pricing]').forEach(loadPricing);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
