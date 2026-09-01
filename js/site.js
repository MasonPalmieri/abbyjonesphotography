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

  async function wireAbout() {
    // Runs on any page carrying about mounts (about.html + wherever we reuse them)
    const img = document.querySelector('[data-about-portrait]');
    const familyPhotos = document.querySelector('[data-family-photos]');
    const hasAboutText = document.querySelector('[data-about-headline], [data-about-lead], [data-about-body]');
    if (!img && !familyPhotos && !hasAboutText) return;
    try {
      const res = await fetch('/data/about.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const data = await res.json();

      // ----- Portrait -----
      if (img && data.portrait) img.src = data.portrait;
      if (img && data.portraitAlt) img.alt = data.portraitAlt;

      // ----- Hero text -----
      setHTML('[data-about-headline]', data.headline);
      setText('[data-about-lead]', data.lead);
      if (Array.isArray(data.body)) {
        const bodyEl = document.querySelector('[data-about-body]');
        if (bodyEl) {
          bodyEl.innerHTML = data.body
            .filter((p) => p && String(p).trim())
            .map((p) => '<p class="reveal">' + escapeHTML(p) + '</p>')
            .join('');
        }
      }

      // ----- Locations -----
      if (Array.isArray(data.locations)) {
        const locEl = document.querySelector('[data-about-locations]');
        if (locEl) {
          locEl.innerHTML = data.locations
            .filter((l) => l && (l.label || l.value))
            .map((l) =>
              '<div class="about__location">' +
              '<span class="about__location-label">' + escapeHTML(l.label || '') + '</span>' +
              '<span class="about__location-value">' + escapeHTML(l.value || '') + '</span>' +
              '</div>'
            ).join('');
        }
      }

      // ----- "A Little More About Me" intro -----
      if (data.aboutMore) {
        setText('[data-about-more-label]', data.aboutMore.label);
        setHTML('[data-about-more-title]', data.aboutMore.title);
      }

      // ----- Family (heading + text + photos) -----
      if (data.family) {
        setText('[data-about-family-heading]', data.family.heading);
        if (Array.isArray(data.family.text)) {
          const famText = document.querySelector('[data-about-family-text]');
          if (famText) {
            famText.innerHTML = data.family.text
              .filter((p) => p && String(p).trim())
              .map((p) => '<p>' + escapeHTML(p) + '</p>')
              .join('');
          }
        }

        if (familyPhotos) {
          [1, 2, 3].forEach((n) => {
            const slot = familyPhotos.querySelector('[data-family-slot="' + n + '"]');
            if (!slot) return;
            const src = data.family['photo' + n];
            const alt = data.family['photo' + n + 'Alt'] || '';
            const caption = data.family['photo' + n + 'Caption'];
            if (caption) {
              const cap = slot.querySelector('figcaption');
              if (cap) cap.textContent = caption;
              const span = slot.querySelector('.family__ph span');
              if (span) span.textContent = caption;
            }
            if (src) {
              const ph = slot.querySelector('.family__ph');
              if (ph) {
                const image = document.createElement('img');
                image.src = src;
                image.alt = alt;
                image.className = 'family__img';
                image.loading = 'lazy';
                ph.replaceWith(image);
              }
            }
          });
        }
      }

      // ----- Fun facts -----
      if (data.funFacts) {
        setText('[data-about-funfacts-eyebrow]', data.funFacts.eyebrow);
        if (Array.isArray(data.funFacts.items)) {
          const grid = document.querySelector('[data-about-funfacts-grid]');
          if (grid) {
            const items = data.funFacts.items.filter((it) => it && (it.title || it.body));
            if (items.length) {
              grid.innerHTML = items.map((it, idx) => {
                const num = it.number || String(idx + 1).padStart(2, '0');
                const media = it.photo
                  ? '<img src="' + escapeAttr(it.photo) + '" alt="' + escapeAttr(it.photoAlt || '') + '" class="funfact__img" loading="lazy">'
                  : '<div class="funfact__ph"><span>' + escapeHTML(it.photoCaption || '') + '</span></div>';
                return '<article class="funfact">' +
                  '<span class="funfact__num">' + escapeHTML(num) + '</span>' +
                  media +
                  '<h4 class="funfact__title">' + escapeHTML(it.title || '') + '</h4>' +
                  '<p class="funfact__body">' + escapeHTML(it.body || '') + '</p>' +
                  '</article>';
              }).join('');
            }
          }
        }
      }

      // ----- Love letter -----
      if (data.loveLetter) {
        setText('[data-about-love-label]', data.loveLetter.label);
        setText('[data-about-love-quote]', data.loveLetter.quote);
        setText('[data-about-love-footer]', data.loveLetter.footer);
      }

      // ----- Contact -----
      if (data.contact) {
        setHTML('[data-about-contact-title]', data.contact.title);
        setText('[data-about-contact-sub]', data.contact.sub);
        const primary = document.querySelector('[data-about-contact-primary]');
        if (primary) {
          if (data.contact.primaryCtaLabel) {
            // Preserve the trailing arrow SVG
            const svg = primary.querySelector('svg');
            primary.textContent = data.contact.primaryCtaLabel + ' ';
            if (svg) primary.appendChild(svg);
          }
          if (data.contact.primaryCtaHref) primary.setAttribute('href', data.contact.primaryCtaHref);
        }
        const secondary = document.querySelector('[data-about-contact-secondary]');
        if (secondary && data.contact.secondaryCtaLabel) {
          secondary.textContent = data.contact.secondaryCtaLabel;
        }
      }
    } catch (_) { /* silent — leave the HTML fallback in place */ }
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  function escapeAttr(s) { return escapeHTML(s); }

  function setText(sel, value) {
    if (value == null) return;
    const el = document.querySelector(sel);
    if (el) el.textContent = value;
  }
  function setHTML(sel, value) {
    if (value == null) return;
    const el = document.querySelector(sel);
    if (el) el.innerHTML = value;
  }
  function setAttr(sel, attr, value) {
    if (value == null) return;
    const el = document.querySelector(sel);
    if (el) el.setAttribute(attr, value);
  }

  async function wireHome() {
    // Only run on the home page (hero mount is unique to index.html)
    if (!document.querySelector('[data-home-hero]')) return;
    try {
      const res = await fetch('/data/home.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const d = await res.json();

      // Hero
      if (d.hero) {
        setAttr('[data-home-hero-bg]', 'src', d.hero.backgroundImage);
        setAttr('[data-home-hero-bg]', 'alt', d.hero.backgroundImageAlt);
        setText('[data-home-hero-eyebrow]', d.hero.eyebrow);
        setText('[data-home-hero-title-lead]', d.hero.titleLead);
        setText('[data-home-hero-title-trailing]', d.hero.titleTrailing);
        const em = document.querySelector('[data-home-hero-title-em]');
        if (em) {
          const words = Array.isArray(d.hero.titleWords) ? d.hero.titleWords.filter(Boolean) : [];
          if (words.length) {
            em.textContent = words[0];
            em.setAttribute('data-words', JSON.stringify(words));
          }
        }
        setText('[data-home-hero-sub]', d.hero.sub);
        setText('[data-home-hero-cta-label]', d.hero.ctaLabel);
        setAttr('[data-home-hero-cta]', 'href', d.hero.ctaHref);
      }

      // Intro
      if (d.intro) {
        setText('[data-home-intro-quote]', d.intro.quote);
        setText('[data-home-intro-attr]', d.intro.attribution);
      }

      // About preview (headline/lead/body may contain <em> tags, so use innerHTML)
      if (d.aboutPreview) {
        setHTML('[data-home-about-headline]', d.aboutPreview.headline);
        setText('[data-home-about-lead]', d.aboutPreview.lead);
        setText('[data-home-about-body]', d.aboutPreview.body);
        setText('[data-home-about-link]', d.aboutPreview.linkLabel);
        setAttr('[data-home-about-link]', 'href', d.aboutPreview.linkHref);
      }

      // Services
      if (d.services) {
        setText('[data-home-services-label]', d.services.label);
        setHTML('[data-home-services-title]', d.services.title);
        setText('[data-home-services-desc]', d.services.description);
        const tilesRoot = document.querySelector('[data-home-services-tiles]');
        if (tilesRoot && Array.isArray(d.services.tiles)) {
          const existing = tilesRoot.querySelectorAll('.service');
          d.services.tiles.forEach((tile, i) => {
            const node = existing[i];
            if (!node) return;
            const num = node.querySelector('.service__num');
            const title = node.querySelector('.service__title');
            const desc = node.querySelector('.service__desc');
            const link = node.querySelector('.service__link');
            const bg = node.querySelector('[data-service-bg]');
            if (num && tile.number) num.textContent = tile.number;
            if (title && tile.title) title.textContent = tile.title;
            if (desc && tile.description) desc.textContent = tile.description;
            if (link && tile.linkLabel) link.textContent = tile.linkLabel;
            if (link && tile.linkHref) link.setAttribute('href', tile.linkHref);
            if (bg && tile.bgImage) {
              bg.style.backgroundImage = `url("${tile.bgImage}")`;
              node.classList.add('service--has-bg');
            } else if (bg) {
              bg.style.backgroundImage = '';
              node.classList.remove('service--has-bg');
            }
          });
        }
      }

      // Recent Work
      if (d.recentWork) {
        setText('[data-home-recent-label]', d.recentWork.label);
        setHTML('[data-home-recent-title]', d.recentWork.title);
        setText('[data-home-recent-desc]', d.recentWork.description);
        setText('[data-home-recent-btn]', d.recentWork.buttonLabel);
        setAttr('[data-home-recent-btn]', 'href', d.recentWork.buttonHref);
      }

      // Love letter
      if (d.loveLetter) {
        setText('[data-home-loveletter-label]', d.loveLetter.label);
        setText('[data-home-loveletter-quote]', d.loveLetter.quote);
        setText('[data-home-loveletter-footer]', d.loveLetter.footer);
      }

      // Contact
      if (d.contact) {
        setText('[data-home-contact-label]', d.contact.label);
        setHTML('[data-home-contact-title]', d.contact.title);
        setText('[data-home-contact-sub]', d.contact.sub);
        setText('[data-home-contact-cta-primary-label]', d.contact.primaryCtaLabel);
        setAttr('[data-home-contact-cta-primary]', 'href', d.contact.primaryCtaHref);
        setText('[data-home-contact-cta-secondary-label]', d.contact.secondaryCtaLabel);
        setText('[data-home-contact-booking]', d.contact.bookingYears);
      }
    } catch (_) { /* silent — leave the HTML fallback in place */ }
  }

  async function wireTestimonials() {
    const mounts = document.querySelectorAll('[data-testimonials]');
    if (!mounts.length) return;
    try {
      const res = await fetch('/data/testimonials.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items.filter((it) => it && it.quote) : [];
      mounts.forEach((mount) => renderTestimonialsCarousel(mount, items, data));
    } catch (_) { /* silent — fallback content stays */ }
  }

  function renderTestimonialsCarousel(mount, items, data) {
    // If coming-soon toggled on OR no items, show the coming-soon fallback
    const track = mount.querySelector('[data-testimonials-track]');
    if (!track) return;

    if (!items.length || data.comingSoon) {
      // Leave the HTML fallback quote untouched
      const label = mount.querySelector('[data-testimonials-label]');
      if (label && data.comingSoonMessage && data.comingSoon) {
        // Nothing to swap on the label; the fallback quote already reads "coming soon"
      }
      // Hide arrows/dots if any
      mount.querySelectorAll('[data-testimonials-nav]').forEach((n) => n.style.display = 'none');
      return;
    }

    // Build slides
    track.innerHTML = items.map((it) => {
      // Support legacy photos[] (array) OR new photo (single object). Take the first available src.
      let photoSrc = '', photoAlt = '';
      if (it.photo && it.photo.src) { photoSrc = it.photo.src; photoAlt = it.photo.alt || ''; }
      else if (Array.isArray(it.photos) && it.photos.length && it.photos[0].src) { photoSrc = it.photos[0].src; photoAlt = it.photos[0].alt || ''; }
      const photoHTML = photoSrc
        ? '<div class="tslide__photo"><img src="' + escapeHTML(photoSrc) + '" alt="' + escapeHTML(photoAlt) + '" loading="lazy"></div>'
        : '';
      const meta = [it.author, it.sessionType].filter(Boolean).map(escapeHTML).join(' · ');
      // Strip surrounding quotes if the CMS content included them; we add typographic ones via CSS
      const cleanQuote = String(it.quote || '').replace(/^["“”]|["“”]$/g, '').trim();
      const bodyHTML =
        '<div class="tslide__body">' +
          '<blockquote class="tslide__quote"><p>' + escapeHTML(cleanQuote) + '</p></blockquote>' +
          (meta ? '<footer class="tslide__meta">— ' + meta + '</footer>' : '') +
        '</div>';
      return '<article class="tslide' + (photoHTML ? ' tslide--has-photo' : '') + '">' +
        photoHTML +
        bodyHTML +
        '</article>';
    }).join('');

    // Wire nav + dots
    const prev = mount.querySelector('[data-testimonials-prev]');
    const next = mount.querySelector('[data-testimonials-next]');
    const dotsWrap = mount.querySelector('[data-testimonials-dots]');

    function scrollToIndex(i) {
      const slides = track.querySelectorAll('.tslide');
      const target = slides[Math.max(0, Math.min(i, slides.length - 1))];
      if (target) track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    }

    function currentIndex() {
      const slides = track.querySelectorAll('.tslide');
      const scrollX = track.scrollLeft;
      let best = 0, bestDist = Infinity;
      slides.forEach((s, i) => {
        const dist = Math.abs(s.offsetLeft - track.offsetLeft - scrollX);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    }

    if (prev) prev.addEventListener('click', () => scrollToIndex(currentIndex() - 1));
    if (next) next.addEventListener('click', () => scrollToIndex(currentIndex() + 1));

    if (dotsWrap) {
      dotsWrap.innerHTML = items.map((_, i) =>
        '<button type="button" class="tdot" data-testimonials-dot="' + i + '" aria-label="Testimonial ' + (i + 1) + '"></button>'
      ).join('');
      dotsWrap.querySelectorAll('[data-testimonials-dot]').forEach((btn) => {
        btn.addEventListener('click', () => scrollToIndex(parseInt(btn.getAttribute('data-testimonials-dot'), 10)));
      });
      const updateDots = () => {
        const idx = currentIndex();
        dotsWrap.querySelectorAll('[data-testimonials-dot]').forEach((d, i) => {
          d.classList.toggle('tdot--active', i === idx);
        });
        // Hide prev/next at ends
        const slideCount = items.length;
        if (prev) prev.classList.toggle('tnav--disabled', idx === 0);
        if (next) next.classList.toggle('tnav--disabled', idx === slideCount - 1);
      };
      updateDots();
      let scrollTimer;
      track.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(updateDots, 60);
      });
    }

    // Auto-advance every 7 seconds. Pause on user interaction (hover, focus, or manual scroll).
    let paused = false;
    let userInteracted = false;
    const AUTO_MS = 7000;
    function autoTick() {
      if (paused || userInteracted) return;
      const idx = currentIndex();
      const nextIdx = (idx + 1) % items.length;
      scrollToIndex(nextIdx);
    }
    const autoTimer = setInterval(autoTick, AUTO_MS);
    mount.addEventListener('mouseenter', () => { paused = true; });
    mount.addEventListener('mouseleave', () => { paused = false; });
    mount.addEventListener('focusin', () => { paused = true; });
    mount.addEventListener('focusout', () => { paused = false; });
    // If the user clicks prev/next or a dot, stop auto-advancing entirely so we don't fight them.
    [prev, next].forEach((btn) => { if (btn) btn.addEventListener('click', () => { userInteracted = true; }); });
    if (dotsWrap) dotsWrap.addEventListener('click', () => { userInteracted = true; });
    // Also stop auto-advance if the user swipes/scrolls the track directly.
    let touchTimer;
    track.addEventListener('pointerdown', () => { userInteracted = true; });
    // Respect reduced-motion preference — no auto-advance if the user opted out.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      clearInterval(autoTimer);
    }
  }

  async function wireInquire() {
    // Only run on the inquire page (photo strip mount is unique to inquire.html)
    const photosRoot = document.querySelector('[data-inquire-photos]');
    if (!photosRoot) return;
    try {
      const res = await fetch('/data/inquire.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const d = await res.json();

      // Photo strip
      const grid = photosRoot.querySelector('[data-inquire-photos-grid]');
      const photos = Array.isArray(d.photos) ? d.photos.filter((p) => p && p.src) : [];
      if (d.showPhotos !== false && photos.length && grid) {
        grid.innerHTML = photos.slice(0, 4).map((p) =>
          '<img src="' + escapeAttr(p.src) + '" alt="' + escapeAttr(p.alt || '') + '" loading="lazy">'
        ).join('');
        photosRoot.hidden = false;
      } else {
        photosRoot.hidden = true;
      }

      // Head copy
      setText('[data-inquire-eyebrow]', d.eyebrow);
      setHTML('[data-inquire-headline]', d.headline);
      setText('[data-inquire-lead]', d.lead);
      setText('[data-inquire-body]', d.body);

      // Details block
      const detailsRoot = document.querySelector('[data-inquire-details]');
      if (d.showDetails === false && detailsRoot) {
        detailsRoot.hidden = true;
      } else if (d.details) {
        const emailA = document.querySelector('[data-inquire-email]');
        if (emailA && d.details.email) {
          emailA.textContent = d.details.email;
          emailA.setAttribute('href', 'mailto:' + d.details.email);
        }
        const igA = document.querySelector('[data-inquire-instagram]');
        if (igA) {
          if (d.details.instagramHandle) igA.textContent = d.details.instagramHandle;
          if (d.details.instagramUrl) igA.setAttribute('href', d.details.instagramUrl);
        }
        setText('[data-inquire-booking]', d.details.bookingYears);
      }
    } catch (_) { /* silent — leave the HTML fallback in place */ }
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
    // wireHome must run before typewriter so it can update data-words + textContent
    await wireHome();
    wireTypewriter();
    wireAbout();
    wireTestimonials();
    wireInquire();
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
