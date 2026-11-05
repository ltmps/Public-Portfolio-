// Validate genuine logged horizons and the player's seek/rate/pause behavior.
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'assets/media/modeling/fan-simscape/iss-chase/planning');
const data=JSON.parse(fs.readFileSync(path.join(dir,'plans.json'),'utf8'));
const evidence=JSON.parse(fs.readFileSync(path.join(dir,'evidence.json'),'utf8'));
const api=require('../projects/modeling/fan-simscape/replay/iss_planning.js');
assert.equal(data.frames,7200);assert.equal(data.horizon,2);assert.equal(data.points,21);assert.equal(data.duration,480);
for(let i=0;i<data.frames;i++){
  assert.equal(data.prediction[i].length,21);assert.equal(data.reference[i].length,21);
  assert(data.planTime[i]<=data.sourceTime[i]+1e-6,'No future executed plan may leak into current frame');
  assert(data.prediction[i].flat().every(Number.isFinite));
  assert(data.facing[i].every(Number.isFinite));
  assert(Math.abs(Math.hypot(...data.facing[i])-1)<2e-7);
  if(i)assert(data.sourceTime[i]>data.sourceTime[i-1]);
  assert(api.timelineSpeed(i,data)>0);
  for(const [ax,ay] of [[0,1],[0,2],[1,2]]){
    const b=api.viewBounds(data.prediction[i],data.targetPrediction[i],ax,ay,'context');
    for(const point of data.prediction[i].concat(data.targetPrediction[i])){
      assert(Math.abs(point[ax]-b.center[0])<=.9375*b.span,'Context must include both future paths horizontally');
      assert(Math.abs(point[ay]-b.center[1])<=.5*b.span,'Context must include both future paths vertically');
    }
  }
}
assert.equal(data.sourceTime.at(-1),9883.6);
assert.equal(api.frameAt(0,data),0);assert.equal(api.frameAt(240,data),3600);
assert.equal(api.frameAt(480,data),7199);assert.equal(api.frameAt(-5,data),0);
const movie=fs.readFileSync(path.join(dir,'station_planning_tour.mp4'));
assert.equal(crypto.createHash('sha256').update(movie).digest('hex'),evidence.movieSha256);
assert(movie.length<100*1024*1024,'Video must fit ordinary GitHub hosting limits');
function node(extra={}){return Object.assign({events:{},textContent:'',value:'',attrs:{},
  addEventListener(k,f){this.events[k]=f;},setAttribute(k,v){this.attrs[k]=v;},fire(k){this.events[k]?.();}},extra);}
const video=node({paused:true,ended:false,currentTime:0,playbackRate:1});
const ctx=new Proxy({}, {get(o,k){return o[k]??(()=>{});}});
const nodes={'planning-rate':node({value:'1'}),'planning-plane':node({value:'XY'}),
 'planning-fit':node({value:'context'}),
 'planning-future':node({getContext:()=>ctx}),'planning-speed':node(),'planning-clock':node(),'planning-map-readout':node()};
const player=node({dataset:{plans:'plans.json'},querySelector:()=>video});
const document={querySelector:()=>player,getElementById:k=>nodes[k]};
global.fetch=async()=>({ok:true,json:async()=>data});
global.requestAnimationFrame=()=>1;
async function run(){
  api.mount(document);await new Promise(resolve=>setImmediate(resolve));
  assert(nodes['planning-speed'].textContent.includes('Paused'));
  assert(nodes['planning-speed'].textContent.includes('simulation 0.0×'));
  video.currentTime=240;video.fire('seeked');
  assert(nodes['planning-clock'].textContent.includes(data.sourceTime[3600].toFixed(1)));
  nodes['planning-rate'].value='2';nodes['planning-rate'].fire('change');assert.equal(video.playbackRate,2);
  video.paused=false;video.fire('play');
  assert(nodes['planning-speed'].textContent.includes((2*api.timelineSpeed(3600,data)).toFixed(1)+'×'));
  nodes['planning-plane'].value='XZ';nodes['planning-plane'].fire('change');
  assert(nodes['planning-future'].attrs['aria-label'].startsWith('XZ'));
  nodes['planning-fit'].value='plan';nodes['planning-fit'].fire('change');
  nodes['planning-fit'].value='context';nodes['planning-fit'].fire('change');
  video.currentTime=480;video.fire('seeked');assert(nodes['planning-clock'].textContent.includes('9883.6'));
  video.paused=true;video.fire('pause');assert(nodes['planning-speed'].textContent.includes('simulation 0.0×'));
  console.log('PASS: 7200 causal horizons, context contains both paths in all three planes, exact movie hash, source clocks, seeking, rate/pause and view controls.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
