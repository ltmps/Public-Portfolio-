(() => {
  'use strict';
  document.querySelectorAll('[data-concept-reel]').forEach(host => {
    const figures = [...host.querySelectorAll('figure')];
    let index = 0;
    const controls = document.createElement('div');
    controls.className = 'reel-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', host.getAttribute('aria-label'));
    const status = document.createElement('span');
    status.className = 'reel-status'; status.setAttribute('aria-live', 'polite');
    const show = delta => {
      index = (index + delta + figures.length) % figures.length;
      figures.forEach((figure, i) => { figure.querySelector('video').pause(); figure.hidden = i !== index; });
      status.textContent = `${index + 1} / ${figures.length} — ${figures[index].dataset.title}`;
    };
    for (const [label, delta] of [['Previous recording', -1], ['Next recording', 1]]) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label;
      button.addEventListener('click', () => show(delta)); controls.append(button);
      if (delta === -1) controls.append(status);
    }
    controls.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); show(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    host.prepend(controls); show(0);
  });
})();
