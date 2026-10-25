# Monte Carlo campaign summary

Total runs: 910; total sim time 17585 s; total wall 2.19 h.

All runs use the corners-in-view gate (0.149 m tag: the usable
footprint shrinks by half a tag per side, corners-in-view gate),
LSM6DS bias + walk, bench calibration, mass randomized in
[1.98, 2.7] kg against the fixed 2.7 kg controller model, and
true tag-camera extrinsics perturbed +-1 deg / +-5 mm while the
filter keeps the nominal model.

Notes: (1) Mode 4 pointing-inward at r = 0.55 m is MARGINAL
under the corners gate: the tag rides the narrow image axis,
whose tag-center footprint at 1 m is 0.590 m, leaving 4 cm of
margin; the fixed-yaw r = 0.45 m arm passes where inward fails.
Inward pointing needs r <= ~0.50 m with the 0.149 m tag.
(2) The chi-square ladder arms are statistically identical in
the blind single-tag return scenario: no gated-fix stream ever
occurs there, so the escape policy cannot act; the ladder
differences documented in ekf15.py arise in edge-fix regimes
this scenario does not produce.

## Monte Carlo (LSM6DS + bench cal, randomized mass and extrinsics)

| Mode | n | pass rate [Wilson 95%] | key metric | mean +- std | worst | min z | max fix gap |
|---|---|---|---|---|---|---|---|
| m1_hold | 50 | 1.00 [0.93, 1.00] | hold_err_m | 0.035 +- 0.006 | 0.049 | 0.98 | 0.07 s |
| m2_track | 50 | 1.00 [0.93, 1.00] | track_med_deg | 4.955 +- 0.387 | 5.645 | 0.98 | 0.07 s |
| m3_back | 50 | 0.80 [0.67, 0.89] | min_floor_clear_m | 0.830 +- 0.232 | 0.096 | 0.10 | 11.83 s |
| m3_out | 50 | 0.90 [0.79, 0.96] | min_floor_clear_m | 0.898 +- 0.164 | 0.140 | 0.14 | 12.03 s |
| m4_orbit | 50 | 0.16 [0.08, 0.29] | tag_img_offset_frac | 1.509 +- 1.552 | 8.884 | 0.10 | 14.37 s |
| m4_orbit [r045] | 50 | 1.00 [0.93, 1.00] | tag_img_offset_frac | 0.703 +- 0.023 | 0.759 | 0.97 | 0.07 s |
| m4_orbit [r050] | 50 | 1.00 [0.93, 1.00] | tag_img_offset_frac | 0.787 +- 0.023 | 0.830 | 0.97 | 0.40 s |
| m5_toss | 50 | 1.00 [0.93, 1.00] | drift_dev_mps | 0.032 +- 0.010 | 0.056 | 0.98 | 4.90 s |
| m6_fig8 | 50 | 0.96 [0.87, 0.99] | fix_loss_frac | 0.003 +- 0.012 | 0.062 | 0.98 | 1.27 s |

## Ablations (20 seeds per arm)

| Arm | n | pass rate [95%] | key mean +- std | min floor clear | longest fix gap |
|---|---|---|---|---|---|
| ladder_att_first | 20 | 0.35 [0.18, 0.57] | 0.636 +- 0.437 | 0.10 | 20.00 s |
| ladder_none | 20 | 0.35 [0.18, 0.57] | 0.636 +- 0.437 | 0.10 | 20.00 s |
| ladder_posvel_first | 20 | 0.35 [0.18, 0.57] | 0.636 +- 0.437 | 0.10 | 20.00 s |
| m3_single_tag | 20 | 0.00 [0.00, 0.16] | 0.650 +- 0.406 | 0.10 | 12.29 s |
| m3_tag_field | 20 | 0.90 [0.70, 0.97] | 0.850 +- 0.218 | 0.10 | 12.16 s |
| m4_fixed_yaw | 20 | 0.90 [0.70, 0.97] | 1.029 +- 0.862 | 0.10 | 10.75 s |
| m4_inward_yaw | 20 | 0.10 [0.03, 0.30] | 1.496 +- 1.060 | 0.10 | 13.57 s |
| m6_amp_anyyaw | 20 | 1.00 [0.84, 1.00] | 0.002 +- 0.006 | 0.97 | 0.67 s |
| m6_amp_wide | 20 | 0.00 [0.00, 0.16] | 0.588 +- 0.232 | 0.10 | 17.05 s |

## Bias sweep (Mode 3 out-leg, 20 seeds per point)

| residual bias [m/s^2] | arm | pass rate | min floor clearance mean +- std |
|---|---|---|---|
| 0.0 | single_tag | 0.00 [0.00, 0.16] | 0.81 +- 0.24 |
| 0.0 | tag_field | 0.90 [0.70, 0.97] | 0.93 +- 0.09 |
| 0.005 | single_tag | 0.00 [0.00, 0.16] | 0.75 +- 0.33 |
| 0.005 | tag_field | 0.95 [0.76, 0.99] | 0.91 +- 0.10 |
| 0.01 | single_tag | 0.00 [0.00, 0.16] | 0.68 +- 0.38 |
| 0.01 | tag_field | 0.85 [0.64, 0.95] | 0.87 +- 0.20 |
| 0.015 | single_tag | 0.00 [0.00, 0.16] | 0.62 +- 0.39 |
| 0.015 | tag_field | 0.90 [0.70, 0.97] | 0.86 +- 0.22 |
| 0.02 | single_tag | 0.00 [0.00, 0.16] | 0.62 +- 0.41 |
| 0.02 | tag_field | 0.65 [0.43, 0.82] | 0.78 +- 0.33 |
| 0.025 | single_tag | 0.00 [0.00, 0.16] | 0.60 +- 0.42 |
| 0.025 | tag_field | 0.55 [0.34, 0.74] | 0.70 +- 0.39 |
| 0.03 | single_tag | 0.00 [0.00, 0.16] | 0.58 +- 0.42 |
| 0.03 | tag_field | 0.55 [0.34, 0.74] | 0.63 +- 0.42 |
