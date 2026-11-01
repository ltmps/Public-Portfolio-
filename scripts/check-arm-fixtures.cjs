// Public media integrity and all 30 selector paths, without running physics.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const replay = path.join(root, 'projects/modeling/fan-simscape/replay');
const media = path.join(root, 'assets/media/modeling/fan-simscape/arm-fixtures');
const manifest = JSON.parse(fs.readFileSync(path.join(media, 'manifest.json'), 'utf8'));
assert.equal(manifest.files.length, 64);
for (const file of manifest.files) {
  const bytes = fs.readFileSync(path.join(media, file.file));
  assert.equal(bytes.length, file.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256);
}
const element = () => ({value: '', dataset: {}, children: [], events: {}, pause() {}, load() {},
  setAttribute(k, v) { this[k] = v; }, addEventListener(k, v) { this.events[k] = v; },
  append(...nodes) { this.children.push(...nodes); }, appendChild(node) { this.children.push(node); },
  replaceChildren() { this.children = []; }});
const ids = ['arm-layout', 'arm-mode', 'arm-video', 'arm-comparison', 'arm-comparison-video',
  'arm-comparison-caption', 'arm-fixture', 'arm-status', 'arm-reach', 'arm-clearance', 'arm-contact', 'arm-flow', 'arm-details'];
const nodes = Object.fromEntries(ids.map(id => [id, element()]));
nodes['arm-layout'].value = 'table_corner';
nodes['arm-mode'].value = '1';
nodes['arm-comparison'].value = 'wall_table';
const box = {window: {}, document: {getElementById: id => nodes[id], createElement: element}};
vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(replay, 'arm_fixtures_data.js'), 'utf8'), box);
vm.runInContext(fs.readFileSync(path.join(replay, 'arm_fixtures.js'), 'utf8'), box);
const data = box.window.ORBES_ARM_FIXTURES;
assert.equal(Object.keys(data.layouts).length, 5);
assert.equal(data.cases.length, 30);
for (const layout of Object.keys(data.layouts)) {
  for (let mode = 1; mode <= 6; mode++) {
    nodes['arm-layout'].value = layout;
    nodes['arm-mode'].value = String(mode);
    nodes['arm-mode'].events.change();
    for (const ref of [nodes['arm-video'].src, nodes['arm-video'].poster]) assert(fs.existsSync(path.resolve(replay, ref)));
    assert(nodes['arm-reach'].textContent.endsWith('%'));
    assert(nodes['arm-details'].children.length >= 6);
    assert.equal(nodes['arm-status'].dataset.complete, String(data.cases.find(c => c.layout === layout && c.mode === mode).ik_reachable_fraction === 1));
  }
}
for (const value of ['wall_table', 'overhead']) {
  nodes['arm-comparison'].value = value;
  nodes['arm-comparison'].events.change();
  assert(fs.existsSync(path.resolve(replay, nodes['arm-comparison-video'].src)));
  assert(fs.existsSync(path.resolve(replay, nodes['arm-comparison-video'].poster)));
}
const page = fs.readFileSync(path.join(replay, 'arm_fixtures.html'), 'utf8');
for (const [tag] of page.matchAll(/<video\b[^>]*>/g)) {
  assert(/\bcontrols\b/.test(tag) && /\bplaysinline\b/.test(tag));
  assert(tag.includes('preload="none"') && !/\b(?:autoplay|loop)\b/.test(tag));
}
assert(fs.readFileSync(path.join(root, 'projects/modeling/fan-simscape/index.html'), 'utf8').includes('replay/arm_fixtures.html'));
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === '.git') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(file, 'utf8');
      assert(!/<a\b[^>]*href=["'][^"']+\.(?:mp4|gif)(?:[?#][^"']*)?["']/i.test(html), `${file}: direct MP4/GIF link`);
    }
  }
}
walk(root);
console.log('PASS: 64 media hashes, 30 case selections, two comparisons, native playback, discovery link and no direct MP4/GIF anchors sitewide.');
