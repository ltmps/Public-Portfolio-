# ORBES localization study media

These files back Study 07, Localization-aware mission design, on the Simulations page. Gavin approved the file list on 2026-10-25. They were copied byte for byte from the `portfolio-media` branch of ltmps/ORBES-sim (head 0fc670d), and each SHA-256 matches that branch's `release/portfolio/manifest.json`. All five were produced at ORBES-sim commit fd1579e. `scripts/check-modeling-media.cjs` pins every hash.

| File | Source script | Content |
|---|---|---|
| fig_mc2_sizing.png | src/mc2_figs.py | Pass rate versus inward-orbit radius and lemniscate amplitude on the design and measured cones, with the predicted bound dotted |
| fig_mc2_sweep.png | src/mc2_figs.py | Mode 3 pass rate versus residual acceleration for one, three, five and seven tags, with Wilson bands |
| fig_mc2_trace.png | src/mc2_figs.py | Mode 3 exemplar on the seven-tag field: estimated position error and fix age with BLIND shaded |
| orbes_modes.mp4 | src/mode_video.py | 78 s MuJoCo recording of the six flight modes with a fix-age overlay; H.264 High, 960 x 540, 15 fps, no audio, faststart |
| orbes_modes_poster.png | src/mode_video.py | Poster frame for the video |

Added 2026-10-26 from `portfolio-media` head 5a122d1 (Gavin-approved, producing commit c78430b). The manifest hashes match the MP4s exactly:

| File | Source script | Content |
|---|---|---|
| mc_mode3_design.mp4 | src/mc_anim.py | 9.9 s animation of 50 design-cone (44.3 x 33.6 deg) Mode 3 runs on the three-tag field, top and side views, colored by outcome: 44 pass, 6 fail |
| mc_mode3_design_3d.mp4 | src/mc_anim3d.py | The same 50 runs from an orbiting 3D camera |
| mc_mode3_design_poster.png, mc_mode3_design_3d_poster.png | ffmpeg final frame | Final-frame posters; since 50d04da these are the manifest's own files. |

Added 2026-10-26 from `portfolio-media` head 74ffda3 (Gavin-approved, producing commit c78430b): `mc_mode3_design_mj.mp4` and `mc_mode3_design_mj_poster.png` (src/mc_anim_mj.py). They show the same 50 design-cone runs rendered in the MuJoCo scene as a fleet with outcome-colored trails over the tag field, seen from an orbiting camera. Both match the manifest hashes, and the poster is the manifest's own file.

Added 2026-10-26 from `portfolio-media` head d63b541 (approved by Gavin in the Personal Website session, producing commit c78430b): `mc_mode3_full_compare.mp4` and its manifest poster (src/mc_anim_full.py). It is a 13 s split-screen MuJoCo render of the full ±2 m Mode 3 slide on the design cone, 30 seeds per arm. With a single tag 2/30 pass (16 endpoint drift, 12 floor strike); with the three-tag field 23/30 pass. It appears on the ORBES case study.

Added 2026-10-26 from `portfolio-media` head 123c7d3 (Gavin-approved per the ORBES-sim session, producing commit c78430b, src/mc_anim_cmp.py): `mc_mode4_cliff.mp4` and `mc_mode2_cameras.mp4` with their manifest posters. Both are 12 s split-screen MuJoCo renders on the measured cone with 20 seeds per arm. The first compares the inward orbit at r = 0.25 m (20/20) with r = 0.30 m, one step past the corners-gate bound (3/20). The second compares Mode 2 tracking with a single forward lens (0/20) against the two-camera build (20/20), with trail color showing fix age. Both appear on the ORBES case study.

Added 2026-10-27 from `portfolio-media` head 673ec5f (Gavin-approved per the ORBES-sim session, producing commit c78430b): `onboard_pov.mp4` (src/pov_anim.py) and `mc_mode3_layouts.mp4` (src/layout4_anim.py), each with its manifest poster. Both are measured-cone renders with 0.10 m/s² residual acceleration. The first is a 20 s rendered onboard tag-camera view during a Mode 3 slide over five tags; the pupil-apriltags detector draws corner boxes and IDs live, and the overlay shows fix age, EKF position error, supervisor mode and a NO FIX banner through a 2 s blind gap. The second is a 12.5 s four-panel ladder of 1, 3, 5 and 7 tags with the same 12 seeds each, passing 0/12, 2/12, 7/12 and 12/12. Both appear on the ORBES case study.

The GIF versions are not published because the MP4s carry the same frames at about 5% of the size.

The PNGs are published instead of the SVGs because the branch stores the SVGs with LF line endings, while the manifest hashes were taken over CRLF bytes. The PNGs match their manifest hashes exactly.

Run totals come from the manifest: 910 design-cone runs and 2,907 measured-cone runs, 3,817 in all. Conditions: 1 m altitude, 0.149 m tag, corners-in-view gate, 28.8 x 21.4 deg measured worst-side cone, 0.075 s fix latency, LSM6DS-class IMU with bench calibration, mass randomized from 1.98 to 2.7 kg against a fixed 2.7 kg controller model, and camera extrinsics perturbed by up to 1 deg and 5 mm per axis.

`mc2_results.csv`, `mc2_summary.md` and `mc2_traces.npz` are not published. All results are simulation, not hardware flights.

On 2026-10-27 every animation poster was replaced from `portfolio-media` head 50d04da (src/final_posters.py). The posters now show completed tallies: the MuJoCo renders were re-rendered one frame past episode end, and the two plot animations use their final frames. The onboard POV poster now shows a fresh fix with a NOMINAL supervisor. All poster hashes match the manifest.

`ppo_vs_dlqr.mp4` and `ppo_vs_dlqr_poster.png` come from ltmps/ORBES-sim portfolio-media @ 1c08c2a (source `src/ppo_cmp_anim.py`, sim commit 2a8477f), checked against the manifest sha256. The video shows 12 held-out Mode 3 cells as an illustrative subset (4/12 vs 0/12). The page headline uses the sim session's N=200 paired rerun: plain DLQR 24/200 (12.0%, Wilson 95% CI 8.2 to 17.2%) vs DLQR plus PPO residual 0/200 (0%, CI 0 to 1.9%), with all 24 baseline successes broken and none fixed.

`ppo_learning_curve.png` is `ppo_s0_learning_curve.png` from portfolio-media @ 340f37a (source `src/ppo_curve.py`, sim commit 2a8477f, manifest sha256 ece0e09b...), with the 50 px title strip cropped off because the page caption carries the title. Training sources are on ltmps/ORBES-sim branch `feat/ppo-recovery` (2a8477f) and in portfolio-media `src/train_ppo.py` and `src/rl_env.py`.
