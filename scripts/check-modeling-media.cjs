const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'projects/modeling/index.html'), 'utf8');
const viewer = fs.readFileSync(path.join(root, 'projects/modeling/playback/index.html'), 'utf8');
for (const tag of page.matchAll(/<(?:video|source)\b[^>]*>/g)) {
  assert(!/\bautoplay\b/.test(tag[0]), 'Media must not autoplay');
  for (const ref of tag[0].matchAll(/(?:src|poster)="([^"]+)"/g)) {
    assert(fs.statSync(path.resolve(root, 'projects/modeling', ref[1])).size > 0, `Missing media ${ref[1]}`);
  }
  if (tag[0].startsWith('<video')) assert(/\bcontrols\b/.test(tag[0]) && /aria-label=/.test(tag[0]), 'Video needs controls and a name');
}
assert(!/(?<![A-Za-z])[A-Za-z]:[\\/](?!\/)/.test(viewer), 'No private machine paths');
assert(!/raw_csv|frame_binary|frame_index|source_hashes/.test(viewer), 'No private download or source-inventory fields');
assert(!/\bfetch\(|XMLHttpRequest/.test(viewer), 'Viewer must use embedded data');
assert(viewer.includes('<noscript>') && viewer.includes('prefers-reduced-motion'), 'Static and reduced-motion fallbacks');
const data = JSON.parse(viewer.match(/<script id="analysis-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
assert.equal(data.runs.length, 5);
for (const run of data.runs) {
  assert(run.plot_series.time_s.length > 0);
  assert.equal(run.plot_series.mode.length, run.plot_series.time_s.length);
}
for (const script of viewer.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (!script[1].includes('application/json')) new vm.Script(script[2]);
}
const svg = fs.readFileSync(path.join(root, 'assets/media/modeling/traceability-example.svg'), 'utf8');
assert(!/<script\b|(?:href|src)=/.test(svg), 'Selected SVG must be self-contained');
console.log('PASS: selected videos/posters, controls, embedded scenarios, script syntax, privacy scan and static/reduced-motion fallbacks.');
