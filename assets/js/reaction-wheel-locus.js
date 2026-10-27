/* Numerical samples exported by MATLAB rlocus; no client-side pole solver. */
(() => {
  const host = document.querySelector('[data-root-locus]');
  if (!host) return;
  const ns = 'http://www.w3.org/2000/svg';
  const colors = ['#0072bd', '#d95319', '#7e2f8e', '#477c00', '#a16800', '#00828b', '#b02970'];
  const el = (name, attrs, text) => {
    const n = document.createElementNS(ns, name);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (text !== undefined) n.textContent = text;
    return n;
  };
  fetch(host.dataset.rootLocus).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).then(data => {
    const select = host.querySelector('select'), slider = host.querySelector('input'), svg = host.querySelector('svg');
    const tip = host.querySelector('.rl-tip'), value = host.querySelector('output');
    const branchSelect=document.createElement('select');branchSelect.setAttribute('aria-label','Root locus branch');
    const branchLabel=document.createElement('label');branchLabel.append('Branch ',branchSelect);host.querySelector('.rl-controls').append(branchLabel);
    let plot, paths, sample = 0;
    const box = { left: 70, top: 35, size: 480 }, lo = -1.6, hi = 1.6;
    const x = a => box.left + (a - lo) / (hi - lo) * box.size;
    const y = a => box.top + (hi - a) / (hi - lo) * box.size;
    const fmt = n => Number.isFinite(n) ? Number(n.toPrecision(5)).toString() : 'undefined';
    const pointText = (re, im) => `${fmt(re)} ${im < 0 ? '−' : '+'} ${fmt(Math.abs(im))}j`;
    const show = (branch, index, kind = 'Closed-loop pole', fixed) => {
      const re = fixed ? fixed[0] : plot.real[branch][index], im = fixed ? fixed[1] : plot.imag[branch][index];
      const radius = Math.hypot(re, im), sr = Math.log(radius) / data.sampleTime, si = Math.atan2(im, re) / data.sampleTime;
      const wn = Math.hypot(sr, si), damping = wn && Number.isFinite(wn) ? -sr / wn : NaN;
      const pairs = Math.abs(im) > 1e-7 ? `Conjugate pair: ${fmt(re)} ± ${fmt(Math.abs(im))}j` : 'Real-axis point';
      paths.forEach((p, b) => p.setAttribute('stroke-width', b === branch ? 3 : 1.5));
      svg.querySelector('.rl-selected')?.remove();
      if (re >= lo && re <= hi && im >= lo && im <= hi) svg.append(el('circle', {cx:x(re),cy:y(im),r:7,class:'rl-selected',fill:'none',stroke:'#111','stroke-width':2}));
      tip.textContent = `${kind} · ${plot.mode} · ${['X / roll','Y / pitch','Z / yaw'][plot.axis-1]}\n${fixed ? 'Open-loop marker' : `Gain multiplier K = ${fmt(plot.gain[index])}`}\nz = ${pointText(re,im)}\n${pairs}\nDamping ratio ζ = ${fmt(damping)}\nNatural frequency = ${fmt(wn)} rad/s\n|z| = ${fmt(radius)}${kind === 'Closed-loop pole' ? ` · ${radius < 1 ? 'inside' : radius > 1 ? 'outside' : 'on'} unit circle` : ''}`;
      tip.hidden = false;
      if (window.matchMedia('(min-width:601px)').matches) {
        const canvas = host.querySelector('.rl-canvas');
        const scale = canvas.clientWidth / 620;
        tip.style.left = `${Math.max(8,Math.min(x(re)*scale+14,canvas.clientWidth-285))}px`;
        tip.style.top = `${Math.max(8,Math.min(y(im)*scale+14,canvas.clientHeight-225))}px`;
        tip.style.right = 'auto';
      } else { tip.style.left='';tip.style.top='';tip.style.right=''; }
    };
    const updateGain = () => {
      sample = Number(slider.value); value.textContent = `K = ${fmt(plot.gain[sample])}`;
      svg.querySelector('.rl-gain-poles')?.remove();
      const g=el('g',{class:'rl-gain-poles'});
      plot.real.forEach((a,b) => { const re=a[sample],im=plot.imag[b][sample]; if(re<lo||re>hi||im<lo||im>hi)return;
        const p=el('path',{d:`M${x(re)-4},${y(im)} l4,-4 4,4 -4,4 Z`,fill:'#fff',stroke:colors[b%colors.length],'stroke-width':2});g.append(p);
      }); svg.append(g); show(Number(branchSelect.value),sample);
    };
    const draw = () => {
      plot=data.plots[Number(select.value)]; svg.replaceChildren(); paths=[];
      branchSelect.replaceChildren(...plot.real.map((_,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1}`;return o;}));
      svg.append(el('title',{},`${plot.mode} root locus, ${['roll','pitch','yaw'][plot.axis-1]}`));
      const defs=el('defs'),clip=el('clipPath',{id:'rl-clip'});clip.append(el('rect',{x:box.left,y:box.top,width:box.size,height:box.size}));defs.append(clip);svg.append(defs);
      svg.append(el('rect',{x:box.left,y:box.top,width:box.size,height:box.size,fill:'#fff',stroke:'#333'}));
      for(let n=-1.5;n<=1.5;n+=.5){svg.append(el('line',{x1:x(n),x2:x(n),y1:box.top,y2:box.top+box.size,stroke:'#ddd'}),el('line',{x1:box.left,x2:box.left+box.size,y1:y(n),y2:y(n),stroke:'#ddd'}),el('text',{x:x(n),y:535,'text-anchor':'middle'},n),el('text',{x:58,y:y(n)+5,'text-anchor':'end'},n));}
      svg.append(el('text',{x:310,y:570,'text-anchor':'middle'},'Real axis (z)'),el('text',{transform:'translate(20 275) rotate(-90)','text-anchor':'middle'},'Imaginary axis (z)'),el('circle',{cx:x(0),cy:y(0),r:box.size/(hi-lo),fill:'none',stroke:'#555','stroke-dasharray':'7 5'}));
      const branches=el('g',{'clip-path':'url(#rl-clip)'});svg.append(branches);
      plot.real.forEach((a,b)=>{const p=el('path',{d:a.map((re,k)=>`${k?'L':'M'}${x(re)},${y(plot.imag[b][k])}`).join(' '),fill:'none',stroke:colors[b%colors.length],'stroke-width':1.5});paths.push(p);branches.append(p);});
      for(const [kind,points] of [['Open-loop pole',plot.poles],['Open-loop zero',plot.zeros]])points.forEach(p=>{const [re,im]=p;if(re<lo||re>hi||im<lo||im>hi)return;const marker=kind.endsWith('zero')?el('circle',{cx:x(re),cy:y(im),r:5,fill:'#fff',stroke:'#111','stroke-width':2}):el('path',{d:`M${x(re)-5},${y(im)-5}l10,10 M${x(re)-5},${y(im)+5}l10,-10`,stroke:'#111','stroke-width':2});marker.setAttribute('tabindex','0');marker.setAttribute('role','img');marker.setAttribute('aria-label',`${kind}: ${pointText(re,im)}`);marker.addEventListener('pointerenter',()=>show(-1,0,kind,p));marker.addEventListener('focus',()=>show(-1,0,kind,p));branches.append(marker);});
      slider.max=plot.gain.length-1;slider.value=plot.gain.indexOf(1);updateGain();
    };
    svg.addEventListener('pointermove',event=>{
      if(event.target.hasAttribute('tabindex'))return;
      const rect=svg.getBoundingClientRect(),px=(event.clientX-rect.left)*620/rect.width,py=(event.clientY-rect.top)*590/rect.height;
      let best=144,found;
      plot.real.forEach((a,b)=>a.forEach((re,k)=>{const im=plot.imag[b][k];if(re<lo||re>hi||im<lo||im>hi)return;const d=(x(re)-px)**2+(y(im)-py)**2;if(d<best){best=d;found=[b,k];}}));
      if(found)show(...found);
    });
    svg.addEventListener('click',event=>{const rect=svg.getBoundingClientRect();const px=(event.clientX-rect.left)*620/rect.width,py=(event.clientY-rect.top)*590/rect.height;let best=400,found;plot.real.forEach((a,b)=>a.forEach((re,k)=>{const d=(x(re)-px)**2+(y(plot.imag[b][k])-py)**2;if(d<best){best=d;found=[b,k];}}));if(found){slider.value=found[1];branchSelect.value=found[0];updateGain();show(...found);}});
    slider.addEventListener('input',updateGain);select.addEventListener('change',draw);branchSelect.addEventListener('change',updateGain);
    host.hidden=false;draw();
  }).catch(()=>{ /* The full-size static figure remains usable. */ });
})();
