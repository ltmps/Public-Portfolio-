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

const pages = ['index.html', 'projects/modeling/index.html', 'projects/modeling/reaction-wheel/index.html', 'projects/modeling/trajectories/index.html',
  'projects/modeling/architecture/index.html', 'projects/modeling/sherpa/index.html', 'projects/modeling/sherpa/deployment/index.html', 'projects/modeling/sherpa/repair/index.html', 'projects/modeling/sherpa/refuel/index.html', 'projects/modeling/sherpa/relay/index.html', 'projects/modeling/sherpa/resupply/index.html', 'projects/modeling/sherpa/robotics/index.html', 'projects/modeling/sherpa/disposal/index.html', 'projects/orbes/index.html', 'projects/modeling/localization/index.html'];
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

// ORBES case study: full Mode 3 comparison, approved set from ltmps/ORBES-sim portfolio-media @ d63b541
const orbesPage = read('projects/orbes/index.html');
for (const [file, hash] of Object.entries({
  'mc_mode3_full_compare.mp4': '7e7cdd7e895ef9fcfac7bcb434f8912927b2c8e30120c13abd58a49f85e5c9a4',
  'mc_mode3_full_compare_poster.png': 'd53b7fb24ee6f623caedace4c8440fd0812e962ad7eadb7b7f7d9a5c83d5b555',
  'mc_mode4_cliff.mp4': 'bed8be1d5f9c3f9b6ccb7ae2b5ca6530bba52ded7c7a08435b9c2f1fd20c2d23',
  'mc_mode4_cliff_poster.png': 'd7e8f0cf62455fdba83b26a91a4313c30b5e3e57581564954b8a9d57a415047a',
  'mc_mode2_cameras.mp4': 'b26931f498c1401b817b3a6806fde36f2e43fd8300837c7bb9892942de0a47f3',
  'mc_mode2_cameras_poster.png': '7c36e7d5ef27e3c09ef79df372318db33baf816b3dbdb81287b73ae00a4bd7ef',
  'onboard_pov.mp4': '0b9f7209468ce9474451c1061ab387e370dbb1f3c608d49e2df045b88f1717f2',
  'onboard_pov_poster.png': '66a37794341c6dea4e231f3f8e13e18d0c31b248abefe63216bb112520a89dc4',
  'mc_mode3_layouts.mp4': '2b238f1e0ba780c7288d5e872317c70c64750cb48337179d62c3ee251887a221',
  'mc_mode3_layouts_poster.png': 'ce26395555fe0c4a26d24caa5b909be79fe1c9dbe04c619e721ba679be84d443'
})) {
  assert.equal(sha('assets/media/modeling/localization/' + file), hash, `Approved ORBES comparison bytes: ${file}`);
  assert(orbesPage.includes('assets/media/modeling/localization/' + file), `ORBES page must show ${file}`);
}

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
// ORBES localization study (Draft-A mc2): approved set from ltmps/ORBES-sim portfolio-media @ 0fc670d
const localization = {
  'fig_mc2_sizing.png': '7811cf36eb78fae2c8c6b641a61c0e44e02d0564a6e339f51c99102a10739a89',
  'fig_mc2_sweep.png': 'f57ba5b4920a052419b192498e2fb4e3947cf028122b320c73473b029280ed12',
  'fig_mc2_trace.png': '4d7a66cd551ec99a0f533d4c73850bf29f7eb6651047059a86842058a8a29999',
  'orbes_modes.mp4': '28b36e683eb636d96281021257e018118736d1fb82b75c94a78ab892b8e155fb',
  'orbes_modes_poster.png': 'b67ada51ebea3e1860e91d6a9187acc0f95d43a20b08bdc6e218117c4e069dd2',
  // portfolio-media @ 5a122d1 (design-cone Mode 3 animations); posters re-exported at portfolio-media 50d04da
  'mc_mode3_design.mp4': '491588c26a4457eb9d2301ae0580143ec5f007c2a974474e6caa4fcd8d749eb5',
  'mc_mode3_design_3d.mp4': '8308782733bdf90d6d601e062264db3ba57356e963d25f2087949fa30c12d5cb',
  'mc_mode3_design_poster.png': '1ad30c387dc5d90b83bb1a67411a1596016bca4a7da8d5a5c96daa4a81a362e9',
  'mc_mode3_design_3d_poster.png': '91a82d250c5c50260e8e6ee80dedb22ba9f5a6eca32865aff5294f7f3b6e9450',
  // portfolio-media @ 74ffda3 (MuJoCo-scene render of the same runs, poster from the manifest)
  'mc_mode3_design_mj.mp4': '2f2a3a31bd80706a5f159a69921b41d0a9f2983aef2c025545f65696390290ea',
  'mc_mode3_design_mj_poster.png': 'b51cb94f12dd33c5f838bd4b744bc726d9b6ae1332adc343c7c4c746928c34fb',
  // portfolio-media @ 1c08c2a (PPO residual vs DLQR, 12-cell illustrative subset; headline N=200 from the sim session)
  'ppo_vs_dlqr.mp4': '5c38685f31701d38bdc4dc8ea6f9c2fc8b0902efb8cd974fa35dcf8497bec380',
  'ppo_vs_dlqr_poster.png': 'fdac8114d1bf40ba9a6389cf08928a4238f8f6d4e57bdf82e7213af70226928f',
  // portfolio-media @ 340f37a ppo_s0_learning_curve.png (ece0e09b...), title strip cropped for the page caption
  'ppo_learning_curve.png': 'c9316f4b060ee57a0aaccff2ac44b27b3d6a17875b5f77ea89d17233903d8fea'
};
const sims = read('projects/modeling/localization/index.html');
for (const [file, hash] of Object.entries(localization)) {
  assert.equal(sha('assets/media/modeling/localization/' + file), hash, `Approved localization bytes: ${file}`);
  assert(sims.includes('assets/media/modeling/localization/' + file), `Localization study page must show ${file}`);
}
// Khorium result fields: rendered offline with VTK from public-geometry SimOps studies (khorium-media branch @ dd31c14)
const khorium = {
  'nasa_hump.png': '0417c750e0633af9650291f33d9da102da32df9d5eef83aa2726a69f506ad9a8',
  'naca0012.png': 'f64a226aeabc2bc0ff7c3d00f728f855677c239331b95b57e78658aea05386dd',
  'blunt_cone.png': '5d5fa787dc028bbcbcd2786d8b51382bd04136f7702237d2e9c35863c3a8c1eb',
  'backward_facing_step.png': '3bc10f504d4315f9e7bbc3983b261d74d6c2f81baf6e1ce8e3bed16b8db742f0'
};
const khoriumPage = read('projects/khorium/index.html');
for (const [file, hash] of Object.entries(khorium)) {
  assert.equal(sha('assets/media/khorium/' + file), hash, `Approved Khorium bytes: ${file}`);
  assert(khoriumPage.includes('assets/media/khorium/' + file), `Khorium page must show ${file}`);
}
const selection = JSON.parse(read('assets/media/modeling/trajectories/manifest.json'));
assert.equal(selection.length, 24);
for (const item of selection) {
  const file = 'assets/media/modeling/trajectories/' + item.file;
  assert.equal(fs.statSync(path.join(root, file)).size, item.bytes);
  assert.equal(sha(file), item.sha256);
}
console.log('PASS: media dependencies and playback rules, CAPCOM phase jumps and v5 media, architecture data and envelope, playback viewer privacy and approved media hashes, including the ORBES localization set and the Khorium result fields.');

