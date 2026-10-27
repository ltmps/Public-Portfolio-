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
    select.title='Choose an axis and its Rate or Pointing feedback loop';
    const branchSelect=document.createElement('select');branchSelect.setAttribute('aria-label','Root locus pole path');branchSelect.title='One eigenvalue trajectory within the selected loop';
    const branchLabel=document.createElement('label');branchLabel.append('Pole path ',branchSelect);host.querySelector('.rl-controls').append(branchLabel);
    let plot, paths, sample = 0, zoom = 1, focusPoint = null, zoomArmed = false, inspected;
    let lo=-1.6,hi=1.6,bottom=-1.6,top=1.6;
    const box = { left: 70, top: 35, size: 480 };
    const x = a => box.left + (a - lo) / (hi - lo) * box.size;
    const y = a => box.top + (top - a) / (top - bottom) * box.size;
    const fmt = n => Number.isFinite(n) ? Number(n.toPrecision(5)).toString() : 'undefined';
    const pointText = (re, im) => `${fmt(re)} ${im < 0 ? '−' : '+'} ${fmt(Math.abs(im))}j`;
    const show = (branch, index, kind = 'Closed-loop pole', fixed) => {
      inspected={branch,index,kind,fixed};
      const re = fixed ? fixed[0] : plot.real[branch][index], im = fixed ? fixed[1] : plot.imag[branch][index];
      const radius = Math.hypot(re, im), sr = Math.log(radius) / data.sampleTime, si = Math.atan2(im, re) / data.sampleTime;
      const wn = Math.hypot(sr, si), damping = wn && Number.isFinite(wn) ? -sr / wn : NaN;
      const pairs = Math.abs(im) > 1e-7 ? `Conjugate pair: ${fmt(re)} ± ${fmt(Math.abs(im))}j` : 'Real-axis point';
      paths.forEach((p, b) => p.setAttribute('stroke-width', b === branch ? 3 : 1.5));
      svg.querySelector('.rl-selected')?.remove();
      if (re >= lo && re <= hi && im >= bottom && im <= top) svg.append(el('circle', {cx:x(re),cy:y(im),r:7,class:'rl-selected',fill:'none',stroke:'#111','stroke-width':2}));
      tip.textContent = `${kind} · ${plot.mode} · ${['X / roll','Y / pitch','Z / yaw'][plot.axis-1]}\n${fixed ? 'Open-loop marker' : `Gain multiplier K = ${fmt(plot.gain[index])}`}\nz = ${pointText(re,im)}\n${pairs}\nDamping ratio ζ = ${fmt(damping)}\nNatural frequency = ${fmt(wn)} rad/s\n|z| = ${fmt(radius)}${kind === 'Closed-loop pole' ? ` · ${radius < 1 ? 'inside' : radius > 1 ? 'outside' : 'on'} unit circle` : ''}`;

      tip.style.setProperty('--branch-color',branch < 0 ? '#333' : colors[branch%colors.length]);
      const lines=tip.textContent.split('\n');tip.replaceChildren(...lines.map((line,i)=>{const row=document.createElement('div');if(i===0){row.className='rl-tip-title';row.textContent=(branch<0?'':('Pole path '+(branch+1)+' · '))+line;}else{const cut=line.includes(' = ')?line.indexOf(' = '):line.indexOf(': ');if(cut>=0){const label=document.createElement('strong');label.textContent=line.slice(0,cut);row.append(label,line.slice(cut));}else row.textContent=line;}return row;}));
      tip.hidden = false;

    };
    const updateGain = () => {
      sample = Number(slider.value); value.textContent = `K = ${fmt(plot.gain[sample])}`;
      svg.querySelector('.rl-gain-poles')?.remove();
      const g=el('g',{class:'rl-gain-poles'});
      plot.real.forEach((a,b) => { const re=a[sample],im=plot.imag[b][sample]; if(re<lo||re>hi||im<bottom||im>top)return;
        const p=el('path',{d:`M${x(re)-4},${y(im)} l4,-4 4,4 -4,4 Z`,fill:'#fff',stroke:colors[b%colors.length],'stroke-width':2});g.append(p);
      }); svg.append(g); show(Number(branchSelect.value),sample);
    };
    const draw = (reset = true) => {
      const savedBranch=branchSelect.value,savedGain=slider.value,savedInspection=inspected;
      if(reset){zoom=1;lo=bottom=-1.6;hi=top=1.6;focusPoint=null;zoomArmed=false;}
      plot=data.plots[Number(select.value)]; svg.replaceChildren(); paths=[];
      branchSelect.replaceChildren(...plot.real.map((_,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1}`;return o;}));
      svg.append(el('title',{},`${plot.mode} root locus, ${['roll','pitch','yaw'][plot.axis-1]}`));
      const defs=el('defs'),clip=el('clipPath',{id:'rl-clip'});clip.append(el('rect',{x:box.left,y:box.top,width:box.size,height:box.size}));defs.append(clip);svg.append(defs);
      svg.append(el('rect',{x:box.left,y:box.top,width:box.size,height:box.size,fill:'#fff',stroke:'#333'}));
      const step=zoom<=1?.5:zoom<=2?.25:zoom<=4?.1:.05;
      for(let n=Math.ceil(lo/step)*step;n<=hi+1e-9;n+=step)svg.append(el('line',{x1:x(n),x2:x(n),y1:box.top,y2:box.top+box.size,stroke:'#ddd'}),el('text',{x:x(n),y:535,'text-anchor':'middle'},Number(n.toFixed(2))));
      for(let n=Math.ceil(bottom/step)*step;n<=top+1e-9;n+=step)svg.append(el('line',{x1:box.left,x2:box.left+box.size,y1:y(n),y2:y(n),stroke:'#ddd'}),el('text',{x:58,y:y(n)+5,'text-anchor':'end'},Number(n.toFixed(2))));
      svg.append(el('text',{x:310,y:570,'text-anchor':'middle'},'Real axis (z)'),el('text',{transform:'translate(20 275) rotate(-90)','text-anchor':'middle'},'Imaginary axis (z)'),el('circle',{cx:x(0),cy:y(0),r:box.size/(hi-lo),fill:'none',stroke:'#555','stroke-dasharray':'7 5','clip-path':'url(#rl-clip)'}));
      const branches=el('g',{'clip-path':'url(#rl-clip)'});svg.append(branches);
      plot.real.forEach((a,b)=>{const p=el('path',{d:a.map((re,k)=>`${k?'L':'M'}${x(re)},${y(plot.imag[b][k])}`).join(' '),fill:'none',stroke:colors[b%colors.length],'stroke-width':1.5});paths.push(p);branches.append(p);});
      for(const [kind,points] of [['Open-loop pole',plot.poles],['Open-loop zero',plot.zeros]])points.forEach(p=>{const [re,im]=p;if(re<lo||re>hi||im<bottom||im>top)return;const marker=kind.endsWith('zero')?el('circle',{cx:x(re),cy:y(im),r:5,fill:'#fff',stroke:'#111','stroke-width':2}):el('path',{d:`M${x(re)-5},${y(im)-5}l10,10 M${x(re)-5},${y(im)+5}l10,-10`,stroke:'#111','stroke-width':2});marker.setAttribute('tabindex','0');marker.setAttribute('role','img');marker.setAttribute('aria-label',`${kind}: ${pointText(re,im)}`);marker.addEventListener('pointerenter',()=>show(-1,0,kind,p));marker.addEventListener('focus',()=>show(-1,0,kind,p));branches.append(marker);});
      slider.max=plot.gain.length-1;slider.value=reset?plot.gain.indexOf(1):savedGain;if(!reset)branchSelect.value=savedBranch;updateGain();if(!reset&&savedInspection)show(savedInspection.branch,savedInspection.index,savedInspection.kind,savedInspection.fixed);zoomOutput.textContent=`${zoom}×`;zoomIn.disabled=zoom>=8;zoomOut.disabled=zoom<=1;paintCentre();
    };
    svg.addEventListener('pointermove',event=>{
      if(event.target.hasAttribute('tabindex'))return;
      const rect=svg.getBoundingClientRect(),px=(event.clientX-rect.left)*620/rect.width,py=(event.clientY-rect.top)*590/rect.height;
      let best=144,found;
      plot.real.forEach((a,b)=>a.forEach((re,k)=>{const im=plot.imag[b][k];if(re<lo||re>hi||im<bottom||im>top)return;const d=(x(re)-px)**2+(y(im)-py)**2;if(d<best){best=d;found=[b,k];}}));
      if(found)show(...found);
    });
    const paintCentre=()=>{
      svg.querySelector('.rl-zoom-centre')?.remove();
      if(focusPoint){const [re,im]=focusPoint;if(re>=lo&&re<=hi&&im>=bottom&&im<=top)svg.append(el('path',{class:'rl-zoom-centre',d:`M${x(re)-10},${y(im)}h20 M${x(re)},${y(im)-10}v20`,stroke:'#111','stroke-width':1.5,'pointer-events':'none'}));}
      svg.style.cursor=zoomArmed?'zoom-in':'crosshair';zoomIn.setAttribute('aria-pressed',String(zoomArmed));
      zoomStatus.textContent=zoomArmed?'Click the plot to zoom here. Keyboard: Enter zooms at the crosshair or view centre.':(focusPoint?`Crosshair: ${fmt(focusPoint[0])}, ${fmt(focusPoint[1])}. Hover only inspects.`:'Choose +, then click where you want to zoom.');
    };
    svg.addEventListener('click',event=>{
      const rect=svg.getBoundingClientRect(),px=(event.clientX-rect.left)*620/rect.width,py=(event.clientY-rect.top)*590/rect.height;
      if(px<box.left||px>box.left+box.size||py<box.top||py>box.top+box.size)return;
      focusPoint=[lo+(px-box.left)/box.size*(hi-lo),top-(py-box.top)/box.size*(top-bottom)];
      let best=400,found;plot.real.forEach((a,b)=>a.forEach((re,k)=>{const im=plot.imag[b][k];if(re<lo||re>hi||im<bottom||im>top)return;const d=(x(re)-px)**2+(y(im)-py)**2;if(d<best){best=d;found=[b,k];}}));
      if(found){slider.value=found[1];branchSelect.value=found[0];updateGain();show(...found);}
      if(zoomArmed){zoomArmed=false;changeZoom(2);}else paintCentre();
    });
    svg.setAttribute('tabindex','0');
    svg.addEventListener('keydown',event=>{if(event.target!==svg)return;if(event.key==='Escape'){zoomArmed=false;paintCentre();return;}if(event.key==='Enter'&&zoomArmed){event.preventDefault();focusPoint=focusPoint||[(lo+hi)/2,(bottom+top)/2];zoomArmed=false;changeZoom(2);return;}const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};if(moves[event.key]){event.preventDefault();const p=focusPoint||[(lo+hi)/2,(bottom+top)/2],d=moves[event.key],step=(hi-lo)/20;focusPoint=[Math.max(lo,Math.min(hi,p[0]+d[0]*step)),Math.max(bottom,Math.min(top,p[1]+d[1]*step))];paintCentre();}});
    slider.addEventListener('input',updateGain);select.addEventListener('change',()=>draw());branchSelect.addEventListener('change',updateGain);
    const zoomControls=document.createElement('div');zoomControls.className='rl-zoom';
    const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;const icon=el('svg',{viewBox:'0 0 24 24',width:18,height:18,'aria-hidden':'true',fill:'none',stroke:'currentColor','stroke-width':1.8});if(label==='Reset view'){icon.append(el('path',{d:'M4 9a8 8 0 1 1 0 6 M4 3v6h6'}));}else{icon.append(el('circle',{cx:10,cy:10,r:6}),el('path',{d:'m15 15 5 5 M7 10h6'+(label==='Zoom in'?' M10 7v6':'')}));}b.append(icon);b.addEventListener('click',action);zoomControls.append(b);return b;};
    const changeZoom=factor=>{const next=Math.max(1,Math.min(8,zoom*factor));if(next===1){zoom=1;lo=bottom=-1.6;hi=top=1.6;}else{zoom=next;const half=1.6/zoom;const centre=factor>1&&focusPoint?focusPoint:[(lo+hi)/2,(bottom+top)/2];lo=centre[0]-half;hi=centre[0]+half;bottom=centre[1]-half;top=centre[1]+half;}draw(false);};
    const zoomIn=button('Zoom in',()=>{zoomArmed=!zoomArmed;paintCentre();}),zoomOut=button('Zoom out',()=>{zoomArmed=false;changeZoom(.5);});button('Reset view',()=>{zoomArmed=false;focusPoint=null;zoom=1;lo=bottom=-1.6;hi=top=1.6;draw(false);});
    const zoomOutput=document.createElement('output');zoomOutput.setAttribute('aria-label','Plot zoom');zoomControls.append(zoomOutput);host.querySelector('.rl-controls').append(zoomControls);
    const zoomStatus=document.createElement('p');zoomStatus.className='rl-zoom-status';zoomStatus.setAttribute('aria-live','polite');host.querySelector('.rl-controls').after(zoomStatus);
    host.hidden=false;draw();
  }).catch(()=>{ /* The full-size static figure remains usable. */ });
})();
