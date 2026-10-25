/* Load mission groups in place; ordinary links remain the no-JS/network fallback. */
(function () {
  'use strict';
  var main = document.querySelector('main');
  var catalog = document.querySelector('.sm-catalog');
  var initial = main;
  var panel = null;
  var base = new URL(catalog ? './' : '../', location.href);
  var originalTitle = document.title;
  var controller = null;
  var serial = 0;
  var slugs = ['deployment', 'repair', 'refuel', 'relay', 'resupply', 'robotics', 'disposal'];
  var status = document.createElement('p');
  status.className = 'sm-load-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  main.before(status);

  function stopVideos(root) {
    root.querySelectorAll('video').forEach(function (video) { video.pause(); });
  }
  function dispose(root) {
    stopVideos(root);
    window.disposeSherpaStrips(root);
  }
  function route(url) {
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
    var slug = url.pathname.slice(base.pathname.length).replace(/\/(?:index.html)?$/, '');
    return slugs.includes(slug) ? slug : null;
  }
  function restore() {
    serial++;
    if (controller) controller.abort();
    status.hidden = true;
    if (panel) { dispose(panel); panel.remove(); panel = null; }
    if (main !== initial) { dispose(main); main.replaceWith(initial); main = initial; }
    document.title = originalTitle;
  }
  async function load(slug, fragment, push) {
    var token = ++serial;
    if (controller) controller.abort();
    controller = new AbortController();
    var source = new URL(slug + '/', base);
    source.hash = fragment;
    status.textContent = 'Loading ' + slug + '\u2026'; status.hidden = false;
    try {
      var response = await fetch(source.href, { signal: controller.signal });
      if (!response.ok) throw new Error('Mission unavailable');
      var doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (token !== serial) return;
      var content = doc.querySelector('main.sm-main');
      if (!content) throw new Error('Mission unavailable');
      // Imported media and links must resolve against their source page, not the host page.
      content.querySelectorAll('[href], [src], [poster]').forEach(function (el) {
        ['href', 'src', 'poster'].forEach(function (attr) {
          if (el.hasAttribute(attr)) el.setAttribute(attr, new URL(el.getAttribute(attr), source).href);
        });
      });
      stopVideos(main);
      if (catalog) {
        if (panel) { dispose(panel); panel.remove(); }
        panel = document.createElement('section');
        panel.className = 'sm-main sm-inline'; panel.tabIndex = -1;
        panel.setAttribute('aria-label', slug + ' animations');
        panel.append.apply(panel, Array.from(content.childNodes));
        var heading = panel.querySelector('h1');
        var smaller = document.createElement('h2'); smaller.textContent = heading.textContent; heading.replaceWith(smaller);
        catalog.after(panel);
        content = panel;
      } else {
        if (main !== initial) dispose(main);
        main.replaceWith(content); main = content;
      }
      window.initSherpaPhases(content);
      window.initSherpaStrips(content);
      document.title = doc.title;
      if (push) {
        var local = new URL(location.href);
        local.searchParams.set('mission', slug); local.hash = fragment;
        history.pushState(null, '', local);
      }
      status.hidden = true;
      var target = fragment ? content.querySelector('[id="' + CSS.escape(fragment.slice(1)) + '"]') : null;
      target = target || content;
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    } catch (error) {
      if (token !== serial || error.name === 'AbortError') return;
      status.hidden = true;
      // The same authored page remains available if inline loading fails.
      location.assign(source.href);
    }
  }
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('.sm-nav a, .sm-card-body, .sm-index a');
    if (!link || link.target || link.hasAttribute('download')) return;
    var url = new URL(link.href);
    var slug = route(url);
    if (!slug) return;
    event.preventDefault();
    var current = panel || main;
    var selected = current.querySelector('.sm-nav a[aria-current]');
    var target = url.hash && current.querySelector('[id="' + CSS.escape(url.hash.slice(1)) + '"]');
    if (target && selected && route(new URL(selected.href)) === slug) {
      // A local index selection supersedes any in-flight mission navigation.
      serial++;
      if (controller) controller.abort();
      status.hidden = true;
      var local = new URL(location.href); local.searchParams.set('mission', slug); local.hash = url.hash;
      history.pushState(null, '', local);
      target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); target.scrollIntoView();
    } else load(slug, url.hash, true);
  });
  function fromLocation() {
    var slug = new URL(location.href).searchParams.get('mission');
    if (slugs.includes(slug)) load(slug, location.hash, false);
    else restore();
  }
  window.addEventListener('popstate', fromLocation);
  fromLocation();
})();
