// Exercise selection behavior without adding a browser or test dependency.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const rootDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(rootDir, 'assets/js/project-selector.js'), 'utf8');
const keys = ['bronco', 'enterprise', 'far'];
function element(dataset = {}) {
  const classes = new Set();
  return { dataset, hidden: true, attrs: {}, events: {}, textContent: '',
    classList: { add: name => classes.add(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name), contains: name => classes.has(name) },
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener(name, callback) { this.events[name] = callback; }
  };
}
const controls = [...keys, ...keys].map(key => element({ projectSelect: key }));
const lines = keys.map(key => element({ projectLine: key }));
const picker = element(), logo = element(), label = element(), note = element(), root = element();
root.querySelector = selector => ({ '[data-project-picker]': picker, '[data-project-logo]': logo, '[data-project-label]': label, '[data-project-note]': note })[selector];
root.querySelectorAll = selector => selector === '[data-project-select]' ? controls : lines;
vm.runInNewContext(script, { document: { querySelector: () => root } });
function selected(key) {
  assert.equal(root.dataset.selectedProject, key);
  controls.forEach(button => assert.equal(button.attrs['aria-pressed'], String(button.dataset.projectSelect === key)));
  lines.forEach(line => assert.equal(line.classList.contains('is-selected'), line.dataset.projectLine === key));
  assert(fs.existsSync(path.join(rootDir, logo.src)));
  assert(logo.alt && label.textContent && note.textContent);
}
selected('bronco');
assert.equal(picker.hidden, false);
assert(controls.every(button => !button.hidden));
controls[1].events.pointerenter({ pointerType: 'mouse' }); selected('enterprise');
controls[2].events.focus(); selected('far');
controls[0].events.pointerenter({ pointerType: 'mouse' }); selected('bronco');
controls[1].events.pointerenter({ pointerType: 'touch' }); selected('bronco');
controls[1].events.click(); selected('enterprise');
lines[2].events.pointerenter({ pointerType: 'mouse' }); selected('far');
lines[0].events.focusin(); selected('bronco');
lines[1].events.click(); selected('enterprise');
controls[5].events.focus(); selected('far');
assert.equal(note.textContent, 'Competition organization logo');
assert.equal(lines.length, 3);
// Safe on pages without this component.
vm.runInNewContext(script, { document: { querySelector: () => null } });
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const m of html.matchAll(/aria-(?:controls|describedby)="([^"]+)"/g)) {
  for (const id of m[1].split(/\s+/)) assert(ids.has(id), `Missing ARIA target: ${id}`);
}
assert.equal((html.match(/class="association-static-title"/g) || []).length, 3);
assert.equal((html.match(/data-project-line="/g) || []).length, 3);
assert.equal((html.match(/data-project-select="/g) || []).length, 6);
assert(/data-project-picker hidden/.test(html), 'Nonfunctional picker stays hidden without JavaScript');
assert(!html.includes('data-project-line="honeywell"'), 'Honeywell must remain independent');
console.log('PASS: sector/row hover, keyboard focus, click/tap, synchronized pressed state, full-logo mapping, ARIA targets and no-JavaScript source fallback.');
