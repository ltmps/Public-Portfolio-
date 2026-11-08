(() => {
  const video = document.getElementById('shaped-dock-video');
  const select = document.getElementById('shaped-dock-rate');
  const output = document.getElementById('shaped-dock-speed');
  if (!video || !select || !output) return;
  function update() {
    output.textContent = `${video.paused ? 'Paused · ' : ''}${2 * video.playbackRate}× simulated time`;
  }
  select.addEventListener('change', () => { video.playbackRate = Number(select.value); });
  ['play', 'pause', 'ratechange', 'ended'].forEach(event => video.addEventListener(event, update));
  update();
})();
