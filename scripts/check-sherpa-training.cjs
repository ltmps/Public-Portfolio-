// Keep training media and result labels distinct from the native mission renders.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets/media/modeling/sherpa-training');
const summary = JSON.parse(fs.readFileSync(path.join(dir, 'simulation-summary.json')));
const html = fs.readFileSync(path.join(root, 'projects/modeling/sherpa/training/index.html'), 'utf8');
assert.equal(summary.rail_policy_trained, true);
assert.equal(summary.rail_dof, 1);
assert.equal(summary.rail_geometry, 'linear and circular');
assert.equal(summary.intended_rail_geometry, 'circular');
assert.equal(summary.circular_rail_simulated, true);
assert.equal(summary.rail_training.stage, 'near_socket');
assert.equal(summary.rail_training.steps_per_geometry, 16384);
assert.equal(summary.circular_configuration.radius_m, 1.25);
const comparison = JSON.parse(fs.readFileSync(path.join(dir, 'near-socket-comparison.json')));
assert.equal(comparison.stage, 'near');
for (const geometry of ['linear', 'circular']) {
  const trials = comparison.results[geometry].outcomes;
  assert.equal(trials.length, 20);
  assert.equal(trials.filter(x => x.success).length, summary.rail_training.counts[geometry].successes);
  for (const mode of ['connect', 'stow']) assert.equal(trials.filter(x => x.source_or_task === mode).length, 10);
}
assert(html.includes('Linear versus circular rail') && html.includes('no learned continuous-transfer success is claimed'));
assert(html.includes('scripted') && html.includes('not a reliability estimate'));
assert.equal((html.match(/<video\b/g) || []).length, summary.media.length);
for (const item of summary.media) {
  const buffer = fs.readFileSync(path.join(dir, item.name+'.mp4'));
  assert.equal(buffer.length, item.bytes);
  assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'), item.sha256);
  assert(item.frames > 0 && item.fps > 0 && item.duration_s > 0);
  assert(fs.statSync(path.join(dir, item.name+'.jpg')).size > 1000);
  assert(html.includes(item.name+'.mp4') && html.includes(item.name+'.jpg'));
}
for (const match of html.matchAll(/<video\b[^>]*>/g)) {
  assert(/\bcontrols\b/.test(match[0]) && /\bplaysinline\b/.test(match[0]));
  assert(match[0].includes('preload="none"') && match[0].includes('aria-describedby='));
  assert(!/\b(?:autoplay|loop)\b/.test(match[0]));
}
for (const mode of ['connect','stow']) {
  const evaluation = summary.evaluation[mode];
  assert(evaluation.episodes > 0 && evaluation.success_rate >= 0 && evaluation.success_rate <= 1);
}
for (const slug of ['refuel','robotics']) {
  assert(fs.readFileSync(path.join(root, `projects/modeling/sherpa/${slug}/index.html`),'utf8').includes('href="../training/"'));
}
console.log('PASS: SHERPA media hashes, manual playback, matched near-socket counts and full-transfer scope labels.');
