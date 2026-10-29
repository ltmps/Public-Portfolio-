const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const folder=path.resolve(__dirname,'../projects/modeling/fan-simscape/replay');
let frames=[],texts=[],dark=false;
const ctx={};for(const n of ['beginPath','moveTo','lineTo','stroke','setLineDash','arc','fillRect','strokeRect','save','clip','restore','closePath','fill','rect'])ctx[n]=(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),`${n}: nonfinite canvas geometry`);};
ctx.fillText=(s,x,y)=>{assert(Number.isFinite(x)&&Number.isFinite(y));texts.push(s);};
const ids=['fault','play','reset','speed','time','clock','description','final-error','max-delta','attitude','saturation','outcome','error-mode','reference-description','camera-scope','plot-window','early','tail','plot-mode'];
const elements=Object.fromEntries(ids.map(id=>[id,{value:'',textContent:'',style:{},appendChild(){}}]));elements.speed.value='4';elements['plot-mode'].value='engine';elements['plot-window'].value='full';elements.view={width:1400,height:850,getContext:()=>ctx};
const box={window:{},document:{documentElement:{getAttribute:()=>dark?'dark':null},getElementById:id=>elements[id],createElement:()=>({})},requestAnimationFrame:f=>frames.push(f)};
vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(folder,'mpc_comparison_data.js'),'utf8'),box);vm.runInContext(fs.readFileSync(path.join(folder,'mpc_comparison_viewer.js'),'utf8'),box);
const data=box.window.ORBES_MPC_COMPARISON;assert.equal(data.cases.length,6);assert.equal(data.usesIR,false);assert.equal(data.sampleIntervalS,.05);
let passes=0;
for(const c of data.cases){
  elements.fault.value=c.id;elements.fault.onchange();
  assert.equal(Number(elements.time.max),c.durationS);
  assert.equal(c.samples.length,c.durationS*20+1);assert.equal(c.baselineSamples.length,c.samples.length);
  assert.equal(c.revisedPlot.length,c.durationS*100+1);
  assert.equal(elements.saturation.textContent,c.metrics.engineGatePass?'PASS':'FAIL');if(c.metrics.engineGatePass)passes++;
  assert(Math.abs(Math.max(...c.revisedPlot.map(s=>s[4]))-1000*c.metrics.maxPositionDifferenceM)<1e-7);
  assert(Math.abs(Math.max(...c.revisedPlot.map(s=>s[5]))-c.metrics.maxAttitudeDifferenceDeg)<1e-7);
  for(const samples of [c.samples,c.baselineSamples])for(const s of samples){assert(s.every(Number.isFinite));for(const u of s.slice(8,22))assert(u>=-1e-9&&u<=.2834+1e-9);}
  for(const theme of [false,true])for(const mode of ['engine','tracking'])for(const window of ['full','early']){
    dark=theme;elements['plot-mode'].value=mode;elements['plot-mode'].onchange();elements['plot-window'].value=window;elements['plot-window'].onchange();
    for(const t of [0,.5,c.durationS/2,c.durationS]){elements.time.value=String(t);elements.time.oninput();assert.equal(elements.clock.textContent,`${t.toFixed(2)} / ${c.durationS.toFixed(2)} s`);}
  }
  elements.early.onclick();assert.equal(elements.clock.textContent,`0.50 / ${c.durationS.toFixed(2)} s`);
  elements.tail.onclick();assert.equal(elements.clock.textContent,`${(c.durationS-2).toFixed(2)} / ${c.durationS.toFixed(2)} s`);
  elements.time.value=String(c.durationS-.1);elements.time.oninput();elements.play.onclick();frames.shift()(0);frames.shift()(100);assert.equal(elements.play.textContent,'Play');assert.equal(elements.clock.textContent,`${c.durationS.toFixed(2)} / ${c.durationS.toFixed(2)} s`);elements.reset.onclick();assert.equal(elements.clock.textContent,`0.00 / ${c.durationS.toFixed(2)} s`);
}
assert.equal(passes,4);
for(let i=0;i<14;i++)assert(texts.includes(`m${i}`));assert(!texts.some(s=>s==='HEALTHY'||s==='FAULT'));assert(texts.some(s=>s.includes('M:')&&s.includes('S:')));
const html=fs.readFileSync(path.join(folder,'mpc_comparison.html'),'utf8');assert(html.includes('mpc_comparison_data.js'));assert(html.includes('mpc_comparison_viewer.js'));
console.log('PASS: six recorded engine comparisons; 100 Hz maxima, 20 Hz synchronized poses/thrusts, all 14 indicators, variable durations, both plot modes/themes, finite canvas drawing and playback endpoints. Mock-canvas checks are not browser visual QA.');
