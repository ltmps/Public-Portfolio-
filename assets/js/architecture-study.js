/* Systems architecture study: event-chain stepper, recovery envelope grid and recorded
   scenario playback. The page ships pre-rendered for the first step, the 200 W / 27 s cell
   and the altimeter-fault scenario, so it reads fully without JavaScript. */
(function () {
  'use strict';
  var EV = [
    ['Physical resource', 'Available bus power drops at 27.00 s', 'The reduced case prescribes a bus-power step from 350 W to 200 W. With the heater drawing 8 W, 192 W remains before modeled propulsion demand.'],
    ['Functional authority', 'The thrust cap shrinks', 'The power limiter recomputes how much thrust the remaining bus power can support. In the reduced case the cap falls to 7.11 N.'],
    ['Supervision', 'The guard requests a return', 'The soft power guard goes negative, at -7.2 W against a 15% hover-headroom policy, while the hard bus margin stays positive.'],
    ['Operational activity', 'Survey becomes return', 'The O07 survey stops short of the configured route and the vehicle heads home instead of finishing it.'],
    ['Physical response', 'The vehicle brakes and returns', 'Maximum horizontal excursion falls from 16.2 m to 8.0 m, and obstacle clearance stays at 0.348 m beyond the body-radius buffer.'],
    ['Measured-state gate', 'Land, then downlink', 'Measured arrival and settled-landing conditions permit O08 land and O09 downlink. The reduced case completes at 62.56 s with all 320 records acknowledged.']
  ];
  var PW = [350, 260, 200, 170, 140, 100], ON = [15, 27, 45, 65];
  var OUT = ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'safe', 'safe', 'safe', 'ok', 'fail', 'fail', 'fail', 'fail', 'fail', 'fail', 'fail', 'fail', 'fail', 'fail', 'fail', 'fail'];
  var OT = {
    ok: ['Mission completed', 'Full configured survey, safe home landing and every record acknowledged, with no checked hard-safety violation.'],
    safe: ['Safe return', 'The survey aborted with recovery requested, then landed safely at home with no checked hard-safety violation. Delivery is reported separately.'],
    fail: ['Unsuccessful recovery', 'At least one physical, recovery or completion criterion failed. A safe landing with incomplete delivery also falls in this category.']
  };
  var state = { ev: 0, cell: 9, sc: 1 };

  function text(key, value) {
    var els = document.querySelectorAll('[data-ar-text="' + key + '"]');
    for (var i = 0; i < els.length; i++) els[i].textContent = value;
  }
  function select(attr, value) {
    var els = document.querySelectorAll('[' + attr + ']');
    for (var i = 0; i < els.length; i++) {
      var on = els[i].getAttribute(attr) === String(value);
      els[i].classList.toggle('on', on);
      els[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  function setEvent(i) {
    state.ev = (i + 6) % 6;
    var e = EV[state.ev];
    text('evNum', '0' + (state.ev + 1)); text('evDomain', e[0]); text('evTitle', e[1]); text('evText', e[2]);
    select('data-ar-ev', state.ev);
  }
  function setCell(i) {
    state.cell = i;
    text('envHead', PW[Math.floor(i / 4)] + ' W bus · fault onset ' + ON[i % 4] + ' s');
    text('envTitle', OT[OUT[i]][0]); text('envText', OT[OUT[i]][1]);
    select('data-ar-cell', i);
  }

  var dataEl = document.getElementById('ar-scenarios');
  var runs = dataEl ? JSON.parse(dataEl.textContent) : [];
  var range = document.getElementById('scx-time');
  function $(id) { return document.getElementById(id); }
  function X(run, t) { return 36 + 552 * t / run.stop; }
  function defaultIndex(run) {
    var n = run.t.length, ti = Math.floor(n * 0.4);
    if (run.fx >= 0) for (var i = 0; i < n; i++) if (X(run, run.t[i]) >= run.fx + run.fw * 0.6) { ti = i; break; }
    return ti;
  }
  function setTime(ti) {
    var run = runs[state.sc];
    ti = Math.max(0, Math.min(run.t.length - 1, ti));
    var tt = run.t[ti], aa = run.a[ti] || 0, dd = run.d[ti] || 0, sx = X(run, tt).toFixed(1);
    text('readout', 't ' + tt.toFixed(1) + ' s · alt ' + aa.toFixed(1) + ' m · ' + Math.round(dd) + ' W');
    $('ar-cursor').setAttribute('x1', sx); $('ar-cursor').setAttribute('x2', sx);
    $('ar-dot').setAttribute('cx', sx); $('ar-dot').setAttribute('cy', (12 + 164 * (1 - aa / 3.5)).toFixed(1));
  }
  function setScenario(i) {
    state.sc = i;
    var run = runs[i];
    text('scName', run.name); text('stopLabel', run.stop + ' s');
    text('inj', run.inj); text('rec', run.rec); text('mo', run.mo); text('ro', run.ro);
    text('lat', run.lat == null ? 'Not applicable' : run.lat + ' s');
    $('ar-chart').setAttribute('aria-label', run.name + ': altitude and power demand over ' + run.stop + ' seconds');
    $('ar-alt').setAttribute('points', run.alt); $('ar-dem').setAttribute('points', run.dem);
    $('ar-fault').setAttribute('x', run.fx >= 0 ? run.fx : 0); $('ar-fault').setAttribute('width', run.fx >= 0 ? run.fw : 0);
    var rx = run.rx >= 0 ? run.rx : -10;
    $('ar-reset').setAttribute('x1', rx); $('ar-reset').setAttribute('x2', rx); $('ar-reset').setAttribute('opacity', run.rx >= 0 ? 0.7 : 0);
    var ti = defaultIndex(run);
    range.max = run.t.length - 1; range.value = ti;
    setTime(ti);
    var picks = document.querySelectorAll('[data-ar-pick]');
    for (var k = 0; k < picks.length; k++) picks[k].setAttribute('aria-pressed', picks[k].getAttribute('data-ar-pick') === 's:' + i ? 'true' : 'false');
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null;
    if (!t) return;
    var b;
    if ((b = t.closest('[data-ar-ev]'))) return setEvent(Number(b.getAttribute('data-ar-ev')));
    if ((b = t.closest('[data-ar-step]'))) return setEvent(state.ev + Number(b.getAttribute('data-ar-step')));
    if ((b = t.closest('[data-ar-cell]'))) return setCell(Number(b.getAttribute('data-ar-cell')));
    if ((b = t.closest('[data-ar-pick]')) && runs.length) return setScenario(Number(b.getAttribute('data-ar-pick').split(':')[1]));
  });
  if (range && runs.length) range.addEventListener('input', function () { setTime(Number(range.value)); });
})();
