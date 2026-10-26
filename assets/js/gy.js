/* Shared interactions for the drafting-table pages: theme toggle, the grid-line loupe under
   the cursor, a light-mode crosshair with a mm readout inside the home hero, dark-mode card glow, hover-to-play media and
   hover-zoom figures. Everything degrades to static, readable markup without script. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var KEY = 'gy-theme';
  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(motion && motion.matches); }
  function isDark() { return doc.getAttribute('data-theme') === 'dark'; }

  function applyTheme(dark, store) {
    if (dark) doc.setAttribute('data-theme', 'dark'); else doc.removeAttribute('data-theme');
    var buttons = document.querySelectorAll('[data-gy-theme]');
    for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
    if (store) { try { window.localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) {} }
    document.dispatchEvent(new CustomEvent('gy-theme', { detail: { dark: dark } }));
  }

  function init() {
    applyTheme(isDark(), false);
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-gy-theme]');
      if (b) applyTheme(!isDark(), true);
    });
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) applyTheme(e.newValue === 'dark', false);
    });

    var root = document.querySelector('[data-gy-root]');
    if (root) bindLoupe(root);
    var hero = root && root.querySelector('[data-gy-hero]');
    if (hero) bindHero(hero);
    bindGlow();
    bindVideos();
    bindZoom();
    bindExpand();
  }

  /* The grid-line loupe follows the pointer across the whole page. */
  function bindLoupe(root) {
    root.addEventListener('mousemove', function (e) {
      var r = root.getBoundingClientRect();
      root.style.setProperty('--cx', (e.clientX - r.left) + 'px');
      root.style.setProperty('--cy', (e.clientY - r.top) + 'px');
    });
    root.addEventListener('mouseleave', function () {
      root.style.setProperty('--cx', '-9999px');
      root.style.setProperty('--cy', '-9999px');
    });
  }

  /* Crosshair and mm readout follow the pointer inside the home hero only. */
  function bindHero(root) {
    var xs = root.querySelectorAll('[data-gy-x]'), ys = root.querySelectorAll('[data-gy-y]');
    var pend = null, raf = 0;
    function mm(v) { return (v * 0.2646).toFixed(1); }
    function flush() {
      raf = 0;
      if (!pend) return;
      var i, x = mm(pend.x), y = mm(pend.y);
      for (i = 0; i < xs.length; i++) xs[i].textContent = x;
      for (i = 0; i < ys.length; i++) ys[i].textContent = y;
    }
    root.addEventListener('mousemove', function (e) {
      var r = root.getBoundingClientRect();
      var w = root.offsetWidth || r.width;
      var x = e.clientX - r.left, y = e.clientY - r.top;
      root.style.setProperty('--cx', x + 'px');
      root.style.setProperty('--cy', y + 'px');
      root.style.setProperty('--rdx', x > w - 220 ? '-206px' : '14px');
      root.style.setProperty('--xh', '1');
      if (isDark()) return;
      pend = { x: x, y: y };
      if (!raf) raf = requestAnimationFrame(flush);
    });
    root.addEventListener('mouseleave', function () {
      root.style.setProperty('--xh', '0');
      root.style.setProperty('--cx', '-999px');
      root.style.setProperty('--cy', '-999px');
    });
  }

  /* Cards record the pointer so the dark-mode glow can sit under it. */
  function bindGlow() {
    var els = document.querySelectorAll('[data-gy-glow]');
    for (var i = 0; i < els.length; i++) {
      els[i].addEventListener('mousemove', function (e) {
        var el = e.currentTarget, r = el.getBoundingClientRect();
        el.style.setProperty('--x', (e.clientX - r.left) + 'px');
        el.style.setProperty('--y', (e.clientY - r.top) + 'px');
      });
    }
  }

  /* Hover or focus plays the muted video inside; leaving pauses it. Reduced motion
     leaves every video paused until the visitor presses play. */
  function bindVideos() {
    var els = document.querySelectorAll('[data-gy-vid]');
    function play(e) {
      var v = e.currentTarget.querySelector('video');
      if (!v || reduced()) return;
      v.muted = true; v.playsInline = true;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    function pause(e) {
      if (e.type === 'focusout' && e.currentTarget.contains(e.relatedTarget)) return;
      var v = e.currentTarget.querySelector('video');
      if (v) v.pause();
    }
    for (var i = 0; i < els.length; i++) {
      els[i].addEventListener('mouseenter', play);
      els[i].addEventListener('focusin', play);
      els[i].addEventListener('mouseleave', pause);
      els[i].addEventListener('focusout', pause);
    }
  }

  /* Zoom figures magnify at the cursor; the surrounding link opens the full image. */
  function bindZoom() {
    var els = document.querySelectorAll('[data-gy-zoom]');
    for (var i = 0; i < els.length; i++) {
      els[i].addEventListener('mousemove', function (e) {
        var el = e.currentTarget, r = el.getBoundingClientRect();
        el.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
        el.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
      });
    }
  }

  /* Clicking a [data-gy-expand] card opens its video large in a modal dialog with
     controls, in place on the page (not fullscreen). Esc, the close button or a
     click on the backdrop closes it; reduced motion opens it paused. */
  function bindExpand() {
    var els = document.querySelectorAll('[data-gy-expand]');
    if (!els.length || typeof HTMLDialogElement === 'undefined') return;
    var dlg = document.createElement('dialog');
    dlg.className = 'gy-lb';
    dlg.innerHTML = '<div class="gy-lb-bar"><span class="gy-lb-cap"></span>' +
      '<button type="button" class="gy-lb-x" aria-label="Close enlarged video">Close ✕</button></div>' +
      '<video controls muted loop playsinline preload="metadata"></video>';
    document.body.appendChild(dlg);
    var big = dlg.querySelector('video'), cap = dlg.querySelector('.gy-lb-cap');
    function close() { if (dlg.open) dlg.close(); }
    dlg.querySelector('.gy-lb-x').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dlg.addEventListener('close', function () {
      big.pause(); big.removeAttribute('src'); big.load();
      if (dlg.opener && dlg.opener.focus) dlg.opener.focus();
    });
    function open(e) {
      var card = e.currentTarget, v = card.querySelector('video');
      if (!v) return;
      e.preventDefault();
      v.pause();
      var title = card.querySelector('h3');
      cap.textContent = title ? title.textContent : (card.getAttribute('data-gy-expand') || '');
      big.setAttribute('aria-label', v.getAttribute('aria-label') || cap.textContent);
      big.poster = v.getAttribute('poster') || '';
      big.src = v.currentSrc || v.getAttribute('src');
      dlg.opener = card;
      dlg.showModal();
      if (!reduced()) { var p = big.play(); if (p && p.catch) p.catch(function () {}); }
    }
    for (var i = 0; i < els.length; i++) {
      els[i].addEventListener('click', open);
      if (els[i].tagName !== 'A' && els[i].tagName !== 'BUTTON') {
        els[i].addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') open(e); });
      }
    }
  }

  window.GY = { isDark: isDark, reduced: reduced, setTheme: applyTheme };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
