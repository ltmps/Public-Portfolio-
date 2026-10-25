# ORBES localization-aware mission sizing: code, data and video

Supplementary material for **"Localization-Aware Mission Design for a Fan-Actuated Free-Flyer in Parabolic Flight"** (K. H. G. Yam, submitted to IROS 2027).

ORBES is a fourteen-fan free-flyer for parabolic flight. Its maneuvers are sized by a closed-form rule that keeps the floor fiducial in the downward camera's view:

```
r_max = h_min * tan(theta_x) - s/2 - m
```

with `theta_x` the narrow half field of view, `s` the tag side (0.149 m) and `m` = 0.084 m (49 mm camera offset, 30 mm tracking budget, 5 mm pointing residual). Tags are laid where the previous effective footprint ends. The rule was applied first at the lens-model cone (44.3 x 33.6 deg) and then at the bench-calibrated flight-pipeline cone (28.8 x 21.4 deg). This folder holds the Monte Carlo evidence for both.

## Contents

| Path | What it is |
|---|---|
| `code/mc_campaign.py` | Campaign 1 driver, lens-model cone: 910 runs. |
| `code/mc2_campaign.py` | Campaign 2 driver, measured cone: 2,907 runs (sizing sweeps at both cones, Monte Carlo, tag-layout and camera ablations, latency, residual acceleration). |
| `code/conops_acceptance.py` | The six-mode CONOPS acceptance script both drivers reuse. |
| `data/mc_results.csv`, `data/mc_summary.md` | Campaign 1, one row per run, and its summary tables. |
| `data/mc2_results.csv`, `data/mc2_summary.md` | Campaign 2, one row per run (plus a few `stage=traces` rows), and its summary tables with Wilson 95 % intervals. |
| `data/mc2_traces.npz` | Exemplar time histories: `m3` (five tags), `m3t7` (seven tags), `m4` (orbit r = 0.25 m), `m6` (figure-eight A = 0.21 m), seed 1000. |
| `figures/make_fig*.py` | Scripts for paper Fig. 1 (mission scenario), Fig. 4 (sizing sweeps) and Fig. 5 (residual acceleration), reading `data/`. |
| `media/orbes_modes.mp4` | 78 s video of the six maneuvers with a fix-age overlay; `orbes_modes_poster.png` is its poster frame. |

## Reproducing the figures

```sh
cd figures
python make_fig1_scenario.py fig1_scenario.svg
python make_fig_sizing.py ../data/mc2_results.csv fig_sizing.svg
python make_fig_resg.py ../data/mc2_results.csv fig_resg.svg
```

Requires Python 3.10+ with `numpy` and `matplotlib`.

## About the campaign drivers

The drivers import the simulator (`sim_harness`, `frame_adapter`, `ekf15`, the MuJoCo model), which is not public. They are published so the procedure behind every row is auditable: seeds, randomization, gates, pass criteria and failure classes are all in the code. They will not run without the simulator. The data were produced from ORBES-sim commits `28de492`, `8615b2b` and `fd1579e`.

## Reading `mc2_results.csv`

One row per simulated episode.

- `stage`, `arm`, `mode`, `seed`: which experiment, which variant, which CONOPS maneuver (`m1_hold` through `m6_fig8`, with `m3_out` and `m3_back` for the two translation legs), and the RNG seed. Arms that are compared share seeds: the `mc`, layout, latency and cone-transfer arms use 1000 onward. Sizing, sweep, design-cone sizing and the camera ablation draw their own ranges.
- `fov_long_bodyY_deg`, `fov_narrow_bodyX_deg`, `tag_m`, `gate`, `latency_s`, `h_min_m`, `margin_m`, `tag_layout`, `orbit_r_m`, `fig8_A_m`: the configuration of that run.
- `mass_kg`, `ext_rot_deg`, `ext_off_mm`, `bias_resid`: the random draws. Extrinsic offsets are per axis. `bias_resid` is the constant unmeasured acceleration in m/s^2 used in the residual-acceleration sweep.
- `pass`: 1 if the run meets the mode's CONOPS criteria (listed in `data/mc2_summary.md`). `failure_class` gives the cause otherwise: `drift_past_tag`, `floor_breach`, `fix_gap` or `attitude_divergence`.
- `key_metric`, `key_value`, `end_err_m`, `yaw_err_p95_deg`, `tilt_max_deg`, `z_min`: outcome metrics. `z_min` is measured at the body centre, which touches the floor at about 0.10 m.
- `max_fix_gap`, `n_blind_entries`, `blind_time_s`, `longest_blind_s`: fiducial availability, counted from capture time.

`mc_results.csv` (campaign 1) uses a subset of these columns. It predates the measured cone and grades Mode 3 at a 0.3 m end-point tolerance instead of 0.2 m.

## Citation

```
K. H. G. Yam, "Localization-Aware Mission Design for a Fan-Actuated Free-Flyer in Parabolic Flight,"
submitted to IEEE/RSJ Int. Conf. Intelligent Robots and Systems (IROS), 2027.
```

## License

MIT, see `LICENSE` in this folder. It covers the code, data and media here only, not the rest of this repository.