// Two tracking studies plus optional full-run and phase-resolved wheel views.
const rw = read('projects/modeling/reaction-wheel/index.html');
const rwVideo = [...rw.matchAll(/<video\b[^>]*>/g)];
assert.equal(rwVideo.length, 4, 'Two study players and two optional wheel inspections');
for (const [tag] of rwVideo) {
  assert(/\bcontrols\b/.test(tag) && /\bplaysinline\b/.test(tag));
  assert(tag.includes('preload="none"') && !/\b(?:loop|autoplay)\b/.test(tag));
  assert(/poster="[^"]+"/.test(tag) && /aria-describedby="[^"]+"/.test(tag));
}
assert(!/<img\b[^>]+src="[^"]+\.gif/i.test(rw),'Reaction-wheel playback remains video-based');
assert(!rw.includes('rw-gif-download'), 'No GIF archive download section');
const rwManifest = JSON.parse(read('assets/media/modeling/reaction-wheel/manifest.json'));
for (const item of rwManifest.files) {
  const file = 'assets/media/modeling/reaction-wheel/' + item.name;
  assert.equal(fs.statSync(path.join(root, file)).size, item.bytes);
  assert.equal(sha(file), item.sha256, `Saved ORBES run asset changed: ${item.name}`);
}
console.log('PASS: two manual Reaction Wheel studies, optional wheel views and source-matched media.');
