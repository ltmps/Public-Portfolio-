/* Khorium workflow animations: each [data-kh-anim] SVG plays once it scrolls into view.
   Without script, or under reduced motion, the SVGs stay in their finished state. */
(function () {
  'use strict';
  function reduced() { return !!(window.GY && window.GY.reduced()); }
  function start() {
    var els = document.querySelectorAll('[data-kh-anim]');
    if (!els.length || reduced() || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) {
        if (!es[i].isIntersecting) continue;
        es[i].target.classList.add('kh-play');
        io.unobserve(es[i].target);
      }
    }, { threshold: 0.35 });
    for (var i = 0; i < els.length; i++) {
      els[i].classList.add('kh-ready');
      io.observe(els[i]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
