/* ===== Pricing renderer =====
   Reads /data/pricing.json → renders tiers + addons into [data-pricing]
   Shape: {
     mode: "inquire" | "coming_soon" | "public",
     intro: string,
     tiers: [{ label, name, price, priceNote, description, includes: [], featured?: bool, cta?: {label, href} }],
     addons: [{ name, description, price? }]
   }
   ============================================ */

(function () {
  'use strict';

  function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function renderTier(t) {
    const wrap = el('div', 'tier reveal' + (t.featured ? ' tier--featured' : ''));
    if (t.label) {
      const l = el('span', 'tier__label');
      l.textContent = t.label;
      wrap.appendChild(l);
    }
    const name = el('h3', 'tier__name');
    name.textContent = t.name || '';
    wrap.appendChild(name);

    const price = el('div', 'tier__price');
    price.innerHTML =
      (t.price ? escapeHtml(t.price) : '<em style="opacity:.55">Inquire for pricing</em>') +
      (t.priceNote ? '<small>' + escapeHtml(t.priceNote) + '</small>' : '');
    wrap.appendChild(price);

    if (t.description) {
      const d = el('p', 'tier__desc');
      d.textContent = t.description;
      wrap.appendChild(d);
    }
    if (Array.isArray(t.includes) && t.includes.length) {
      const ul = el('ul', 'tier__include');
      t.includes.forEach((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
    }
    const defaultHref = (window.AJP && window.AJP.url) ? window.AJP.url('/inquire.html') : '/inquire.html';
    const cta = t.cta || { label: 'Inquire about this', href: defaultHref };
    const a = el('a', 'tier__cta');
    a.href = cta.href;
    a.textContent = cta.label;
    wrap.appendChild(a);
    return wrap;
  }

  function renderAddon(a) {
    const w = el('div', 'addon');
    const n = el('h4', 'addon__name');
    n.textContent = a.name || '';
    w.appendChild(n);
    const d = el('p', 'addon__desc');
    d.textContent = a.description || '';
    w.appendChild(d);
    if (a.price) {
      const p = el('span', 'addon__price');
      p.textContent = a.price;
      w.appendChild(p);
    }
    return w;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
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

      const tiersMount = mount.querySelector('[data-pricing-tiers]');
      if (tiersMount && Array.isArray(data.tiers)) {
        tiersMount.innerHTML = '';
        data.tiers.forEach((t) => tiersMount.appendChild(renderTier(t)));
      }

      const addonsMount = mount.querySelector('[data-pricing-addons]');
      if (addonsMount && Array.isArray(data.addons) && data.addons.length) {
        addonsMount.innerHTML = '';
        data.addons.forEach((a) => addonsMount.appendChild(renderAddon(a)));
      } else if (addonsMount) {
        const container = addonsMount.closest('.addons');
        if (container) container.style.display = 'none';
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
