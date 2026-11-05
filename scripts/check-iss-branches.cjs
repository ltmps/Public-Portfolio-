const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const media=path.join(root,'assets/media/modeling/fan-simscape/iss-chase/planning/branches');
const evidence=JSON.parse(fs.readFileSync(path.join(media,'evidence.json'),'utf8'));
const sha=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(media,name))).digest('hex');
assert.equal(sha('mpc_candidates.mp4'),evidence.movieSha256);
assert.equal(sha('mpc_candidates_poster.png'),evidence.posterSha256);
assert.equal(evidence.alternativesUsedOnline,false);assert.equal(evidence.completeTour,false);
assert.equal(evidence.selectedHorizonS,4);assert.equal(evidence.requestedHorizonS,8);
assert.equal(evidence.longHorizonAccepted,false);assert.equal(evidence.numericalAuditPassed,true);
assert.equal(evidence.acceptedCandidates,1614);assert.equal(evidence.attemptedCandidates,1626);
assert.equal(evidence.minimumRenderedPerFrame,5);assert.equal(evidence.maximumRenderedPerFrame,6);
assert(evidence.gradient.includes('per frame'));assert(evidence.gradient.includes('per-stage'));
const html=fs.readFileSync(path.join(root,'projects/modeling/fan-simscape/replay/iss_chase.html'),'utf8');
assert(html.includes('id="mpc-branches"'));assert(html.includes('post-run MPC re-solves'));
assert(html.includes('real-time deadline handling remains unqualified'));
const {readout,mount}=require('../projects/modeling/fan-simscape/replay/iss_branch_player.js');
function node(extra={}){return Object.assign({events:{},textContent:'',addEventListener(k,f){this.events[k]=f;},fire(k){this.events[k]?.();}},extra);}
const video=node({currentTime:0,paused:true,ended:false,playbackRate:1});
const select=node({value:'1'}),speed=node(),clock=node();
const nodes={'video':video,'[data-branch-rate]':select,'[data-branch-speed]':speed,'[data-branch-clock]':clock};
mount({querySelector:()=>({dataset:{sourceRate:'5',sourceDuration:'90'},querySelector:k=>nodes[k]})});
assert(speed.textContent.includes('simulation 0.0×'));
video.paused=false;video.currentTime=10;video.fire('timeupdate');
assert(clock.textContent.includes('50.0 s'));assert(speed.textContent.includes('simulation 5.0×'));
select.value='2';select.fire('change');assert.equal(video.playbackRate,2);assert(speed.textContent.includes('simulation 10.0×'));
video.paused=true;video.fire('pause');assert(speed.textContent.includes('simulation 0.0×'));
assert.deepEqual(readout({currentTime:20,playbackRate:2,paused:false,ended:false},5,90),{time:90,speed:0});
// Each movie keeps its own speed and clock when two diagnostic players coexist.
function player(){
  const video=node({currentTime:3,paused:false,ended:false,playbackRate:1});
  const select=node({value:'1'}),speed=node(),clock=node();
  const nodes={'video':video,'[data-branch-rate]':select,'[data-branch-speed]':speed,'[data-branch-clock]':clock};
  return {video,select,speed,clock,panel:{dataset:{sourceRate:'5',sourceDuration:'90'},querySelector:k=>nodes[k]}};
}
const first=player(),second=player();
mount({querySelectorAll:()=>[first.panel,second.panel]});
first.select.value='2';first.select.fire('change');
assert.equal(first.video.playbackRate,2);assert.equal(second.video.playbackRate,1);
assert(first.speed.textContent.includes('simulation 10.0×'));assert(second.speed.textContent.includes('simulation 5.0×'));
console.log('PASS: diagnostic media hashes/scope, guard evidence, shared gradient meaning, speed, source clock and pause/end behavior.');
