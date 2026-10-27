const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/media/modeling/reaction-wheel/root-locus-data.json')));
assert.equal(data.sampleTime,.01);assert.equal(data.plots.length,6);
for(const p of data.plots){
 assert(p.gain.includes(1));assert.equal(p.gain[0],0);
 assert(p.gain.every((v,i)=>Number.isFinite(v)&&(!i||v>p.gain[i-1])));
 assert.equal(p.real.length,p.imag.length);
 for(let b=0;b<p.real.length;b++){
  assert.equal(p.real[b].length,p.gain.length);assert.equal(p.imag[b].length,p.gain.length);
  for(let k=0;k<p.gain.length;k++){
   const re=p.real[b][k],im=p.imag[b][k];assert(Number.isFinite(re)&&Number.isFinite(im));
   assert(p.real.some((a,j)=>Math.hypot(a[k]-re,p.imag[j][k]+im)<1e-6),'Real-coefficient loop requires conjugate symmetry');
  }
 }
 const k=p.gain.indexOf(1);
 assert(p.real.every((a,b)=>Math.hypot(a[k],p.imag[b][k])<1),'Saved nominal local loop must have poles inside the unit circle');
 assert(p.poles.every(([re,im])=>p.real.some((a,b)=>Math.hypot(a[0]-re,p.imag[b][0]-im)<1e-6)),'K=0 must match open-loop poles');
}
console.log('PASS: six finite MATLAB loci, gain ordering, conjugate pairs, K=0 poles and nominal local stability.');
