// Dependency-free checks for the homepage and case studies.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pages = ['projects/modeling/fan-simscape/replay/recovery_comparison.html', 'projects/modeling/fan-simscape/replay/comparison_mode2.html', 'projects/modeling/fan-simscape/replay/comparison_mode3.html', 'projects/modeling/fan-simscape/replay/comparison_mode4.html', 'projects/modeling/fan-simscape/replay/comparison_mode5.html', 'projects/modeling/fan-simscape/replay/comparison_mode6.html', 'projects/modeling/fan-simscape/replay/command_comparisons.html', 'projects/modeling/fan-simscape/replay/index.html', 'projects/modeling/fan-simscape/replay/engineering_checks.html', 'projects/modeling/fan-simscape/index.html', 'index.html', 'projects/orbes/index.html', 'projects/b1lv/index.html', 'projects/satellite/index.html', 'projects/singularity/index.html', 'projects/eureka-ii/index.html', 'projects/modeling/index.html', 'projects/modeling/reaction-wheel/index.html', 'projects/modeling/playback/index.html', 'projects/modeling/trajectories/index.html', 'projects/modeling/sherpa/index.html', 'projects/modeling/sherpa/deployment/index.html', 'projects/modeling/sherpa/repair/index.html', 'projects/modeling/sherpa/refuel/index.html', 'projects/modeling/sherpa/relay/index.html', 'projects/modeling/sherpa/resupply/index.html', 'projects/modeling/sherpa/robotics/index.html', 'projects/modeling/sherpa/disposal/index.html', 'projects/modeling/architecture/index.html', 'projects/modeling/localization/index.html', 'projects/khorium/index.html'];
pages.push('projects/modeling/sherpa/training/index.html');
pages.push('projects/modeling/fan-simscape/replay/supervisor_review.html', 'projects/modeling/fan-simscape/replay/mpc_comparison.html');
pages.push('projects/modeling/fan-simscape/replay/arm_fixtures.html');
const base = 'https://example.test/Public-Portfolio-/';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const attr = (tag, name) => tag.match(new RegExp('\\b' + name + '="([^"]*)"'))?.[1];
let checked = 0;
for (const file of pages) {
  const html = read(file);
  const pageIds = ids(html);
  assert.equal(new Set(pageIds).size, pageIds.length, `${file}: duplicate IDs`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one primary heading`);
  assert(/<html\b[^>]*lang="en"/.test(html), `${file}: page language`);
  assert(/<title>[^<]+<\/title>/.test(html), `${file}: page title`);
  assert(/<meta\b[^>]*name="description"[^>]*content="[^"]+"/.test(html), `${file}: description`);
  assert(/<meta\b[^>]*name="viewport"/.test(html), `${file}: responsive viewport`);
  const skipLink = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].find(match =>
    attr(match[0], 'href') === '#main' &&
    (attr(match[0], 'class') || '').split(/\s+/).some(name => name === 'skip' || name === 'skip-link')
  );
  assert(skipLink, `${file}: skip link targeting main content must exist`);
  const main = html.match(/<main\b[^>]*>/)?.[0];
  assert.equal(attr(main || '', 'tabindex'), '-1', `${file}: skip destination must accept keyboard focus`);
  assert.equal(attr(main || '', 'id'), 'main', `${file}: skip destination exists`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) {
    assert.notEqual(attr(image[0], 'alt'), undefined, `${file}: image needs alt text`);
    assert(attr(image[0], 'src'), `${file}: image needs nonempty source`);
  }
  for (const tag of html.matchAll(/<(?:a|img|link|script|source|video)\b[^>]*>/g)) {
    const ref = attr(tag[0], 'href') ?? attr(tag[0], 'src');
    if (ref === undefined) continue;
    assert(ref, `${file}: empty reference`);
    if (/^(?:https?:|mailto:)/.test(ref)) continue;
    assert(!ref.startsWith('/'), `${file}: reference must preserve project base`);
    const target = new URL(ref, base + file);
    assert(target.pathname.startsWith('/Public-Portfolio-/'), `${file}: escaped project base`);
    let relative = decodeURIComponent(target.pathname.slice('/Public-Portfolio-/'.length));
    let local = path.join(root, relative);
    assert(fs.existsSync(local), `${file}: missing target ${ref}`);
    if (fs.statSync(local).isDirectory()) {
      relative += relative.endsWith('/') ? 'index.html' : '/index.html';
      local = path.join(root, relative);
    }
    assert(fs.existsSync(local), `${file}: missing index ${ref}`);
    if (target.hash) assert(ids(read(relative)).includes(decodeURIComponent(target.hash.slice(1))), `${file}: missing fragment ${ref}`);
    checked++;
  }
}
const home = read('index.html');
const parts = [...home.matchAll(/<a\b[^>]*class="gy-part"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map(m => [m[1], m[2].trim()]);
assert.deepEqual(parts.map(p => p[0]), ['projects/orbes/', 'projects/satellite/', 'projects/b1lv/', 'projects/singularity/'], 'Selected work keeps ORBES, satellite, Bronco 1 and Singularity in order');
assert.equal(new Set(parts.map(p => p[1])).size, 4, 'Selected-work cards need distinct accessible names');
assert(home.includes('href="projects/modeling/"'), 'Homepage must link to the simulations overview');
for (const study of ['trajectories', 'architecture', 'sherpa']) {
  assert(read('projects/modeling/index.html').includes(`href="${study}/"`), `Simulations overview must link to ${study}`);
}
// Every redesigned page shares the drafting-table theme and returns home.
for (const file of pages.filter(f => !f.includes('/playback/'))) {
  const html = read(file);
  const rel = '../'.repeat(file.split('/').length - 1);
  assert(html.includes(`href="${rel}assets/css/gy.css?v=`) && html.includes(`src="${rel}assets/js/gy.js?v=`), `${file}: shared theme assets`);
  // Shared assets carry a content-hash version, so browsers never pair a new page with a cached old file
  for (const m of html.matchAll(/(?:href|src)="(?:\.\.\/)*(assets\/(?:css|js)\/[^"?]+)(\?v=([0-9a-f]+))?"/g)) {
    assert(m[3], `${file}: ${m[1]} needs a ?v= content version`);
    const want = require('node:crypto').createHash('sha256').update(read(m[1]).replace(/\r\n/g, '\n')).digest('hex').slice(0, 10);
    assert.equal(m[3], want, `${file}: ${m[1]} version is stale; rebuild the page`);
  }
  assert(/localStorage\.getItem\('gy-theme'\)/.test(html), `${file}: theme restored before first paint`);
  assert(/<button type="button" class="gy-toggle" data-gy-theme aria-pressed="false">/.test(html), `${file}: native dark-mode toggle`);
  assert(html.includes('<footer id="contact"'), `${file}: contact footer`);
  if (file !== 'index.html') assert(html.includes(`href="${rel}index.html"`), `${file}: route back home`);
}
// Copy rule: no em dashes in pages or the shared theme.
for (const file of [...pages, 'assets/css/gy.css', 'assets/js/gy.js', 'assets/js/gy-mesh.js', 'assets/js/mission-studies.js', 'assets/js/architecture-study.js']) {
  assert(!read(file).includes('—'), `${file}: no em dashes`);
}
console.log(`PASS: ${pages.length} pages; ${checked} local references; metadata, image alt, keyboard skip destinations, project/contact navigation, shared theme and copy rules.`);

// Selected team media remain byte-identical and manually played.
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/images/singularity/singularity-workshop-assembly.png'))).digest('hex'), 'a7217d87e62374a13f9abb8a9cecafff3c4314a17363f04f6a0ebb0079ab2591', 'singularity-workshop-assembly.png: approved media hash');
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/images/singularity/singularity-field-preparation.png'))).digest('hex'), 'c43d73adefe67b71758529c75d27ec760b9ed54a1589a0313aad2e156bc3866c', 'singularity-field-preparation.png: approved media hash');
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/images/singularity/singularity-vehicle-cutaway.png'))).digest('hex'), '36c66056d19308b6eb4e3caab0e9e2744a93b03deface441f832fc62d27f424b', 'singularity-vehicle-cutaway.png: approved media hash');
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/images/eureka-ii/eureka-ii-field-integration.png'))).digest('hex'), 'be0bfec8712977e9272a2a17cf5ba7b10829b4ea4ba2df803f88cd6ed661e18f', 'eureka-ii-field-integration.png: approved media hash');
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/images/eureka-ii/eureka-ii-range-team.png'))).digest('hex'), 'f9eef906f6f556237aa3f91e341afbebe1000043badb689f5fabea94fecd79a2', 'eureka-ii-range-team.png: approved media hash');
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/media/singularity/singularity-2023-test-launch.mp4'))).digest('hex'), '8b04105187f233e57b28ff5dfc026b8ca13caa2d33c8d335698ee41dcc7ea4e9', 'singularity-2023-test-launch.mp4: approved media hash');
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/media/eureka-ii/eureka-ii-onboard-flight.mp4'))).digest('hex'), 'c890217b8fd6fc0dfe0b3c092ee6efc412eb2e200eb8576c6434dfa6c809be91', 'eureka-ii-onboard-flight.mp4: approved media hash');
for (const file of ['projects/singularity/index.html', 'projects/eureka-ii/index.html']) {
  const html = read(file);
  for (const video of html.matchAll(/<video\b[^>]*>/g)) {
    assert(/\bcontrols\b/.test(video[0]) && !/\bautoplay\b/.test(video[0]), `${file}: manual native controls`);
    assert(!html.includes('data-gy-vid'), `${file}: no hover autoplay`);
    assert(fs.existsSync(path.resolve(root, path.dirname(file), attr(video[0], 'poster'))), `${file}: poster exists`);
  }
}
