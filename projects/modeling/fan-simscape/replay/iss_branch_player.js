/* Speed/source-clock controls for the fixed-rate diagnostic movie. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else api.mount(root.document);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function readout(video,rate,duration){
    const time=Math.min(duration,Math.max(0,video.currentTime*rate));
    const speed=video.paused||video.ended||time>=duration?0:rate*video.playbackRate;
    return {time,speed};
  }
  function mount(doc){
    const panels=doc.querySelectorAll?doc.querySelectorAll('[data-branch-player]'):[doc.querySelector('[data-branch-player]')];
    for(const panel of panels){if(!panel)continue;
    const video=panel.querySelector('video');
    const select=panel.querySelector('[data-branch-rate]');
    const speed=panel.querySelector('[data-branch-speed]');
    const clock=panel.querySelector('[data-branch-clock]');
    const rate=Number(panel.dataset.sourceRate),duration=Number(panel.dataset.sourceDuration);
    function update(){
      const state=readout(video,rate,duration);
      speed.textContent=`${video.paused?'Paused · ':''}video ${video.playbackRate}× · simulation ${state.speed.toFixed(1)}×`;
      clock.textContent=`Simulation ${state.time.toFixed(1)} s`;
    }
    select.addEventListener('change',()=>{video.playbackRate=Number(select.value);update();});
    for(const event of ['play','pause','ended','ratechange','timeupdate','seeked','loadedmetadata'])video.addEventListener(event,update);
    update();
    }
  }
  return {readout,mount};
});
