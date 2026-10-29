const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function setup(reduced = false) {
  const element = () => ({events:{},hidden:true,addEventListener(t,f){this.events[t]=f;},setAttribute(k,v){this[k]=v;}});
  const rail = Object.assign(element(), {scrollWidth:1800,clientWidth:400,scrollLeft:0,scrollBy({left}){this.scrollLeft+=left;}});
  const toggle=element(),prev=element(),next=element(),controls=element();
  controls.querySelector=s=>s.includes('toggle')?toggle:s.includes('prev')?prev:next;
  const gallery={querySelector:s=>s.includes('rail')?rail:controls};
  const motion=Object.assign(element(),{matches:reduced});
  const document=Object.assign(element(),{hidden:false,querySelector:()=>gallery});
  let callback, intersection,resize;
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/js/singularity-gallery.js'),'utf8'),{
    document,matchMedia:()=>motion,requestAnimationFrame:f=>(callback=f,1),cancelAnimationFrame:()=>{callback=null;},
    IntersectionObserver:class {constructor(f){intersection=f;}observe(){}},ResizeObserver:class {constructor(f){resize=f;}observe(){}}
  });
  return {rail,toggle,prev,next,motion,document,controls,see:()=>intersection([{isIntersecting:true}]),resize:()=>resize(),step:t=>{const f=callback;callback=null;if(f)f(t);},pending:()=>!!callback};
}
const a=setup();a.see();a.step(100);a.step(150);assert(a.rail.scrollLeft>0);
a.rail.events.pointerenter();const x=a.rail.scrollLeft;a.step(200);assert.equal(a.rail.scrollLeft,x);assert.equal(a.toggle.textContent,'Play gallery');
a.toggle.events.click();a.step(250);a.step(300);assert(a.rail.scrollLeft>x);
a.rail.events.focusin();assert(!a.pending());a.next.events.click();assert(a.rail.scrollLeft>300);
a.toggle.events.click();a.motion.matches=true;a.motion.events.change();assert(!a.pending());
const b=setup(true);b.see();assert(!b.pending());assert.equal(b.toggle.textContent,'Play gallery');
b.toggle.events.click();b.step(100);b.step(150);assert(b.rail.scrollLeft>0);
b.rail.events.pointerdown();assert(!b.pending());b.rail.scrollWidth=300;b.resize();assert(b.controls.hidden);
const c=setup();let rounded=0;Object.defineProperty(c.rail,'scrollLeft',{get:()=>rounded,set:v=>{rounded=Math.round(v);}});
c.see();for(let t=100;t<1100;t+=16)c.step(t);assert(c.rail.scrollLeft>15,'subpixel motion must accumulate on browsers that round scroll offsets');
console.log('PASS: gallery motion, hover/focus/touch pause, explicit resume, reduced motion and overflow controls.');
