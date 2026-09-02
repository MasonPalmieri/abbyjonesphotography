/* ===== Pricing renderer =====
   Reads /data/pricing.json → renders section-based accordion collections.
   Shape (v2):
   {
     intro: string,
     sections: [{
       id, label, name, startingAt, priceNote, sub, description,
       groups: [{ heading, note?, items: [] }],
       fineprint?, cta?: {label, href}
     }]
   }
   Legacy v1 (tiers/addons) still supported as a fallback.
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

  function renderSection(sec, i, forceOpenId) {
    const shouldOpen = forceOpenId ? (sec.id === forceOpenId) : (i === 0);
    const wrap = el('article', 'psec reveal' + (shouldOpen ? ' psec--open' : ''));
    wrap.dataset.sectionId = sec.id || '';
    if (sec.id) wrap.id = sec.id;

    // Header (clickable to toggle)
    const head = el('button', 'psec__head');
    head.type = 'button';
    head.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    head.innerHTML =
      (sec.label ? '<span class="psec__label">' + escapeHtml(sec.label) + '</span>' : '') +
      '<h2 class="psec__name">' + escapeHtml(sec.name || '') + '</h2>' +
      (sec.startingAt
        ? '<span class="psec__price">' +
            (sec.priceNote ? '<small>' + escapeHtml(sec.priceNote) + '</small>' : '') +
            '<strong>' + escapeHtml(sec.startingAt) + '</strong>' +
          '</span>'
        : '') +
      '<span class="psec__toggle" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9l6 6 6-6"/></svg>' +
      '</span>';

    // Body
    const body = el('div', 'psec__body');
    if (sec.heroImage) {
      const fig = el('figure', 'psec__hero');
      const im = document.createElement('img');
      im.src = sec.heroImage;
      im.alt = sec.heroImageAlt || sec.name || '';
      im.loading = 'lazy';
      fig.appendChild(im);
      body.appendChild(fig);
    }
    if (sec.sub) {
      const s = el('p', 'psec__sub');
      s.textContent = sec.sub;
      body.appendChild(s);
    }
    if (sec.description) {
      const d = el('p', 'psec__desc');
      d.textContent = sec.description;
      body.appendChild(d);
    }

    // Tier cards (e.g. wedding collections: Intimate / Signature / Full Story)
    if (Array.isArray(sec.tiers) && sec.tiers.length) {
      const tiersWrap = el('div', 'psec__tiers');
      sec.tiers.filter((t) => t && (t.name || t.price || (t.includes && t.includes.length))).forEach((t) => {
        const card = el('article', 'ptier' + (t.featured ? ' ptier--featured' : ''));
        if (t.label) {
          const lb = el('p', 'ptier__label');
          lb.textContent = t.label;
          card.appendChild(lb);
        }
        if (t.name) {
          const nm = el('h3', 'ptier__name');
          nm.textContent = t.name;
          card.appendChild(nm);
        }
        if (t.price) {
          const pr = el('p', 'ptier__price');
          pr.innerHTML =
            (t.priceNote ? '<small>' + escapeHtml(t.priceNote) + '</small> ' : '') +
            '<strong>' + escapeHtml(t.price) + '</strong>';
          card.appendChild(pr);
        }
        if (t.description) {
          const ds = el('p', 'ptier__desc');
          ds.textContent = t.description;
          card.appendChild(ds);
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
        tiersWrap.appendChild(card);
      });
      if (tiersWrap.children.length) body.appendChild(tiersWrap);
    }

    if (Array.isArray(sec.groups)) {
      sec.groups.forEach((g) => {
        const gw = el('div', 'psec__group');
        if (g.heading) {
          const h = el('h3', 'psec__group-head');
          h.textContent = g.heading;
          gw.appendChild(h);
        }
        if (g.note) {
          const n = el('p', 'psec__group-note');
          n.textContent = g.note;
          gw.appendChild(n);
        }
        if (Array.isArray(g.items) && g.items.length) {
          const ul = el('ul', 'psec__list');
          g.items.forEach((line) => {
            const li = document.createElement('li');
            li.textContent = line;
            ul.appendChild(li);
          });
          gw.appendChild(ul);
        }
        body.appendChild(gw);
      });
    }
    if (sec.fineprint) {
      const fp = el('p', 'psec__fineprint');
      fp.textContent = sec.fineprint;
      body.appendChild(fp);
    }
    const defaultHref = (window.AJP && window.AJP.url) ? window.AJP.url('/inquire.html') : '/inquire.html';
    const cta = sec.cta || { label: 'Inquire here', href: defaultHref };
    const a = el('a', 'psec__cta btn btn--primary');
    a.href = cta.href;
    a.innerHTML = escapeHtml(cta.label) + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
    body.appendChild(a);

    wrap.appendChild(head);
    wrap.appendChild(body);

    head.addEventListener('click', () => {
      const isOpen = wrap.classList.toggle('psec--open');
      head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    return wrap;
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
        // If URL has a hash matching a section id, open that section instead of the first one
        const hash = (location.hash || '').replace(/^#/, '');
        const hashMatch = hash && data.sections.some((s) => s.id === hash) ? hash : '';
        sectionsMount.innerHTML = '';
        data.sections.forEach((s, i) => sectionsMount.appendChild(renderSection(s, i, hashMatch)));
        // After render, scroll the targeted section into view (with nav offset)
        if (hashMatch) {
          const target = document.getElementById(hashMatch);
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
