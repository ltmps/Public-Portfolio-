/* Saved Simscape data only. No physics or controller is simulated here. */
(() => {
  'use strict';
  const data = window.ORBES_MPC_COMPARISON;
  let duration=data.durationS; let mode=data.mode; data.faults=data.cases;
  const canvas = document.getElementById('view'), ctx = canvas.getContext('2d');
  const ui = Object.fromEntries(['fault','play','reset','speed','time','clock','description','final-error','max-delta','attitude','saturation','outcome','pose-csv','actuation-csv','error-mode'].map(id => [id, document.getElementById(id)]));
  const darkColors = {'#25364d':'#edf0f4','#22354f':'#f5f5f5','white':'#191919','#dce3ed':'#454545','#e9edf3':'#252525','#d2dae5':'#404040','#c5dfd5':'#365c4c','#eed0d2':'#674047','#5e6c80':'#b5bec9','#55667d':'#b6beca','#d5dce7':'#454545','#56647b':'#b6beca','#586a80':'#b6beca','#e5eaf1':'#363636','#68768b':'#b6beca','#35475f':'#c5cbd4','#bfcbd9':'#595959','#59677c':'#b6beca','#f5f7fb':'#111111','#4f6178':'#b6beca','#67778d':'#b6beca','#16845e':'#62d2ab','#c63f45':'#ff8f89','#ac790a':'#ffd16c','#7f39a7':'#c69ae0','#ca560f':'#ffa66f'};
  const ink = color => document.documentElement?.getAttribute('data-theme') === 'dark' ? (darkColors[color] || color) : color;
  const green = '#16845e', red = '#c63f45', gold = '#ac790a', purple = '#7f39a7', orange = '#ca560f';
  const regions = {world:[25,65,780,405],tag:[850,70,245,175],ir:[1125,70,245,175],body:[850,300,520,165],stats:[1125,70,245,195],pos:[30,550,420,215],att:[480,550,345,215],fans:[875,550,485,215]};
  const fanPositions=[[.087,.0633,.076],[.087,-.0527,.076],[.087,-.0527,-.04],[.087,.0633,-.04],[-.0964,.0633,.076],[-.0964,-.0527,.076],[-.0964,-.0527,-.04],[-.0964,.0633,-.04],[-.0047,-.083,.0595],[-.0047,-.083,-.0235],[-.0047,.0936,.0595],[-.0047,.0936,-.0235],[-.0047,.0053,.1063],[-.0047,.0053,-.0703]];
  const thrustAnchors=[[.5,.55,.6],[.05,.65,.85],[.2,.75,.35],[1,.7,.05],[.9,.15,.08]];
  function thrustColor(newtons){const level=Math.min(1,Math.max(0,newtons/.2834))*4,i=Math.min(3,Math.floor(level)),a=level-i;return `rgb(${thrustAnchors[i].map((v,j)=>Math.round(255*(v+a*(thrustAnchors[i+1][j]-v)))).join(',')})`;}
  let selected = data.faults[0], time = 0, playing = false, lastStamp = null, project = null;
  data.faults.forEach(f => {const option=document.createElement('option');option.value=f.id;option.textContent=f.title;ui.fault.appendChild(option);});
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const add=(a,b)=>a.map((x,i)=>x+b[i]);
  const distance=m=>m>=.1?`${m.toFixed(4)} m`:m>=1e-6?`${(1000*m).toFixed(3)} mm`:'<0.001 mm';
  function rotation(q) {
    const n=Math.hypot(...q); const [w,x,y,z]=q.map(v=>v/n);
    return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)], [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)], [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];
  }
  const mul=(R,v)=>R.map(row=>dot(row,v));
  const transposeMul=(R,v)=>[0,1,2].map(i=>R.reduce((a,row,j)=>a+row[i]*v[j],0));
  function sample(rows,t) {
    let i=Math.min(rows.length-2,Math.max(0,Math.floor(t/data.sampleIntervalS)));
    while(i>0&&rows[i][0]>t)i--;while(i<rows.length-2&&rows[i+1][0]<t)i++;
    const a=clamp((t-rows[i][0])/(rows[i+1][0]-rows[i][0]),0,1);return rows[i].map((v,j)=>v+a*(rows[i+1][j]-v));
  }
  const reference=t=>data.referenceSamples?sample(data.referenceSamples,t):[t,...data.commandPositionM,0,1.8*Math.cos(.1*t),1.8*Math.sin(.1*t),1];
  const referenceDescription=document.getElementById('reference-description');
  const cameraScope=document.getElementById('camera-scope');if(cameraScope)cameraScope.textContent=data.usesIR?'Bottom TAG and forward IR cameras use their actual mounts. The IR target is active in this mode.':'Bottom TAG observes the floor reference; the unused IR target and panel are hidden in this mode.';
  ui.time.max=duration;
  function text(s,x,y,color='#25364d',size=14,align='left') {ctx.fillStyle=ink(color);ctx.font=`${size}px ui-monospace, monospace`;ctx.textAlign=align;ctx.fillText(s,x,y);}
  function line(points,color,width=1,dash=[]) {if(!points.length)return;ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(p=>ctx.lineTo(...p));ctx.strokeStyle=ink(color);ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
  function dotMark(p,color,r=4){ctx.beginPath();ctx.arc(p[0],p[1],r,0,2*Math.PI);ctx.fillStyle=ink(color);ctx.fill();}
  function panel(box,title){const[x,y,w,h]=box;ctx.fillStyle=ink('white');ctx.fillRect(x,y,w,h);ctx.strokeStyle=ink('#dce3ed');ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);text(title,x,y-14,'#22354f',15);}
  const az=35*Math.PI/180, el=28*Math.PI/180;
  const right=[Math.cos(az),-Math.sin(az),0], up=[-Math.sin(az)*Math.sin(el),-Math.cos(az)*Math.sin(el),Math.cos(el)];
  const planar=p=>[dot(p,right),dot(p,up)];
  let bounds;
  function setProjection(){
    const points=[...data.healthy,...selected.samples].map(s=>s.slice(1,4));
    points.push([0,0,0],...data.referenceSamples.map(r=>r.slice(1,4)));if(data.usesIR)points.push(...data.referenceSamples.map(r=>r.slice(5,8)));
    const min=[0,1,2].map(j=>Math.min(...points.map(p=>p[j]))-.2), max=[0,1,2].map(j=>Math.max(...points.map(p=>p[j]))+.2);
    for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])points.push([x,y,0]);
    const uv=points.map(planar), lo=[0,1].map(j=>Math.min(...uv.map(p=>p[j]))), hi=[0,1].map(j=>Math.max(...uv.map(p=>p[j])));
    const[x,y,w,h]=regions.world,scale=Math.min((w-150)/(hi[0]-lo[0]),(h-100)/(hi[1]-lo[1]));
    project=p=>{const q=planar(p);return [x+w/2+(q[0]-(lo[0]+hi[0])/2)*scale,y+h/2-(q[1]-(lo[1]+hi[1])/2)*scale];};
    bounds={min,max,scale};
  }
  const corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  function cube(p,q,color,projection,size=.115){const R=rotation(q),v=corners.map(a=>projection(add(p,mul(R,a.map(x=>x*size)))));edges.forEach(e=>line(e.map(i=>v[i]),color,1.4));}
  function fanDisks(p,q,forces,projection,labels=false){
    const R=rotation(q);
    fanPositions.forEach((r,j)=>{
      const basis=j<8?[[0,1,0],[0,0,1]]:j<12?[[1,0,0],[0,0,1]]:[[1,0,0],[0,1,0]];
      const points=Array.from({length:25},(_,k)=>{const angle=k/24*2*Math.PI,v=r.map((x,a)=>x+.014*(basis[0][a]*Math.cos(angle)+basis[1][a]*Math.sin(angle)));return projection(add(p,mul(R,v)));});
      const color=thrustColor(forces[j]);ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(v=>ctx.lineTo(...v));ctx.closePath();ctx.fillStyle=color;ctx.fill();line(points,color,1.5);
      if(labels){const center=projection(add(p,mul(R,r)));text(`m${j}`,center[0]+8,center[1]-7,'#25364d',10);}
    });
  }
  function leader(p,label,offset,color){const a=project(p),b=[a[0]+offset[0],a[1]+offset[1]];line([a,b],color,1,[3,3]);text(label,b[0]+(offset[0]<0?-4:4),b[1],color,13,offset[0]<0?'right':'left');}
  function route(rows,t,color,width){const pts=rows.filter(s=>s[0]<=t).map(s=>project(s.slice(1,4)));line(pts,color,width);}
  function drawWorld(h,f){
    const box=regions.world;panel(box,'Same recorded maneuver: MuJoCo versus Simscape');ctx.save();ctx.beginPath();ctx.rect(...box);ctx.clip();
    const {min,max}=bounds;const floor=[[min[0],min[1],0],[max[0],min[1],0],[max[0],max[1],0],[min[0],max[1],0]].map(project);
    ctx.beginPath();ctx.moveTo(...floor[0]);floor.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.fillStyle=ink('#e9edf3');ctx.fill();
    const step=Math.max(.5,Math.ceil(Math.max(max[0]-min[0],max[1]-min[1])/10)*.5);
    for(let x=Math.ceil(min[0]/step)*step;x<=max[0];x+=step)line([project([x,min[1],0]),project([x,max[1],0])],'#d2dae5');
    for(let y=Math.ceil(min[1]/step)*step;y<=max[1];y+=step)line([project([min[0],y,0]),project([max[0],y,0])],'#d2dae5');
    line(data.healthy.map(s=>project(s.slice(1,4))),'#c5dfd5',1,[3,4]);line(selected.samples.map(s=>project(s.slice(1,4))),'#eed0d2',1,[3,4]);
    route(data.healthy,time,green,2.8);route(selected.samples,time,red,2.8);
    const hp=h.slice(1,4),fp=f.slice(1,4),command=reference(time).slice(1,4);
    line([project([hp[0],hp[1],0]),project(hp)],green,1,[2,3]);line([project([fp[0],fp[1],0]),project(fp)],red,1,[2,3]);
    cube(hp,h.slice(4,8),green,project);cube(fp,f.slice(4,8),red,project);fanDisks(hp,h.slice(4,8),h.slice(8,22),project);fanDisks(fp,f.slice(4,8),f.slice(8,22),project);dotMark(project(hp),green);dotMark(project(fp),red);
    line(data.referenceSamples.map(r=>project(r.slice(1,4))),gold,1,[5,4]);dotMark(project(command),gold,6);leader(command,data.positionControlled?'CURRENT COMMAND':'COAST REFERENCE',[30,-55],gold);
    dotMark(project([0,0,0]),purple,6);leader([0,0,0],'FLOOR TAG / z=0',[-45,35],purple);
    dotMark(project(data.initialPositionM),'#5e6c80',3);leader(data.initialPositionM,'START',[-30,-55],'#5e6c80');
    leader(hp,'MUJOCO',[-35,-22],green);leader(fp,'SIMSCAPE',[35,28],red);

    if(data.usesIR){const beacon=reference(time).slice(5,8);dotMark(project(beacon),orange,5);leader(beacon,'IR TARGET',[15,-20],orange);}
    ctx.restore();
    text('Same initial state, target and physical parameters.',box[0]+12,box[1]+box[3]-12,'#55667d',13);
  }
  function cameraProjection(sample,point,type){
    const R=rotation(sample.slice(4,8)),pos=sample.slice(1,4);
    const mount=type==='tag'?[.04875,0,-.09275]:[.09125,0,.06975];
    const axes=type==='tag'?[[0,1,0],[1,0,0],[0,0,-1]]:[[0,0,1],[1,0,0],[0,1,0]];
    const v=transposeMul(axes,sub(transposeMul(R,sub(point,pos)),mount));
    const uv=[Math.atan2(v[0],v[2])*180/Math.PI,Math.atan2(v[1],v[2])*180/Math.PI];
    return {uv,inside:v[2]>0&&Math.abs(uv[0])<=44.3485&&Math.abs(uv[1])<=33.5};
  }
  function drawCamera(type,h,f){
    const box=regions[type];panel(box,type==='tag'?'BOTTOM TAG camera / −Z':'FORWARD IR / reference only (+X)');const[x,y,w,hg]=box;
    line([[x+w/2,y],[x+w/2,y+hg]],'#d5dce7',1,[3,3]);line([[x,y+hg/2],[x+w,y+hg/2]],'#d5dce7',1,[3,3]);
    const target=type==='tag'?[0,0,0]:reference(time).slice(5,8);
    const projected=[cameraProjection(h,target,type),cameraProjection(f,target,type)];
    projected.forEach((r,i)=>{if(!r.inside)return;const px=x+w/2+r.uv[0]*Math.min(w/88.697,hg/67),py=y+hg/2+r.uv[1]*Math.min(w/88.697,hg/67);dotMark([px,py],i===0?green:red,i===0?6:3);});
    text(`M: ${projected[0].inside?'in FOV':'outside'}  S: ${projected[1].inside?'in FOV':'outside'}`,x+8,y+hg-10,'#56647b',12);
  }
  function drawBody(h,f){
    const box=regions.body;panel(box,'14 fan indicators / actual applied thrust');const[x,y,w,hg]=box;
    [h,f].forEach((s,i)=>{const center=x+w*(i===0?.25:.75),local=p=>{const v=planar(p);return [center+v[0]*480,y+hg/2-v[1]*480];};cube([0,0,0],s.slice(4,8),i===0?green:red,local);fanDisks([0,0,0],s.slice(4,8),s.slice(8,22),local,true);text(i===0?'MUJOCO':'SIMSCAPE',center,y+hg-8,i===0?green:red,12,'center');});
  }
  function plot(box,title,index,limit){
    panel(box,title);const[x,y,w,hg]=box,pad={l:48,r:12,t:18,b:32};
    const windowEnd=document.getElementById('plot-window').value==='early'?2:duration;
    const aa=selected.baselinePlot.filter(s=>s[0]<=windowEnd),bb=selected.revisedPlot.filter(s=>s[0]<=windowEnd);
    const max=Math.max(.0001,limit||0,...aa.map(s=>s[index]),...bb.map(s=>s[index]))*1.12;
    const pr=s=>[x+pad.l+s[0]/windowEnd*(w-pad.l-pad.r),y+hg-pad.b-s[index]/max*(hg-pad.t-pad.b)];
    for(let i=0;i<=4;i++){const yy=y+hg-pad.b-i/4*(hg-pad.t-pad.b);line([[x+pad.l,yy],[x+w-pad.r,yy]],'#e5eaf1');text((max*i/4).toPrecision(2),x+pad.l-5,yy+4,'#68768b',11,'right');}
    if(limit!==null){const marker=Array(6).fill(limit);marker[0]=0;const lim=pr(marker)[1];line([[x+pad.l,lim],[x+w-pad.r,lim]],gold,1,[5,4]);text('gate '+limit,x+w-16,lim-5,gold,10,'right');}
    line(aa.map(pr),green,2);line(bb.map(pr),red,2);const xx=x+pad.l+Math.min(time,windowEnd)/windowEnd*(w-pad.l-pad.r);line([[xx,y+pad.t],[xx,y+hg-pad.b]],'#35475f',1,[3,3]);
    for(let i=0;i<=4;i++)text((i*windowEnd/4).toFixed(windowEnd===2?1:0),x+pad.l+i/4*(w-pad.l-pad.r),y+hg-10,'#68768b',11,'center');
  }
  function drawFans(h,f){
    const box=regions.fans;panel(box,'Actual thrust (N): MuJoCo outline / Simscape solid');const[x,y,w,hg]=box,base=y+hg-30,height=hg-50,left=x+35,bar=(w-45)/14;
    line([[left,y+20],[left,base],[x+w-5,base]],'#bfcbd9');
    for(let j=0;j<14;j++){const xx=left+j*bar;ctx.strokeStyle=thrustColor(h[8+j]);ctx.strokeRect(xx,base-h[8+j]/.3*height,bar*.35,h[8+j]/.3*height);ctx.fillStyle=thrustColor(f[8+j]);ctx.fillRect(xx+bar*.4,base-f[8+j]/.3*height,bar*.35,f[8+j]/.3*height);text(String(j),xx+bar*.35,base+18,'#59677c',11,'center');}
    text('0.3',x+5,y+24,'#68768b',11);text('0',x+20,base,'#68768b',11);
  }
  function drawThrustLegend(){
    const x=875,y=491,w=485,h=10;
    text('Fan color: actual applied thrust (N)',x,y-7,'#56647b',11);
    for(let i=0;i<100;i++){ctx.fillStyle=thrustColor(.2834*i/99);ctx.fillRect(x+i*w/100,y,w/100+.5,h);}
    [0,.07085,.1417,.21255,.2834].forEach((v,i)=>text(i===0?'0 / off':v.toFixed(4),x+i*w/4,y+h+15,'#56647b',10,i===0?'left':i===4?'right':'center'));
  }
  function draw(){
    ctx.fillStyle=ink('#f5f7fb');ctx.fillRect(0,0,canvas.width,canvas.height);text(selected.title,25,27,'#22354f',21);
    const h=sample(data.healthy,time),f=sample(selected.samples,time);
    drawWorld(h,f);drawCamera('tag',h,f);drawBody(h,f);
    const[x,y]=regions.stats;text(`Time ${time.toFixed(2)} / ${duration.toFixed(0)} s`,x,y+22,'#22354f',16);
    text(`MuJoCo error: ${distance(h[22])}`,x,y+57,green,12);text(`Simscape error: ${distance(f[22])}`,x,y+84,red,12);
    text(`Rate M ${h[24].toFixed(3)} rad/s`,x,y+122,green,12);text(`Rate S ${f[24].toFixed(3)} rad/s`,x,y+146,red,12);
    text(`Upright error ${f[23].toFixed(2)}°`,x,y+177,'#56647b',12);
    if(document.getElementById('plot-mode').value==='engine'){
      plot(regions.pos,'Engine position difference (mm)',4,5);plot(regions.att,'Engine attitude difference (deg)',5,.5);
    }else{
      plot(regions.pos,'Position error from target (m)',1,null);plot(regions.att,'Body rate norm (rad/s)',2,null);
    }
    drawFans(h,f);drawThrustLegend();
    text(selected.kind==='simscape'?'Same MPC · independent state feedback in both engines · 10 Hz control · truth state':'Applied-input replay · Simscape feedback bypassed · same recorded fan commands',30,810,'#4f6178',14);
    text('Recorded simulation results. 20 Hz pose/fan display; error plots and reported maxima use 100 Hz logs.',30,835,'#67778d',13);
    ui.time.value=time;ui.clock.textContent=`${time.toFixed(2)} / ${duration.toFixed(2)} s`;
  }
  function choose(){
    selected=data.cases.find(c=>c.id===ui.fault.value)||data.cases[4];duration=selected.durationS;data.durationS=duration;
    data.healthy=selected.baselineSamples;data.initialPositionM=selected.initialPositionM;data.commandPositionM=selected.goal;
    data.referenceSamples=selected.samples.map(s=>[s[0],...selected.goal,0,0,0,0]);
    time=0;playing=false;lastStamp=null;ui.play.textContent='Play';ui.time.max=duration;setProjection();
    referenceDescription.textContent=`Start (${selected.initialPositionM.join(', ')}) m; target (${selected.goal.join(', ')}) m, identity attitude. Same 2.7 kg vehicle, initial pose/velocity/body rate and fan limits in both runs. Truth-state controller check; no EKF or faults.`;
    ui.description.textContent=selected.description;const m=selected.metrics;
    ui['final-error'].textContent=`${(1000*m.maxPositionDifferenceM).toFixed(3)} mm`;
    ui['max-delta'].textContent=`${m.maxAttitudeDifferenceDeg.toFixed(4)}°`;
    ui.attitude.textContent=`${(1000*m.tailPositionM).toFixed(3)} mm`;
    ui.saturation.textContent=m.engineGatePass?'PASS':'FAIL';ui.saturation.style.color=m.engineGatePass?'#16845e':'#c63f45';
    ui.outcome.textContent=(m.engineGatePass?'PASS':'FAIL')+`: engine gate is max position difference ≤5 mm and attitude difference ≤0.5° over the whole run. `+(selected.kind==='simscape'?'Same MPC in both engines; '+m.solverFallbackCount+' solver fallbacks. This is engine agreement, not flight acceptance.':m.engineGatePass?'XML-geometry applied-input comparison passes.':'XML-geometry replay fails. The authoritative Simscape brief rounds XML fan points by up to 40 µm per coordinate; numerical integration also contributes. These failures stay on record. See the geometry diagnostic below.');
    draw();
  }
  ui.fault.onchange=choose;ui.play.onclick=()=>{playing=!playing;if(playing&&time>=duration)time=0;ui.play.textContent=playing?'Pause':'Play';lastStamp=null;};ui.reset.onclick=()=>{time=0;playing=false;ui.play.textContent='Play';draw();};ui.time.oninput=()=>{playing=false;ui.play.textContent='Play';time=Number(ui.time.value);draw();};
  document.getElementById('plot-window').onchange=draw;document.getElementById('plot-mode').onchange=draw;
  document.getElementById('early').onclick=()=>{document.getElementById('plot-window').value='early';time=.5;playing=false;ui.play.textContent='Play';draw();};
  document.getElementById('tail').onclick=()=>{document.getElementById('plot-window').value='full';time=duration-2;playing=false;ui.play.textContent='Play';draw();};
  function animate(stamp){if(playing){if(lastStamp!==null)time=Math.min(duration,time+Math.min(.1,(stamp-lastStamp)/1000)*Number(ui.speed.value));if(time>=duration){playing=false;ui.play.textContent='Play';}draw();}lastStamp=stamp;requestAnimationFrame(animate);}
  if(typeof MutationObserver!=='undefined')new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  ui.fault.value='compound_tumble_simscape';choose();requestAnimationFrame(animate);
})();
