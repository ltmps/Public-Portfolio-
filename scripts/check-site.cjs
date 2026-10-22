// Dependency-free checks for the homepage and case studies.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'projects/orbes/index.html', 'projects/b1lv/index.html', 'projects/satellite/index.html', 'projects/singularity/index.html', 'projects/modeling/index.html', 'projects/modeling/playback/index.html', 'projects/modeling/trajectories/index.html', 'projects/modeling/sherpa/index.html', 'projects/modeling/architecture/index.html'];
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
  assert(html.includes(`href="${rel}assets/css/gy.css"`) && html.includes(`src="${rel}assets/js/gy.js"`), `${file}: shared theme assets`);
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
