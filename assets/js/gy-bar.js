/* Slim section bar: once the reader scrolls past the page header, a fixed bar shows the
   home link, the section currently on screen, a jump list of the page's sections and a
   2 px reading-progress line. Pages opt in by loading this script; without it (or with
   fewer than two sections) nothing changes. */
(function () {
  'use strict';
  var CSS = '.gy-bar{position:fixed;left:0;right:0;top:0;z-index:1000;height:48px;display:flex;align-items:center;gap:16px;' +
    'padding:0 20px;background:var(--background,#fff);border-bottom:1.5px solid var(--foreground,#0a0a0a);' +
    'font-family:var(--font-mono,ui-monospace,monospace);font-size:12px;letter-spacing:.08em;text-transform:uppercase;' +
    'color:var(--foreground,#0a0a0a);transform:translateY(-100%);visibility:hidden;transition:transform .25s ease,visibility 0s .25s}' +
    '.gy-bar.on{transform:none;visibility:visible;transition:transform .25s ease}' +
    '.gy-bar a{color:inherit;text-decoration:none;font-weight:600;white-space:nowrap}' +
    '.gy-bar a:hover{color:rgb(var(--acc,245,73,0))}' +
    '.gy-bar-cur{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted-foreground,#737373)}' +
    '.gy-bar select{font:inherit;text-transform:uppercase;letter-spacing:.06em;height:32px;max-width:180px;padding:0 8px;cursor:pointer;' +
    'border:1.5px solid var(--foreground,#0a0a0a);border-radius:0;background:var(--background,#fff);color:var(--foreground,#0a0a0a)}' +
    '.gy-bar select:hover{border-color:rgb(var(--acc,245,73,0))}' +
    '.gy-bar-prog{position:absolute;left:0;bottom:-1.5px;height:2px;width:100%;background:rgb(var(--acc,245,73,0));transform-origin:0 50%;transform:scaleX(0)}' +
    'main section[id],main [id]{scroll-margin-top:64px}' +
    '@media (max-width:600px){.gy-bar{gap:10px;padding:0 12px}.gy-bar-home{display:none}.gy-bar select{max-width:130px}}' +
    '@media (prefers-reduced-motion:reduce){.gy-bar,.gy-bar.on{transition:none}}';

  function start() {
    var root = document.querySelector('[data-gy-root]') || document.body;
    var seen = [], secs = [];
    var heads = root.querySelectorAll('h2');
    for (var i = 0; i < heads.length; i++) {
      var s = heads[i].closest('section');
      if (!s || seen.indexOf(s) >= 0 || s.closest('footer')) continue;
      seen.push(s);
      secs.push({ s: s, t: heads[i].textContent.replace(/\s+/g, ' ').trim() });
    }
    if (secs.length < 2) return;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var header = root.querySelector('header');
    var home = header && header.querySelector('a');
    var bar = document.createElement('nav');
    bar.className = 'gy-bar';
    bar.setAttribute('aria-label', 'Page sections');
    bar.innerHTML = '<a class="gy-bar-home"></a><span class="gy-bar-cur" aria-live="off"></span>' +
      '<select aria-label="Jump to section"><option value="">Sections</option></select><span class="gy-bar-prog" aria-hidden="true"></span>';
    var link = bar.querySelector('a');
    link.textContent = home ? home.textContent.replace(/\s+/g, ' ').trim() : 'Home';
    link.href = home ? home.getAttribute('href') : '#';
    var sel = bar.querySelector('select');
    secs.forEach(function (o, k) {
      if (!o.s.id) o.s.id = 'gy-sec-' + (k + 1);
      var op = document.createElement('option');
      op.value = o.s.id; op.textContent = o.t;
      sel.appendChild(op);
    });
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
    sel.addEventListener('change', function () {
      var t = sel.value && document.getElementById(sel.value);
      if (t) t.scrollIntoView({ behavior: reduced && reduced.matches ? 'auto' : 'smooth' });
      sel.value = '';
    });
    root.appendChild(bar);

    var cur = bar.querySelector('.gy-bar-cur'), prog = bar.querySelector('.gy-bar-prog'), raf = 0;
    function update() {
      raf = 0;
      var y = window.scrollY, H = document.documentElement.scrollHeight - window.innerHeight;
      var edge = header ? header.getBoundingClientRect().bottom + y : 80;
      bar.classList.toggle('on', y > edge + 40);
      prog.style.transform = 'scaleX(' + (H > 0 ? Math.min(1, y / H) : 0) + ')';
      var c = '';
      for (var k = 0; k < secs.length; k++) if (secs[k].s.getBoundingClientRect().top < 120) c = secs[k].t;
      cur.textContent = c;
    }
    function queue() { if (!raf) raf = requestAnimationFrame(update); }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
