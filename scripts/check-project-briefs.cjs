// Keep simulation evidence and hardware inputs unambiguous in project summaries.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=JSON.parse(read('project_briefs.json')).pages;
assert.equal(pages.length,18);
for(const page of pages){
  const html=read(page),boxes=html.match(/<aside class="project-brief"[\s\S]*?<\/aside>/g)||[];
  assert.equal(boxes.length,1,page);
  for(const label of ['Question','Inputs','Outputs','How I checked it'])assert(boxes[0].includes(`<dt>${label}</dt>`),page+': '+label);
  assert(html.includes('project-brief.css?v=clarity1'));
}
for(const page of ['index.html','projects/orbes/index.html']){
  const html=read(page);assert(html.includes('MuJoCo'));assert(html.includes('3,817 SIMULATED RUNS'));
  assert(!html.includes('MEASURED ON HARDWARE'));assert(!html.includes('3,817-RUN MONTE CARLO'));
}
const media='assets/media/modeling/fan-simscape/iss-chase/planning/view-region/';
const evidence=JSON.parse(read(media+'evidence.json'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,media+p))).digest('hex');
assert.equal(sha('view_region_3d.mp4'),evidence.movieSha256);assert.equal(sha('view_region_3d_poster.png'),evidence.posterSha256);
assert.equal(evidence.onlineViewpointSelection,true);assert.equal(evidence.alternatives.usedOnline,false);
assert.equal(evidence.fallbackActivations,0);assert.equal(evidence.completeTour,false);
assert.equal(evidence.alternatives.accepted,1626);assert.equal(evidence.alternatives.minimumDistinctPathsAt1mm,6);
const html=read('projects/modeling/fan-simscape/replay/iss_chase.html');
assert(html.includes('id="view-region"'));assert(html.includes('0 activations in 901'));assert(html.includes('post-run diagnostics'));
console.log('PASS: 18 project evidence boxes, simulation/hardware wording, 3D media provenance and diagnostic/fallback scope.');
