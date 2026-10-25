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
  assert(html.includes('assets/js/sherpa-missions.js?v='), `${slug}: phase controls`);
  assert(html.includes('assets/js/sherpa-strips.js?v='), `${slug}: strip controls`);
  assert(html.includes('data-sm-strip="Mission sequence"'), `${slug}: horizontally scrollable phases`);
  assert(!html.includes('sm-download'), `${slug}: no visible MP4 download row`);
  assert(!/[\u00e2\u00c3\ufffd]/.test(html), `${slug}: no garbled encoding`);
  for (const block of html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/g)) {
    const tag = block[0].split('>')[0];
    assert(/\bcontrols\b/.test(tag) && /\bplaysinline\b/.test(tag));
    assert(!/\b(?:autoplay|loop)\b/.test(tag));
    assert(tag.includes('preload="none"'), `${slug}: defer video transfer until requested`);
    assert(/aria-describedby="[^"]+"/.test(tag));
    const name = block[0].match(/src="[^" ]+\/([^/]+)\.mp4"/)[1];
    assert(!seen.has(name), `${name}: duplicated video`);
    seen.add(name);
    assert(html.includes('class="sm-phase-grid"'), `${slug}: static phase panels`);
    assert(html.includes(`href="../../../../assets/media/modeling/sherpa/${name}.mp4"`));
    assert(fs.statSync(path.join(dir, name + '.jpg')).size > 1000);
  }
  for (const section of html.matchAll(/<section class="sm-film"[\s\S]*?<\/section>/g)) {
    const name = section[0].match(/src="[^" ]+\/([^/]+)\.mp4"/)[1];
    const times = [...section[0].matchAll(/data-sm-time="([\d.]+)"/g)].map(m => Number(m[1]));
    assert(times.length > 1 && times[0] === 0, `${name}: sequence starts at zero`);
    assert(times.every((t, i) => !i || t > times[i - 1]), `${name}: ordered timestamps`);
    assert(times.at(-1) < manifest.find(m => m.name === name).duration_s, `${name}: timestamps within video`);
  }
}
const hub = fs.readFileSync(path.join(root, 'projects/modeling/sherpa/index.html'), 'utf8');
assert.equal((hub.match(/data-sm-preview>/g) || []).length, 7, 'Seven grouped mission cards');
assert(hub.includes('data-sm-strip="Mission groups"'), 'One mission-card strip');
const previews = JSON.parse(fs.readFileSync(path.join(dir, 'previews.json')));
assert.equal(previews.length, 7);
assert(previews.reduce((sum, p) => sum + p.bytes, 0) < 250000, 'Keep all preview excerpts lightweight');
for (const preview of previews) {
  const bytes = fs.readFileSync(path.join(dir, preview.file));
  assert.equal(bytes.length, preview.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), preview.sha256);
  assert.equal(preview.duration_s, 6);
  assert(manifest.some(m => m.name + '.mp4' === preview.source));
}
for (const video of hub.matchAll(/<video\b[^>]*data-sm-preview-src[^>]*>/g)) {
  assert(!/\ssrc=/.test(video[0]), 'Preview sources load only on intent');
  assert(/\bmuted\b/.test(video[0]) && /preload="none"/.test(video[0]));
  assert(!/\bautoplay\b/.test(video[0]));
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
console.log('PASS: 7 SHERPA pages; 17 source-matched videos and timestamp strips; 7 lightweight lazy previews; clean text and manual full-video playback.');
