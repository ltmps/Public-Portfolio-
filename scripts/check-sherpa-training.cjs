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
assert(html.includes('Linear versus circular rail') && html.includes('id="learned-cycle"'));
const learned = summary.full_cycle_study.demonstration;
const proof = JSON.parse(fs.readFileSync(path.join(dir, learned.verification_file)));
assert.equal(learned.training_stage, 'ppo_checkpoint');
assert(learned.ppo_updates > 0 && learned.checkpoint_environment_steps > 0);
assert.equal(learned.seed_role, 'seen in initialization and recovery');
assert.equal(learned.policy_sha256, proof.policy_checkpoint_sha256);
assert.equal(proof.inference_teacher_queries, 0);
assert(proof.audit.physical_cycle_pass && proof.audit.independent_policy_run && proof.audit.pass_required);
assert.equal(proof.audit.violation_count, 0);
assert.equal(proof.payload_reel_audit.violation_count, 0);
assert.equal(proof.audit.checked_states, proof.payload_reel_audit.checked_states);
assert(proof.audit.all_eight_mission_stages && proof.audit.continuous_time_without_episode_reset);
assert(proof.audit.accepted_interface_checks.every(x => x.passed));
assert(proof.audit.minimum_bend_radius_m >= proof.physical_limits.minimum_bend_radius_m);
assert(proof.audit.maximum_hose_twist_rad <= proof.physical_limits.maximum_hose_net_twist_rad);
assert(Object.values(proof.audit.runtime_failure_samples).every(x => x === 0));
assert.deepEqual(proof.physical_limits.gravity_m_s2, [0, 0, 0]);
const fullBaseline = JSON.parse(fs.readFileSync(path.join(dir, summary.full_cycle_study.matched_baseline_file)));
assert.equal(fullBaseline.requested_steps, 16384);
for (const geometry of ['linear', 'circular']) {
  const result = fullBaseline.results[geometry];
  assert.equal(result.episodes, 10);
  assert.equal(result.full_cycle_successes, result.outcomes.filter(x => x.full_cycle_success).length);
  assert.equal(result.outbound_successes, result.outcomes.filter(x => x.outbound_success).length);
  if (!result.full_cycle_successes) {
    assert.equal(result.mean_success_cycle_time_s, null);
    assert.equal(result.mean_success_drive_work_j, null);
  }
}
assert(html.includes('id="continuous-cycle"') && html.includes('id="training-method"'));
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
console.log('PASS: SHERPA media hashes, manual playback, learned-cycle audit/provenance, rail counts and scope labels.');
