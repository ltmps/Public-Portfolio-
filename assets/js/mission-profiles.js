(() => {
  'use strict';
  const host = document.querySelector('.mission-profiles');
  if (!host) return;
  const figures = [...host.querySelectorAll('figure')];
  let index = 0;
  let pendingSeek = null;
  const bar = document.createElement('div');
  bar.className = 'reel-controls';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'CAPCOM mission profiles');
  const button = (label, action, parent = bar) => {
    const node = document.createElement('button');
    node.type = 'button'; node.textContent = label;
    node.addEventListener('click', action); parent.append(node);
    return node;
  };
  const cancelSeek = () => {
    if (pendingSeek) pendingSeek.video.removeEventListener('loadedmetadata', pendingSeek.handler);
    pendingSeek = null;
  };
  const show = delta => {
    cancelSeek();
    index = (index + delta + figures.length) % figures.length;
    figures.forEach((figure, i) => {
      figure.querySelector('video').pause(); figure.hidden = i !== index;
    });
    status.textContent = `${index + 1} / ${figures.length} — ${figures[index].dataset.title}`;
    mars.hidden = figures[index].dataset.mars !== 'true';
    chapters.querySelectorAll('button').forEach(node => node.setAttribute('aria-controls', figures[index].querySelector('video').id));
  };
  button('Previous mission', () => show(-1));
  const status = document.createElement('span');
  status.className = 'reel-status'; status.setAttribute('aria-live', 'polite'); bar.append(status);
  button('Next mission', () => show(1));
  bar.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  const chapters = document.createElement('div');
  chapters.className = 'reel-controls profile-chapters';
  chapters.setAttribute('role', 'group'); chapters.setAttribute('aria-label', 'Jump to mission phase; playback stays paused');
  let mars;
  for (const [label, seconds] of [['Launch', 0], ['Earth parking', 22], ['Departure', 32], ['Solar transfer', 40], ['Mars flyby', 58], ['Encke arrival', 85], ['Polar orbit', 95]]) {
    const node = button(label, () => {
      cancelSeek();
      const video = figures[index].querySelector('video'); video.pause();
      const seek = () => { video.currentTime = seconds; pendingSeek = null; };
      if (video.readyState >= 1) seek();
      else {
        pendingSeek = { video, handler: seek };
        video.addEventListener('loadedmetadata', seek, { once: true }); video.load();
      }
    }, chapters);
    if (label === 'Mars flyby') mars = node;
  }
  host.insertBefore(bar, figures[0]); host.insertBefore(chapters, figures[0]);
  show(0);
})();
