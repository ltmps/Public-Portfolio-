/* Shared replay transport. Buttons marked data-gy-ctl="play" or "reset" render as 36 px
   icon buttons. Each viewer keeps writing its own label ("Play", "Pause", "Play trace"); this
   script keeps that text as the button's hidden spoken name and swaps the icon to match, so
   no viewer needs to change. Without script the buttons keep their plain text labels. */
(function () {
  'use strict';
  var ICON = {
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>'
  };
  // Size only: each page keeps its own button border and colors, as in the approved preview.
  var CSS = 'button.gy-ctl.gy-ctl{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;' +
    'width:36px;height:36px;min-width:36px;min-height:36px;padding:0;gap:0;line-height:0}' +
    'button.gy-ctl[hidden]{display:none}' +
    '.gy-ctl svg{display:block;width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
    '.gy-ctl-t{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}';

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function upgrade(btn) {
    var last = null;
    function sync() {
      var label = (btn.textContent || '').trim() || btn.getAttribute('title') || '';
      if (label === last && btn.querySelector('svg')) return;
      last = label;
      var kind = btn.getAttribute('data-gy-ctl') === 'reset' ? 'reset' : (/^pause/i.test(label) ? 'pause' : 'play');
      btn.setAttribute('data-gy-icon', kind);
      btn.title = label;
      btn.innerHTML = '<span class="gy-ctl-t">' + esc(label) + '</span>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON[kind] + '</svg>';
    }
    btn.classList.add('gy-ctl');
    if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');
    sync();
    new MutationObserver(sync).observe(btn, { childList: true, characterData: true, subtree: true });
  }

  function start() {
    var btns = document.querySelectorAll('button[data-gy-ctl]');
    if (!btns.length) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    for (var i = 0; i < btns.length; i++) upgrade(btns[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
