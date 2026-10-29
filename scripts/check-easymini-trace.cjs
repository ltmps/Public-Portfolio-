const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/data/singularity/easymini-trace.json')));
for(const s of data.series){
  let previous=-Infinity;
  for(const a of s.anchors){assert(a.t>previous);previous=a.t;assert(Number.isFinite(a.value));assert(Math.abs(a.t-(a.pixel[0]-159)/(1040/30))<0.0001);assert(Math.abs(a.value-(s.zero-a.pixel[1])*s.scale)<0.001);}
}
// Independent readings of clear landmarks from the supplied image, allowing visual uncertainty.
assert(Math.abs(Math.max(...data.series[0].anchors.map(p=>p.value))-5860)<30);
assert(Math.abs(Math.max(...data.series[1].anchors.map(p=>p.value))-930)<15);
assert(Math.abs(Math.max(...data.series[2].anchors.map(p=>p.value))-450)<10);
assert(Math.abs(Math.min(...data.series[2].anchors.map(p=>p.value))+280)<10);
const csv=fs.readFileSync(path.join(root,'assets/data/singularity/easymini-digitized.csv'),'utf8').trim().split('\n');assert.equal(csv.length,132);
function element(){return {hidden:true,value:'2',textContent:'',attrs:{},events:{},children:[],setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(k,f){this.events[k]=f;},append(e){this.children.push(e);}};}
async function run(reduced,fail){
  const elements={};for(const key of ['.em-controls','[data-em-play]','[data-em-reset]','input[type="range"]','select','.em-time','.em-readings','#em-reveal rect','.em-cursor'])elements[key]=element();
  const line=element();elements['.em-cursor'].querySelector=()=>line;
  let next,requests=0;const media={matches:reduced,addEventListener(){}};
  const doc={currentScript:{src:'https://example.test/Public-Portfolio-/assets/js/easymini-trace.js'},hidden:false,querySelector:()=>({querySelector:k=>elements[k]}),createElement:element,addEventListener(){}};
  const ctx={document:doc,URL,fetch:async()=>({ok:!fail,json:async()=>data}),matchMedia:()=>media,requestAnimationFrame:f=>{next=f;requests++;return requests;},cancelAnimationFrame:()=>{next=null;}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/easymini-trace.js'),'utf8'),ctx);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests,0,'No autoplay');
  if(fail){assert.equal(elements['.em-controls'].hidden,true);return;}
  assert.equal(elements['[data-em-play]'].hidden,reduced);
  assert.equal(elements['.em-time'].textContent,'32.5 s');
  elements['[data-em-reset]'].events.click();assert.equal(elements['.em-time'].textContent,'0.0 s');
  elements['input[type="range"]'].value='10';elements['input[type="range"]'].events.input();assert.equal(elements['.em-time'].textContent,'10.0 s');
  elements['[data-em-play]'].events.click();next(1000);next(2000);assert.equal(elements['.em-time'].textContent,'12.0 s');
  elements['[data-em-play]'].events.click();assert.equal(next,null,'Pause cancels playback');
  elements['[data-em-play]'].events.click();next(3000);next(30000);assert.equal(elements['.em-time'].textContent,'32.5 s');assert.equal(elements['[data-em-play]'].textContent,'Play trace');
}
(async()=>{await run(false,false);await run(true,false);await run(false,true);console.log('PASS: calibrated finite trace anchors, CSV extent, manual playback, pause, reset, scrubbing, endpoint, reduced-motion UI and fetch-failure fallback.');})();
