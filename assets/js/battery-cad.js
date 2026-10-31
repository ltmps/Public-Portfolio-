(function () {
  'use strict';
  var root = document.querySelector('[data-battery-cad]');
  if (!root) return;
  var canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  if (!ctx) return;
  var controls = root.querySelector('[data-cad-controls]');
  var status = root.querySelector('[data-cad-status]');
  var spinButton = root.querySelector('[data-cad-spin]');
  var cover = root.querySelector('[data-cad-cover]');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var parts, yaw = -.65, pitch = .95, zoom = 1, spinning = false;
  var visible = false, raf = 0, last = 0, loading = false, pointers = new Map();
  var palette = { metal: [133, 151, 168], pads: [224, 157, 46], packs: [48, 128, 181], electronics: [97, 162, 120] };
  var sides = [[0,3,2,1], [4,5,6,7], [0,1,5,4], [1,2,6,5], [2,3,7,6], [3,0,4,7]];
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function transform(p) {
    var x = p[0] - 160, y = p[1] - 172.5, z = p[2] - 52.5;
    var u = Math.cos(yaw) * x - Math.sin(yaw) * y;
    var v = Math.sin(yaw) * x + Math.cos(yaw) * y;
    return [u, Math.sin(pitch) * v - Math.cos(pitch) * z, Math.cos(pitch) * v + Math.sin(pitch) * z];
  }
  function polygons() {
    var faces = [];
    parts.forEach(function (part) {
      part.boxes_mm.forEach(function (b) {
        if (cover.checked && part.name === 'chassis' && b[2] === 103) return;
        var vertices = [[b[0],b[1],b[2]],[b[3],b[1],b[2]],[b[3],b[4],b[2]],[b[0],b[4],b[2]],
          [b[0],b[1],b[5]],[b[3],b[1],b[5]],[b[3],b[4],b[5]],[b[0],b[4],b[5]]].map(transform);
        sides.forEach(function (side) {
          var p = side.map(function (i) { return vertices[i]; });
          var a = p[1].map(function (v,i) { return v-p[0][i]; });
          var c = p[2].map(function (v,i) { return v-p[0][i]; });
          var normal = [a[1]*c[2]-a[2]*c[1], a[2]*c[0]-a[0]*c[2], a[0]*c[1]-a[1]*c[0]];
          if (normal[2] <= 0) return;
          var light = .67 + .33 * normal[2] / Math.hypot.apply(null, normal);
          faces.push({ p: p, depth: p.reduce(function (s,v) { return s+v[2]; },0)/4,
            color: palette[part.group].map(function (n) { return Math.round(n*light); }) });
        });
      });
    });
    return faces.sort(function (a,b) { return a.depth-b.depth; });
  }
  function draw() {
    if (!parts) return;
    var box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    var w = box.width, h = box.height;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
      canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = dark ? '#111820' : '#f1f5f7'; ctx.fillRect(0,0,w,h);
    var scale = Math.min(w/560,h/540)*zoom;
    polygons().forEach(function (face) {
      ctx.beginPath();
      face.p.forEach(function (p,i) { var x=w/2+p[0]*scale,y=h/2+p[1]*scale; if(i) ctx.lineTo(x,y); else ctx.moveTo(x,y); });
      ctx.closePath(); ctx.fillStyle='rgb('+face.color.join(',')+')'; ctx.fill();
      ctx.lineWidth=.65; ctx.strokeStyle=dark?'#1b2935':'#405365'; ctx.stroke();
    });
    ctx.fillStyle = dark ? '#d6e2ed' : '#263c4c'; ctx.font='12px monospace';
    ctx.fillText('320 x 349 x 105 mm | '+Math.round(zoom*100)+'%',16,h-18);
  }
  function updateStatus() {
    status.textContent = (cover.checked ? 'Cutaway: cover hidden.' : 'Complete assembly: cover shown.') +
      ' Zoom '+Math.round(zoom*100)+'%. '+(spinning ? 'Spinning.' : 'Rotation paused.');
  }
  function animate(now) {
    raf=0;
    if (!spinning || !visible || document.hidden) { last=0; return; }
    if(last) yaw += Math.min(now-last,50)*.00018;
    last=now; draw(); raf=requestAnimationFrame(animate);
  }
  function schedule() { if (spinning && visible && !document.hidden && !raf) raf=requestAnimationFrame(animate); }
  function spin(on) {
    spinning=on; last=0;
    spinButton.textContent=on?'Pause spin':'Spin model'; spinButton.setAttribute('aria-pressed',String(on));
    if (!on && raf) { cancelAnimationFrame(raf); raf=0; }
    updateStatus(); schedule();
  }
  function zoomBy(factor) { zoom=clamp(zoom*factor,.65,2.5); draw(); updateStatus(); }
  function reset() { spin(false); yaw=-.65; pitch=.95; zoom=1; draw(); updateStatus(); }
  function distance() { var a=Array.from(pointers.values()); return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0; }
  canvas.addEventListener('pointerdown',function(e) {
    if (e.button!==0) return;
    spin(false); canvas.focus({preventScroll:true}); canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  });
  canvas.addEventListener('pointermove',function(e) {
    var old=pointers.get(e.pointerId); if(!old) return;
    var previousDistance=distance();
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2 && previousDistance>1) { zoomBy(distance()/previousDistance); return; }
    if(pointers.size===1) { yaw+=(e.clientX-old.x)*.009; pitch=clamp(pitch+(e.clientY-old.y)*.009,-1.5,1.5); draw(); }
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(function(name) {
    canvas.addEventListener(name,function(e) { pointers.delete(e.pointerId); });
  });
  canvas.addEventListener('wheel',function(e) {
    if(document.activeElement!==canvas) return;
    e.preventDefault(); spin(false); zoomBy(Math.exp(clamp(-e.deltaY,-100,100)*.002));
  },{passive:false});
  canvas.addEventListener('keydown',function(e) {
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home',' '].includes(e.key)) return;
    e.preventDefault();
    if(e.key===' ') { spin(!spinning); return; }
    spin(false);
    if(e.key==='Home') reset();
    else if(e.key==='+' || e.key==='=') zoomBy(1.15);
    else if(e.key==='-') zoomBy(1/1.15);
    else { yaw+=(e.key==='ArrowRight'?.12:e.key==='ArrowLeft'?-.12:0); pitch=clamp(pitch+(e.key==='ArrowDown'?.12:e.key==='ArrowUp'?-.12:0),-1.5,1.5); draw(); }
  });
  spinButton.addEventListener('click',function() { spin(!spinning); });
  root.querySelector('[data-cad-in]').addEventListener('click',function() { zoomBy(1.15); });
  root.querySelector('[data-cad-out]').addEventListener('click',function() { zoomBy(1/1.15); });
  root.querySelector('[data-cad-reset]').addEventListener('click',reset);
  cover.addEventListener('change',function() { draw(); updateStatus(); });
  document.addEventListener('visibilitychange',function() { if(document.hidden) { if(raf) cancelAnimationFrame(raf); raf=0; last=0; } else schedule(); });
  reduced.addEventListener('change',function() { spin(false); });
  new ResizeObserver(draw).observe(canvas);
  new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  function load() {
    if(loading) return; loading=true;
    fetch(root.getAttribute('data-geometry')).then(function(r) { if(!r.ok) throw new Error('CAD unavailable'); return r.json(); }).then(function(data) {
      if(!Array.isArray(data.parts) || data.parts.length!==17) throw new Error('Invalid CAD');
      parts=data.parts; canvas.hidden=false; controls.hidden=false; root.querySelector('[data-cad-poster]').hidden=true;
      draw(); updateStatus();
    }).catch(function() { status.textContent='Interactive model unavailable. The static CAD view and component description remain available.'; });
  }
  new IntersectionObserver(function(entries) {
    visible=entries[0].isIntersecting;
    if(visible) { load(); schedule(); }
    else { if(raf) cancelAnimationFrame(raf); raf=0; last=0; }
  },{rootMargin:'100px'}).observe(root);
})();
