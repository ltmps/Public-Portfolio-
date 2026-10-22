/* CAPCOM mission studies: mission profiles with phase jumps, route views and Lambert
   window cases. Without JavaScript each viewer shows its default case with native
   controls. Picking a route or window case plays it muted unless reduced motion is set;
   switching missions keeps the current time and leaves playback paused. */
(function () {
  'use strict';
  var host = document.querySelector('[data-ms-base]');
  if (!host) return;
  var base = host.getAttribute('data-ms-base');
  var CH = [0, 22, 32, 40, 58, 85, 91, 100, 103];
  var MISSIONS = [
    { name: 'Mission 01 · Direct route A', n: '01', mars: false },
    { name: 'Mission 02 · Direct route B', n: '02', mars: false },
    { name: 'Mission 03 · Mars-assisted route A', n: '03', mars: true },
    { name: 'Mission 04 · Mars-assisted route B', n: '04', mars: true }
  ];
  var ROUTES = [
    { name: 'Direct route A', desc: 'Direct low-thrust transfer', h: 'trajectories/direct-a-heliocentric', a: 'trajectories/direct-a-angled' },
    { name: 'Direct route B', desc: 'Direct low-thrust transfer', h: 'trajectories/direct-b-heliocentric', a: 'trajectories/direct-b-angled' },
    { name: 'Mars-assisted route A', desc: 'Transfer with a Mars flyby', h: 'trajectories/mars-assisted-heliocentric', a: 'trajectories/mars-assisted-angled' },
    { name: 'Mars-assisted route B / Encke', desc: 'Earth, Mars, Encke', h: 'encke/heliocentric', a: 'encke/angled' }
  ];
  var WINS = [
    { name: 'Lowest departure energy', n: 1 },
    { name: 'Lowest speed sum', n: 2 },
    { name: 'Shorter flight time', n: 3 }
  ];
  var state = { m: 2, ch: 0, route: 3, view: 'h', win: 0, wview: '2' };
  var mv = document.getElementById('ms-mission-video');
  var rv = document.getElementById('ms-route-video');
  var wv = document.getElementById('ms-window-video');
  var chips = document.querySelectorAll('[data-ms-jump]');

  function reduced() { return !!(window.GY && window.GY.reduced()); }
  function text(key, value) {
    var els = document.querySelectorAll('[data-ms-text="' + key + '"]');
    for (var i = 0; i < els.length; i++) els[i].textContent = value;
  }
  function pressed(group, value) {
    var els = document.querySelectorAll('[data-ms-pick^="' + group + ':"]');
    for (var i = 0; i < els.length; i++) {
      els[i].setAttribute('aria-pressed', els[i].getAttribute('data-ms-pick') === group + ':' + value ? 'true' : 'false');
    }
  }
  function swap(video, src, poster, label, autoplay) {
    video.pause();
    video.setAttribute('poster', poster);
    video.setAttribute('src', src);
    video.setAttribute('aria-label', label);
    if (autoplay && !reduced()) {
      video.muted = true;
      var p = video.play(); if (p && p.catch) p.catch(function () {});
    }
  }
  function markChip(ci) {
    state.ch = ci;
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', i === ci);
  }

  function setMission(i) {
    if (i === state.m) return;
    var t = mv.currentTime || 0;
    state.m = i;
    var M = MISSIONS[i];
    var dir = base + 'mission-profiles/mission_' + M.n;
    swap(mv, dir + '_120s_capture_v3.mp4', dir + '_capture_v3_poster.png', 'CAPCOM ' + M.name + ', two-minute mission visualization', false);
    var onMeta = function () {
      mv.removeEventListener('loadedmetadata', onMeta);
      try { mv.currentTime = Math.min(t, (mv.duration || t + 1) - 0.2); } catch (e) {}
    };
    mv.addEventListener('loadedmetadata', onMeta);
    text('mName', M.name);
    pressed('m', i);
    var mars = chips[4];
    mars.disabled = !M.mars;
    mars.title = M.mars ? 'Jump to the Mars flyby' : 'Direct routes have no Mars flyby';
    if (!M.mars && state.ch === 4) markChip(3);
  }

  function setRoute() {
    var R = ROUTES[state.route], view = state.view === 'h' ? 'Heliocentric' : 'Angled';
    var file = base + (state.view === 'h' ? R.h : R.a);
    swap(rv, file + '.mp4', file + '.png', R.name + ', ' + view.toLowerCase() + ' view playback', true);
    text('routeName', R.name); text('routeDesc', R.desc); text('viewName', view);
    pressed('route', state.route); pressed('view', state.view);
  }

  function setWindow() {
    var W = WINS[state.win], file = base + 'trajectories/window-' + W.n + '-' + state.wview + 'd';
    swap(wv, file + '.mp4', file + '.png', 'Lambert launch-window replay, ' + W.name, true);
    text('winName', W.name); text('winView', state.wview === '2' ? '2D top view' : '3D view');
    pressed('win', state.win); pressed('wview', state.wview);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ms-pick]');
    if (b) {
      var parts = b.getAttribute('data-ms-pick').split(':'), key = parts[0], val = parts[1];
      if (key === 'm') return setMission(Number(val));
      if (key === 'route' || key === 'win') val = Number(val);
      if (state[key] === val) return;
      state[key] = val;
      return (key === 'route' || key === 'view') ? setRoute() : setWindow();
    }
    var c = e.target.closest && e.target.closest('[data-ms-jump]');
    if (c && !c.disabled) {
      var i = Number(c.getAttribute('data-ms-jump'));
      try { mv.currentTime = CH[i] + 0.05; } catch (err) {}
      markChip(i);
    }
  });

  mv.addEventListener('timeupdate', function () {
    var t = mv.currentTime, ci = 0;
    for (var i = 0; i < CH.length; i++) if (t >= CH[i] - 0.05) ci = i;
    if (ci === 4 && !MISSIONS[state.m].mars) ci = 3;
    if (ci !== state.ch) markChip(ci);
  });
})();
