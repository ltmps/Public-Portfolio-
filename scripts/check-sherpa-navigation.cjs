// Exercise navigation ordering against the real browser script, including responses
// that settle after cancellation. No DOM/network dependency is needed in CI.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/sherpa-inline.js'), 'utf8');
const base = 'https://example.test/Public-Portfolio-/projects/modeling/sherpa/';
function setup() {
  const requests = [], pushes = [], redirects = [], listeners = {};
  let rendered = 'deployment';
  const target = { setAttribute() {}, focus() {}, scrollIntoView() {} };
  const link = (slug, hash = '') => ({ href: base + slug + '/' + hash, hasAttribute() { return false; } });
  const node = slug => ({
    before() {}, setAttribute() {}, focus() {}, scrollIntoView() {},
    querySelectorAll() { return []; },
    querySelector(selector) {
      if (selector === '.sm-nav a[aria-current]') return link(slug);
      if (selector.startsWith('[id=')) return target;
      return null;
    },
    replaceWith(next) { rendered = next.slug; }, slug
  });
  const main = node('deployment');
  const status = { setAttribute() {} };
  const location = { href: base + 'deployment/', assign(url) { redirects.push(url); } };
  const context = {
    URL, AbortController, CSS: { escape: value => value }, location,
    history: { pushState(_state, _title, url) { location.href = String(url); pushes.push(String(url)); } },
    document: {
      title: 'Deployment',
      querySelector(selector) { return selector === 'main' ? main : null; },
      createElement() { return status; },
      addEventListener(type, callback) { listeners[type] = callback; }
    },
    window: { initSherpaPhases() {}, initSherpaStrips() {}, disposeSherpaStrips() {}, addEventListener(type, callback) { listeners[type] = callback; } },
    DOMParser: class { parseFromString(slug) { return { title: slug, querySelector() { return node(slug); } }; } },
    fetch(url, options) { return new Promise((resolve, reject) => requests.push({ url, signal: options.signal, resolve, reject })); }
  };
  vm.runInNewContext(source, context);
  function click(slug, hash) {
    const anchor = link(slug, hash);
    listeners.click({ button: 0, target: { closest() { return anchor; } }, preventDefault() {} });
  }
  return { click, requests, pushes, redirects, status, get rendered() { return rendered; }, get href() { return location.href; } };
}
async function settle(request, outcome, slug = 'repair') {
  if (outcome === 'success') request.resolve({ ok: true, async text() { return slug; } });
  else request.reject(new Error('Delayed network failure'));
  await new Promise(resolve => setImmediate(resolve));
}
(async function () {
  for (const outcome of ['success', 'failure']) {
    const app = setup();
    for (let round = 0; round < 2; round++) {
      app.click('repair');
      const pending = app.requests.at(-1);
      app.click('deployment', '#deployment-' + round);
      assert.equal(pending.signal.aborted, true, `${outcome}: index selection cancels pending request`);
      assert.equal(app.status.hidden, true, 'loading status clears for local selection');
      const latest = app.href, historyLength = app.pushes.length;
      await settle(pending, outcome);
      assert.equal(app.rendered, 'deployment', `${outcome}: stale result cannot replace current panel`);
      assert.equal(app.href, latest, `${outcome}: stale result cannot change URL`);
      assert.equal(app.pushes.length, historyLength, `${outcome}: stale result cannot add history`);
      assert.deepEqual(app.redirects, [], `${outcome}: stale failure cannot redirect`);
    }
    // A subsequent remote selection must still win, even if older results arrive last.
    app.click('repair'); const old = app.requests.at(-1);
    app.click('deployment', '#deployment-last');
    app.click('relay'); const latest = app.requests.at(-1);
    await settle(latest, 'success', 'relay');
    await settle(old, outcome);
    assert.equal(app.rendered, 'relay');
    assert.equal(new URL(app.href).searchParams.get('mission'), 'relay');
    assert.deepEqual(app.redirects, []);
  }
  console.log('PASS: delayed success/failure cannot override local index selection; repeated and subsequent remote navigation retain latest intent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
