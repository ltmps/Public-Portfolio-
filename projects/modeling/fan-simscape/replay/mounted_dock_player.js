/* Recorded articulated replay: map video frames to simulation time. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else api.mount(root.document);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function validate(clock){
    if(!(clock.fps>0)||!Array.isArray(clock.sourceTimes)||!clock.sourceTimes.length||
       !Array.isArray(clock.frameRates)||clock.frameRates.length!==clock.sourceTimes.length||
       clock.sourceTimes.some((t,i)=>!Number.isFinite(t)||(i&&t<clock.sourceTimes[i-1]))||
       clock.frameRates.some(r=>!Number.isFinite(r)||r<0))throw new Error('Invalid source clock');
    return clock;
  }
  function readout(clock,time,playbackRate,paused){
    const i=Math.min(clock.sourceTimes.length-1,Math.max(0,Math.floor(time*clock.fps)));
    return {time:clock.sourceTimes[i],speed:paused?0:clock.frameRates[i]*playbackRate};
  }
  function mount(doc){
    for(const panel of doc.querySelectorAll('[data-mounted-player]')){
      const video=panel.querySelector('video'),select=panel.querySelector('[data-mounted-rate]');
      const output=panel.querySelector('[data-mounted-clock]');let clock;
      function update(){if(!clock)return;const s=readout(clock,video.currentTime,video.playbackRate,video.paused||video.ended);
        output.textContent=`${video.paused?'Paused · ':''}t ${s.time.toFixed(1)} s · simulation ${Number(s.speed.toFixed(2))}×`;}
      fetch(panel.dataset.clockUrl).then(r=>{if(!r.ok)throw new Error('Missing clock');return r.json();})
        .then(value=>{clock=validate(value);update();}).catch(()=>{output.textContent='Simulation clock unavailable';});
      select.addEventListener('change',()=>{video.playbackRate=Number(select.value);update();});
      for(const event of ['play','pause','ended','timeupdate','seeked','ratechange','loadedmetadata'])video.addEventListener(event,update);
    }
  }
  return {validate,readout,mount};
});
