(() => {
  'use strict';
  const video = document.getElementById('encke-video');
  const views = document.getElementById('encke-views');
  const caption = document.getElementById('encke-caption');
  if (!video || !views || !caption) return;
  const base = '../../assets/media/modeling/encke/';
  const labels = { heliocentric: 'Heliocentric', angled: 'Angled', original: 'Original' };
  views.hidden = false;
  views.addEventListener('click', event => {
    const button = event.target.closest('button[data-view]');
    if (!button || button.getAttribute('aria-pressed') === 'true') return;
    const view = button.dataset.view;
    if (!Object.hasOwn(labels, view)) return;
    const time = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    video.pause();
    for (const item of views.querySelectorAll('button')) {
      item.setAttribute('aria-pressed', String(item === button));
    }
    video.poster = base + view + '.png';
    video.src = base + view + '.mp4';
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) video.currentTime = Math.min(time, video.duration);
    };
    caption.textContent = labels[view] + ' view · silent 10-second path replay. Source annotations are retained in the recordings; timing and encounter markers follow the reconstruction assumptions.';
    // Keep each new view paused, including when reduced motion is requested.
    video.load();
  });
})();
