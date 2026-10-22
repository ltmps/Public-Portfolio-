const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'projects/modeling/index.html'), 'utf8');
const overview = page;
const detail = fs.readFileSync(path.join(root, 'projects/modeling/trajectories/index.html'), 'utf8');
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
assert(detail.includes('id="encke-views"') && detail.includes('aria-label="Trajectory view" hidden'), 'Hide script-only selectors by default');
assert(detail.includes('Earth and Mars reference tracks use DE405/SPICE; Encke uses JPL Horizons.'), 'Visible reference-track credits');
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
  if (file.endsWith('.mp4')) assert(detail.includes(`href="../../../assets/media/modeling/encke/${file}"`), 'No-JS direct recording link');
}
const trajectoryPage = fs.readFileSync(path.join(root, 'projects/modeling/trajectories/index.html'), 'utf8');
const trajectoryScript = fs.readFileSync(path.join(root, 'assets/js/trajectory-viewer.js'), 'utf8');
const reels = fs.readFileSync(path.join(root, 'assets/js/modeling-reels.js'), 'utf8');
new vm.Script(reels);
assert(!/\bplay\(/.test(reels), 'Reel changes must never start playback');
assert(reels.includes('prefers-reduced-motion') && reels.includes('IntersectionObserver'), 'Reel motion and offscreen playback guards');
assert(!page.includes('id="routes"') && detail.includes('id="routes"') && detail.includes('id="windows"'), 'Detailed route viewers stay on CAPCOM detail page');
assert.equal((page.match(/assets\/media\/modeling\/mission-profiles\/[^"]+\.mp4" type=/g)||[]).length,1,'One CAPCOM animation on overview');
assert(page.includes('modeling-reels.js') && trajectoryPage.includes('modeling-reels.js'), 'Both pages use reel enhancement');
new vm.Script(trajectoryScript);
assert(!/\bplay\(|\bfetch\(|XMLHttpRequest/.test(trajectoryScript), 'Local paused selection only');
assert(!/(?<![A-Za-z])[A-Za-z]:[\\/](?!\/)|file:\/\/|\.gif/.test(trajectoryPage), 'No machine paths or excluded downloads');
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

// CAPCOM full mission recordings: immutable media and local progressive enhancement.
const profilesRoot = path.join(root, 'assets/media/modeling/mission-profiles');
const profileManifest = JSON.parse(fs.readFileSync(path.join(profilesRoot, 'manifest.json'), 'utf8'));
assert.equal(profileManifest.files.length, 13);
for (const item of profileManifest.files) {
  const bytes = fs.readFileSync(path.join(profilesRoot, item.file));
  assert.equal(bytes.length, item.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256);
  assert(detail.includes(`href="../../../assets/media/modeling/mission-profiles/${item.file}"`), 'Direct recording/poster fallback');
}
const profileScript = fs.readFileSync(path.join(root, 'assets/js/mission-profiles.js'), 'utf8');
new vm.Script(profileScript);
assert(!/\bplay\(|\bfetch\(|XMLHttpRequest/.test(profileScript), 'Profile selection stays paused and local');
assert(profileScript.includes('cancelSeek') && profileScript.includes('removeEventListener'), 'Cancel stale chapter seeks');
assert(detail.includes('id="mission-profiles"') && detail.includes('illustrative launch phases and a local two-body capture example'));
console.log('PASS: CAPCOM mission-profile hashes, source scope, paused selection and static links.');

assert(profileScript.includes("['Polar orbit', 103]") && profileScript.includes("['Capture braking', 91]"), 'V5 chapter timing');
assert(detail.includes('550 Earth days') && detail.includes('Among these three candidates'), 'Bounded annual comparison');
assert(detail.includes('separately from the interplanetary path'), 'Separate local capture scope');

const sherpa = fs.readFileSync(path.join(root, 'projects/modeling/sherpa/index.html'), 'utf8');
new vm.Script(fs.readFileSync(path.join(root, 'assets/js/concept-reels.js'), 'utf8'));
const sherpaManifest=JSON.parse(fs.readFileSync(path.join(root,'assets/media/modeling/sherpa/manifest.json'),'utf8'));
assert.equal(sherpaManifest.length,14);
for(const item of sherpaManifest){
 const bytes=fs.readFileSync(path.join(root,'assets/media/modeling/sherpa',item.file));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);
 assert(sherpa.includes(`href="../../../assets/media/modeling/sherpa/${item.file}"`));
}
for(const tag of sherpa.matchAll(/<video\b[^>]*>/g)) assert(/controls/.test(tag[0])&&/aria-label/.test(tag[0])&&!/autoplay/.test(tag[0]));
assert.equal((sherpa.match(/data-concept-reel/g)||[]).length,2);
assert(sherpa.includes('assumed lumped tank-state model')&&sherpa.includes('Earth-centered two-body conics'));
console.log('PASS: one CAPCOM overview video, full detail media and SHERPA selection hashes/scopes.');

assert(enckeScript.includes("video.querySelector('source').src"), 'Encke media base follows the page source after relocation');
