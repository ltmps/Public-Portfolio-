(() => {
  'use strict';
  const host = document.querySelector('.em-study');
  if (!host) return;
  const script = document.currentScript;
  const url = new URL('../data/singularity/easymini-trace.json', script.src);
  fetch(url).then(r => { if (!r.ok) throw new Error('Trace unavailable'); return r.json(); }).then(data => {
    const controls = host.querySelector('.em-controls');
    const play = host.querySelector('[data-em-play]');
    const reset = host.querySelector('[data-em-reset]');
    const range = host.querySelector('input[type="range"]');
    const speed = host.querySelector('select');
    const output = host.querySelector('.em-time');
    const readings = host.querySelector('.em-readings');
    const clip = host.querySelector('#em-reveal rect');
    const cursor = host.querySelector('.em-cursor');
    const line = cursor.querySelector('line');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let time = 32.5, running = false, frame = 0, last = 0;
    function valueAt(series,t) {
      const a = series.anchors;
      const j = a.findIndex(p => p.t >= t);
      if (j < 0) return a[a.length-1].value;
      if (!j) return a[0].value;
      const p=a[j-1], q=a[j];
      return p.value+(q.value-p.value)*(t-p.t)/(q.t-p.t);
    }
    const cells=data.series.map(s => {const el=document.createElement('span');el.className='em-'+s.key;readings.append(el);return el;});
    function draw(t) {
      time=Math.min(32.5,Math.max(0,t));range.value=time.toFixed(1);
      output.textContent=time.toFixed(1)+' s';
      clip.setAttribute('width',String(time/32.5*900));
      line.setAttribute('x1',String(90+time/32.5*900));line.setAttribute('x2',String(90+time/32.5*900));
      data.series.forEach((s,i) => {cells[i].textContent=s.label+' ≈ '+(Math.round(valueAt(s,time)) || 0).toLocaleString()+' '+s.unit;});
    }
    function stop() {running=false;cancelAnimationFrame(frame);play.textContent='Play trace';play.setAttribute('aria-pressed','false');}
    function tick(now) {if(!running)return;if(last)draw(time+(now-last)/1000*Number(speed.value));last=now;if(time>=32.5)stop();else frame=requestAnimationFrame(tick);}
    play.addEventListener('click',() => {if(running){stop();return;}if(time>=32.5)draw(0);running=true;last=0;play.textContent='Pause';play.setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);});
    range.addEventListener('input',() => {stop();draw(Number(range.value));});
    reset.addEventListener('click',() => {stop();draw(0);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    reduced.addEventListener('change',()=>{stop();play.hidden=reduced.matches;});
    controls.hidden=false;readings.hidden=false;cursor.removeAttribute('hidden');play.hidden=reduced.matches;
    draw(32.5);
  }).catch(() => { /* The complete static SVG and downloadable data remain available. */ });
})();
