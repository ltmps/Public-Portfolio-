// Dependency-free checks for the modeling pages: media dependencies, playback rules,
// CAPCOM phase timing, Architecture data and the recorded playback viewer.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

const pages = ['index.html', 'projects/modeling/index.html', 'projects/modeling/trajectories/index.html',
  'projects/modeling/architecture/index.html', 'projects/modeling/sherpa/index.html', 'projects/orbes/index.html'];
for (const file of pages) {
  const html = read(file);
  const dir = path.dirname(file);
  for (const tag of html.matchAll(/<(?:video|source)\b[^>]*>/g)) {
    assert(!/\bautoplay\b/.test(tag[0]), `${file}: media must not autoplay`);
    for (const ref of tag[0].matchAll(/(?:src|poster)="([^"]+)"/g)) {
      assert(fs.statSync(path.resolve(root, dir, ref[1])).size > 0, `${file}: missing media ${ref[1]}`);
    }
    if (tag[0].startsWith('<video')) assert(/aria-label="[^"]+"/.test(tag[0]), `${file}: video needs a name`);
  }
  // Hover-to-play videos stay muted, and their label sits in a caption strip, never over the media.
  for (const block of html.matchAll(/<(a|figure)\b[^>]*data-gy-vid[^>]*>[\s\S]*?<\/\1>/g)) {
    const video = block[0].match(/<video\b[^>]*>/);
    if (video) assert(/\bmuted\b/.test(video[0]), `${file}: hover-to-play video must be muted`);
  }
  for (const label of html.matchAll(/<span class="gy-play"[^>]*>/g)) {
    assert(!/position: absolute/.test(label[0]), `${file}: hover-to-play label must not overlay media`);
  }
}

// CAPCOM mission studies: merged v5 media and phase jumps
const missions = read('projects/modeling/trajectories/index.html');
const ms = read('assets/js/mission-studies.js');
new vm.Script(ms);
assert.deepEqual(JSON.parse(ms.match(/var CH = (\[[^\]]+\])/)[1]), [0, 22, 32, 40, 58, 85, 91, 100, 103], 'CAPCOM phase-jump times');
assert.deepEqual([...ms.matchAll(/n: '0(\d)', mars: (true|false)/g)].map(m => m[2] === 'true'), [false, false, true, true], 'Mars flyby only on Mars routes');
assert.equal((missions.match(/data-ms-jump="\d"/g) || []).length, 9, 'Nine phase chips');
const mp = 'assets/media/modeling/mission-profiles/';
for (const n of ['01', '02', '03', '04']) {
  for (const f of [`mission_${n}_120s_capture_v3.mp4`, `mission_${n}_capture_v3_poster.png`]) assert(fs.existsSync(path.join(root, mp, f)), `Missing ${f}`);
}
for (const f of ['arrival_01_15s_capture_v3.mp4', 'neighbor_window_comparison.png', 'c3_launch_to_arrival.mp4']) {
  assert(missions.includes(mp + f), `Mission studies must show ${f}`);
}
for (const m of ms.matchAll(/'((?:trajectories|encke)\/[a-z0-9-]*[a-z0-9])'/g)) {
  for (const ext of ['.mp4', '.png']) assert(fs.existsSync(path.join(root, 'assets/media/modeling', m[1] + ext)), `Missing ${m[1]}${ext}`);
}
for (const n of [1, 2, 3]) for (const v of ['2d', '3d']) for (const ext of ['.mp4', '.png']) {
  assert(fs.existsSync(path.join(root, `assets/media/modeling/trajectories/window-${n}-${v}${ext}`)), `Missing window ${n} ${v}`);
}
assert(missions.includes('DE405/SPICE') && missions.includes('JPL Horizons'), 'Visible reference-track credits');
assert(/\bplay\(/.test(ms) && /reduced\(\)/.test(ms), 'Case picks play only when reduced motion is off');

// Systems architecture study
const arch = read('projects/modeling/architecture/index.html');
const as = read('assets/js/architecture-study.js');
new vm.Script(as);
const scen = JSON.parse(arch.match(/<script id="ar-scenarios" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const viewer = read('projects/modeling/playback/index.html');
const recorded = JSON.parse(viewer.match(/<script id="analysis-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
assert.deepEqual(scen.map(s => s.name), recorded.runs.map(r => r.scenario.name), 'Scenario playback uses the recorded runs');
for (const s of scen) assert(s.t.length === s.a.length && s.t.length === s.d.length, `${s.name}: aligned series`);
assert.equal((arch.match(/<button type="button" class="gy-cell /g) || []).length, 24, 'Recovery envelope is a 6 by 4 grid of native buttons');
for (const f of ['planar-flight.mp4', 'planar-flight.jpg', 'mission-cycle.mp4', 'mission-cycle.jpg', 'coupled-domains.mp4', 'coupled-domains.jpg', 'catalog-couplings.png']) {
  assert(arch.includes('assets/media/modeling/architecture/' + f), `Architecture must use ${f}`);
}

// Recorded playback viewer (unchanged page)
assert(!/(?<![A-Za-z])[A-Za-z]:[\\/](?!\/)/.test(viewer), 'No private machine paths');
assert(!/raw_csv|frame_binary|frame_index|source_hashes/.test(viewer), 'No private download or source-inventory fields');
assert(!/\bfetch\(|XMLHttpRequest/.test(viewer), 'Viewer must use embedded data');
assert(viewer.includes('<noscript>') && viewer.includes('prefers-reduced-motion'), 'Static and reduced-motion fallbacks');
assert.equal(recorded.runs.length, 5);
for (const run of recorded.runs) {
  assert(run.plot_series.time_s.length > 0);
  assert.equal(run.plot_series.mode.length, run.plot_series.time_s.length);
}
for (const script of viewer.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (!script[1].includes('application/json')) new vm.Script(script[2]);
}
for (const file of ['assets/js/gy.js', 'assets/js/gy-mesh.js']) new vm.Script(read(file));

const svg = read('assets/media/modeling/traceability-example.svg');
assert(!/<script\b|(?:href|src)=/.test(svg), 'Selected SVG must be self-contained');

// Approved media bytes stay unchanged
const encke = {
  'original.mp4': '40bcc0010decf91b0979f1b3fa49cb905f4e9b5dfdfb5962a86e0591d45cc4ad',
  'original.png': '81373113415db12fd90b08fe3fb56de89ef96d4f208769dc35b3773238eb69e3',
  'angled.mp4': '51051689cfc5857731c2b83d776aa530ef405ea6ce02ca9e6084adcd85b524e9',
  'angled.png': '83bcc22e8958c7c7e1fe9a961a9775fa5e489b4c9950024d7d16c34d86f3c79a',
  'heliocentric.mp4': '66dcdce0b589969d5483b507a8af2e3cbc5f3b533cfc0979069a509953ef522c',
  'heliocentric.png': 'eb4bc09880f65a5ec1b52ef0b00bec270604f707d1741bba551961a13c0df334'
};
for (const [file, hash] of Object.entries(encke)) assert.equal(sha('assets/media/modeling/encke/' + file), hash, `Approved Encke bytes: ${file}`);
const selection = JSON.parse(read('assets/media/modeling/trajectories/manifest.json'));
assert.equal(selection.length, 24);
for (const item of selection) {
  const file = 'assets/media/modeling/trajectories/' + item.file;
  assert.equal(fs.statSync(path.join(root, file)).size, item.bytes);
  assert.equal(sha(file), item.sha256);
}
console.log('PASS: media dependencies and playback rules, CAPCOM phase jumps and v5 media, architecture data and envelope, playback viewer privacy and approved media hashes.');
