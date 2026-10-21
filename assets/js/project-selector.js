"use strict";
(() => {
  const root = document.querySelector('[data-project-associations]');
  if (!root) return;
  const picker = root.querySelector('[data-project-picker]');
  const controls = [...root.querySelectorAll('[data-project-select]')];
  const lines = [...root.querySelectorAll('[data-project-line]')];
  const logo = root.querySelector('[data-project-logo]');
  const label = root.querySelector('[data-project-label]');
  const projects = {
    bronco: { src: 'assets/images/projects/bronco.png', alt: 'Bronco Launch Vehicle emblem', label: 'Bronco 1 / CPP Liquid Rocket Lab', note: 'Vehicle project emblem', width: 600, height: 600 },
    enterprise: { src: 'assets/images/projects/space-enterprise.png', alt: 'Space Enterprise at Berkeley team logo', label: 'Enterprise E-2 / Space Enterprise', note: 'Team logo', width: 233, height: 600 },
    far: { src: 'assets/images/projects/far.png', alt: 'Friends of Amateur Rocketry logo', label: 'FAR 51025 / Singularity', note: 'Competition organization logo', width: 320, height: 312 }
  };
  const note = root.querySelector('[data-project-note]');
  let selected = null;
  function select(key) {
    if (!projects[key] || selected === key) return;
    selected = key;
    const project = projects[key];
    controls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projectSelect === key)));
    lines.forEach(line => line.classList.toggle('is-selected', line.dataset.projectLine === key));
    root.dataset.selectedProject = key;
    logo.src = project.src;
    logo.alt = project.alt;
    logo.width = project.width;
    logo.height = project.height;
    label.textContent = project.label;
    note.textContent = project.note;
  }
  controls.forEach(button => {
    button.hidden = false;
    button.addEventListener('focus', () => select(button.dataset.projectSelect));
    button.addEventListener('click', () => select(button.dataset.projectSelect));
  });
  lines.forEach(line => {
    line.addEventListener('focusin', () => select(line.dataset.projectLine));
    line.addEventListener('click', () => select(line.dataset.projectLine));
  });
  // Scroll can move rows beneath a stationary pointer. Only viewport movement
  // restores hover selection after keyboard focus; boundary entry alone cannot.
  let pointerPosition = null;
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const moved = pointerPosition
      ? event.clientX !== pointerPosition.x || event.clientY !== pointerPosition.y
      : Boolean(event.movementX || event.movementY);
    pointerPosition = { x: event.clientX, y: event.clientY };
    if (!moved) return;
    const target = event.target.closest('[data-project-select], [data-project-line]');
    if (target && root.contains(target)) {
      select(target.dataset.projectSelect || target.dataset.projectLine);
    }
  });
  root.classList.add('is-enhanced');
  picker.hidden = false;
  select('bronco');
})();
