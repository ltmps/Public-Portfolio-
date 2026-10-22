(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animate = (video, flip) => {
    video.getAnimations().forEach(animation => animation.cancel());
    if (!reduced.matches) video.animate([
      { opacity: .55, transform: flip ? 'perspective(900px) rotateY(-12deg)' : 'translateX(12px)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 180, easing: 'ease-out' });
  };
  reduced.addEventListener('change', () => {
    if (reduced.matches) document.querySelectorAll('video').forEach(v => v.getAnimations().forEach(a => a.cancel()));
  });
  const toolbar = (host, label, previous, next, flip) => {
    const bar = document.createElement('div');
    bar.className = 'reel-controls';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', label);
    const add = (text, name, action) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = text;
      button.setAttribute('aria-label', name);
      button.addEventListener('click', action);
      bar.append(button);
      return button;
    };
    add('← Previous', 'Previous ' + label, previous);
    const status = document.createElement('span');
    status.className = 'reel-status'; status.setAttribute('aria-live', 'polite');
    bar.append(status);
    add('Next →', 'Next ' + label, next);
    const flipButton = flip ? add('Flip view', 'Switch recorded view', flip) : null;
    bar.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault(); (event.key === 'ArrowLeft' ? previous : next)();
    });
    const frame = host.querySelector(':scope > figure');
    if (frame) host.insertBefore(bar, frame); else host.prepend(bar);
    return { status, flipButton };
  };
  for (const player of document.querySelectorAll('.trajectory-player')) {
    const study = player.querySelector('.case-select');
    const view = player.querySelector('.view-select');
    const video = player.querySelector('video');
    view.closest('label').hidden = true;
    const move = delta => {
      study.selectedIndex = (study.selectedIndex + delta + study.length) % study.length;
      study.dispatchEvent(new Event('change'));
    };
    const ui = toolbar(player.querySelector('.modeling-media'), 'study', () => move(-1), () => move(1), () => {
      view.selectedIndex = (view.selectedIndex + 1) % view.length;
      view.dispatchEvent(new Event('change'));
    });
    const sync = flip => {
      ui.status.textContent = `${study.selectedIndex + 1} / ${study.length} · ${study.selectedOptions[0].textContent}`;
      ui.flipButton.textContent = 'View: ' + view.selectedOptions[0].textContent + ' ↻';
      ui.flipButton.setAttribute('aria-label', ui.flipButton.textContent + '; switch recorded view');
      animate(video, flip);
    };
    study.addEventListener('change', () => sync(false));
    view.addEventListener('change', () => sync(true));
    // Direct links remain useful without JavaScript; enhanced links select in place.
    player.querySelectorAll('a[data-case][data-view]').forEach(link => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); study.value = link.dataset.case; view.value = link.dataset.view;
      study.dispatchEvent(new Event('change'));
      ui.flipButton.focus({ preventScroll: true });
      video.scrollIntoView({ block: 'center', behavior: 'instant' });
    }));
    sync(false);
  }
  const encke = document.querySelector('.encke-preview');
  if (encke) {
    const buttons = [...encke.querySelectorAll('button[data-view]')];
    const video = encke.querySelector('video');
    const move = delta => {
      const index = buttons.findIndex(b => b.getAttribute('aria-pressed') === 'true');
      buttons[(index + delta + buttons.length) % buttons.length].click();
    };
    const ui = toolbar(encke, 'trajectory view', () => move(-1), () => move(1));
    const sync = () => {
      const index = buttons.findIndex(b => b.getAttribute('aria-pressed') === 'true');
      ui.status.textContent = `${index + 1} / ${buttons.length} · ${buttons[index].textContent}`;
      animate(video, true);
    };
    buttons.forEach(b => b.addEventListener('click', () => queueMicrotask(sync)));
    sync();
  }
  const dynamics = document.querySelector('.dynamics-reel');
  if (dynamics) {
    const figures = [...dynamics.querySelectorAll('figure')];
    let index = 0;
    const show = delta => {
      index = (index + delta + figures.length) % figures.length;
      figures.forEach((figure, i) => { figure.querySelector('video').pause(); figure.hidden = i !== index; });
      ui.status.textContent = `${index + 1} / ${figures.length} · ${index ? 'Target tracking' : 'Roll slew and hold'}`;
      animate(figures[index].querySelector('video'), false);
    };
    const ui = toolbar(dynamics, 'reaction-wheel recording', () => show(-1), () => show(1));
    show(0);
  }
  const videos = [...document.querySelectorAll('video')];
  // Only the explicitly started player may produce audio or motion.
  videos.forEach(video => video.addEventListener('play', () => videos.forEach(other => { if (other !== video) other.pause(); })));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) entry.target.pause();
    }));
    videos.forEach(video => observer.observe(video));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) videos.forEach(v => v.pause()); });
})();
