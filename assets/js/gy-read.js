/* Reading aids for long pages, used with gy-bar.js: long paragraphs show three lines with a
   More toggle on the last line, long bullet lists show two items behind a Show more button,
   a back-to-top button appears after the first screen, and no running text renders under 12 px.
   Without this script the page shows everything in full. */
(function () {
  'use strict';
  function words(e) { return (e.innerText || '').trim().split(/\s+/).filter(Boolean).length; }
  var CHEV = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  var SKIP = 'figure,figcaption,table,details,header,footer,nav,.gy-bar';

  function start() {
    var root = document.querySelector('main') || document.body;

    // 12 px floor for running text
    root.querySelectorAll('*').forEach(function (e) {
      if (e.closest('svg')) return;
      var has = [].some.call(e.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
      if (has && parseFloat(getComputedStyle(e).fontSize) < 12) e.style.fontSize = '12px';
    });

    // Three-line paragraphs with More on the last line
    root.querySelectorAll('section p').forEach(function (p) {
      if (words(p) <= 40 || p.closest(SKIP)) return;
      var cs = getComputedStyle(p), pb = parseFloat(cs.paddingBottom) || 0;
      if (pb) { p.style.marginBottom = ((parseFloat(cs.marginBottom) || 0) + pb) + 'px'; p.style.paddingBottom = '0'; }
      p.classList.add('gy-read-clip', 'gy-read-clamp');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'gy-read-more'; b.setAttribute('aria-expanded', 'false');
      b.innerHTML = '<span>More</span>' + CHEV;
      b.addEventListener('click', function () {
        var shut = p.classList.toggle('gy-read-clamp');
        b.setAttribute('aria-expanded', shut ? 'false' : 'true');
        b.firstChild.textContent = shut ? 'More' : 'Less';
      });
      p.appendChild(b);
    });

    // Long bullet lists show two items
    root.querySelectorAll('section ul').forEach(function (l) {
      if (l.closest(SKIP)) return;
      var items = [].filter.call(l.children, function (c) { return c.tagName === 'LI'; });
      if (items.length < 4) return;
      var avg = items.reduce(function (a, c) { return a + words(c); }, 0) / items.length;
      if (avg < 18) return;
      var rest = items.slice(2);
      rest.forEach(function (c) { c.hidden = true; });
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'gy-read-more gy-read-list'; b.setAttribute('aria-expanded', 'false');
      var label = 'Show ' + rest.length + ' more';
      b.innerHTML = '<span>' + label + '</span>' + CHEV;
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        rest.forEach(function (c) { c.hidden = !open; });
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        b.firstChild.textContent = open ? 'Show less' : label;
      });
      l.after(b);
    });

    // Back to top
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
    var top = document.createElement('button');
    top.type = 'button'; top.className = 'gy-read-top'; top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduced && reduced.matches ? 'auto' : 'smooth' }); });
    document.body.appendChild(top);
    var raf = 0;
    function update() { raf = 0; top.classList.toggle('on', window.scrollY > window.innerHeight); }
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
