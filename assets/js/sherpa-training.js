/* Optional video chapters and deep links into the reference library. */
(function () {
  'use strict';
  var video = document.getElementById('training-cycle-video');
  var play = document.querySelector('[data-training-play]');
  var chapters = document.querySelector('.training-chapters');
  var status = document.querySelector('[data-training-status]');
  var pendingTime = null;
  function revealTarget() {
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    var target = id && document.getElementById(id);
    if (!target) return;
    var disclosure = target.closest('details');
    if (disclosure && !disclosure.open) {
      disclosure.open = true;
      requestAnimationFrame(function () { target.scrollIntoView(); });
    }
  }
  revealTarget();
  window.addEventListener('hashchange', revealTarget);
  document.addEventListener('change', function (event) {
    if (event.target.matches('.gy-bar select')) {
      var target = document.getElementById(event.target.value);
      if (target && target.closest('details')) target.closest('details').open = true;
    }
  }, true);
  if (!video || !play || !chapters || !status) return;
  play.hidden = false;
  chapters.hidden = false;
  function label() { play.textContent = video.paused ? 'Play cycle' : 'Pause cycle'; }
  play.addEventListener('click', function () {
    if (!video.paused) { video.pause(); return; }
    var promise = video.play();
    if (promise) promise.catch(function () { status.textContent = 'Use the video controls to play the cycle.'; });
  });
  ['play', 'pause', 'ended'].forEach(function (event) { video.addEventListener(event, label); });
  video.addEventListener('loadedmetadata', function () {
    if (pendingTime !== null) { video.currentTime = Math.min(pendingTime, video.duration); pendingTime = null; }
  });
  chapters.querySelectorAll('[data-training-time]').forEach(function (button) {
    button.addEventListener('click', function () {
      var time = Number(button.getAttribute('data-training-time'));
      if (video.readyState >= 1) video.currentTime = Math.min(time, video.duration);
      else { pendingTime = time; video.load(); }
      status.textContent = button.textContent + ' · ' + time.toFixed(2) + ' s';
    });
  });
  var links = Array.from(document.querySelectorAll('.training-nav a'));
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-10% 0px -65% 0px' });
    links.forEach(function (link) { var target = document.getElementById(link.hash.slice(1)); if (target) observer.observe(target); });
  }
})();
