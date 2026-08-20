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

  function renderSection(sec, i) {
    const wrap = el('article', 'psec reveal' + (i === 0 ? ' psec--open' : ''));
    wrap.dataset.sectionId = sec.id || '';

    // Header (clickable to toggle)
    const head = el('button', 'psec__head');
    head.type = 'button';
    head.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');
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
        sectionsMount.innerHTML = '';
        data.sections.forEach((s, i) => sectionsMount.appendChild(renderSection(s, i)));
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
