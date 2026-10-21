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
const enckeScript = fs.readFileSync(path.join(root, 'assets/js/encke-viewer.js'), 'utf8');
new vm.Script(enckeScript);
assert(!/\bplay\(/.test(enckeScript), 'View changes must leave playback paused');
assert(page.includes('id="encke-views"') && page.includes('aria-label="Trajectory view" hidden'), 'Hide script-only selectors by default');
assert(page.includes('unknown spacecraft Z coordinate is displayed as zero'), 'Visible reconstruction assumptions');
const hashes = {
  'original.mp4': '40bcc0010decf91b0979f1b3fa49cb905f4e9b5dfdfb5962a86e0591d45cc4ad',
  'original.png': '81373113415db12fd90b08fe3fb56de89ef96d4f208769dc35b3773238eb69e3',
  'angled.mp4': '51051689cfc5857731c2b83d776aa530ef405ea6ce02ca9e6084adcd85b524e9',
  'angled.png': '83bcc22e8958c7c7e1fe9a961a9775fa5e489b4c9950024d7d16c34d86f3c79a',
  'heliocentric.mp4': '66dcdce0b589969d5483b507a8af2e3cbc5f3b533cfc0979069a509953ef522c',
  'heliocentric.png': 'eb4bc09880f65a5ec1b52ef0b00bec270604f707d1741bba551961a13c0df334'
};
const crypto = require('node:crypto');
for (const [file, hash] of Object.entries(hashes)) {
  const bytes = fs.readFileSync(path.join(root, 'assets/media/modeling/encke', file));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), hash, `Approved Encke bytes: ${file}`);
  if (file.endsWith('.mp4')) assert(page.includes(`href="../../assets/media/modeling/encke/${file}"`), 'No-JS direct recording link');
}
const trajectoryPage = fs.readFileSync(path.join(root, 'projects/modeling/trajectories/index.html'), 'utf8');
const trajectoryScript = fs.readFileSync(path.join(root, 'assets/js/trajectory-viewer.js'), 'utf8');
new vm.Script(trajectoryScript);
assert(!/\bplay\(|\bfetch\(|XMLHttpRequest/.test(trajectoryScript), 'Local paused selection only');
assert(!/(?<![A-Za-z])[A-Za-z]:[\\/](?!\/)|file:\/\/|\.gif|\.pdf/.test(trajectoryPage), 'No machine paths or excluded downloads');
assert.equal([...trajectoryPage.matchAll(/data-case=/g)].length, 14, 'Eight route views and six launch-window views');
assert.equal([...trajectoryPage.matchAll(/class="trajectory-controls" hidden/g)].length, 2, 'Script-only controls hidden by default');
assert(trajectoryPage.includes('<noscript>'), 'Native player and recording-link fallback');
for (const tag of trajectoryPage.matchAll(/<(?:video|source|a)\b[^>]*>/g)) {
  for (const ref of tag[0].matchAll(/(?:src|poster|data-poster)="([^"]+)"/g)) {
    assert(fs.existsSync(path.resolve(root, 'projects/modeling/trajectories', ref[1])), `Missing trajectory dependency ${ref[1]}`);
  }
  if (tag[0].startsWith('<video')) assert(/controls/.test(tag[0]) && /aria-label/.test(tag[0]) && !/autoplay|loop/.test(tag[0]));
}
const selection = JSON.parse(fs.readFileSync(path.join(root, 'assets/media/modeling/trajectories/manifest.json'), 'utf8'));
assert.equal(selection.length, 24);
for (const item of selection) {
  const bytes = fs.readFileSync(path.join(root, 'assets/media/modeling/trajectories', item.file));
  assert.equal(bytes.length, item.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256);
}
console.log('PASS: selected media hashes/dependencies, controls, scenarios, script syntax, privacy and fallback guards.');
