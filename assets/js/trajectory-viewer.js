(() => {
  'use strict';
  for (const player of document.querySelectorAll('.trajectory-player')) {
    const video = player.querySelector('video');
    const controls = player.querySelector('.trajectory-controls');
    const study = player.querySelector('.case-select');
    const view = player.querySelector('.view-select');
    const caption = player.querySelector('figcaption');
    const links = [...player.querySelectorAll('a[data-case][data-view]')];
    controls.hidden = false;
    let lastStudy = study.value;
    const update = () => {
      const link = links.find(item => item.dataset.case === study.value && item.dataset.view === view.value);
      if (!link) return;
      const time = study.value === lastStudy && Number.isFinite(video.currentTime) ? video.currentTime : 0;
      lastStudy = study.value;
      video.pause();
      video.onloadedmetadata = null;
      video.poster = link.dataset.poster;
      video.src = link.href;
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration)) video.currentTime = Math.min(time, video.duration);
      };
      caption.textContent = study.selectedOptions[0].textContent + ' · ' + view.selectedOptions[0].textContent + ' · silent 10-second recording.';
      // Every selection stays paused; reduced-motion users choose when to play.
      video.load();
    };
    study.addEventListener('change', update);
    view.addEventListener('change', update);
  }
})();
