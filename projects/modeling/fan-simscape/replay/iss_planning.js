/* The player shows recorded plans only: it never extrapolates executed poses. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.mount(root.document);
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function frameAt(time,data){return Math.min(data.frames-1,Math.max(0,Math.floor(time*data.fps+1e-5)));}
  function timelineSpeed(i,data){
    const a=Math.max(0,i-1),b=Math.min(data.frames-1,i+1);
    return (data.sourceTime[b]-data.sourceTime[a])/((b-a)/data.fps);
  }
  function mount(doc){
    const root=doc.querySelector('[data-planning-player]');if(!root)return;
    const video=root.querySelector('video'),rate=doc.getElementById('planning-rate');
    const plane=doc.getElementById('planning-plane'),canvas=doc.getElementById('planning-future');
    const speed=doc.getElementById('planning-speed'),clock=doc.getElementById('planning-clock');
    const readout=doc.getElementById('planning-map-readout');
    let data=null,raf=null;
    const axes={XY:[0,1],XZ:[0,2],YZ:[1,2]};
    function draw(i){
      const [ax,ay]=axes[plane.value],points=data.prediction[i],ref=data.reference[i];
      const w=720,h=420,c=canvas.getContext('2d');
      c.clearRect(0,0,w,h);c.fillStyle='#101a25';c.fillRect(0,0,w,h);
      const xs=points.map(p=>p[ax]),ys=points.map(p=>p[ay]);
      const lo=[Math.min(...xs),Math.min(...ys)],hi=[Math.max(...xs),Math.max(...ys)];
      const center=[(lo[0]+hi[0])/2,(lo[1]+hi[1])/2];
      const span=Math.max(.06,(hi[0]-lo[0])*1.45,(hi[1]-lo[1])*1.45);
      const box={x:80,y:32,w:600,h:320};const scale=Math.min(box.w,box.h)/span;
      const project=p=>[box.x+box.w/2+(p[ax]-center[0])*scale,box.y+box.h/2-(p[ay]-center[1])*scale];
      c.font='13px system-ui';c.textAlign='center';c.lineWidth=1;
      for(let k=0;k<=4;k++){
        let x=box.x+k*box.w/4,y=box.y+k*box.h/4;
        c.strokeStyle='#2e4157';c.beginPath();c.moveTo(x,box.y);c.lineTo(x,box.y+box.h);c.stroke();
        c.beginPath();c.moveTo(box.x,y);c.lineTo(box.x+box.w,y);c.stroke();
        c.fillStyle='#aabbd0';c.fillText((center[0]+(x-box.x-box.w/2)/scale).toFixed(2),x,box.y+box.h+24);
        c.textAlign='right';c.fillText((center[1]-(y-box.y-box.h/2)/scale).toFixed(2),box.x-10,y+4);c.textAlign='center';
      }
      c.fillStyle='#ecf3fa';c.font='15px system-ui';
      c.fillText(plane.value[0]+' (m)',box.x+box.w/2,h-12);
      c.save();c.translate(17,box.y+box.h/2);c.rotate(-Math.PI/2);c.fillText(plane.value[1]+' (m)',0,0);c.restore();
      c.fillStyle='#aabbd0';c.textAlign='left';c.font='13px system-ui';
      c.fillText('Equal metre scale · automatic magnification',box.x,19);
      c.save();c.beginPath();c.rect(box.x,box.y,box.w,box.h);c.clip();
      function path(values,color,dash,width){
        c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.beginPath();
        values.forEach((p,k)=>{const [x,y]=project(p);k?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();c.setLineDash([]);
      }
      path(ref,'#ecf3fa',[7,6],2);path(data.targetPrediction[i],'#ffbe72',[4,5],2);path(points,'#57dfdb',[],4);
      for(const k of [0,5,10,15,20]){
        const [x,y]=project(points[k]);c.fillStyle='#57dfdb';c.beginPath();c.arc(x,y,k===0?6:3,0,Math.PI*2);c.fill();
      }
      const origin=project(points[0]),last=project(points[20]);
      c.font='bold 14px system-ui';c.fillStyle='#ecf3fa';c.fillText('NOW',origin[0]+9,origin[1]+21);
      c.fillStyle='#57dfdb';c.fillText('+2.0 s',last[0]+9,last[1]-12);
      const facing=data.facing[i],delta=[facing[ax]*48,-facing[ay]*48];
      const end=[origin[0]+delta[0],origin[1]+delta[1]],length=Math.hypot(...delta);
      c.strokeStyle='#c1ff55';c.fillStyle='#c1ff55';c.lineWidth=3;
      if(length>5){
        c.beginPath();c.moveTo(...origin);c.lineTo(...end);c.stroke();
        const angle=Math.atan2(delta[1],delta[0]);c.beginPath();c.moveTo(...end);
        c.lineTo(end[0]-10*Math.cos(angle-.45),end[1]-10*Math.sin(angle-.45));
        c.lineTo(end[0]-10*Math.cos(angle+.45),end[1]-10*Math.sin(angle+.45));c.closePath();c.fill();
      }else{c.beginPath();c.arc(...origin,9,0,Math.PI*2);c.stroke();}
      c.restore();
      let distance=0;for(let k=1;k<points.length;k++)distance+=Math.hypot(...points[k].map((v,j)=>v-points[k-1][j]));
      readout.textContent='Full 2.0 s prediction · '+(distance*100).toFixed(1)+' cm planned 3D travel · plan at '+data.planTime[i].toFixed(1)+' simulated s';
      canvas.setAttribute('aria-label',plane.value+' equal-scale magnified view of the actual two-second MPC plan at '+data.planTime[i].toFixed(1)+' simulated seconds');
    }
    function update(){
      if(!data)return;
      const i=frameAt(video.currentTime,data),base=timelineSpeed(i,data),effective=video.paused?0:base*video.playbackRate;
      speed.textContent=(video.paused?'Paused':'Playing')+' · video '+video.playbackRate+'× · simulation '+effective.toFixed(1)+'× real time';
      clock.textContent='Simulation '+data.sourceTime[i].toFixed(1)+' s · timeline '+base.toFixed(1)+' sim s/video s';
      rate.value=String(video.playbackRate);draw(i);
    }
    function tick(){update();if(!video.paused&&!video.ended)raf=requestAnimationFrame(tick);else raf=null;}
    rate.addEventListener('change',()=>{video.playbackRate=Number(rate.value);update();});
    plane.addEventListener('change',update);
    for(const event of ['timeupdate','seeking','seeked','loadedmetadata','pause','ratechange','ended'])video.addEventListener(event,update);
    video.addEventListener('play',()=>{if(raf===null)tick();});
    fetch(root.dataset.plans).then(r=>{if(!r.ok)throw Error('Recorded plans unavailable');return r.json();}).then(value=>{
      if(value.frames!==7200||value.horizon!==2||value.points!==21)throw Error('Unexpected prediction metadata');
      data=value;update();
    }).catch(()=>{readout.textContent='Prediction data unavailable. The video still shows the logged 3D prediction and XZ inset.';});
  }
  return {frameAt,timelineSpeed,mount};
});
