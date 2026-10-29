const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const folder=path.resolve(__dirname,'../projects/modeling/fan-simscape/replay');
for(const mode of [1,2,3,4,5,6,'recovery']){
  const recovery=mode==='recovery';
  let frames=[],texts=[],colors=[],dark=false;
  const ctx={};for(const n of ['beginPath','moveTo','lineTo','stroke','setLineDash','arc','fillRect','strokeRect','save','clip','restore','closePath','fill','rect'])ctx[n]=(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),`${mode}: nonfinite canvas geometry`);};
  ctx.fillText=(s,x,y)=>{assert(Number.isFinite(x)&&Number.isFinite(y));texts.push(s);};Object.defineProperty(ctx,'fillStyle',{set(v){colors.push(v);}});
  const ids=['fault','play','reset','speed','time','clock','description','final-error','max-delta','attitude','saturation','outcome','error-mode','reference-description','camera-scope'];
  const elements=Object.fromEntries(ids.map(id=>[id,{value:'',textContent:'',appendChild(){}}]));elements.speed.value='1';elements.view={width:1400,height:850,getContext:()=>ctx};
  const box={window:{},document:{documentElement:{getAttribute:()=>dark?'dark':null},getElementById:id=>elements[id],createElement:()=>({})},requestAnimationFrame:f=>frames.push(f)};
  vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(folder,recovery?'recovery_data.js':`comparison_mode${mode}_data.js`),'utf8'),box);vm.runInContext(fs.readFileSync(path.join(folder,'comparison_viewer.js'),'utf8'),box);
  const data=box.window.ORBES_COMPARISON;assert.equal(data.mode,recovery?1:mode);assert.equal(data.faults.length,recovery?7:6);assert.equal(data.usesIR,[2,4,5].includes(mode));assert.equal(data.positionControlled,mode!==5);
  assert(elements['reference-description'].textContent.includes(`GNC ${recovery?1:mode}`));assert.equal(Number(elements.time.max),data.durationS);
  for(const item of data.faults){elements.fault.value=item.id;elements.fault.onchange();assert(elements.outcome.textContent.length>30);for(const plot of ['command','healthy']){dark=plot==='healthy';elements['error-mode'].value=plot;elements['error-mode'].onchange();elements.time.value=String(data.durationS);elements.time.oninput();assert.equal(elements.clock.textContent,`${data.durationS.toFixed(2)} / ${data.durationS.toFixed(2)} s`);}}
  elements.play.onclick();for(let k=0;k<Math.ceil(data.durationS*10)+5;k++)frames.shift()(k*100);assert.equal(elements.play.textContent,'Play');elements.reset.onclick();assert.equal(elements.clock.textContent,`0.00 / ${data.durationS.toFixed(2)} s`);
  for(let i=0;i<14;i++)assert(texts.includes(`m${i}`));assert(colors.includes('rgb(230,38,20)'));assert(colors.includes('rgb(128,140,153)'));
  const file=recovery?'recovery_comparison.html':mode===1?'command_comparisons.html':`comparison_mode${mode}.html`,html=fs.readFileSync(path.join(folder,file),'utf8');assert(html.includes(recovery?'recovery_data.js':`comparison_mode${mode}_data.js`));if(!recovery)assert(html.includes(`value="${mode}" selected`));
  if(recovery){assert(data.faults.find(f=>f.id==='quarter_turn').metrics.recoveryTargetPass);assert(!data.faults.find(f=>f.id==='quarter_delay2').metrics.recoveryTargetPass);assert(!data.faults.find(f=>f.id==='full_roll').metrics.recoveryTargetPass);}
  console.log(`PASS: GNC ${mode}, six faults, ${data.durationS}s, same-clock fan colors, both plot/theme modes, exact endpoint, replay/reset.`);
}
