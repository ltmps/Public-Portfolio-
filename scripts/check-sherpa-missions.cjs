// Check the public mission set against the inspected files, and keep playback manual.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets/media/modeling/sherpa');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'mission-renders.json')));
const slugs = ['deployment', 'repair', 'refuel', 'relay', 'resupply', 'robotics', 'disposal'];
const seen = new Set();
for (const slug of slugs) {
  const html = fs.readFileSync(path.join(root, `projects/modeling/sherpa/${slug}/index.html`), 'utf8');
  assert(!html.includes('data-gy-vid'), `${slug}: no hover playback`);
  assert(!html.includes('sherpa-trajectory.js'), `${slug}: no unrelated trajectory script`);
  for (const block of html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/g)) {
    const tag = block[0].split('>')[0];
    assert(/\bcontrols\b/.test(tag) && /\bplaysinline\b/.test(tag));
    assert(!/\b(?:autoplay|loop)\b/.test(tag));
    assert(tag.includes('preload="none"'), `${slug}: defer video transfer until requested`);
    assert(/aria-describedby="[^"]+"/.test(tag));
    const name = block[0].match(/src="[^" ]+\/([^/]+)\.mp4"/)[1];
    assert(!seen.has(name), `${name}: duplicated video`);
    seen.add(name);
    assert(html.includes(`Sequence in text:`));
    assert(html.includes(`href="../../../../assets/media/modeling/sherpa/${name}.mp4"`));
    assert(fs.statSync(path.join(dir, name + '.jpg')).size > 1000);
  }
}
assert.equal(manifest.length, 17);
assert.deepEqual([...seen].sort(), manifest.map(m => m.name).sort());
for (const item of manifest) {
  const buffer = fs.readFileSync(path.join(dir, item.name + '.mp4'));
  assert.equal(buffer.length, item.bytes);
  assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'), item.sha256);
  assert.equal(item.audio, false);
  assert.equal(item.fps, 24);
  assert(Math.abs(item.frames / item.fps - item.duration_s) < 0.05);
}
console.log('PASS: 7 SHERPA pages; all 17 source-matched videos, posters, text sequences and manual playback.');
