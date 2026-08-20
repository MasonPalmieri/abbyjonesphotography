/* ===== Site-wide shared behavior =====
   - Loads nav + footer partials into any element with [data-partial="nav|footer"]
   - Handles mobile nav toggle
   - Highlights active nav link
   - Fills in copyright year
   - Reveal-on-scroll IntersectionObserver
   ============================================ */

(function () {
  'use strict';

  // Compute site base from the location of this script — works whether the site
  // is served at the domain root (GitHub Pages) or under a sub-path (preview host).
  function computeBase() {
    const scripts = document.querySelectorAll('script[src]');
    for (const s of scripts) {
      const src = s.getAttribute('src') || '';
      const idx = src.indexOf('/js/site.js');
      if (idx >= 0) return src.slice(0, idx) || '.';
    }
    return '.';
  }
  const BASE = computeBase();
  window.AJP = window.AJP || {};
  window.AJP.base = BASE;
  window.AJP.url = (p) => BASE + (p.startsWith('/') ? p : '/' + p);

  async function loadPartial(el, name) {
    try {
      const res = await fetch(window.AJP.url('/partials/' + name + '.html'), { cache: 'no-cache' });
      if (!res.ok) throw new Error('Partial fetch failed: ' + name);
      el.innerHTML = await res.text();
    } catch (err) {
      console.warn('Partial load error:', err);
    }
  }

  function wireNav(navRoot) {
    if (!navRoot) return;

    // Mobile toggle
    const toggle = navRoot.querySelector('.nav__toggle');
    const links = navRoot.querySelector('.nav__links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const open = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // Rewrite partial-relative absolute paths (e.g. /galleries.html) to site base
    navRoot.querySelectorAll('a[href^="/"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href.startsWith('//')) a.setAttribute('href', window.AJP.url(href));
    });

    // Active link — match by pathname *ending*
    const currentPath = location.pathname.replace(/\/$/, '') || '/';
    navRoot.querySelectorAll('.nav__links a').forEach((a) => {
      const linkPath = new URL(a.href, location.href).pathname.replace(/\/$/, '') || '/';
      if (linkPath === currentPath) a.style.color = 'var(--gold)';
    });
  }

  function wireYear(root) {
    root.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  function wireReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
  }

  function wireTypewriter() {
    const nodes = document.querySelectorAll('[data-typewriter]');
    if (!nodes.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    nodes.forEach((node) => {
      let words = [];
      try { words = JSON.parse(node.getAttribute('data-words') || '[]'); } catch (e) { words = []; }
      if (!words.length) return;
      const original = node.textContent;
      if (words[0] !== original) words.unshift(original);

      let wi = 0, ci = 0, deleting = false;
      function tick() {
        const word = words[wi];
        if (!deleting) {
          ci++;
          node.textContent = word.slice(0, ci);
          if (ci === word.length) {
            deleting = true;
            setTimeout(tick, 2400);
            return;
          }
          setTimeout(tick, 60 + Math.random() * 40);
        } else {
          ci--;
          node.textContent = word.slice(0, ci);
          if (ci === 0) {
            deleting = false;
            wi = (wi + 1) % words.length;
            setTimeout(tick, 500);
            return;
          }
          setTimeout(tick, 30);
        }
      }
      setTimeout(tick, 2200);
    });
  }

  async function boot() {
    // Load partials in parallel
    const navRoot = document.querySelector('[data-partial="nav"]');
    const footerRoot = document.querySelector('[data-partial="footer"]');
    const jobs = [];
    if (navRoot) jobs.push(loadPartial(navRoot, 'nav').then(() => wireNav(navRoot)));
    if (footerRoot) jobs.push(loadPartial(footerRoot, 'footer').then(() => wireYear(footerRoot)));
    await Promise.all(jobs);
    wireReveal();
    wireTypewriter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for other scripts
  window.AJP = window.AJP || {};
  window.AJP.wireReveal = wireReveal;
})();
