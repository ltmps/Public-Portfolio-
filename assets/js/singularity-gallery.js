(() => {
  const gallery = document.querySelector('[data-photo-gallery]');
  if (!gallery) return;
  const rail = gallery.querySelector('[data-gallery-rail]');
  const controls = gallery.querySelector('[data-gallery-controls]');
  const toggle = controls.querySelector('[data-gallery-toggle]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !motion.matches;
  let visible = false;
  let frame = 0;
  let previous = 0;
  let direction = 1;
  let position = 0;
  const overflowing = () => rail.scrollWidth > rail.clientWidth + 1;
  function paint() {
    toggle.textContent = playing ? 'Pause gallery' : 'Play gallery';
    toggle.setAttribute('aria-pressed', String(playing));
  }
  function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    paint();
  }
  function tick(now) {
    frame = 0;
    if (!playing || !visible || document.hidden || !overflowing()) { previous = 0; return; }
    if (previous) {
      const limit = rail.scrollWidth - rail.clientWidth;
      const next = position + direction * Math.min(now - previous, 50) * 0.022;
      position = Math.max(0, Math.min(limit, next));
      rail.scrollLeft = position;
      if (next >= limit) direction = -1;
      else if (next <= 0) direction = 1;
    }
    previous = now;
    frame = requestAnimationFrame(tick);
  }
  function start() {
    if (!frame && playing && visible && !document.hidden && overflowing()) {
      position = rail.scrollLeft;
      frame = requestAnimationFrame(tick);
    }
  }
  controls.hidden = false;
  paint();
  toggle.addEventListener('click', () => {
    if (playing) stop();
    else { playing = true; previous = 0; paint(); start(); }
  });
  for (const type of ['pointerenter', 'pointerdown', 'focusin', 'keydown', 'wheel']) rail.addEventListener(type, stop, {passive:true});
  for (const [selector, sign] of [['[data-gallery-prev]', -1], ['[data-gallery-next]', 1]]) {
    controls.querySelector(selector).addEventListener('click', () => {
      stop();
      rail.scrollBy({left: sign * rail.clientWidth * 0.85, behavior: motion.matches ? 'auto' : 'smooth'});
    });
  }
  motion.addEventListener('change', () => { if (motion.matches) stop(); });
  document.addEventListener('visibilitychange', () => { previous = 0; start(); });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    previous = 0;
    start();
  }, {threshold:0.1}).observe(rail);
  new ResizeObserver(() => {
    const needed = overflowing();
    controls.hidden = !needed;
    if (needed) start();
  }).observe(rail);
})();
