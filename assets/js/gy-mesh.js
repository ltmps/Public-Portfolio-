/* Quadtree mesh refinement drawn on a canvas behind a hero.
   data-gy-mesh="home": refinement follows the cursor in both themes (levels 0 to 3,
   base cell 40px, thresholds r, 1.75r and 2.8r). Hold and drag traces a trail that
   fades over 2.6 s; holding still cycles the refinement radius.
   data-gy-mesh="field": a dark-mode-only background field that drifts on its own and
   follows the cursor. Reduced motion stops the drift and the easing. */
(function () {
  'use strict';
  var LIFE = 2600;

  function Mesh(cv, root) {
    this.cv = cv;
    this.root = root;
    this.mode = cv.getAttribute('data-gy-mesh');
    this.hero = cv.closest('[data-gy-hero]') || cv.parentNode;
    this.hud = document.querySelector('[data-gy-hud]');
    this.r3 = Number(cv.getAttribute('data-refinement')) || 110;
    this.t0 = performance.now();
    this.src = { x: 0, y: 0, init: false };
    this.trail = [];
    this.mult = 1;
    this.down = false;
    this.visible = true;
    this.raf = 0;
    this.bind();
    this.resize();
  }

  Mesh.prototype.dark = function () { return document.documentElement.getAttribute('data-theme') === 'dark'; };
  Mesh.prototype.reduce = function () { return !!(window.GY && window.GY.reduced()); };

  Mesh.prototype.bind = function () {
    var self = this;
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(this.cv);
    else window.addEventListener('resize', function () { self.resize(); });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; self.kick(); }).observe(this.cv);
    }
    document.addEventListener('gy-theme', function () { self.dirty = true; self.kick(); });
    this.root.addEventListener('mousemove', function (e) { self.move(e); });
    this.root.addEventListener('mouseleave', function () {
      self.root.style.setProperty('--lo', '1');
      self.down = false; self.target = null; self.kick();
    });
    if (this.mode !== 'home') return;
    this.hero.addEventListener('mousedown', function (e) { self.press(e); });
    window.addEventListener('mouseup', function () { if (self.down) { self.down = false; self.kick(); } });
  };

  Mesh.prototype.local = function (e) {
    var r = this.cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  Mesh.prototype.move = function (e) {
    if (!this.H) return;
    if (this.mode === 'field' && !this.dark()) return;
    var p = this.local(e);
    var inside = p.y >= 0 && p.y <= this.H && p.x >= 0 && p.x <= this.W;
    this.target = inside ? p : null;
    if (this.mode === 'home') {
      this.root.style.setProperty('--lo', inside ? '0' : '1');
      if (this.down && inside) {
        var dp = this.downPos;
        if (!this.moved && dp && Math.abs(p.x - dp.x) + Math.abs(p.y - dp.y) > 6) this.moved = true;
        if (this.moved) {
          var last = this.trail[this.trail.length - 1];
          if (!last || Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > 10) {
            this.trail.push({ x: p.x, y: p.y, t: performance.now() });
            if (this.trail.length > 90) this.trail.shift();
          }
        }
      }
      if (!inside && this.down) this.down = false;
    }
    this.kick();
  };

  Mesh.prototype.press = function (e) {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest('a,button,input,label,select,textarea,video,[role="button"]')) return;
    if (!this.H) return;
    e.preventDefault();
    var p = this.local(e);
    this.down = true; this.moved = false; this.downAt = performance.now(); this.downPos = p;
    this.target = p;
    this.trail = [{ x: p.x, y: p.y, t: this.downAt }];
    this.kick();
  };

  Mesh.prototype.resize = function () {
    var w = this.cv.clientWidth, h = this.cv.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.W = w; this.H = h; this.dpr = dpr; this.dirty = true;
    this.kick();
  };

  Mesh.prototype.kick = function () {
    var self = this;
    if (!this.raf) this.raf = requestAnimationFrame(function (t) { self.frame(t); });
  };

  Mesh.prototype.clear = function () {
    var c = this.cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    this.drawn = false;
  };

  Mesh.prototype.hudText = function (txt) {
    if (this.hud && this.hud.textContent !== txt) this.hud.textContent = txt;
  };

  Mesh.prototype.frame = function (t) {
    this.raf = 0;
    if (!this.W || !this.visible) return;
    var dark = this.dark(), reduce = this.reduce(), now = performance.now();
    if (this.mode === 'field') return this.fieldFrame(t, dark, reduce);

    if (this.trail.length) this.trail = this.trail.filter(function (p) { return now - p.t < LIFE; });
    var cyc = this.down && !this.moved && (now - this.downAt > 220);
    var mPrev = this.mult;
    if (cyc) {
      var ph = (now - this.downAt - 220) / 1400;
      this.mult = 0.35 + 1.25 * (0.5 - 0.5 * Math.cos(ph * Math.PI * 2));
    } else {
      this.mult += (1 - this.mult) * 0.15;
    }
    if (Math.abs(this.mult - 1) < 0.005) this.mult = 1;

    var tx, ty, active = true;
    if (this.target) { tx = this.target.x; ty = this.target.y; }
    else if (dark && !reduce) { var s = (t - this.t0) / 1000; tx = this.W * (0.66 + 0.17 * Math.cos(s * 0.21)); ty = this.H * (0.45 + 0.2 * Math.sin(s * 0.33)); }
    else if (dark) { tx = this.W * 0.72; ty = this.H * 0.45; }
    else active = false;

    var moving = false;
    if (active) {
      if (!this.src.init) { this.src.x = tx; this.src.y = ty; this.src.init = true; this.dirty = true; }
      var dx = tx - this.src.x, dy = ty - this.src.y;
      moving = Math.abs(dx) + Math.abs(dy) > 0.3;
      if (moving) { var k = (reduce || this.down) ? 1 : 0.18; this.src.x += dx * k; this.src.y += dy * k; }
    }
    var busy = this.trail.length > 0 || cyc || this.mult !== mPrev;
    if (!active && !busy) {
      if (this.drawn) this.clear();
      this.hudText('Cells 0 · Move into the drawing');
      return;
    }
    if (moving || busy || this.dirty) { this.drawHome(dark, active, now, cyc); this.dirty = false; this.drawn = true; }
    if ((dark && !reduce) || moving || busy) this.kick();
  };

  Mesh.prototype.drawHome = function (dark, active, now, cyc) {
    var ctx = this.cv.getContext('2d'), W = this.W, H = this.H, dpr = this.dpr;
    var off = dpr === 1 ? 0.5 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, off, off);
    ctx.clearRect(-1, -1, W + 2, H + 2);
    var r3 = this.r3, srcs = [], main = null, trail = this.trail, i;
    if (active) { main = { x: this.src.x, y: this.src.y, r: r3 * this.mult }; srcs.push(main); }
    for (i = 0; i < trail.length; i++) {
      var a = 1 - (now - trail[i].t) / LIFE, rr = r3 * 0.7 * a;
      if (rr > 10) srcs.push({ x: trail[i].x, y: trail[i].y, r: rr });
    }
    var S = 40, n = 0, ns = srcs.length;
    var paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    var near = new Path2D(), core = new Path2D(), trailFill = new Path2D();
    function levelAt(x, y, s) {
      var best = 0;
      for (var j = 0; j < ns; j++) {
        var q = srcs[j];
        var ex = Math.max(Math.abs(x + s / 2 - q.x) - s / 2, 0), ey = Math.max(Math.abs(y + s / 2 - q.y) - s / 2, 0);
        var d = Math.sqrt(ex * ex + ey * ey);
        var l = d < q.r ? 3 : d < q.r * 1.75 ? 2 : d < q.r * 2.8 ? 1 : 0;
        if (l > best) { best = l; if (best === 3) break; }
      }
      return best;
    }
    function cell(x, y, s, l) {
      if (l < 3 && levelAt(x, y, s) > l) {
        var h = s / 2;
        cell(x, y, h, l + 1); cell(x + h, y, h, l + 1); cell(x, y + h, h, l + 1); cell(x + h, y + h, h, l + 1);
        return;
      }
      var p = paths[l];
      p.moveTo(x, y + s); p.lineTo(x, y); p.lineTo(x + s, y);
      n++;
      if (l !== 3) return;
      var cx = x + s / 2, cy = y + s / 2;
      if (main) {
        var mx = cx - main.x, my = cy - main.y, dm = Math.sqrt(mx * mx + my * my);
        if (dm < main.r * 0.34) { core.rect(x, y, s, s); return; }
        if (dm < main.r * 0.64) { near.rect(x, y, s, s); return; }
      }
      for (var j = 0; j < ns; j++) {
        var q = srcs[j];
        if (q === main) continue;
        var tx = cx - q.x, ty = cy - q.y;
        if (tx * tx + ty * ty < (q.r * 0.3) * (q.r * 0.3)) { trailFill.rect(x, y, s, s); return; }
      }
    }
    for (var y = 0; y < H; y += S) for (var x = 0; x < W; x += S) cell(x, y, S, 0);
    var A = dark ? '43,127,255' : '245,73,0', INK = dark ? '250,250,250' : '10,10,10';
    ctx.fillStyle = 'rgba(' + A + ',' + (dark ? 0.08 : 0.1) + ')'; ctx.fill(trailFill);
    ctx.fillStyle = 'rgba(' + A + ',' + (dark ? 0.07 : 0.09) + ')'; ctx.fill(near);
    ctx.fillStyle = 'rgba(' + A + ',' + (dark ? 0.24 : 0.22) + ')'; ctx.fill(core);
    var st = dark
      ? ['rgba(250,250,250,0.05)', 'rgba(250,250,250,0.09)', 'rgba(43,127,255,0.32)', 'rgba(43,127,255,0.6)']
      : [null, 'rgba(10,10,10,0.12)', 'rgba(245,73,0,0.38)', 'rgba(245,73,0,0.62)'];
    ctx.lineWidth = 1;
    for (i = 0; i < 4; i++) if (st[i]) { ctx.strokeStyle = st[i]; ctx.stroke(paths[i]); }
    if (trail.length > 1) {
      ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (i = 1; i < trail.length; i++) {
        var al = Math.max(0, 1 - (now - trail[i].t) / LIFE);
        ctx.strokeStyle = 'rgba(' + A + ',' + (0.85 * al).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
      }
    }
    if (main) {
      var ringR = Math.max(8, main.r * 0.31);
      ctx.beginPath(); ctx.arc(main.x, main.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + INK + ',0.85)'; ctx.lineWidth = 1.25; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(main.x - 5, main.y); ctx.lineTo(main.x + 5, main.y); ctx.moveTo(main.x, main.y - 5); ctx.lineTo(main.x, main.y + 5); ctx.stroke();
      if (cyc) {
        ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.fillStyle = 'rgba(' + INK + ',0.9)'; ctx.textAlign = 'left';
        ctx.fillText('R ' + Math.round(main.r) + ' PX', main.x + ringR + 8, main.y - 6);
      }
    }
    if (!this.hudT || now - this.hudT > 90) {
      this.hudT = now;
      var mode = cyc ? ' · Cycling' : (this.down ? ' · Tracing' : '');
      this.hudText('Cells ' + n.toLocaleString('en-US') + ' · Levels 0 to 3 · R ' + Math.round(main ? main.r : r3) + ' px' + mode);
    }
  };

  Mesh.prototype.fieldFrame = function (t, dark, reduce) {
    if (!dark) { if (this.drawn) this.clear(); this.src.init = false; return; }
    var tx, ty;
    if (this.target) { tx = this.target.x; ty = this.target.y; }
    else if (!reduce) { var s = (t - this.t0) / 1000; tx = this.W * (0.7 + 0.15 * Math.cos(s * 0.21)); ty = this.H * (0.5 + 0.22 * Math.sin(s * 0.33)); }
    else { tx = this.W * 0.75; ty = this.H * 0.5; }
    if (!this.src.init) { this.src.x = tx; this.src.y = ty; this.src.init = true; this.dirty = true; }
    var dx = tx - this.src.x, dy = ty - this.src.y;
    var moving = Math.abs(dx) + Math.abs(dy) > 0.3;
    if (moving) { var k = reduce ? 1 : 0.14; this.src.x += dx * k; this.src.y += dy * k; this.dirty = true; }
    if (this.dirty) { this.drawField(); this.dirty = false; this.drawn = true; }
    if (!reduce || moving) this.kick();
  };

  Mesh.prototype.drawField = function () {
    var ctx = this.cv.getContext('2d'), W = this.W, H = this.H, dpr = this.dpr;
    var off = dpr === 1 ? 0.5 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, off, off);
    ctx.clearRect(-1, -1, W + 2, H + 2);
    var sx = this.src.x, sy = this.src.y, r3 = this.r3;
    var R = [r3 * 2.8, r3 * 1.75, r3], S = 64;
    var paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    var near = new Path2D(), core = new Path2D();
    function want(d) { return d < R[2] ? 3 : d < R[1] ? 2 : d < R[0] ? 1 : 0; }
    function cell(x, y, s, l) {
      var ex = Math.max(Math.abs(x + s / 2 - sx) - s / 2, 0), ey = Math.max(Math.abs(y + s / 2 - sy) - s / 2, 0);
      var d = Math.sqrt(ex * ex + ey * ey);
      if (l < 3 && want(d) > l) {
        var h = s / 2;
        cell(x, y, h, l + 1); cell(x + h, y, h, l + 1); cell(x, y + h, h, l + 1); cell(x + h, y + h, h, l + 1);
        return;
      }
      var p = paths[l];
      p.moveTo(x, y + s); p.lineTo(x, y); p.lineTo(x + s, y);
      if (l === 3) {
        var cx = x + s / 2 - sx, cy = y + s / 2 - sy, dc = Math.sqrt(cx * cx + cy * cy);
        if (dc < 38) core.rect(x, y, s, s); else if (dc < 72) near.rect(x, y, s, s);
      }
    }
    for (var y = 0; y < H; y += S) for (var x = 0; x < W; x += S) cell(x, y, S, 0);
    ctx.fillStyle = 'rgba(43,127,255,0.07)'; ctx.fill(near);
    ctx.fillStyle = 'rgba(43,127,255,0.24)'; ctx.fill(core);
    var st = ['rgba(250,250,250,0.05)', 'rgba(250,250,250,0.09)', 'rgba(43,127,255,0.32)', 'rgba(43,127,255,0.6)'];
    ctx.lineWidth = 1;
    for (var i = 0; i < 4; i++) { ctx.strokeStyle = st[i]; ctx.stroke(paths[i]); }
    ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(250,250,250,0.85)'; ctx.lineWidth = 1.25; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 5, sy); ctx.lineTo(sx + 5, sy); ctx.moveTo(sx, sy - 5); ctx.lineTo(sx, sy + 5); ctx.stroke();
  };

  function init() {
    var root = document.querySelector('[data-gy-root]');
    var cvs = document.querySelectorAll('canvas[data-gy-mesh]');
    if (!root || !window.Path2D) return;
    for (var i = 0; i < cvs.length; i++) new Mesh(cvs[i], root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
