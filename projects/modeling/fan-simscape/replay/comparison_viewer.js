/* Saved Simscape data only. No physics or controller is simulated here. */
(() => {
  'use strict';
  const data = window.ORBES_COMPARISON;
  const canvas = document.getElementById('view'), ctx = canvas.getContext('2d');
  const ui = Object.fromEntries(['fault','play','reset','speed','time','clock','description','final-error','max-delta','attitude','saturation','outcome','pose-csv','actuation-csv','error-mode'].map(id => [id, document.getElementById(id)]));
  const green = '#16845e', red = '#c63f45', gold = '#ac790a', purple = '#7f39a7', orange = '#ca560f';
  const regions = {world:[25,65,780,405],tag:[850,70,245,175],ir:[1125,70,245,175],body:[850,290,245,175],stats:[1125,275,245,195],pos:[30,550,420,215],att:[480,550,345,215],fans:[875,550,485,215]};
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
    const i=clamp(Math.floor(t/data.sampleIntervalS),0,rows.length-2), a=clamp((t-rows[i][0])/data.sampleIntervalS,0,1);
    return rows[i].map((v,j)=>v+a*(rows[i+1][j]-v));
  }
  function text(s,x,y,color='#25364d',size=14,align='left') {ctx.fillStyle=color;ctx.font=`${size}px system-ui`;ctx.textAlign=align;ctx.fillText(s,x,y);}
  function line(points,color,width=1,dash=[]) {if(!points.length)return;ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(p=>ctx.lineTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
  function dotMark(p,color,r=4){ctx.beginPath();ctx.arc(p[0],p[1],r,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();}
  function panel(box,title){const[x,y,w,h]=box;ctx.fillStyle='white';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#dce3ed';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);text(title,x,y-14,'#22354f',15);}
  const az=35*Math.PI/180, el=28*Math.PI/180;
  const right=[Math.cos(az),-Math.sin(az),0], up=[-Math.sin(az)*Math.sin(el),-Math.cos(az)*Math.sin(el),Math.cos(el)];
  const planar=p=>[dot(p,right),dot(p,up)];
  let bounds;
  function setProjection(){
    const points=[...data.healthy,...selected.samples].map(s=>s.slice(1,4));
    points.push([0,0,0],[0,0,1],[1.8,0,1],[-1.1,1.8,1]);
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
  function leader(p,label,offset,color){const a=project(p),b=[a[0]+offset[0],a[1]+offset[1]];line([a,b],color,1,[3,3]);text(label,b[0]+(offset[0]<0?-4:4),b[1],color,13,offset[0]<0?'right':'left');}
  function route(rows,t,color,width){const pts=rows.filter(s=>s[0]<=t).map(s=>project(s.slice(1,4)));line(pts,color,width);}
  function drawWorld(h,f){
    const box=regions.world;panel(box,'Same maneuver: healthy versus fault');ctx.save();ctx.beginPath();ctx.rect(...box);ctx.clip();
    const {min,max}=bounds;const floor=[[min[0],min[1],0],[max[0],min[1],0],[max[0],max[1],0],[min[0],max[1],0]].map(project);
    ctx.beginPath();ctx.moveTo(...floor[0]);floor.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.fillStyle='#e9edf3';ctx.fill();
    const step=Math.max(.5,Math.ceil(Math.max(max[0]-min[0],max[1]-min[1])/10)*.5);
    for(let x=Math.ceil(min[0]/step)*step;x<=max[0];x+=step)line([project([x,min[1],0]),project([x,max[1],0])],'#d2dae5');
    for(let y=Math.ceil(min[1]/step)*step;y<=max[1];y+=step)line([project([min[0],y,0]),project([max[0],y,0])],'#d2dae5');
    line(data.healthy.map(s=>project(s.slice(1,4))),'#c5dfd5',1,[3,4]);line(selected.samples.map(s=>project(s.slice(1,4))),'#eed0d2',1,[3,4]);
    route(data.healthy,time,green,2.8);route(selected.samples,time,red,2.8);
    const hp=h.slice(1,4),fp=f.slice(1,4),command=data.commandPositionM;
    line([project([hp[0],hp[1],0]),project(hp)],green,1,[2,3]);line([project([fp[0],fp[1],0]),project(fp)],red,1,[2,3]);
    cube(hp,h.slice(4,8),green,project);cube(fp,f.slice(4,8),red,project);dotMark(project(hp),green);dotMark(project(fp),red);
    dotMark(project(command),gold,6);leader(command,'COMMAND (0,0,1) m',[30,-55],gold);
    dotMark(project([0,0,0]),purple,6);leader([0,0,0],'FLOOR TAG / z=0',[-45,35],purple);
    dotMark(project(data.initialPositionM),'#5e6c80',3);leader(data.initialPositionM,'START',[-30,-55],'#5e6c80');
    leader(hp,'HEALTHY',[-35,-22],green);leader(fp,'FAULT',[35,28],red);
    const beacon=[1.8*Math.cos(.1*time),1.8*Math.sin(.1*time),1];dotMark(project(beacon),orange,5);leader(beacon,'IR reference (not commanded)',[15,-15],orange);
    ctx.restore();
    text('Position command + upright attitude; each trace uses the same saved time.',box[0]+12,box[1]+box[3]-12,'#55667d',13);
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
    const target=type==='tag'?[0,0,0]:[1.8*Math.cos(.1*time),1.8*Math.sin(.1*time),1];
    const projected=[cameraProjection(h,target,type),cameraProjection(f,target,type)];
    projected.forEach((r,i)=>{if(!r.inside)return;const px=x+w/2+r.uv[0]/88.697*w,py=y+hg/2+r.uv[1]/67*hg;dotMark([px,py],i===0?green:red,i===0?6:3);});
    text(`H: ${projected[0].inside?'in FOV':'outside'}  F: ${projected[1].inside?'in FOV':'outside'}`,x+8,y+hg-10,'#56647b',12);
  }
  function drawBody(h,f){
    const box=regions.body;panel(box,'Attitude comparison / same scale');const[x,y,w,hg]=box;
    const local=p=>{const v=planar(p);return [x+w/2+v[0]*360,y+hg/2-v[1]*360];};
    cube([0,0,0],h.slice(4,8),green,local);cube([0,0,0],f.slice(4,8),red,local);
    text('Green healthy · red fault',x+12,y+hg-9,'#586a80',12);
  }
  function plot(box,title,index,h,f){
    panel(box,title);const[x,y,w,hg]=box,pad={l:38,r:12,t:15,b:30},max=Math.max(.001,...data.healthy.map(s=>s[index]),...selected.samples.map(s=>s[index]))*1.1;
    const pr=s=>[x+pad.l+s[0]/22*(w-pad.l-pad.r),y+hg-pad.b-s[index]/max*(hg-pad.t-pad.b)];
    for(let i=0;i<=4;i++){const yy=y+hg-pad.b-i/4*(hg-pad.t-pad.b);line([[x+pad.l,yy],[x+w-pad.r,yy]],'#e5eaf1');text((max*i/4).toPrecision(2),x+pad.l-5,yy+4,'#68768b',11,'right');}
    line(data.healthy.map(pr),green,2);line(selected.samples.map(pr),red,2);const xx=x+pad.l+time/22*(w-pad.l-pad.r);line([[xx,y+pad.t],[xx,y+hg-pad.b]],'#35475f',1,[3,3]);dotMark(pr(h),green,3);dotMark(pr(f),red,3);
    [0,5,10,15,20,22].forEach(t=>text(String(t),x+pad.l+t/22*(w-pad.l-pad.r),y+hg-10,'#68768b',11,'center'));
  }
  function drawFans(h,f){
    const box=regions.fans;panel(box,'Actual fan thrust (N): healthy / fault');const[x,y,w,hg]=box,base=y+hg-30,height=hg-50,left=x+35,bar=(w-45)/14;
    line([[left,y+20],[left,base],[x+w-5,base]],'#bfcbd9');
    for(let j=0;j<14;j++){const xx=left+j*bar;ctx.fillStyle=green;ctx.fillRect(xx,base-h[8+j]/.3*height,bar*.35,h[8+j]/.3*height);ctx.fillStyle=red;ctx.fillRect(xx+bar*.4,base-f[8+j]/.3*height,bar*.35,f[8+j]/.3*height);text(String(j),xx+bar*.35,base+18,'#59677c',11,'center');}
    text('0.3',x+5,y+24,'#68768b',11);text('0',x+20,base,'#68768b',11);
  }
  function draw(){
    ctx.fillStyle='#f5f7fb';ctx.fillRect(0,0,canvas.width,canvas.height);text(`GNC 1: ${selected.title} versus healthy`,25,27,'#22354f',21);
    const h=sample(data.healthy,time),f=sample(selected.samples,time);
    drawWorld(h,f);drawCamera('tag',h,f);drawCamera('ir',h,f);drawBody(h,f);
    const[x,y]=regions.stats;text(`Time ${time.toFixed(2)} / 22.00 s`,x,y+22,'#22354f',17);
    text(`Healthy position error`,x,y+56,green,13);text(`${h[22].toFixed(4)} m`,x,y+79,green,19);
    text(`Fault position error`,x,y+110,red,13);text(`${f[22].toFixed(4)} m`,x,y+133,red,19);
    text(`Fault attitude error: ${f[23].toFixed(2)}°`,x,y+162,red,13);
    if(f[3]<0)text('BELOW FLOOR REFERENCE',x,y+187,red,13);
    const delta=ui['error-mode'].value==='healthy';
    plot(regions.pos,delta?'Position difference from healthy (m)':'Position error from commanded (0,0,1) m',delta?25:22,h,f);plot(regions.att,delta?'Attitude difference from healthy (deg)':'Attitude error from identity (deg)',delta?26:23,h,f);drawFans(h,f);
    text('Same plant · same start · same controller · same command · only the selected fault changes',30,810,'#4f6178',15);
    text('Saved Simscape trajectories. Browser draws the comparison; no simulation runs here.',30,835,'#67778d',13);
    ui.time.value=time;ui.clock.textContent=`${time.toFixed(2)} / 22 s`;
  }
  function choose(){
    selected=data.faults.find(f=>f.id===ui.fault.value)||data.faults[0];time=0;playing=false;ui.play.textContent='Play';lastStamp=null;setProjection();
    ui.description.textContent=selected.description;const m=selected.metrics;
    ui['final-error'].textContent=distance(m.finalPositionErrorM);ui['max-delta'].textContent=distance(m.maxPositionDeltaVsHealthyM);ui.attitude.textContent=`${m.tailRmsAttitudeErrorDeg.toFixed(2)}°`;ui.saturation.textContent=`${(100*m.upperSaturationDuty).toFixed(1)}% of samples`;
    const outcomes={dead_m12:()=>`Healthy m12 demand reaches ${data.healthyMetrics.maxM12ThrustN.toFixed(3)} N; the fault forces it to zero. The vehicle cannot brake the downward acquisition properly and ends at z=${m.finalPositionM[2].toFixed(3)} m. It crosses the floor reference at ${m.firstBelowFloorReferenceS.toFixed(2)} s.`,stuck_m0:()=>`The same command now leaves ${m.finalPositionErrorM.toFixed(3)} m of position error and ${m.tailRmsAttitudeErrorDeg.toFixed(2)}° attitude RMS in the final 5 s.`,scale_09:()=>'The weaker fans change the acquisition transient; this ideal truth-state controller eventually acquires the same hold point.',scale_11:()=>'The stronger fans change the acquisition transient; actual thrust retains the physical ceiling and the same hold point is eventually acquired.',force_bias:()=>`The controller holds with a ${(1000*m.finalPositionErrorM).toFixed(2)} mm offset, rather than the uncorrected drift of the old attitude-only test. PD static prediction: 0.05/(2.7×0.8) ≈ 23.15 mm.`,torque_pulse:()=>`The pulse produces ${m.peakYawRateDegS.toFixed(2)}°/s peak yaw rate; nominal-relative recovery takes ${m.pulseRecoveryS.toFixed(2)} s after the pulse ends (1° attitude / 0.5°/s yaw-rate bounds held for 1 s).`};
    ui.outcome.textContent=outcomes[selected.id]();ui['pose-csv'].href=`https://raw.githubusercontent.com/ltmps/ORBES-sim/8a682f6139863bac6001f42c63a7c6322ce346d6/matlab/fan_model/gnc_faults_out/mode1_${selected.id}.csv`;ui['actuation-csv'].href=`https://raw.githubusercontent.com/ltmps/ORBES-sim/8a682f6139863bac6001f42c63a7c6322ce346d6/matlab/fan_model/gnc_faults_out/mode1_${selected.id}_actuation.csv`;draw();
  }
  ui.fault.onchange=choose;ui.play.onclick=()=>{playing=!playing;if(playing&&time>=22)time=0;ui.play.textContent=playing?'Pause':'Play';lastStamp=null;};ui.reset.onclick=()=>{time=0;playing=false;ui.play.textContent='Play';draw();};ui.time.oninput=()=>{playing=false;ui.play.textContent='Play';time=Number(ui.time.value);draw();};
  ui['error-mode'].onchange=draw;
  function animate(stamp){if(playing){if(lastStamp!==null)time=Math.min(22,time+Math.min(.1,(stamp-lastStamp)/1000)*Number(ui.speed.value));if(time>=22){playing=false;ui.play.textContent='Play';}draw();}lastStamp=stamp;requestAnimationFrame(animate);}
  ui.fault.value='dead_m12';choose();requestAnimationFrame(animate);
})();
