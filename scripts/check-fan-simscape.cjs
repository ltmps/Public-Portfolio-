// Checks the published fan package, including dynamic media URLs and all fault choices.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const study = path.join(root, 'projects/modeling/fan-simscape');
const replay = path.join(study, 'replay');
const media = path.join(root, 'assets/media/modeling/fan-simscape');
const read = file => fs.readFileSync(file, 'utf8');
const manifest = JSON.parse(read(path.join(media, 'manifest.json')));
assert.equal(manifest.files.length, 45);
for (const item of manifest.files) {
  const bytes = fs.readFileSync(path.join(media, item.file));
  assert.equal(bytes.length, item.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256, item.file);
}
for (const name of ['index.html', 'engineering_checks.html']) {
  const html = read(path.join(replay, name));
  const options = [...html.matchAll(/<option value="((?:gnc_mode|T1_|hold|dead_|stuck_|scale_|force_|torque_|conservation)[^"]*)"/g)].map(m => m[1]);
  assert.equal(options.length, name === 'index.html' ? 6 : 9);
  const nodes = Object.fromEntries(['case', 'movie', 'mp4', 'gif', 'csv', 'model', 'results', 'description', 'camera-description', 'speed'].map(id => [id, {value: id === 'speed' ? '1' : options[0]}]));
  const sandbox = {document: {getElementById: id => nodes[id]}};
  vm.createContext(sandbox);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], sandbox);
  for (const option of options) {
    nodes.case.value = option;
    nodes.case.onchange();
    for (const ref of [nodes.movie.src, nodes.movie.poster, nodes.mp4.href, nodes.gif.href]) assert(fs.existsSync(path.resolve(replay, ref)), `Missing ${ref}`);
    assert(nodes.csv.href.startsWith('https://raw.githubusercontent.com/ltmps/ORBES-sim/'));
  }
}
let frames = [];
const ctx = {};
for (const name of ['beginPath', 'moveTo', 'lineTo', 'stroke', 'setLineDash', 'fillText', 'arc', 'fillRect', 'strokeRect', 'save', 'clip', 'restore', 'closePath', 'fill', 'rect']) {
  ctx[name] = (...args) => { for (const n of args) if (typeof n === 'number') assert(Number.isFinite(n)); };
}
const ids = ['fault', 'play', 'reset', 'speed', 'time', 'clock', 'description', 'final-error', 'max-delta', 'attitude', 'saturation', 'outcome', 'pose-csv', 'actuation-csv', 'error-mode'];
const elements = Object.fromEntries(ids.map(id => [id, {value: '', textContent: '', appendChild() {}}]));
elements.speed.value = '1';
elements.view = {width: 1400, height: 850, getContext: () => ctx};
const sandbox = {window: {}, document: {getElementById: id => elements[id], createElement: () => ({})}, requestAnimationFrame: cb => frames.push(cb)};
vm.createContext(sandbox);
for (const file of ['comparison_data.js', 'comparison_viewer.js']) vm.runInContext(read(path.join(replay, file)), sandbox);
assert.equal(sandbox.window.ORBES_COMPARISON.faults.length, 6);
for (const fault of sandbox.window.ORBES_COMPARISON.faults) {
  elements.fault.value = fault.id;
  elements.fault.onchange();
  assert(elements.outcome.textContent.length > 30);
  assert(elements['pose-csv'].href.startsWith('https://raw.githubusercontent.com/ltmps/ORBES-sim/'));
  for (const mode of ['command', 'healthy']) {
    elements['error-mode'].value = mode;
    elements['error-mode'].onchange();
    elements.time.value = '22';
    elements.time.oninput();
    assert.equal(elements.clock.textContent, '22.00 / 22 s');
  }
}
elements.play.onclick();
for (let k = 0; k < 240; k++) frames.shift()(k * 100);
assert.equal(elements.play.textContent, 'Play');
elements.reset.onclick();
assert.equal(elements.clock.textContent, '0.00 / 22 s');
for (const file of ['projects/modeling/index.html', 'projects/modeling/localization/index.html', 'projects/orbes/index.html']) assert(read(path.join(root, file)).includes('fan-simscape/'));
console.log('PASS: 45 byte-identical media assets, 15 dynamic video selections, six fault choices, both error plots, playback/seek/reset and three discovery links. Mock canvas checks are not browser visual QA.');
