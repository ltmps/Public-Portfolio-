/* Progressive phase controls: static sequence text remains available without JS. */
(function () {
  'use strict';
  document.querySelectorAll('.sm-film').forEach(function (film) {
    var video = film.querySelector('video');
    var sequence = film.querySelector('.sm-phases');
    if (!video || !sequence) return;
    var phases = Array.from(sequence.querySelectorAll('[data-sm-time]'));
    var pendingTime = null;
    var current = -1;
    function mark(index) {
      if (index === current) return;
      current = index;
      phases.forEach(function (phase, i) {
        var button = phase.querySelector('button');
        if (i === index) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      sequence.querySelector('[data-sm-current-time]').textContent = phases[index].querySelector('.sm-phase-time').textContent;
      sequence.querySelector('[data-sm-current-description]').textContent = phases[index].getAttribute('data-sm-description');
    }
    function seek(time) {
      // A seek never starts playback. Native controls retain the user's play/pause choice.
      if (video.readyState < 1) {
        pendingTime = time;
        video.load();
      } else {
        video.currentTime = Math.min(time, video.duration);
      }
    }
    phases.forEach(function (phase, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'gy-chip sm-phase-button';
      button.setAttribute('aria-label', 'Jump to ' + phase.querySelector('.sm-phase-time').textContent + ': ' + phase.getAttribute('data-sm-description'));
      button.appendChild(phase.querySelector('.sm-phase-time'));
      button.appendChild(phase.querySelector('.sm-phase-label'));
      phase.insertBefore(button, phase.firstChild);
      button.addEventListener('click', function () {
        mark(index);
        seek(Number(phase.getAttribute('data-sm-time')));
      });
    });
    video.addEventListener('loadedmetadata', function () {
      if (pendingTime !== null) {
        var time = pendingTime;
        pendingTime = null;
        seek(time);
      }
    });
    video.addEventListener('timeupdate', function () {
      if (pendingTime !== null || video.seeking) return;
      var index = 0;
      phases.forEach(function (phase, i) {
        if (video.currentTime >= Number(phase.getAttribute('data-sm-time')) - 0.01) index = i;
      });
      mark(index);
    });
    sequence.classList.add('sm-phases-live');
    sequence.querySelector('.sm-phase-help').hidden = false;
    sequence.querySelector('.sm-current-phase').hidden = false;
    mark(0);
  });
})();
