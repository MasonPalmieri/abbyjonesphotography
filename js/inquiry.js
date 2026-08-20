/* ===== Inquiry form submitter =====
   Reads endpoint from /data/site.json (site.formEndpoint) and posts as JSON.
   Falls back to mailto: link if endpoint is missing/placeholder.
   ============================================ */

(function () {
  'use strict';

  const PLACEHOLDER = 'REPLACE_WITH_FORM_ENDPOINT';

  async function getEndpoint() {
    try {
      const url = (window.AJP && window.AJP.url) ? window.AJP.url('/data/site.json') : '/data/site.json';
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.formEndpoint || null;
    } catch (_) { return null; }
  }

  function setStatus(form, kind, msg) {
    const s = form.querySelector('.form__status');
    if (!s) return;
    s.className = 'form__status is-visible form__status--' + kind;
    s.textContent = msg;
  }

  function fallbackMailto(form) {
    const data = new FormData(form);
    const to = form.dataset.fallbackEmail || 'abbyjonesphotography1@gmail.com';
    const subject = encodeURIComponent('New inquiry from ' + (data.get('name') || 'your website'));
    const lines = [];
    for (const [k, v] of data.entries()) {
      if (k.startsWith('_') || !v) continue;
      lines.push(k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + ': ' + v);
    }
    const body = encodeURIComponent(lines.join('\n\n'));
    window.location.href = 'mailto:' + to + '?subject=' + subject + '&body=' + body;
  }

  async function submit(form, endpoint) {
    const btn = form.querySelector('.form__submit');
    if (btn) { btn.disabled = true; btn.dataset.origText = btn.textContent; btn.textContent = 'Sending…'; }

    // Honeypot
    const honey = form.querySelector('input[name="_gotcha"]');
    if (honey && honey.value) {
      setStatus(form, 'ok', "Thanks — I'll be in touch soon.");
      return;
    }

    const fd = new FormData(form);
    const payload = {};
    fd.forEach((v, k) => { if (!k.startsWith('_')) payload[k] = v; });

    // FormSubmit convenience fields (safe no-op if the endpoint isn't FormSubmit)
    payload._subject = 'New inquiry from ' + (payload.name || 'your website');
    payload._template = 'table';
    payload._captcha = 'false';
    payload._cc = 'abbyjonesphotography1@gmail.com';
    if (payload.email) payload._replyto = payload.email;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setStatus(form, 'ok', "Thank you — your inquiry is on its way. I'll respond within 48 hours.");
      form.reset();
    } catch (err) {
      setStatus(form, 'err', "Something went wrong sending your message. Please email abbyjonesphotography1@gmail.com directly.");
      console.warn(err);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.origText || 'Send inquiry'; }
    }
  }

  async function wire(form) {
    const endpoint = await getEndpoint();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!endpoint || endpoint === PLACEHOLDER) {
        fallbackMailto(form);
        return;
      }
      submit(form, endpoint);
    });
  }

  function boot() { document.querySelectorAll('form[data-inquiry]').forEach(wire); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
