/* Recorded media and sampled results. This page does not simulate physics. */
(() => {
  'use strict';
  const data = window.ORBES_ARM_FIXTURES;
  const $ = id => document.getElementById(id);
  const base = '../../../../assets/media/modeling/fan-simscape/arm-fixtures/';
  const layout = $('arm-layout'), mode = $('arm-mode'), movie = $('arm-video');
  const percent = value => `${(100 * value).toFixed(1)}%`;
  const number = (value, unit, digits = 1) => `${value.toFixed(digits)} ${unit}`;
  const comparisons = {
    wall_table: ['wall_table_comparison.mp4', 'wall_table_mode3.png', 'Wall mount and table-corner mount, side by side through all six modes. The wall view looks from the open test area.'],
    overhead: ['six_mode_comparison.mp4', 'overview_mode3.png', 'Wall, fixed overhead, X/Y carriage and X/Y-plus-yaw layouts through the same six saved motion profiles.'],
  };

  function changeComparison() {
    const [source, poster, caption] = comparisons[$('arm-comparison').value];
    const player = $('arm-comparison-video');
    player.pause();
    player.src = base + source;
    player.poster = base + poster;
    player.load();
    $('arm-comparison-caption').textContent = caption;
  }

  function addRow(table, title, value) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = title;
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    table.appendChild(tr);
  }

  function selectCase() {
    const record = data.cases.find(item => item.layout === layout.value && item.mode === Number(mode.value));
    const fixture = data.layouts[layout.value];
    const stem = `${layout.value}-mode${mode.value}`;
    movie.pause();
    movie.src = base + stem + '.mp4';
    movie.poster = base + stem + '.png';
    movie.setAttribute('aria-label', `${fixture.name}, GNC ${mode.value}: ${data.modes[Number(mode.value) - 1]}`);
    movie.load();
    $('arm-fixture').textContent = fixture.fixture;
    const status = $('arm-status');
    const complete = record.ik_reachable_fraction === 1;
    status.dataset.complete = String(complete);
    status.textContent = complete ? 'All sampled poses reached in this layout.' : 'Part of this motion is outside the tested layout’s reachable envelope.';
    $('arm-reach').textContent = percent(record.ik_reachable_fraction);
    $('arm-clearance').textContent = number(record.min_payload_fixture_clearance_m_capped * 1000, 'mm');
    $('arm-contact').textContent = percent(record.penetration_fraction);
    $('arm-flow').textContent = percent(record.fan_cone_intersection_fraction);
    const details = $('arm-details');
    details.replaceChildren();
    addRow(details, 'Source duration', number(record.duration_s, 's', 2));
    addRow(details, 'Maximum position / attitude mismatch', `${number(record.max_pose_error_m * 1000, 'mm')} / ${number(record.max_attitude_error_deg, '°')}`);
    addRow(details, 'Peak arm-joint speed / datasheet limit', number(record.max_speed_utilization, '×', 2));
    addRow(details, 'Minimum joint-limit margin', number(record.min_joint_margin_deg, '°'));
    for (const key of ['TAG', 'IR']) {
      const camera = record[key];
      const value = !camera ? 'Not used in this mode.' : camera.usable_fraction_among_reached_poses === null ? 'No reached poses available for this comparison.' : percent(camera.usable_fraction_among_reached_poses);
      addRow(details, `${key} geometric availability on reached poses`, value);
    }
    if (record.peak_rail_speed_xy_mps) addRow(details, 'Peak X / Y stage speed', record.peak_rail_speed_xy_mps.map(v => number(v, 'm/s', 2)).join(' / '));
    if (record.peak_base_yaw_speed_rad_s !== undefined) addRow(details, 'Peak yaw-stage speed', number(record.peak_base_yaw_speed_rad_s, 'rad/s', 2));
  }

  layout.addEventListener('change', selectCase);
  mode.addEventListener('change', selectCase);
  $('arm-comparison').addEventListener('change', changeComparison);
  selectCase();
})();
