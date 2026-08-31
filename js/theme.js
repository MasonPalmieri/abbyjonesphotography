/* Theme loader — reads /data/theme.json and applies font + accent overrides.
 * Runs in the <head> before site.js so users see the correct theme on paint.
 * Falls back silently if the file is missing (CSS defaults from :root apply).
 */
(function () {
  'use strict';

  // Curated font catalog — must stay in sync with admin/config.yml Design collection.
  // Each entry provides a Google Fonts family name + a safe fallback stack.
  var FONT_STACKS = {
    // Serifs
    'Cormorant Garamond': "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    'Playfair Display':   "'Playfair Display', Georgia, 'Times New Roman', serif",
    'Fraunces':           "'Fraunces', Georgia, 'Times New Roman', serif",
    'DM Serif Display':   "'DM Serif Display', Georgia, 'Times New Roman', serif",
    'Cormorant Infant':   "'Cormorant Infant', Georgia, 'Times New Roman', serif",
    // Sans-serifs
    'Inter':              "'Inter', system-ui, -apple-system, sans-serif",
    'Nunito Sans':        "'Nunito Sans', system-ui, -apple-system, sans-serif",
    'Lato':               "'Lato', system-ui, -apple-system, sans-serif",
    'Montserrat':         "'Montserrat', system-ui, -apple-system, sans-serif",
    'Work Sans':          "'Work Sans', system-ui, -apple-system, sans-serif"
  };

  // Google Fonts URL fragments — weights we actually use on the site.
  var FONT_URLS = {
    'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500',
    'Playfair Display':   'Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500',
    'Fraunces':           'Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500',
    'DM Serif Display':   'DM+Serif+Display:ital@0;1',
    'Cormorant Infant':   'Cormorant+Infant:ital,wght@0,400;0,500;0,600;1,400;1,500',
    'Inter':              'Inter:wght@300;400;500;600',
    'Nunito Sans':        'Nunito+Sans:wght@300;400;500;600;700',
    'Lato':               'Lato:wght@300;400;700',
    'Montserrat':         'Montserrat:wght@300;400;500;600;700',
    'Work Sans':          'Work+Sans:wght@300;400;500;600'
  };

  function applyTheme(theme) {
    if (!theme) return;

    var css = ':root {';

    // Fonts
    var heading = theme.headingFont && FONT_STACKS[theme.headingFont];
    var body    = theme.bodyFont    && FONT_STACKS[theme.bodyFont];
    if (heading) css += ' --serif: ' + heading + ';';
    if (body)    css += ' --sans: '  + body    + ';';

    // Accent color — only apply if it looks like a hex color
    if (theme.accentColor && /^#[0-9A-Fa-f]{6}$/.test(theme.accentColor)) {
      css += ' --sage: ' + theme.accentColor + ';';
    }

    css += ' }';

    // Alternating section backgrounds — light ivory / soft cream
    if (theme.sectionAlternate) {
      css += ' .section:nth-of-type(even) { background: var(--ivory-deep); }';
    }

    var style = document.createElement('style');
    style.setAttribute('data-theme-runtime', '');
    style.textContent = css;
    document.head.appendChild(style);

    // Load any non-default Google Fonts
    var families = [];
    if (theme.headingFont && FONT_URLS[theme.headingFont] && theme.headingFont !== 'Cormorant Garamond') {
      families.push(FONT_URLS[theme.headingFont]);
    }
    if (theme.bodyFont && FONT_URLS[theme.bodyFont] && theme.bodyFont !== 'Inter') {
      families.push(FONT_URLS[theme.bodyFont]);
    }
    if (families.length) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?' +
        families.map(function (f) { return 'family=' + f; }).join('&') +
        '&display=swap';
      document.head.appendChild(link);
    }
  }

  // Fire ASAP — sync XHR would be ideal for zero FOUC but is deprecated in modern browsers.
  // fetch() is async; the flash is ~50-100ms on a warm cache, imperceptible in practice.
  fetch('/data/theme.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(applyTheme)
    .catch(function () { /* silent — CSS defaults win */ });
})();
