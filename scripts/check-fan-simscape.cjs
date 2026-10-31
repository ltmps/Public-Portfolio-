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
  const nodes = Object.fromEntries(['case', 'movie', 'csv', 'model', 'results', 'description', 'camera-description', 'speed'].map(id => [id, {value: id === 'speed' ? '1' : options[0]}]));
  const sandbox = {document: {getElementById: id => nodes[id]}};
  vm.createContext(sandbox);
  const selectorScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m => m[1].includes('const cases='));
  assert(selectorScript, 'Replay selector script exists');
  vm.runInContext(selectorScript[1], sandbox);
  for (const option of options) {
    nodes.case.value = option;
    nodes.case.onchange();
    for (const ref of [nodes.movie.src, nodes.movie.poster]) assert(fs.existsSync(path.resolve(replay, ref.split('?')[0])), `Missing ${ref}`);
    assert(html.includes('<a id="csv" hidden>'), 'No public CSV download control');
  }
}
require('./check-fan-matrix.cjs');
for (const file of ['projects/modeling/index.html', 'projects/modeling/localization/index.html', 'projects/orbes/index.html']) assert(read(path.join(root, file)).includes('fan-simscape/'));
console.log('PASS: 45 byte-identical media assets, 15 dynamic video selections, 36 fault choices across six modes, both error plots, playback/seek/reset and three discovery links. Mock canvas checks are not browser visual QA.');
