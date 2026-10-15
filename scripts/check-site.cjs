// Dependency-free checks for the portfolio's two public entry points.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'projects/orbes/index.html'];
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
  for (const tag of html.matchAll(/<(?:a|img|link|script)\b[^>]*>/g)) {
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
const detailLinks = [...home.matchAll(/<a\b[^>]*href="#(?:satellite|rocket)-details"[^>]*>([^<]+)<\/a>/g)].map(m => m[1]);
assert.equal(new Set(detailLinks).size, 2, 'Project detail links need distinct accessible names');
assert(read('projects/orbes/index.html').includes('href="../../index.html#contact"'), 'ORBES must offer the existing contact route');
console.log(`PASS: ${pages.length} pages; ${checked} local references; metadata, image alt, keyboard skip destinations and project/contact navigation.`);
