/* Single-row navigation and lazy, silent mission-card previews. */
(function () {
  'use strict';
  document.querySelectorAll('[data-sm-strip]').forEach(function (strip) {
    var tools = document.createElement('div');
    tools.className = 'sm-strip-tools';
    var previous = document.createElement('button');
    var next = document.createElement('button');
    previous.type = next.type = 'button';
    previous.textContent = '\u2190'; next.textContent = '\u2192';
    previous.setAttribute('aria-label', 'Scroll ' + strip.dataset.smStrip + ' left');
    next.setAttribute('aria-label', 'Scroll ' + strip.dataset.smStrip + ' right');
    tools.append(previous, next); strip.before(tools);
    function update() {
      var max = strip.scrollWidth - strip.clientWidth;
      tools.hidden = max < 2;
      previous.disabled = strip.scrollLeft < 2;
      next.disabled = strip.scrollLeft >= max - 2;
    }
    function move(direction) { strip.scrollLeft += direction * Math.max(180, strip.clientWidth * 0.8); }
    previous.addEventListener('click', function () { move(-1); });
    next.addEventListener('click', function () { move(1); });
    strip.addEventListener('keydown', function (event) {
      if (event.target !== strip) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    strip.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var active = null;
  var cards = [];
  function pause(card) {
    card.intent = false;
    card.video.pause();
    card.video.hidden = true;
    card.button.textContent = 'Play preview';
    card.button.setAttribute('aria-pressed', 'false');
    if (active === card) active = null;
  }
  function play(card, explicit) {
    if (!explicit && (motion.matches || !hover.matches)) return;
    if (active && active !== card) pause(active);
    active = card; card.intent = true;
    card.video.muted = true;
    if (!card.video.getAttribute('src')) card.video.src = card.video.dataset.smPreviewSrc;
    card.video.hidden = false;
    card.button.textContent = 'Pause preview';
    card.button.setAttribute('aria-pressed', 'true');
    var result = card.video.play();
    if (result && result.catch) result.then(function () {
      if (!card.intent) card.video.pause();
    }).catch(function () { pause(card); });
  }
  document.querySelectorAll('[data-sm-preview]').forEach(function (element) {
    var card = { element: element, video: element.querySelector('video'), button: element.querySelector('[data-sm-preview-play]'), intent: false };
    cards.push(card);
    element.querySelector('.sm-preview-controls').hidden = false;
    element.addEventListener('pointerenter', function (event) { if (event.pointerType === 'mouse') play(card, false); });
    element.addEventListener('pointerleave', function (event) { if (event.pointerType === 'mouse') pause(card); });
    element.addEventListener('focusin', function (event) {
      if (event.target.matches(':focus-visible')) play(card, false);
    });
    element.addEventListener('focusout', function (event) { if (!element.contains(event.relatedTarget)) pause(card); });
    card.button.addEventListener('click', function () { if (card.intent) pause(card); else play(card, true); });
    card.video.addEventListener('ended', function () { pause(card); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { if (!entries[0].isIntersecting) pause(card); }).observe(element);
    }
  });
  motion.addEventListener('change', function () { if (motion.matches && active) pause(active); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && active) pause(active); });
})();
