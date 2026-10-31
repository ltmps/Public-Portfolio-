const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const folder=path.resolve(__dirname,'../projects/modeling/fan-simscape/replay');
let frames=[],texts=[],dark=false;
const ctx={};for(const n of ['beginPath','moveTo','lineTo','stroke','setLineDash','arc','fillRect','strokeRect','save','clip','restore','closePath','fill','rect'])ctx[n]=(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),`${n}: nonfinite canvas geometry`);};
ctx.fillText=(s,x,y)=>{assert(Number.isFinite(x)&&Number.isFinite(y));texts.push(s);};
const ids=['fault','play','reset','speed','time','clock','description','final-error','max-delta','attitude','saturation','outcome','error-mode','reference-description','camera-scope','plot-window','early','tail'];
const elements=Object.fromEntries(ids.map(id=>[id,{value:'',textContent:'',appendChild(){}}]));elements.speed.value='4';elements['plot-window'].value='full';elements.view={width:1400,height:850,getContext:()=>ctx};
const box={window:{},document:{documentElement:{getAttribute:()=>dark?'dark':null},getElementById:id=>elements[id],createElement:()=>({})},requestAnimationFrame:f=>frames.push(f)};
vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(folder,'supervisor_review_data.js'),'utf8'),box);vm.runInContext(fs.readFileSync(path.join(folder,'supervisor_review_viewer.js'),'utf8'),box);
const data=box.window.ORBES_SUPERVISOR_REVIEW;assert.equal(data.cases.length,3);assert.equal(data.usesIR,false);assert.equal(data.sampleIntervalS,.05);
for(const c of data.cases){
  elements.fault.value=c.id;elements.fault.onchange();assert(elements['reference-description'].textContent.includes(`GNC ${c.mode}`));assert.equal(elements.saturation.textContent,'FAIL / FAIL');
  assert.equal(c.baselineSamples.length,1201);assert.equal(c.samples.length,1201);assert.equal(c.baselinePlot.length,6001);assert.equal(c.revisedPlot.length,6001);
  assert(c.baselineSamples.every(s=>s[20]===0)&&c.samples.every(s=>s[20]===0),'m12 applied thrust must remain zero');
  assert(Math.abs(Math.max(...c.revisedPlot.map(s=>s[2]))-c.revised.peakRateAllRadS)<1e-8,'100 Hz rate plot must retain true peak');
  if(c.unchangedControl)assert.equal(c.maximumPositionDeltaM,0);
  for(const theme of [false,true])for(const window of ['full','early']){
    dark=theme;elements['plot-window'].value=window;elements['plot-window'].onchange();
    for(const t of [0,.02,.48,.52,30,58,60]){elements.time.value=String(t);elements.time.oninput();assert.equal(elements.clock.textContent,`${t.toFixed(2)} / 60.00 s`);}
  }
  elements.early.onclick();assert.equal(elements.clock.textContent,'0.50 / 60.00 s');assert.equal(elements['plot-window'].value,'early');
  elements.tail.onclick();assert.equal(elements.clock.textContent,'58.00 / 60.00 s');assert.equal(elements['plot-window'].value,'full');
  elements.time.value='59.9';elements.time.oninput();elements.play.onclick();frames.shift()(0);frames.shift()(100);assert.equal(elements.play.textContent,'Play');assert.equal(elements.clock.textContent,'60.00 / 60.00 s');elements.reset.onclick();assert.equal(elements.clock.textContent,'0.00 / 60.00 s');
}
for(let i=0;i<14;i++)assert(texts.includes(`m${i}`));assert(!texts.some(s=>s==='HEALTHY'||s==='FAULT'));assert(texts.some(s=>s.includes('B:')&&s.includes('R:')));
assert(data.cases[2].revised.positionMarginM>.025);assert(data.cases[2].revised.peakRateAllRadS>1);
const html=fs.readFileSync(path.join(folder,'supervisor_review.html'),'utf8');assert(html.includes('supervisor_review_data.js'));assert(html.includes('supervisor_review_viewer.js'));assert(!html.includes('src="comparison_viewer.js'));
console.log('PASS: three paired schedule replays, matched faulty plant/interface, 100 Hz peaks, 14 fan indicators, early/tail seeking, both themes, finite drawing, exact endpoint and reset. Mock-canvas checks are not browser visual QA.');
